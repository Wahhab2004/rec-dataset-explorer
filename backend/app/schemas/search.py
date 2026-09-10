from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

NumericOperator = Literal["eq", "lt", "lte", "gt", "gte"]
SortField = Literal["fileName"]
SortDirection = Literal["asc", "desc"]


class ImageFilters(BaseModel):
    time_of_day: list[str] = Field(default_factory=list, alias="timeOfDay")
    weather: list[str] = Field(default_factory=list)
    installation_location: list[str] = Field(
        default_factory=list,
        alias="installationLocation",
    )
    location: str | None = None
    tags: list[str] = Field(default_factory=list)


class ObjectCountFilter(BaseModel):
    category: str = Field(min_length=1)
    operator: NumericOperator
    value: int = Field(ge=0)


class BoundingBoxFilter(BaseModel):
    operator: NumericOperator
    value: float = Field(ge=0, le=1)


class BoundingBoxFilters(BaseModel):
    width: BoundingBoxFilter | None = None
    height: BoundingBoxFilter | None = None
    area: BoundingBoxFilter | None = None
    x_center: BoundingBoxFilter | None = Field(default=None, alias="xCenter")
    y_center: BoundingBoxFilter | None = Field(default=None, alias="yCenter")


class AnnotationFilters(BaseModel):
    categories: list[str] = Field(default_factory=list)
    object_counts: list[ObjectCountFilter] = Field(
        default_factory=list,
        alias="objectCounts",
    )
    bbox: BoundingBoxFilters = Field(default_factory=BoundingBoxFilters)


class SearchSort(BaseModel):
    field: SortField = "fileName"
    direction: SortDirection = "asc"


class SearchRequest(BaseModel):
    image_filters: ImageFilters = Field(default_factory=ImageFilters, alias="imageFilters")
    annotation_filters: AnnotationFilters = Field(
        default_factory=AnnotationFilters,
        alias="annotationFilters",
    )
    sort: SearchSort = Field(default_factory=SearchSort)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=24, ge=1, le=100, alias="pageSize")


class ImageMetadata(BaseModel):
    time_of_day: str | None = Field(alias="timeOfDay")
    weather: str | None
    installation_location: str | None = Field(alias="installationLocation")
    location: str | None
    tags: list[str]


class AnnotationSummary(BaseModel):
    category: str
    count: int


class SearchResultItem(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    file_name: str = Field(alias="fileName")
    image_url: str = Field(alias="imageUrl")
    metadata: ImageMetadata
    annotation_summary: list[AnnotationSummary] = Field(alias="annotationSummary")


class SearchResponse(BaseModel):
    total: int
    page: int
    page_size: int = Field(alias="pageSize")
    items: list[SearchResultItem]
