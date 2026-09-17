from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import BinaryIO
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.import_job import ImportJob
from app.services.dataset_validation_service import (
    ValidationResult,
    validate_dataset_zip,
)
from app.services.dataset_ingestion_service import ingest_import_job
from app.services.storage_service import StorageService

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


def save_import_upload(
    db: Session,
    job: ImportJob,
    upload_stream: BinaryIO,
    storage: StorageService,
) -> bool:
    source_path = storage.import_source_path(job.id)
    source_path.parent.mkdir(parents=True, exist_ok=True)
    settings = get_settings()

    try:
        _save_upload(upload_stream, source_path, settings.max_upload_size_bytes)
    except UploadTooLargeError:
        _fail_job(db, job, [
                {
                    "code": "ARCHIVE_TOO_LARGE",
                    "message": f"Uploaded ZIP exceeds the configured maximum size of {_format_size(settings.max_upload_size_bytes)}",
                }
            ], "upload_failed")
        return False
    except OSError:
        _fail_job(db, job, [
                {
                    "code": "INVALID_ZIP",
                    "message": "Uploaded file could not be stored or read",
                }
            ], "upload_failed")
        return False

    job.progress = 5
    job.stage = "uploaded"
    job.errors = None
    job.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(job)
    return True


def process_saved_import(
    db: Session,
    job_id: UUID,
    storage: StorageService,
) -> ImportJob | None:
    job = db.get(ImportJob, job_id)
    if job is None or job.status == "completed":
        return job

    settings = get_settings()
    job.stage = "validating"
    job.progress = 10
    job.updated_at = datetime.now(timezone.utc)
    db.commit()

    result = validate_dataset_zip(
        str(storage.import_source_path(job.id)),
        max_extracted_size_bytes=settings.max_extracted_size_bytes,
        max_archive_entries=settings.max_archive_entries,
    )
    job.summary = {
        "images": result.image_count,
        "annotationFiles": result.annotation_file_count,
        "metadataLoaded": not bool(result.errors),
        "annotationFormat": job.annotation_format,
    }

    if result.errors:
        _fail_job(db, job, result.errors, "validation_failed")
        return job

    job.status = "processing"
    job.stage = "validated"
    job.progress = 30
    job.errors = None
    job.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(job)
    return ingest_import_job(db, job, storage)


def _fail_job(
    db: Session,
    job: ImportJob,
    errors: list[dict[str, str]],
    stage: str,
) -> None:
    now = datetime.now(timezone.utc)
    job.status = "failed"
    job.stage = stage
    job.progress = 100
    job.completed_at = now
    job.updated_at = now
    job.errors = errors
    db.commit()
    db.refresh(job)


def _save_upload(
    upload_stream: BinaryIO,
    destination: Path,
    max_upload_size_bytes: int,
) -> None:
    total = 0
    with destination.open("wb") as output:
        while chunk := upload_stream.read(CHUNK_SIZE):
            total += len(chunk)
            if total > max_upload_size_bytes:
                raise UploadTooLargeError
            output.write(chunk)


def _format_size(size_bytes: int) -> str:
    for unit, divisor in (("GB", 1024**3), ("MB", 1024**2), ("KB", 1024)):
        if size_bytes >= divisor:
            value = size_bytes / divisor
            return f"{value:g} {unit}"
    return f"{size_bytes} bytes"
