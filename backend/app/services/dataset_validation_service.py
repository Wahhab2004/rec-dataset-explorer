from __future__ import annotations

import json
import math
import posixpath
import zipfile
from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Any

SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_ARCHIVE_ENTRIES = 10_000
MAX_EXTRACTED_BYTES = 1_000_000_000


@dataclass(frozen=True)
class ValidationError:
    code: str
    message: str
    file: str | None = None

    def as_dict(self) -> dict[str, str]:
        result = {"code": self.code, "message": self.message}
        if self.file is not None:
            result["file"] = self.file
        return result


@dataclass(frozen=True)
class ValidationResult:
    errors: list[dict[str, str]]
    image_count: int
    annotation_file_count: int


def validate_dataset_zip(archive_path: str) -> ValidationResult:
    errors: list[ValidationError] = []

    try:
        with zipfile.ZipFile(archive_path) as archive:
            infos = archive.infolist()
            if len(infos) > MAX_ARCHIVE_ENTRIES:
                return ValidationResult(
                    errors=[ValidationError("ARCHIVE_TOO_LARGE", f"Archive contains more than {MAX_ARCHIVE_ENTRIES} entries").as_dict()],
                    image_count=0,
                    annotation_file_count=0,
                )

            safe_infos: list[zipfile.ZipInfo] = []
            for info in infos:
                unsafe_error = _validate_archive_name(info.filename)
                if unsafe_error is not None:
                    errors.append(unsafe_error)
                else:
                    safe_infos.append(info)

            extracted_size = sum(info.file_size for info in safe_infos)
            if extracted_size > MAX_EXTRACTED_BYTES:
                errors.append(
                    ValidationError(
                        "ARCHIVE_TOO_LARGE",
                        f"Archive expands beyond {MAX_EXTRACTED_BYTES} bytes",
                    )
                )

            if errors:
                return ValidationResult(
                    errors=[error.as_dict() for error in errors],
                    image_count=0,
                    annotation_file_count=0,
                )

            names = [info.filename for info in safe_infos if not info.is_dir()]
            images = _files_in_directory(names, "images", SUPPORTED_IMAGE_EXTENSIONS)
            labels = _files_in_directory(names, "labels", {".txt"})

            if not any(name == "images" or name.startswith("images/") for name in names):
                errors.append(ValidationError("INVALID_STRUCTURE", "images/ is missing"))
            if not any(name == "labels" or name.startswith("labels/") for name in names):
                errors.append(ValidationError("INVALID_STRUCTURE", "labels/ is missing"))
            if "metadata/metadata.json" not in names:
                errors.append(
                    ValidationError(
                        "INVALID_STRUCTURE",
                        "metadata/metadata.json is missing",
                        "metadata/metadata.json",
                    )
                )

            duplicate_images = _duplicates(images)
            for file_name in duplicate_images:
                errors.append(
                    ValidationError("DUPLICATE_IMAGE", f"Duplicate image filename {file_name}", file_name)
                )

            image_by_basename = {PurePosixPath(name).stem: name for name in images}
            label_by_basename = {PurePosixPath(name).stem: name for name in labels}
            for basename, image_name in image_by_basename.items():
                if basename not in label_by_basename:
                    errors.append(
                        ValidationError(
                            "MISSING_ANNOTATION",
                            f"Image {PurePosixPath(image_name).name} has no matching annotation file",
                            PurePosixPath(image_name).name,
                        )
                    )
            for basename, label_name in label_by_basename.items():
                if basename not in image_by_basename:
                    errors.append(
                        ValidationError(
                            "UNMATCHED_ANNOTATION",
                            f"Annotation {PurePosixPath(label_name).name} has no matching image",
                            PurePosixPath(label_name).name,
                        )
                    )

            metadata: dict[str, Any] | None = None
            if "metadata/metadata.json" in names:
                try:
                    metadata = json.loads(archive.read("metadata/metadata.json"))
                except (UnicodeDecodeError, json.JSONDecodeError):
                    errors.append(
                        ValidationError(
                            "INVALID_METADATA",
                            "metadata/metadata.json contains invalid JSON",
                            "metadata/metadata.json",
                        )
                    )

            class_indexes: set[int] = set()
            metadata_images: dict[str, dict[str, Any]] = {}
            if metadata is not None:
                class_indexes, class_errors = _validate_metadata_classes(metadata)
                errors.extend(class_errors)
                metadata_images, image_errors = _validate_metadata_images(metadata)
                errors.extend(image_errors)

                for image_name in images:
                    file_name = PurePosixPath(image_name).name
                    if file_name not in metadata_images:
                        errors.append(
                            ValidationError(
                                "MISSING_IMAGE_METADATA",
                                f"Image {file_name} has no metadata entry",
                                file_name,
                            )
                        )

            for image_name in images:
                basename = PurePosixPath(image_name).stem
                label_name = label_by_basename.get(basename)
                if label_name is None:
                    continue
                errors.extend(
                    _validate_label_file(
                        archive,
                        label_name,
                        class_indexes,
                    )
                )
    except (zipfile.BadZipFile, OSError, ValueError):
        errors.append(ValidationError("INVALID_ZIP", "Uploaded file is not a readable ZIP archive"))

    return ValidationResult(
        errors=[error.as_dict() for error in errors],
        image_count=len(images) if "images" in locals() else 0,
        annotation_file_count=len(labels) if "labels" in locals() else 0,
    )


