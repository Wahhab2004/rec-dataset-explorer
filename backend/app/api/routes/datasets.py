from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.dataset import DatasetDetail, DatasetListResponse
from app.services.dataset_service import DatasetNotFoundError, get_dataset, list_datasets

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
