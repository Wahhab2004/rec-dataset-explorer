from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.import_job import ImportJob
from app.schemas.dataset_import import ImportAcceptedResponse, ImportStatusResponse
from app.services.dataset_import_service import create_import_job, save_and_validate_import
from app.services.storage_service import StorageService, get_storage_service

router = APIRouter(prefix="/dataset-imports", tags=["dataset-imports"])


@router.post("", response_model=ImportAcceptedResponse, status_code=202)
def create_dataset_import(
    name: Annotated[str, Form(min_length=1)],
    annotation_format: Annotated[Literal["YOLO"], Form(alias="annotationFormat")],
    file: Annotated[UploadFile, File()],
    db: Annotated[Session, Depends(get_db)],
    storage: Annotated[StorageService, Depends(get_storage_service)],
    description: Annotated[str | None, Form()] = None,
) -> ImportAcceptedResponse:
    job = create_import_job(
        db,
        name=name,
        description=description,
        annotation_format=annotation_format,
        source_file_name=file.filename,
    )
    save_and_validate_import(db, job, file.file, storage)
    return ImportAcceptedResponse(importId=job.id, status="processing")


@router.get("/{import_id}", response_model=ImportStatusResponse)
def read_dataset_import(
    import_id: UUID,
    db: Annotated[Session, Depends(get_db)],
) -> ImportStatusResponse | JSONResponse:
    job = db.get(ImportJob, import_id)
    if job is None:
        return JSONResponse(
            status_code=404,
            content={
                "error": {
                    "code": "IMPORT_NOT_FOUND",
                    "message": "Import job not found",
                    "details": None,
                }
            },
        )

    return ImportStatusResponse(
        id=job.id,
        status=job.status,
        progress=job.progress,
        stage=job.stage,
        datasetId=job.dataset_id,
        summary=job.summary,
        errors=job.errors,
        createdAt=job.created_at,
        updatedAt=job.updated_at,
        completedAt=job.completed_at,
    )
