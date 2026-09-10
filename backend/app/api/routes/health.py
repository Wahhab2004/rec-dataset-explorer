from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db

router = APIRouter()


@router.get("/health", tags=["health"])
def health_check(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "degraded",
            "service": "REC Dataset Explorer API",
            "database": "unavailable",
        }

    return {
        "status": "ok",
        "service": "REC Dataset Explorer API",
        "database": "connected",
    }
