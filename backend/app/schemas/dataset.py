from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DatasetListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    name: str
    description: str | None
    image_count: int = Field(alias="imageCount")
    annotation_format: str = Field(alias="annotationFormat")
    status: str
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class DatasetListResponse(BaseModel):
    items: list[DatasetListItem]


class AvailableFilters(BaseModel):
    time_of_day: list[str] = Field(default_factory=list, alias="timeOfDay")
    weather: list[str] = Field(default_factory=list)
    installation_locations: list[str] = Field(
        default_factory=list,
        alias="installationLocations",
    )
    categories: list[str] = Field(default_factory=list)


class DatasetDetail(DatasetListItem):
    available_filters: AvailableFilters = Field(alias="availableFilters")
