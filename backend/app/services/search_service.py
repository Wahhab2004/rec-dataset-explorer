from __future__ import annotations

from collections import defaultdict
from typing import cast
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.annotation import Annotation
from app.models.dataset import Dataset
from app.models.dataset_class import DatasetClass
from app.models.image import Image
from app.schemas.search import (
    AnnotationSummary,
    ImageMetadata,
    SearchRequest,
    SearchResponse,
    SearchResultItem,
)
from app.services.dataset_service import DatasetNotFoundError
from app.services.storage_service import StorageService


def search_dataset(
    db: Session,
    dataset_id: UUID,
    request: SearchRequest,
    storage: StorageService | None = None,
) -> SearchResponse:
    if db.get(Dataset, dataset_id) is None:
        raise DatasetNotFoundError(dataset_id)

    matched_images = _build_matched_image_query(dataset_id, request)
    matched_images_subquery = matched_images.subquery()
    total = db.scalar(select(func.count()).select_from(matched_images_subquery)) or 0

    page_statement = (
        select(Image)
        .where(Image.id.in_(select(matched_images_subquery.c.id)))
        .order_by(
            Image.file_name.asc()
            if request.sort.direction == "asc"
            else Image.file_name.desc(),
        )
        .offset((request.page - 1) * request.page_size)
        .limit(request.page_size)
    )
    images = list(db.scalars(page_statement).all())
    annotation_summaries = _get_annotation_summaries(
        db,
        [image.id for image in images],
    )
    storage_service = storage or StorageService()

    items = [
        SearchResultItem(
            id=image.id,
            fileName=image.file_name,
            imageUrl=storage_service.image_url(dataset_id, image.file_name),
            metadata=ImageMetadata(
                timeOfDay=image.time_of_day,
                weather=image.weather,
                installationLocation=image.installation_location,
                location=image.location,
                tags=image.tags,
            ),
            annotationSummary=annotation_summaries[image.id],
        )
        for image in images
    ]
    return SearchResponse(
        total=total,
        page=request.page,
        pageSize=request.page_size,
        items=items,
    )


def _build_matched_image_query(
    dataset_id: UUID,
    request: SearchRequest,
) -> Select[tuple[UUID]]:
    image_filters = request.image_filters
    annotation_filters = request.annotation_filters
    statement = select(Image.id).where(Image.dataset_id == dataset_id)

    if image_filters.time_of_day:
        statement = statement.where(Image.time_of_day.in_(image_filters.time_of_day))
    if image_filters.weather:
        statement = statement.where(Image.weather.in_(image_filters.weather))
    if image_filters.installation_location:
        statement = statement.where(
            Image.installation_location.in_(image_filters.installation_location),
        )
    if image_filters.location is not None:
        statement = statement.where(Image.location == image_filters.location)
    for tag in image_filters.tags:
        statement = statement.where(Image.tags.contains([tag]))

    categories = annotation_filters.categories
    if categories:
        statement = statement.where(
            _annotation_exists(categories=categories),
        )

    for object_count in annotation_filters.object_counts:
        count_statement = (
            select(func.count(Annotation.id))
            .join(DatasetClass, DatasetClass.id == Annotation.class_id)
            .where(
                Annotation.image_id == Image.id,
                DatasetClass.class_name == object_count.category,
            )
            .scalar_subquery()
        )
        statement = statement.where(
            _compare(count_statement, object_count.operator, object_count.value),
        )

    bbox_conditions = annotation_filters.bbox.model_dump(
        by_alias=False,
        exclude_none=True,
    )
    if bbox_conditions:
        statement = statement.where(
            _annotation_exists(
                categories=categories,
                bbox_conditions=bbox_conditions,
            ),
        )

    return statement


def _annotation_exists(
    *,
    categories: list[str] | None = None,
    bbox_conditions: dict[str, object] | None = None,
):
    annotation_statement = select(Annotation.id).where(Annotation.image_id == Image.id)
    if categories:
        annotation_statement = annotation_statement.join(
            DatasetClass,
            DatasetClass.id == Annotation.class_id,
        ).where(DatasetClass.class_name.in_(categories))

    for field_name, condition in (bbox_conditions or {}).items():
        annotation_field = cast(object, getattr(Annotation, field_name))
        operator = condition["operator"]
        value = condition["value"]
        annotation_statement = annotation_statement.where(
            _compare(annotation_field, operator, value),
        )

    return annotation_statement.exists()


def _compare(column: object, operator: str, value: object):
    if operator == "eq":
        return column == value
    if operator == "lt":
        return column < value
    if operator == "lte":
        return column <= value
    if operator == "gt":
        return column > value
    if operator == "gte":
        return column >= value
    raise ValueError(f"Unsupported numeric operator: {operator}")


def _get_annotation_summaries(
    db: Session,
    image_ids: list[UUID],
) -> dict[UUID, list[AnnotationSummary]]:
    summaries: dict[UUID, list[AnnotationSummary]] = defaultdict(list)
    if not image_ids:
        return summaries

    statement = (
        select(
            Annotation.image_id,
            DatasetClass.class_name,
            func.count(Annotation.id),
        )
        .join(DatasetClass, DatasetClass.id == Annotation.class_id)
        .where(Annotation.image_id.in_(image_ids))
        .group_by(Annotation.image_id, DatasetClass.class_name)
        .order_by(Annotation.image_id, DatasetClass.class_name)
    )
    for image_id, class_name, count in db.execute(statement).all():
        summaries[image_id].append(
            AnnotationSummary(category=class_name, count=count),
        )
    return summaries