def _validate_archive_name(name: str) -> ValidationError | None:
    normalized = name.replace("\\", "/")
    path = PurePosixPath(normalized)
    if normalized.startswith("/") or path.is_absolute() or ".." in path.parts:
        return ValidationError("UNSAFE_ARCHIVE_PATH", f"Unsafe archive path: {name}", name)
    if "\\" in name:
        return ValidationError("UNSAFE_ARCHIVE_PATH", f"Unsafe archive path: {name}", name)
    return None


def _files_in_directory(
    names: list[str],
    directory: str,
    extensions: set[str],
) -> list[str]:
    result = []
    for name in names:
        path = PurePosixPath(name)
        if len(path.parts) >= 2 and path.parts[0] == directory and path.suffix.lower() in extensions:
            result.append(name)
    return result


def _duplicates(paths: list[str]) -> set[str]:
    names = [PurePosixPath(path).name for path in paths]
    return {name for name in names if names.count(name) > 1}


def _validate_metadata_classes(metadata: dict[str, Any]) -> tuple[set[int], list[ValidationError]]:
    errors: list[ValidationError] = []
    classes = metadata.get("classes")
    if not isinstance(classes, list):
        return set(), [ValidationError("INVALID_METADATA", "metadata.classes must be an array", "metadata/metadata.json")]

    indexes: set[int] = set()
    for entry in classes:
        if not isinstance(entry, dict) or not isinstance(entry.get("index"), int):
            errors.append(ValidationError("INVALID_METADATA", "Each class must have an integer index", "metadata/metadata.json"))
            continue
        index = entry["index"]
        if index in indexes:
            errors.append(ValidationError("INVALID_METADATA", f"Duplicate class index {index}", "metadata/metadata.json"))
        indexes.add(index)
    return indexes, errors


def _validate_metadata_images(metadata: dict[str, Any]) -> tuple[dict[str, dict[str, Any]], list[ValidationError]]:
    errors: list[ValidationError] = []
    entries = metadata.get("images")
    if not isinstance(entries, list):
        return {}, [ValidationError("INVALID_METADATA", "metadata.images must be an array", "metadata/metadata.json")]

    result: dict[str, dict[str, Any]] = {}
    for entry in entries:
        file_name = entry.get("fileName") if isinstance(entry, dict) else None
        if not isinstance(file_name, str) or not file_name:
            errors.append(ValidationError("INVALID_METADATA", "Each image metadata entry needs fileName", "metadata/metadata.json"))
            continue
        if file_name in result:
            errors.append(ValidationError("DUPLICATE_IMAGE", f"Duplicate image filename {file_name}", file_name))
        if isinstance(entry, dict):
            result[file_name] = entry
    return result, errors


def _validate_label_file(
    archive: zipfile.ZipFile,
    label_name: str,
    class_indexes: set[int],
) -> list[ValidationError]:
    errors: list[ValidationError] = []
    try:
        content = archive.read(label_name).decode("utf-8")
    except (UnicodeDecodeError, KeyError):
        return [ValidationError("INVALID_YOLO_ROW", "Label file is not valid UTF-8", label_name)]

    for line_number, line in enumerate(content.splitlines(), start=1):
        values = line.split()
        if not values:
            continue
        if len(values) != 5:
            errors.append(ValidationError("INVALID_YOLO_ROW", f"YOLO row {line_number} must contain exactly 5 values", label_name))
            continue
        try:
            class_index = int(values[0])
            coordinates = [float(value) for value in values[1:]]
        except ValueError:
            errors.append(ValidationError("INVALID_YOLO_ROW", f"YOLO row {line_number} contains non-numeric values", label_name))
            continue
        if class_index not in class_indexes:
            errors.append(ValidationError("UNKNOWN_CLASS_INDEX", f"Class index {class_index} is not defined", label_name))
        if any(not math.isfinite(value) or value < 0 or value > 1 for value in coordinates):
            errors.append(ValidationError("INVALID_BBOX_VALUE", f"YOLO row {line_number} has non-normalized values", label_name))
    return errors
