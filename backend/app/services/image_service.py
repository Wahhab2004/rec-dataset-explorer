from __future__ import annotations

from pathlib import PurePosixPath
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.annotation import Annotation
from app.models.dataset import Dataset
from app.models.dataset_class import DatasetClass
from app.models.image import Image
from app.schemas.image import AnnotationFile, ImageDetail
from app.schemas.search import AnnotationSummary, ImageMetadata
from app.services.dataset_service import DatasetNotFoundError
from app.services.storage_service import StorageService


class ImageNotFoundError(Exception):
    def __init__(self, image_id: UUID) -> None:
        self.image_id = image_id
        super().__init__(f"Image {image_id} not found")


def get_image_detail(
    db: Session,
    dataset_id: UUID,
    image_id: UUID,
    storage: StorageService | None = None,
) -> ImageDetail:
    if db.get(Dataset, dataset_id) is None:
        raise DatasetNotFoundError(dataset_id)

    image = db.scalar(
        select(Image).where(
            Image.id == image_id,
            Image.dataset_id == dataset_id,
        ),
    )
    if image is None:
        raise ImageNotFoundError(image_id)

    summary = _get_annotation_summary(db, image_id)
    annotation_file = _get_annotation_file(db, image)

    return ImageDetail(
        id=image.id,
        fileName=image.file_name,
        imageUrl=(storage or StorageService()).image_url(dataset_id, image.file_name),
        metadata=ImageMetadata(
            timeOfDay=image.time_of_day,
            weather=image.weather,
            installationLocation=image.installation_location,
            location=image.location,
            tags=image.tags,
        ),
        annotationSummary=summary,
        annotationFile=annotation_file,
    )


def _get_annotation_summary(
    db: Session,
    image_id: UUID,
) -> list[AnnotationSummary]:
    statement = (
        select(
            DatasetClass.class_name,
            func.count(Annotation.id),
            DatasetClass.class_index,
        )
        .join(Annotation, Annotation.class_id == DatasetClass.id)
        .where(Annotation.image_id == image_id)
        .group_by(DatasetClass.class_name, DatasetClass.class_index)
        .order_by(DatasetClass.class_index)
    )
    return [
        AnnotationSummary(category=class_name, count=count)
        for class_name, count, _ in db.execute(statement).all()
    ]


def _get_annotation_file(db: Session, image: Image) -> AnnotationFile:
    statement = (
        select(
            DatasetClass.class_index,
            Annotation.x_center,
            Annotation.y_center,
            Annotation.width,
            Annotation.height,
        )
        .join(DatasetClass, DatasetClass.id == Annotation.class_id)
        .where(Annotation.image_id == image.id)
        .order_by(Annotation.id)
    )
    lines = [
        f"{class_index} {x_center:.3f} {y_center:.3f} {width:.3f} {height:.3f}"
        for class_index, x_center, y_center, width, height in db.execute(statement).all()
    ]
    file_name = (
        PurePosixPath(image.annotation_path).name
        if image.annotation_path
        else f"{PurePosixPath(image.file_name).stem}.txt"
    )
    return AnnotationFile(fileName=file_name, content="\n".join(lines))
