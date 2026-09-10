from collections.abc import Generator
from uuid import uuid4

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


@pytest.fixture(scope="session")
def test_database_url() -> Generator[str, None, None]:
    configured_url = make_url("postgresql+psycopg://postgres:postgres@localhost:5432/rec_dataset_explorer")
    database_name = f"rec_dataset_explorer_test_{uuid4().hex[:12]}"
    admin_url = configured_url.set(drivername="postgresql", database="postgres")

    with psycopg.connect(admin_url.render_as_string(hide_password=False), autocommit=True) as connection:
        connection.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name)))

    test_url = configured_url.set(database=database_name)
    try:
        yield test_url.render_as_string(hide_password=False)
    finally:
        with psycopg.connect(admin_url.render_as_string(hide_password=False), autocommit=True) as connection:
            connection.execute(
                sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(
                    sql.Identifier(database_name),
                ),
            )


@pytest.fixture
def client(test_database_url: str) -> Generator[TestClient, None, None]:
    engine = create_engine(test_database_url, pool_pre_ping=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)

    def override_get_db() -> Generator[Session, None, None]:
        with SessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def seed_dataset(test_database_url: str) -> Dataset:
    engine = create_engine(test_database_url)
    SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)

    with SessionLocal() as session:
        dataset = Dataset(name="Test Dataset", description="Dataset for API tests")
        person = DatasetClass(class_index=0, class_name="person", dataset=dataset)
        car = DatasetClass(class_index=1, class_name="car", dataset=dataset)
        image = Image(
            file_name="image_001.jpg",
            file_path="images/image_001.jpg",
            time_of_day="nighttime",
            weather="rainy",
            installation_location="front",
            location="Taipei",
            tags=["urban"],
            dataset=dataset,
        )
        image_without_values = Image(
            file_name="image_002.jpg",
            file_path="images/image_002.jpg",
            dataset=dataset,
        )
        Annotation(
            image=image,
            dataset_class=person,
            x_center=0.5,
            y_center=0.5,
            width=0.2,
            height=0.3,
            area=0.06,
        )
        Annotation(
            image=image,
            dataset_class=car,
            x_center=0.3,
            y_center=0.4,
            width=0.1,
            height=0.2,
            area=0.02,
        )
        session.add_all([dataset, image_without_values])
        session.commit()
        dataset_id = dataset.id

    engine.dispose()
    return dataset_id


def test_list_datasets_returns_image_count(client: TestClient, test_database_url: str) -> None:
    dataset_id = seed_dataset(test_database_url)

    response = client.get("/api/v1/datasets")

    assert response.status_code == 200
    assert response.json()["items"] == [
        {
            "id": str(dataset_id),
            "name": "Test Dataset",
            "description": "Dataset for API tests",
            "imageCount": 2,
            "annotationFormat": "YOLO",
            "status": "ready",
            "createdAt": response.json()["items"][0]["createdAt"],
            "updatedAt": response.json()["items"][0]["updatedAt"],
        }
    ]


def test_dataset_detail_returns_available_filters(
    client: TestClient,
    test_database_url: str,
) -> None:
    dataset_id = seed_dataset(test_database_url)

    response = client.get(f"/api/v1/datasets/{dataset_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["imageCount"] == 2
    assert body["availableFilters"] == {
        "timeOfDay": ["nighttime"],
        "weather": ["rainy"],
        "installationLocations": ["front"],
        "categories": ["car", "person"],
    }


def test_nonexistent_dataset_returns_contract_error(client: TestClient) -> None:
    response = client.get(f"/api/v1/datasets/{uuid4()}")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "DATASET_NOT_FOUND",
            "message": "Dataset not found",
            "details": None,
        }
    }
