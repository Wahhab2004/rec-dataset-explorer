from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.dataset import Dataset
from app.models.dataset_class import DatasetClass
from app.models.image import Image
from app.schemas.dataset import (
    AvailableFilters,
    DatasetDetail,
    DatasetListItem,
    DatasetListResponse,
)


class DatasetNotFoundError(Exception):
    def __init__(self, dataset_id: UUID) -> None:
        self.dataset_id = dataset_id
        super().__init__(f"Dataset {dataset_id} not found")


def list_datasets(db: Session) -> DatasetListResponse:
    image_count = func.count(Image.id).label("image_count")
    statement = (
        select(Dataset, image_count)
        .outerjoin(Image, Image.dataset_id == Dataset.id)
        .group_by(Dataset.id)
        .order_by(Dataset.created_at, Dataset.id)
    )

    items = [
        DatasetListItem(
            id=dataset.id,
            name=dataset.name,
            description=dataset.description,
            imageCount=image_count_value,
            annotationFormat=dataset.annotation_format,
            status=dataset.status,
            createdAt=dataset.created_at,
            updatedAt=dataset.updated_at,
        )
        for dataset, image_count_value in db.execute(statement).all()
    ]
    return DatasetListResponse(items=items)


def get_dataset(db: Session, dataset_id: UUID) -> DatasetDetail:
    dataset = db.get(Dataset, dataset_id)
    if dataset is None:
        raise DatasetNotFoundError(dataset_id)

    image_count = db.scalar(
        select(func.count(Image.id)).where(Image.dataset_id == dataset_id),
    )
    available_filters = AvailableFilters(
        timeOfDay=_distinct_image_values(db, Image.time_of_day, dataset_id),
        weather=_distinct_image_values(db, Image.weather, dataset_id),
        installationLocations=_distinct_image_values(
            db,
            Image.installation_location,
            dataset_id,
        ),
        categories=_distinct_class_names(db, dataset_id),
    )

    return DatasetDetail(
        id=dataset.id,
        name=dataset.name,
        description=dataset.description,
        imageCount=image_count or 0,
        annotationFormat=dataset.annotation_format,
        status=dataset.status,
        availableFilters=available_filters,
        createdAt=dataset.created_at,
        updatedAt=dataset.updated_at,
    )


def _distinct_image_values(db: Session, column: object, dataset_id: UUID) -> list[str]:
    statement = (
        select(column)
        .where(Image.dataset_id == dataset_id, column.is_not(None))
        .distinct()
        .order_by(column)
    )
    return [value for value in db.scalars(statement).all() if value is not None]


def _distinct_class_names(db: Session, dataset_id: UUID) -> list[str]:
    statement = (
        select(DatasetClass.class_name)
        .where(DatasetClass.dataset_id == dataset_id)
        .distinct()
        .order_by(DatasetClass.class_name)
    )
    return list(db.scalars(statement).all())
