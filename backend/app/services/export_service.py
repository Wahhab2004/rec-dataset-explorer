from __future__ import annotations

import json
import zipfile
from datetime import datetime, timezone
from pathlib import PurePosixPath
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.annotation import Annotation
from app.models.dataset import Dataset
from app.models.dataset_class import DatasetClass
from app.models.export_job import ExportJob
from app.models.image import Image
from app.schemas.export import ExportRequest
from app.services.dataset_service import DatasetNotFoundError
from app.services.search_service import _build_matched_image_query
from app.services.storage_service import StorageService


class ExportNotFoundError(Exception):
    pass


class ExportInputError(Exception):
    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


def create_export(
    db: Session,
    dataset_id: UUID,
    request: ExportRequest,
    storage: StorageService,
) -> ExportJob:
    dataset = db.get(Dataset, dataset_id)
    if dataset is None:
        raise DatasetNotFoundError(dataset_id)

    job = ExportJob(
        dataset_id=dataset_id,
        export_type=request.export_type,
        filters=request.filters.model_dump(by_alias=True),
        status="pending",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        job.status = "processing"
        db.commit()
        image_ids = _resolve_image_ids(db, dataset_id, request)
        if not image_ids:
            raise ExportInputError("EMPTY_EXPORT", "No images matched the export selection")

        images = list(db.scalars(select(Image).where(Image.id.in_(image_ids))).all())
        classes = list(db.scalars(select(DatasetClass).where(DatasetClass.dataset_id == dataset_id)).all())
        class_by_id = {item.id: item for item in classes}
        annotations = list(
            db.scalars(select(Annotation).where(Annotation.image_id.in_(image_ids))).all()
        )
        annotations_by_image: dict[UUID, list[Annotation]] = {image_id: [] for image_id in image_ids}
        for annotation in annotations:
            annotations_by_image[annotation.image_id].append(annotation)

        export_path = storage.export_archive_path(job.id)
        export_path.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(export_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            metadata_images = []
            for image in images:
                matching_annotations = _matching_annotations(
                    annotations_by_image[image.id],
                    class_by_id,
                    request,
                )
                label_name = f"{PurePosixPath(image.file_name).stem}.txt"
                label_content = _yolo_content(matching_annotations, class_by_id)
                if request.export_type in {"images_and_annotations", "complete_dataset"}:
                    source = storage.image_path(dataset_id, image.file_name)
                    if not source.is_file():
                        raise ExportInputError("SOURCE_FILE_NOT_FOUND", f"Image file not found: {image.file_name}")
                    archive.write(source, f"images/{image.file_name}")
                archive.writestr(f"labels/{label_name}", label_content)
                metadata_images.append({
                    "fileName": image.file_name,
                    "timeOfDay": image.time_of_day,
                    "weather": image.weather,
                    "installationLocation": image.installation_location,
                    "location": image.location,
                    "tags": image.tags or [],
                })

            if request.export_type == "complete_dataset":
                archive.writestr(
                    "metadata/metadata.json",
                    json.dumps(
                        {
                            "classes": [
                                {"index": item.class_index, "name": item.class_name}
                                for item in sorted(classes, key=lambda item: item.class_index)
                            ],
                            "images": metadata_images,
                        },
                        indent=2,
                    ),
                )

        job.status = "completed"
        job.output_path = f"exports/{job.id}/dataset.zip"
        job.completed_at = datetime.now(timezone.utc)
        job.filters = {
            **(job.filters or {}),
            "summary": {
                "selectedImages": len(images),
                "generatedAnnotationFiles": len(images),
                "exportType": request.export_type,
            },
        }
        db.commit()
        db.refresh(job)
        return job
    except Exception as error:
        db.rollback()
        job = db.get(ExportJob, job.id)
        if job is not None:
            job.status = "failed"
            job.output_path = None
            job.filters = {
                **(job.filters or {}),
                "error": {"code": getattr(error, "code", "EXPORT_FAILED"), "message": str(error)},
            }
            db.commit()
            db.refresh(job)
        return job


def _resolve_image_ids(db: Session, dataset_id: UUID, request: ExportRequest) -> list[UUID]:
    if request.selection.mode == "all_filtered":
        statement = _build_matched_image_query(dataset_id, request.filters)
        return list(db.scalars(statement).all())

    image_ids = request.selection.image_ids or []
    matched_ids = set(db.scalars(_build_matched_image_query(dataset_id, request.filters)).all())
    images = list(
        db.scalars(
            select(Image.id).where(Image.dataset_id == dataset_id, Image.id.in_(image_ids))
        ).all()
    )
    if len(images) != len(set(image_ids)):
        raise ExportInputError("INVALID_IMAGE_ID", "One or more selected images do not belong to the dataset")
    return [image_id for image_id in images if image_id in matched_ids]


def _matching_annotations(
    annotations: list[Annotation],
    class_by_id: dict[UUID, DatasetClass],
    request: ExportRequest,
) -> list[Annotation]:
    filters = request.filters.annotation_filters
    categories = set(filters.categories)
    result = []
    for annotation in annotations:
        dataset_class = class_by_id[annotation.class_id]
        if categories and dataset_class.class_name not in categories:
            continue
        if not _matches_bbox(annotation, filters.bbox.model_dump(by_alias=False, exclude_none=True)):
            continue
        result.append(annotation)
    return result


def _matches_bbox(annotation: Annotation, conditions: dict[str, object]) -> bool:
    for field, condition in conditions.items():
        value = getattr(annotation, field)
        expected = condition["value"]
        operator = condition["operator"]
        if operator == "eq" and value != expected:
            return False
        if operator == "lt" and value >= expected:
            return False
        if operator == "lte" and value > expected:
            return False
        if operator == "gt" and value <= expected:
            return False
        if operator == "gte" and value < expected:
            return False
    return True


def _yolo_content(annotations: list[Annotation], class_by_id: dict[UUID, DatasetClass]) -> str:
    return "\n".join(
        f"{class_by_id[annotation.class_id].class_index} "
        f"{annotation.x_center:.3f} {annotation.y_center:.3f} "
        f"{annotation.width:.3f} {annotation.height:.3f}"
        for annotation in annotations
    )
