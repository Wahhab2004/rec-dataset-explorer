from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.search import AnnotationFilters, ImageFilters

ExportType = Literal[
    "images_and_annotations",
    "annotations_only",
    "complete_dataset",
]
SelectionMode = Literal["explicit", "all_filtered"]


class ExportSelection(BaseModel):
    mode: SelectionMode
    image_ids: list[UUID] | None = Field(default=None, alias="imageIds")


class ExportFilters(BaseModel):
    image_filters: ImageFilters = Field(default_factory=ImageFilters, alias="imageFilters")
    annotation_filters: AnnotationFilters = Field(
        default_factory=AnnotationFilters,
        alias="annotationFilters",
    )


class ExportRequest(BaseModel):
    export_type: ExportType = Field(alias="exportType")
    selection: ExportSelection
    filters: ExportFilters = Field(default_factory=ExportFilters)


class ExportAcceptedResponse(BaseModel):
    export_id: UUID = Field(alias="exportId")
    status: str


class ExportSummary(BaseModel):
    selected_images: int = Field(alias="selectedImages")
    generated_annotation_files: int = Field(alias="generatedAnnotationFiles")
    export_type: ExportType = Field(alias="exportType")


class ExportStatusResponse(BaseModel):
    id: UUID
    status: str
    progress: int | None = None
    stage: str | None = None
    summary: ExportSummary | None = None
    file_name: str | None = Field(default=None, alias="fileName")
    error: dict[str, str] | None = None
