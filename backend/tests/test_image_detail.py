from collections.abc import Generator
from uuid import UUID, uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg import sql
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.annotation import Annotation
from app.models.dataset import Dataset
from app.models.dataset_class import DatasetClass
from app.models.image import Image


@pytest.fixture(scope="module")
def image_detail_context() -> Generator[dict[str, object], None, None]:
    configured_url = make_url("postgresql+psycopg://postgres:postgres@localhost:5432/rec_dataset_explorer")
    database_name = f"rec_dataset_explorer_image_{uuid4().hex[:12]}"
    admin_url = configured_url.set(drivername="postgresql", database="postgres")

    with psycopg.connect(admin_url.render_as_string(hide_password=False), autocommit=True) as connection:
        connection.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name)))

    database_url = configured_url.set(database=database_name).render_as_string(hide_password=False)
    engine = create_engine(database_url)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)

    with SessionLocal() as session:
        dataset = Dataset(name="Image Detail Dataset")
        other_dataset = Dataset(name="Other Dataset")
        person = DatasetClass(class_index=0, class_name="person")
        car = DatasetClass(class_index=2, class_name="car")
        dataset.classes.extend([person, car])
        other_dataset.classes.append(
            DatasetClass(class_index=0, class_name="person"),
        )

        image = Image(
            file_name="image_000123.jpg",
            file_path="demo/detail/images/image_000123.jpg",
            annotation_path="demo/detail/labels/image_000123.txt",
            time_of_day="nighttime",
            weather="rainy",
            installation_location="front",
            location="Taipei",
            tags=["urban"],
            dataset=dataset,
        )
        person_annotation = Annotation(
            image=image,
            dataset_class=person,
            x_center=0.512,
            y_center=0.431,
            width=0.120,
            height=0.350,
            area=0.120 * 0.350,
        )
        car_annotation = Annotation(
            image=image,
            dataset_class=car,
            x_center=0.245,
            y_center=0.512,
            width=0.100,
            height=0.300,
            area=0.100 * 0.300,
        )
        other_image = Image(
            file_name="other.jpg",
            file_path="demo/other/images/other.jpg",
            annotation_path="demo/other/labels/other.txt",
            dataset=other_dataset,
        )
        session.add_all([dataset, other_dataset, image, other_image])
        session.flush()
        session.commit()

        annotations_by_id = sorted(
            [person_annotation, car_annotation],
            key=lambda annotation_row: str(annotation_row.id),
        )
        class_index_by_id = {person.id: 0, car.id: 2}
        expected_content = "\n".join(
            f"{class_index_by_id[annotation_row.class_id]} "
            f"{annotation_row.x_center:.3f} "
            f"{annotation_row.y_center:.3f} "
            f"{annotation_row.width:.3f} "
            f"{annotation_row.height:.3f}"
            for annotation_row in annotations_by_id
        )
        context = {
            "dataset_id": dataset.id,
            "other_dataset_id": other_dataset.id,
            "image_id": image.id,
            "other_image_id": other_image.id,
            "expected_content": expected_content,
        }

    def override_get_db() -> Generator[Session, None, None]:
        with SessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield context
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
        engine.dispose()
        with psycopg.connect(admin_url.render_as_string(hide_password=False), autocommit=True) as connection:
            connection.execute(
                sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(
                    sql.Identifier(database_name),
                ),
            )


@pytest.fixture
def client(image_detail_context: dict[str, object]) -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


def test_image_detail_returns_metadata_summary_and_yolo_content(
    client: TestClient,
    image_detail_context: dict[str, object],
) -> None:
    response = client.get(
        f"/api/v1/datasets/{image_detail_context['dataset_id']}"
        f"/images/{image_detail_context['image_id']}"
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": str(image_detail_context["image_id"]),
        "fileName": "image_000123.jpg",
        "imageUrl": (
            f"/api/v1/datasets/{image_detail_context['dataset_id']}"
            "/files/images/image_000123.jpg"
        ),
        "metadata": {
            "timeOfDay": "nighttime",
            "weather": "rainy",
            "installationLocation": "front",
            "location": "Taipei",
            "tags": ["urban"],
        },
        "annotationSummary": [
            {"category": "person", "count": 1},
            {"category": "car", "count": 1},
        ],
        "annotationFile": {
            "fileName": "image_000123.txt",
            "content": image_detail_context["expected_content"],
        },
    }


def test_nonexistent_dataset_returns_404(
    client: TestClient,
    image_detail_context: dict[str, object],
) -> None:
    response = client.get(f"/api/v1/datasets/{uuid4()}/images/{image_detail_context['image_id']}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "DATASET_NOT_FOUND"


def test_nonexistent_image_returns_404(
    client: TestClient,
    image_detail_context: dict[str, object],
) -> None:
    response = client.get(f"/api/v1/datasets/{image_detail_context['dataset_id']}/images/{uuid4()}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "IMAGE_NOT_FOUND"


def test_image_from_another_dataset_returns_404(
    client: TestClient,
    image_detail_context: dict[str, object],
) -> None:
    response = client.get(
        f"/api/v1/datasets/{image_detail_context['dataset_id']}"
        f"/images/{image_detail_context['other_image_id']}"
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "IMAGE_NOT_FOUND"
