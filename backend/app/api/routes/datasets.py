from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.dataset import DatasetDetail, DatasetListResponse
from app.schemas.search import SearchRequest, SearchResponse
from app.services.dataset_service import DatasetNotFoundError, get_dataset, list_datasets
from app.services.search_service import search_dataset

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
) -> SearchResponse | JSONResponse:
    try:
        return search_dataset(db, dataset_id, request)
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
