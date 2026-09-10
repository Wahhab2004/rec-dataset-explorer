from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, Index, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.annotation import Annotation
    from app.models.dataset import Dataset


class Image(Base):
    __tablename__ = "images"
    __table_args__ = (
        UniqueConstraint(
            "dataset_id",
            "file_name",
            name="uq_images_dataset_id_file_name",
        ),
        Index("ix_images_dataset_id", "dataset_id"),
        Index("ix_images_time_of_day", "time_of_day"),
        Index("ix_images_weather", "weather"),
        Index("ix_images_installation_location", "installation_location"),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    dataset_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    annotation_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    time_of_day: Mapped[str | None] = mapped_column(String(32), nullable=True)
    weather: Mapped[str | None] = mapped_column(String(32), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    installation_location: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True,
    )
    tags: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default=text("'[]'::jsonb"),
    )
    extra_metadata: Mapped[dict[str, object] | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    dataset: Mapped[Dataset] = relationship(back_populates="images")
    annotations: Mapped[list[Annotation]] = relationship(
        back_populates="image",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
