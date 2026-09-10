from pydantic import BaseModel, Field
from uuid import UUID

from app.schemas.search import AnnotationSummary, ImageMetadata


class AnnotationFile(BaseModel):
    file_name: str = Field(alias="fileName")
    content: str


class ImageDetail(BaseModel):
    id: UUID
    file_name: str = Field(alias="fileName")
    image_url: str = Field(alias="imageUrl")
    metadata: ImageMetadata
    annotation_summary: list[AnnotationSummary] = Field(alias="annotationSummary")
    annotation_file: AnnotationFile = Field(alias="annotationFile")
