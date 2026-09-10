from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.annotation import Annotation
    from app.models.dataset import Dataset


class DatasetClass(Base):
    __tablename__ = "dataset_classes"
    __table_args__ = (
        UniqueConstraint(
            "dataset_id",
            "class_index",
            name="uq_dataset_classes_dataset_id_class_index",
        ),
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
    class_index: Mapped[int] = mapped_column(Integer, nullable=False)
    class_name: Mapped[str] = mapped_column(String(255), nullable=False)

    dataset: Mapped[Dataset] = relationship(back_populates="classes")
    annotations: Mapped[list[Annotation]] = relationship(
        back_populates="dataset_class",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
