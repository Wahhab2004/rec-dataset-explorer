from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Float, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.dataset_class import DatasetClass
    from app.models.image import Image


class Annotation(Base):
    __tablename__ = "annotations"
    __table_args__ = (
        Index("ix_annotations_image_id", "image_id"),
        Index("ix_annotations_class_id", "class_id"),
        Index("ix_annotations_width", "width"),
        Index("ix_annotations_height", "height"),
        Index("ix_annotations_area", "area"),
        Index("ix_annotations_x_center", "x_center"),
        Index("ix_annotations_y_center", "y_center"),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    image_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("images.id", ondelete="CASCADE"),
        nullable=False,
    )
    class_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("dataset_classes.id", ondelete="CASCADE"),
        nullable=False,
    )
    x_center: Mapped[float] = mapped_column(Float, nullable=False)
    y_center: Mapped[float] = mapped_column(Float, nullable=False)
    width: Mapped[float] = mapped_column(Float, nullable=False)
    height: Mapped[float] = mapped_column(Float, nullable=False)
    area: Mapped[float] = mapped_column(Float, nullable=False)

    image: Mapped[Image] = relationship(back_populates="annotations")
    dataset_class: Mapped[DatasetClass] = relationship(
        back_populates="annotations",
    )
