from typing import Annotated
import mimetypes
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.dataset import Dataset
from app.schemas.dataset import DatasetDetail, DatasetListResponse
from app.schemas.image import ImageDetail
from app.schemas.search import SearchRequest, SearchResponse
from app.services.dataset_service import DatasetNotFoundError, get_dataset, list_datasets
from app.services.image_service import ImageNotFoundError, get_image_detail
from app.services.search_service import search_dataset
from app.services.storage_service import (
    StorageService,
    UnsafeStoragePathError,
    get_storage_service,
)

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.get("", response_model=DatasetListResponse)
def read_datasets(
    db: Annotated[Session, Depends(get_db)],
) -> DatasetListResponse:
    return list_datasets(db)


@router.get("/{dataset_id}", response_model=DatasetDetail)
def read_dataset(
    dataset_id: UUID,
    db: Annotated[Session, Depends(get_db)],
) -> DatasetDetail | JSONResponse:
    try:
        return get_dataset(db, dataset_id)
    except DatasetNotFoundError:
        return JSONResponse(
            status_code=404,
            content={
                "error": {
                    "code": "DATASET_NOT_FOUND",
                    "message": "Dataset not found",
                    "details": None,
                }
            },
        )


@router.post("/{dataset_id}/search", response_model=SearchResponse)
def search_dataset_images(
    dataset_id: UUID,
    request: SearchRequest,
    db: Annotated[Session, Depends(get_db)],
    storage: Annotated[StorageService, Depends(get_storage_service)],
) -> SearchResponse | JSONResponse:
    try:
        return search_dataset(db, dataset_id, request, storage)
    except DatasetNotFoundError:
        return JSONResponse(
            status_code=404,
            content={
                "error": {
                    "code": "DATASET_NOT_FOUND",
                    "message": "Dataset not found",
                    "details": None,
                }
            },
        )


@router.get("/{dataset_id}/files/images/{file_name:path}", response_model=None)
def read_image_file(
    dataset_id: UUID,
    file_name: str,
    db: Annotated[Session, Depends(get_db)],
    storage: Annotated[StorageService, Depends(get_storage_service)],
) -> FileResponse | JSONResponse:
    if db.get(Dataset, dataset_id) is None:
        return JSONResponse(
            status_code=404,
            content={
                "error": {
                    "code": "DATASET_NOT_FOUND",
                    "message": "Dataset not found",
                    "details": None,
                }
            },
        )

    try:
        image_path = storage.image_path(dataset_id, file_name)
    except UnsafeStoragePathError:
        image_path = None

    if image_path is None or not image_path.is_file():
        return JSONResponse(
            status_code=404,
            content={
                "error": {
                    "code": "IMAGE_FILE_NOT_FOUND",
                    "message": "Image file not found",
                    "details": None,
                }
            },
        )

    media_type = mimetypes.guess_type(file_name)[0] or "application/octet-stream"
    return FileResponse(image_path, media_type=media_type)


@router.get("/{dataset_id}/images/{image_id}", response_model=ImageDetail)
def read_image_detail(
    dataset_id: UUID,
    image_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    storage: Annotated[StorageService, Depends(get_storage_service)],
) -> ImageDetail | JSONResponse:
    try:
        return get_image_detail(db, dataset_id, image_id, storage)
    except DatasetNotFoundError:
        return JSONResponse(
            status_code=404,
            content={
                "error": {
                    "code": "DATASET_NOT_FOUND",
                    "message": "Dataset not found",
                    "details": None,
                }
            },
        )
    except ImageNotFoundError:
        return JSONResponse(
            status_code=404,
            content={
                "error": {
                    "code": "IMAGE_NOT_FOUND",
                    "message": "Image not found",
                    "details": None,
                }
            },
        )
