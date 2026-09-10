from __future__ import annotations

import json
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import PurePosixPath

from sqlalchemy.orm import Session

from app.models.annotation import Annotation
from app.models.dataset import Dataset
from app.models.dataset_class import DatasetClass
from app.models.image import Image
from app.models.import_job import ImportJob
from app.services.storage_service import StorageService


def ingest_import_job(
    db: Session,
    job: ImportJob,
    storage: StorageService,
) -> ImportJob:
    if job.status == "completed":
        return job
    if job.status != "processing" or job.stage != "validated":
        raise ValueError("Import job is not ready for ingestion")

    source_path = storage.import_source_path(job.id)
    permanent_directory = None

    try:
        with zipfile.ZipFile(source_path) as archive:
            names = [info.filename for info in archive.infolist() if not info.is_dir()]
            image_names = _files_in_directory(names, "images", {".jpg", ".jpeg", ".png"})
            label_names = _files_in_directory(names, "labels", {".txt"})
            metadata = json.loads(archive.read("metadata/metadata.json"))
            class_entries = metadata["classes"]
            image_entries = {
                entry["fileName"]: entry for entry in metadata["images"]
            }

            job.stage = "creating_records"
            job.progress = 10
            db.flush()

            dataset = Dataset(
                name=job.name,
                description=job.description,
                annotation_format=job.annotation_format,
                status="ready",
            )
            db.add(dataset)
            db.flush()
            job.dataset_id = dataset.id

            class_records = {
                entry["index"]: DatasetClass(
                    dataset_id=dataset.id,
                    class_index=entry["index"],
                    class_name=entry["name"],
                )
                for entry in class_entries
            }
            db.add_all(class_records.values())
            db.flush()

            permanent_directory = storage.create_dataset_directories(dataset.id)
            _copy_archive_file(archive, "metadata/metadata.json", permanent_directory / "metadata" / "metadata.json")

            image_count = 0
            annotation_count = 0
            job.stage = "processing_images"
            for image_name in image_names:
                file_name = PurePosixPath(image_name).name
                metadata_entry = image_entries[file_name]
                label_name = _matching_label(label_names, image_name)
                image_path = storage.image_path(dataset.id, file_name)
                annotation_path = storage.annotation_path(
                    dataset.id,
                    PurePosixPath(label_name).name,
                )
                _copy_archive_file(archive, image_name, image_path)
                _copy_archive_file(archive, label_name, annotation_path)

                image_record = Image(
                    dataset_id=dataset.id,
                    file_name=file_name,
                    file_path=f"datasets/{dataset.id}/images/{file_name}",
                    annotation_path=f"datasets/{dataset.id}/labels/{PurePosixPath(label_name).name}",
                    time_of_day=metadata_entry.get("timeOfDay"),
                    weather=metadata_entry.get("weather"),
                    installation_location=metadata_entry.get("installationLocation"),
                    location=metadata_entry.get("location"),
                    tags=metadata_entry.get("tags", []),
                )
                db.add(image_record)
                image_count += 1

            db.flush()
            job.stage = "processing_annotations"
            for image_name in image_names:
                file_name = PurePosixPath(image_name).name
                label_name = _matching_label(label_names, image_name)
                image_record = db.query(Image).filter(
                    Image.dataset_id == dataset.id,
                    Image.file_name == file_name,
                ).one()
                for line in archive.read(label_name).decode("utf-8").splitlines():
                    values = line.split()
                    if not values:
                        continue
                    class_index = int(values[0])
                    x_center, y_center, width, height = map(float, values[1:])
                    db.add(
                        Annotation(
                            image_id=image_record.id,
                            class_id=class_records[class_index].id,
                            x_center=x_center,
                            y_center=y_center,
                            width=width,
                            height=height,
                            area=width * height,
                        )
                    )
                    annotation_count += 1

            db.flush()
            now = datetime.now(timezone.utc)
            job.status = "completed"
            job.stage = "completed"
            job.progress = 100
            job.completed_at = now
            job.updated_at = now
            job.summary = {
                "images": image_count,
                "annotationFiles": len(label_names),
                "annotations": annotation_count,
                "classes": len(class_records),
                "metadataLoaded": True,
                "annotationFormat": job.annotation_format,
            }
            job.errors = None
            db.commit()
            db.refresh(job)
            return job
    except Exception as error:
        db.rollback()
        if permanent_directory is not None:
            shutil.rmtree(permanent_directory, ignore_errors=True)
        failed_job = db.get(ImportJob, job.id)
        if failed_job is not None and failed_job.status != "completed":
            now = datetime.now(timezone.utc)
            failed_job.status = "failed"
            failed_job.stage = "ingestion_failed"
            failed_job.progress = 100
            failed_job.completed_at = now
            failed_job.updated_at = now
            failed_job.errors = [{
                "code": "INGESTION_FAILED",
                "message": str(error),
            }]
            db.commit()
            db.refresh(failed_job)
            return failed_job
        raise


def _files_in_directory(names: list[str], directory: str, extensions: set[str]) -> list[str]:
    return [
        name
        for name in names
        if PurePosixPath(name).parts[0] == directory
        and PurePosixPath(name).suffix.lower() in extensions
    ]


def _matching_label(label_names: list[str], image_name: str) -> str:
    image_stem = PurePosixPath(image_name).stem
    return next(
        name for name in label_names if PurePosixPath(name).stem == image_stem
    )


def _copy_archive_file(archive: zipfile.ZipFile, member: str, destination) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(archive.read(member))
