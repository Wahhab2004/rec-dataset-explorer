from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import BinaryIO
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.import_job import ImportJob
from app.services.dataset_validation_service import (
    ValidationResult,
    validate_dataset_zip,
)
from app.services.storage_service import StorageService

MAX_UPLOAD_BYTES = 100_000_000
CHUNK_SIZE = 1024 * 1024


class UploadTooLargeError(Exception):
    pass


def create_import_job(
    db: Session,
    *,
    name: str,
    description: str | None,
    annotation_format: str,
    source_file_name: str | None,
) -> ImportJob:
    job = ImportJob(
        name=name.strip(),
        description=description,
        annotation_format=annotation_format,
        source_file_name=source_file_name,
        status="processing",
        progress=0,
        stage="uploading",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def save_and_validate_import(
    db: Session,
    job: ImportJob,
    upload_stream: BinaryIO,
    storage: StorageService,
) -> ImportJob:
    source_path = storage.import_source_path(job.id)
    source_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        _save_upload(upload_stream, source_path)
        if source_path.stat().st_size > MAX_UPLOAD_BYTES:
            result = ValidationResult(
                errors=[
                    {
                        "code": "ARCHIVE_TOO_LARGE",
                        "message": f"Uploaded ZIP exceeds {MAX_UPLOAD_BYTES} bytes",
                    }
                ],
                image_count=0,
                annotation_file_count=0,
            )
        else:
            result = validate_dataset_zip(str(source_path))
    except UploadTooLargeError:
        result = ValidationResult(
            errors=[
                {
                    "code": "ARCHIVE_TOO_LARGE",
                    "message": f"Uploaded ZIP exceeds {MAX_UPLOAD_BYTES} bytes",
                }
            ],
            image_count=0,
            annotation_file_count=0,
        )
    except OSError:
        result = ValidationResult(
            errors=[
                {
                    "code": "INVALID_ZIP",
                    "message": "Uploaded file could not be stored or read",
                }
            ],
            image_count=0,
            annotation_file_count=0,
        )

    now = datetime.now(timezone.utc)
    job.progress = 100
    job.completed_at = now
    job.updated_at = now
    job.summary = {
        "images": result.image_count,
        "annotationFiles": result.annotation_file_count,
        "metadataLoaded": not bool(result.errors),
        "annotationFormat": job.annotation_format,
    }

    if result.errors:
        job.status = "failed"
        job.stage = "validation_failed"
        job.errors = result.errors
    else:
        job.status = "processing"
        job.stage = "validated"
        job.errors = None

    db.commit()
    db.refresh(job)
    return job


def _save_upload(upload_stream: BinaryIO, destination: Path) -> None:
    total = 0
    with destination.open("wb") as output:
        while chunk := upload_stream.read(CHUNK_SIZE):
            total += len(chunk)
            if total > MAX_UPLOAD_BYTES:
                raise UploadTooLargeError
            output.write(chunk)
