from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.annotation import Annotation
from app.models.dataset import Dataset
from app.models.dataset_class import DatasetClass
from app.models.image import Image


@dataclass(frozen=True)
class AnnotationSeed:
    class_name: str
    x_center: float
    y_center: float
    width: float
    height: float


@dataclass(frozen=True)
class ImageSeed:
    file_name: str
    time_of_day: str
    weather: str
    installation_location: str
    location: str
    tags: tuple[str, ...]
    annotations: tuple[AnnotationSeed, ...]


@dataclass(frozen=True)
class DatasetSeed:
    name: str
    description: str
    slug: str
    classes: tuple[tuple[int, str], ...]
    images: tuple[ImageSeed, ...]


def annotation(
    class_name: str,
    x_center: float,
    y_center: float,
    width: float,
    height: float,
) -> AnnotationSeed:
    return AnnotationSeed(class_name, x_center, y_center, width, height)


def image(
    file_name: str,
    time_of_day: str,
    weather: str,
    installation_location: str,
    location: str,
    tags: tuple[str, ...],
    annotations: tuple[AnnotationSeed, ...],
) -> ImageSeed:
    return ImageSeed(
        file_name,
        time_of_day,
        weather,
        installation_location,
        location,
        tags,
        annotations,
    )


DEMO_DATASETS: tuple[DatasetSeed, ...] = (
    DatasetSeed(
        name="BDD100K Demo",
        description="Development demo records representing a BDD100K-style dataset.",
        slug="bdd100k",
        classes=((0, "person"), (1, "bicycle"), (2, "car"), (3, "truck"), (4, "bus")),
        images=(
            image(
                "image_000001.jpg", "daytime", "sunny", "front", "Taipei",
                ("urban", "intersection"),
                (
                    annotation("person", 0.18, 0.55, 0.08, 0.22),
                    annotation("person", 0.34, 0.58, 0.06, 0.18),
                    annotation("person", 0.52, 0.56, 0.07, 0.2),
                    annotation("person", 0.71, 0.57, 0.05, 0.16),
                    annotation("car", 0.28, 0.76, 0.24, 0.16),
                    annotation("car", 0.68, 0.74, 0.2, 0.14),
                ),
            ),
            image(
                "image_000002.jpg", "nighttime", "rainy", "front", "Taipei",
                ("urban", "wet-road"),
                (
                    annotation("person", 0.24, 0.58, 0.07, 0.19),
                    annotation("person", 0.43, 0.6, 0.06, 0.17),
                    annotation("car", 0.2, 0.75, 0.3, 0.2),
                    annotation("car", 0.62, 0.73, 0.25, 0.18),
                    annotation("bus", 0.84, 0.68, 0.22, 0.3),
                ),
            ),
            image(
                "image_000003.jpg", "daytime", "cloudy", "rear", "Hsinchu",
                ("highway", "dense-traffic"),
                (
                    annotation("car", 0.2, 0.7, 0.18, 0.12),
                    annotation("car", 0.42, 0.68, 0.26, 0.18),
                    annotation("car", 0.72, 0.69, 0.2, 0.14),
                    annotation("truck", 0.88, 0.65, 0.2, 0.25),
                ),
            ),
            image(
                "image_000004.jpg", "nighttime", "foggy", "side", "Hsinchu",
                ("highway", "low-visibility"),
                (
                    annotation("bicycle", 0.22, 0.72, 0.12, 0.16),
                    annotation("person", 0.22, 0.56, 0.07, 0.2),
                    annotation("truck", 0.66, 0.68, 0.35, 0.28),
                ),
            ),
            image(
                "image_000005.jpg", "daytime", "sunny", "front", "Taipei",
                ("urban", "pedestrian"),
                (
                    annotation("person", 0.16, 0.58, 0.08, 0.24),
                    annotation("person", 0.31, 0.59, 0.06, 0.2),
                    annotation("person", 0.47, 0.57, 0.07, 0.21),
                    annotation("bicycle", 0.5, 0.75, 0.18, 0.16),
                    annotation("car", 0.82, 0.74, 0.22, 0.15),
                ),
            ),
            image(
                "image_000006.jpg", "nighttime", "rainy", "rear", "Hsinchu",
                ("wet-road", "intersection"),
                (
                    annotation("car", 0.28, 0.76, 0.28, 0.2),
                    annotation("car", 0.63, 0.75, 0.24, 0.18),
                    annotation("bus", 0.84, 0.66, 0.26, 0.34),
                ),
            ),
        ),
    ),
    DatasetSeed(
        name="REC Front Camera Dataset",
        description="Development demo records for REC front-camera validation runs.",
        slug="rec-front-camera",
        classes=((0, "person"), (2, "car"), (3, "truck"), (5, "rider")),
        images=(
            image(
                "rec_front_000001.jpg", "daytime", "sunny", "front", "Taipei",
                ("urban", "intersection"),
                (
                    annotation("person", 0.2, 0.56, 0.08, 0.22),
                    annotation("person", 0.36, 0.58, 0.06, 0.18),
                    annotation("car", 0.24, 0.75, 0.25, 0.17),
                    annotation("car", 0.68, 0.74, 0.2, 0.14),
                ),
            ),
            image(
                "rec_front_000002.jpg", "nighttime", "rainy", "front", "Taipei",
                ("wet-road", "urban"),
                (
                    annotation("person", 0.18, 0.57, 0.07, 0.2),
                    annotation("person", 0.34, 0.59, 0.06, 0.18),
                    annotation("person", 0.51, 0.58, 0.05, 0.16),
                    annotation("car", 0.7, 0.74, 0.3, 0.2),
                ),
            ),
            image(
                "rec_front_000003.jpg", "daytime", "cloudy", "front", "Hsinchu",
                ("highway", "dense-traffic"),
                (
                    annotation("truck", 0.24, 0.67, 0.34, 0.28),
                    annotation("car", 0.65, 0.72, 0.22, 0.15),
                    annotation("car", 0.84, 0.73, 0.16, 0.12),
                ),
            ),
            image(
                "rec_front_000004.jpg", "nighttime", "foggy", "front", "Hsinchu",
                ("highway", "low-visibility"),
                (
                    annotation("rider", 0.26, 0.58, 0.1, 0.22),
                    annotation("person", 0.26, 0.76, 0.18, 0.1),
                    annotation("car", 0.72, 0.73, 0.28, 0.18),
                ),
            ),
            image(
                "rec_front_000005.jpg", "daytime", "sunny", "front", "Taipei",
                ("urban", "pedestrian"),
                (
                    annotation("person", 0.16, 0.57, 0.08, 0.24),
                    annotation("person", 0.31, 0.58, 0.07, 0.2),
                    annotation("person", 0.46, 0.59, 0.06, 0.18),
                    annotation("person", 0.62, 0.58, 0.05, 0.16),
                    annotation("car", 0.84, 0.74, 0.2, 0.14),
                ),
            ),
            image(
                "rec_front_000006.jpg", "daytime", "cloudy", "front", "Hsinchu",
                ("highway", "dense-traffic"),
                (
                    annotation("truck", 0.27, 0.67, 0.4, 0.3),
                    annotation("truck", 0.72, 0.68, 0.28, 0.24),
                    annotation("person", 0.09, 0.58, 0.06, 0.18),
                ),
            ),
        ),
    ),
    DatasetSeed(
        name="Cityscapes Subset",
        description="Development demo records representing a Cityscapes-style subset.",
        slug="cityscapes",
        classes=((0, "person"), (1, "bicycle"), (2, "car"), (4, "bus"), (5, "rider")),
        images=(
            image(
                "frankfurt_000001.jpg", "daytime", "cloudy", "front", "Frankfurt",
                ("city-center", "urban"),
                (
                    annotation("person", 0.14, 0.57, 0.07, 0.2),
                    annotation("person", 0.28, 0.58, 0.06, 0.18),
                    annotation("person", 0.44, 0.59, 0.05, 0.16),
                    annotation("person", 0.6, 0.58, 0.06, 0.19),
                    annotation("person", 0.75, 0.59, 0.05, 0.17),
                    annotation("person", 0.88, 0.58, 0.04, 0.15),
                    annotation("car", 0.38, 0.75, 0.25, 0.17),
                    annotation("bicycle", 0.76, 0.75, 0.16, 0.14),
                ),
            ),
            image(
                "munster_000002.jpg", "daytime", "sunny", "front", "Frankfurt",
                ("city-center", "pedestrian"),
                (
                    annotation("person", 0.24, 0.58, 0.08, 0.23),
                    annotation("bicycle", 0.26, 0.75, 0.2, 0.16),
                    annotation("car", 0.68, 0.74, 0.28, 0.18),
                    annotation("bus", 0.9, 0.65, 0.18, 0.3),
                ),
            ),
            image(
                "lindau_000003.jpg", "daytime", "sunny", "side", "Frankfurt",
                ("urban", "intersection"),
                (
                    annotation("rider", 0.22, 0.58, 0.1, 0.22),
                    annotation("bicycle", 0.22, 0.75, 0.18, 0.14),
                    annotation("car", 0.62, 0.73, 0.3, 0.2),
                ),
            ),
            image(
                "stuttgart_000004.jpg", "daytime", "foggy", "front", "Frankfurt",
                ("city-center", "low-visibility"),
                (
                    annotation("person", 0.2, 0.58, 0.06, 0.19),
                    annotation("person", 0.42, 0.57, 0.07, 0.2),
                    annotation("car", 0.28, 0.74, 0.25, 0.17),
                    annotation("car", 0.68, 0.73, 0.22, 0.15),
                ),
            ),
            image(
                "hamburg_000005.jpg", "daytime", "rainy", "rear", "Frankfurt",
                ("wet-road", "dense-traffic"),
                (
                    annotation("car", 0.2, 0.74, 0.22, 0.16),
                    annotation("car", 0.48, 0.72, 0.3, 0.2),
                    annotation("bus", 0.82, 0.66, 0.25, 0.32),
                    annotation("person", 0.1, 0.58, 0.05, 0.16),
                ),
            ),
            image(
                "berlin_000006.jpg", "daytime", "cloudy", "front", "Frankfurt",
                ("city-center", "pedestrian"),
                (
                    annotation("person", 0.18, 0.57, 0.07, 0.21),
                    annotation("person", 0.34, 0.59, 0.06, 0.18),
                    annotation("bicycle", 0.35, 0.75, 0.18, 0.14),
                    annotation("rider", 0.64, 0.58, 0.09, 0.2),
                    annotation("car", 0.84, 0.73, 0.2, 0.15),
                ),
            ),
        ),
    ),
)


