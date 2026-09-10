from __future__ import annotations

from pathlib import Path
from urllib.parse import quote
from uuid import UUID

from app.core.config import BACKEND_DIR, get_settings


class UnsafeStoragePathError(ValueError):
    """Raised when a requested path would escape the storage root."""


class StorageService:
    def __init__(self, storage_root: str | Path | None = None) -> None:
        configured_root = Path(storage_root or get_settings().storage_root)
        if not configured_root.is_absolute():
            configured_root = BACKEND_DIR / configured_root
        self.storage_root = configured_root.resolve()

    def safe_resolve(self, *parts: str | Path) -> Path:
        candidate_parts: list[str] = []
        for part in parts:
            path_part = Path(part)
            if path_part.is_absolute() or ".." in path_part.parts:
                raise UnsafeStoragePathError("Path escapes storage root")
            candidate_parts.extend(path_part.parts)

        candidate = (self.storage_root / Path(*candidate_parts)).resolve()
        try:
            candidate.relative_to(self.storage_root)
        except ValueError as error:
            raise UnsafeStoragePathError("Path escapes storage root") from error
        return candidate

    def dataset_directory(self, dataset_id: UUID | str) -> Path:
        return self.safe_resolve("datasets", str(dataset_id))

    def import_directory(self, import_id: UUID | str) -> Path:
        return self.safe_resolve("imports", str(import_id))

    def import_source_path(self, import_id: UUID | str) -> Path:
        return self.safe_resolve("imports", str(import_id), "source.zip")

    def export_directory(self, export_id: UUID | str) -> Path:
        return self.safe_resolve("exports", str(export_id))

    def export_archive_path(self, export_id: UUID | str) -> Path:
        return self.safe_resolve("exports", str(export_id), "dataset.zip")

    def image_path(self, dataset_id: UUID | str, file_name: str) -> Path:
        return self.safe_resolve("datasets", str(dataset_id), "images", file_name)

    def annotation_path(self, dataset_id: UUID | str, file_name: str) -> Path:
        return self.safe_resolve("datasets", str(dataset_id), "labels", file_name)

    def create_dataset_directories(self, dataset_id: UUID | str) -> Path:
        dataset_directory = self.dataset_directory(dataset_id)
        for directory_name in ("images", "labels", "metadata"):
            self.safe_resolve("datasets", str(dataset_id), directory_name).mkdir(
                parents=True,
                exist_ok=True,
            )
        return dataset_directory

    def file_exists(self, path: Path) -> bool:
        try:
            safe_path = self.safe_resolve(path.relative_to(self.storage_root))
        except (ValueError, UnsafeStoragePathError):
            return False
        return safe_path.is_file()

    def image_url(self, dataset_id: UUID | str, file_name: str) -> str:
        return (
            f"/api/v1/datasets/{quote(str(dataset_id), safe='')}"
            f"/files/images/{quote(file_name, safe='/')}"
        )


def get_storage_service() -> StorageService:
    return StorageService()
