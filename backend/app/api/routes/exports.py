from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.export_job import ExportJob
from app.schemas.export import ExportAcceptedResponse, ExportRequest, ExportStatusResponse, ExportSummary
from app.services.dataset_service import DatasetNotFoundError
from app.services.export_service import create_export
from app.services.storage_service import StorageService, get_storage_service

router = APIRouter(tags=["exports"])


@router.post("/datasets/{dataset_id}/exports", response_model=ExportAcceptedResponse, status_code=202)
def create_dataset_export(
    dataset_id: UUID,
    request: ExportRequest,
    db: Annotated[Session, Depends(get_db)],
    storage: Annotated[StorageService, Depends(get_storage_service)],
) -> ExportAcceptedResponse | JSONResponse:
    try:
        job = create_export(db, dataset_id, request, storage)
    except DatasetNotFoundError:
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "DATASET_NOT_FOUND", "message": "Dataset not found", "details": None}},
        )
    return ExportAcceptedResponse(exportId=job.id, status="processing")


@router.get("/exports/{export_id}", response_model=ExportStatusResponse)
def get_export_status(
    export_id: UUID,
    db: Annotated[Session, Depends(get_db)],
) -> ExportStatusResponse | JSONResponse:
    job = db.get(ExportJob, export_id)
    if job is None:
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "EXPORT_NOT_FOUND", "message": "Export job not found", "details": None}},
        )

    summary = job.filters.get("summary") if job.filters else None
    error = job.filters.get("error") if job.filters else None
    return ExportStatusResponse(
        id=job.id,
        status=job.status,
        progress=100 if job.status == "completed" else None,
        stage="completed" if job.status == "completed" else job.status,
        summary=ExportSummary(**summary) if summary else None,
        fileName="dataset.zip" if job.status == "completed" else None,
        error=error,
    )


@router.get("/exports/{export_id}/download", response_model=None)
def download_export(
    export_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    storage: Annotated[StorageService, Depends(get_storage_service)],
) -> FileResponse | JSONResponse:
    job = db.get(ExportJob, export_id)
    if job is None:
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "EXPORT_NOT_FOUND", "message": "Export job not found", "details": None}},
        )
    if job.status != "completed":
        return JSONResponse(
            status_code=409,
            content={"error": {"code": "EXPORT_NOT_COMPLETED", "message": "Export is not completed", "details": None}},
        )

    archive_path = storage.export_archive_path(export_id)
    if not archive_path.is_file():
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "EXPORT_FILE_NOT_FOUND", "message": "Export file not found", "details": None}},
        )
    return FileResponse(archive_path, media_type="application/zip", filename="dataset.zip")