def seed_dataset(session: Session, definition: DatasetSeed) -> tuple[int, int]:
    dataset = Dataset(
        name=definition.name,
        description=definition.description,
        annotation_format="YOLO",
        status="ready",
    )
    dataset_classes = {
        class_name: DatasetClass(class_index=class_index, class_name=class_name)
        for class_index, class_name in definition.classes
    }
    dataset.classes.extend(dataset_classes.values())

    for image_seed in definition.images:
        image_record = Image(
            file_name=image_seed.file_name,
            file_path=f"demo/{definition.slug}/images/{image_seed.file_name}",
            annotation_path=f"demo/{definition.slug}/labels/{image_seed.file_name.rsplit('.', 1)[0]}.txt",
            time_of_day=image_seed.time_of_day,
            weather=image_seed.weather,
            installation_location=image_seed.installation_location,
            location=image_seed.location,
            tags=list(image_seed.tags),
        )
        for annotation_seed in image_seed.annotations:
            image_record.annotations.append(
                Annotation(
                    dataset_class=dataset_classes[annotation_seed.class_name],
                    x_center=annotation_seed.x_center,
                    y_center=annotation_seed.y_center,
                    width=annotation_seed.width,
                    height=annotation_seed.height,
                    area=annotation_seed.width * annotation_seed.height,
                ),
            )
        dataset.images.append(image_record)

    session.add(dataset)
    return len(definition.images), sum(
        len(image_seed.annotations) for image_seed in definition.images
    )


def remove_existing_demo_datasets(session: Session) -> None:
    demo_names = [definition.name for definition in DEMO_DATASETS]
    existing_datasets = session.scalars(
        select(Dataset).where(Dataset.name.in_(demo_names)),
    ).all()
    for dataset in existing_datasets:
        session.delete(dataset)
    session.flush()


def seed_demo() -> tuple[int, int]:
    total_images = 0
    total_annotations = 0
    with SessionLocal() as session:
        remove_existing_demo_datasets(session)
        for definition in DEMO_DATASETS:
            image_count, annotation_count = seed_dataset(session, definition)
            total_images += image_count
            total_annotations += annotation_count
        session.commit()
    return total_images, total_annotations


def main() -> None:
    image_count, annotation_count = seed_demo()
    print(
        f"Seeded {len(DEMO_DATASETS)} demo datasets, "
        f"{image_count} images, and {annotation_count} annotations.",
    )


if __name__ == "__main__":
    main()
