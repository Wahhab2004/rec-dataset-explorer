from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ImportAcceptedResponse(BaseModel):
    import_id: UUID = Field(alias="importId")
    status: Literal["processing"]


class ImportValidationError(BaseModel):
    code: str
    message: str
    file: str | None = None


class ImportSummary(BaseModel):
    images: int
    annotation_files: int = Field(alias="annotationFiles")
    metadata_loaded: bool = Field(alias="metadataLoaded")
    annotation_format: str = Field(alias="annotationFormat")


class ImportStatusResponse(BaseModel):
    id: UUID
    status: str
    progress: int
    stage: str | None
    dataset_id: UUID | None = Field(default=None, alias="datasetId")
    processed_images: int | None = Field(default=None, alias="processedImages")
    total_images: int | None = Field(default=None, alias="totalImages")
    summary: ImportSummary | None = None
    errors: list[ImportValidationError] | None = None
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    completed_at: datetime | None = Field(default=None, alias="completedAt")
