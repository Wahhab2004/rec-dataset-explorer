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
def search_database_url() -> Generator[str, None, None]:
    configured_url = make_url("postgresql+psycopg://postgres:postgres@localhost:5432/rec_dataset_explorer")
    database_name = f"rec_dataset_explorer_search_{uuid4().hex[:12]}"
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


@pytest.fixture(scope="module")
def search_context(search_database_url: str) -> Generator[UUID, None, None]:
    engine = create_engine(search_database_url)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)

    with SessionLocal() as session:
        dataset = Dataset(name="Search Test Dataset")
        classes = {
            name: DatasetClass(class_index=index, class_name=name)
            for index, name in enumerate(("person", "car", "bus", "truck"))
        }
        dataset.classes.extend(classes.values())

        def add_image(
            file_name: str,
            time_of_day: str,
            weather: str,
            installation_location: str,
            location: str,
            tags: list[str],
            rows: list[tuple[str, float, float, float, float]],
        ) -> None:
            image = Image(
                file_name=file_name,
                file_path=f"demo/search/images/{file_name}",
                time_of_day=time_of_day,
                weather=weather,
                installation_location=installation_location,
                location=location,
                tags=tags,
                dataset=dataset,
            )
            for class_name, x_center, y_center, width, height in rows:
                image.annotations.append(
                    Annotation(
                        dataset_class=classes[class_name],
                        x_center=x_center,
                        y_center=y_center,
                        width=width,
                        height=height,
                        area=width * height,
                    ),
                )

        add_image(
            "a-night-rain-front.jpg", "nighttime", "rainy", "front", "Taipei", ["urban"],
            [
                ("person", 0.15, 0.55, 0.10, 0.20),
                ("person", 0.35, 0.56, 0.20, 0.25),
                ("person", 0.55, 0.57, 0.30, 0.30),
                ("person", 0.75, 0.58, 0.40, 0.35),
                ("car", 0.25, 0.75, 0.20, 0.15),
                ("car", 0.65, 0.74, 0.25, 0.20),
            ],
        )
        add_image(
            "b-day-sunny-rear.jpg", "daytime", "sunny", "rear", "Hsinchu", ["highway"],
            [
                ("person", 0.20, 0.58, 0.08, 0.20),
                ("car", 0.30, 0.72, 0.20, 0.15),
                ("car", 0.55, 0.73, 0.18, 0.14),
                ("car", 0.80, 0.71, 0.22, 0.18),
            ],
        )
        add_image(
            "c-night-rain-side.jpg", "nighttime", "rainy", "side", "Taipei", ["highway"],
            [
                ("bus", 0.85, 0.65, 0.45, 0.40),
                ("car", 0.35, 0.75, 0.18, 0.14),
                ("car", 0.58, 0.74, 0.20, 0.16),
                ("car", 0.72, 0.73, 0.22, 0.18),
            ],
        )
        add_image(
            "d-day-cloudy-front.jpg", "daytime", "cloudy", "front", "Frankfurt", ["city-center"],
            [
                ("person", 0.25, 0.58, 0.10, 0.20),
                ("person", 0.45, 0.59, 0.12, 0.22),
                ("car", 0.70, 0.74, 0.24, 0.20),
            ],
        )
        add_image(
            "e-day-sunny-front.jpg", "daytime", "sunny", "front", "Taipei", ["intersection"],
            [
                ("person", 0.20, 0.58, 0.10, 0.20),
                ("person", 0.40, 0.59, 0.10, 0.22),
                ("bus", 0.82, 0.70, 0.35, 0.35),
                ("car", 0.55, 0.75, 0.20, 0.15),
                ("car", 0.68, 0.74, 0.18, 0.14),
            ],
        )
        add_image(
            "f-night-fog-rear.jpg", "nighttime", "foggy", "rear", "Hsinchu", ["highway"],
            [("truck", 0.88, 0.68, 0.50, 0.45)],
        )
        session.add(dataset)
        session.commit()
        dataset_id = dataset.id

    def override_get_db() -> Generator[Session, None, None]:
        with SessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield dataset_id
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture
def client(search_context: UUID) -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


def search(client: TestClient, dataset_id: UUID, payload: dict) -> dict:
    response = client.post(f"/api/v1/datasets/{dataset_id}/search", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


def test_no_filters_returns_all_images(client: TestClient, search_context: UUID) -> None:
    body = search(client, search_context, {})

    assert body["total"] == 6
    assert len(body["items"]) == 6
    assert body["items"][0]["fileName"] == "a-night-rain-front.jpg"
    assert body["items"][0]["annotationSummary"] == [
        {"category": "car", "count": 2},
        {"category": "person", "count": 4},
    ]


def test_image_level_filters(client: TestClient, search_context: UUID) -> None:
    assert search(client, search_context, {"imageFilters": {"timeOfDay": ["nighttime"]}})["total"] == 3
    assert search(client, search_context, {"imageFilters": {"weather": ["rainy"]}})["total"] == 2
    assert search(client, search_context, {"imageFilters": {"installationLocation": ["front"]}})["total"] == 3
    assert search(client, search_context, {"imageFilters": {"location": "Taipei"}})["total"] == 3
    assert search(client, search_context, {"imageFilters": {"tags": ["urban"]}})["total"] == 1


def test_category_filter(client: TestClient, search_context: UUID) -> None:
    body = search(
        client,
        search_context,
        {"annotationFilters": {"categories": ["person"]}},
    )

    assert body["total"] == 4


def test_object_count_filter(client: TestClient, search_context: UUID) -> None:
    body = search(
        client,
        search_context,
        {
            "annotationFilters": {
                "objectCounts": [{"category": "person", "operator": "gt", "value": 3}],
            },
        },
    )

    assert body["total"] == 1
    assert body["items"][0]["fileName"] == "a-night-rain-front.jpg"


def test_bbox_filters(client: TestClient, search_context: UUID) -> None:
    assert search(client, search_context, {"annotationFilters": {"bbox": {"width": {"operator": "gt", "value": 0.45}}}})["total"] == 1
    assert search(client, search_context, {"annotationFilters": {"bbox": {"height": {"operator": "gt", "value": 0.40}}}})["total"] == 1
    assert search(client, search_context, {"annotationFilters": {"bbox": {"area": {"operator": "gt", "value": 0.15}}}})["total"] == 2
    assert search(client, search_context, {"annotationFilters": {"bbox": {"xCenter": {"operator": "gt", "value": 0.87}}}})["total"] == 1
    assert search(client, search_context, {"annotationFilters": {"bbox": {"yCenter": {"operator": "lt", "value": 0.40}}}})["total"] == 0


def test_combined_filters(client: TestClient, search_context: UUID) -> None:
    body = search(
        client,
        search_context,
        {
            "imageFilters": {"timeOfDay": ["nighttime"], "weather": ["rainy"]},
            "annotationFilters": {
                "categories": ["person"],
                "objectCounts": [{"category": "person", "operator": "gt", "value": 3}],
                "bbox": {"width": {"operator": "gt", "value": 0.20}},
            },
        },
    )

    assert body["total"] == 1
    assert body["items"][0]["fileName"] == "a-night-rain-front.jpg"


def test_pagination_and_descending_sort(client: TestClient, search_context: UUID) -> None:
    body = search(
        client,
        search_context,
        {"page": 2, "pageSize": 2, "sort": {"field": "fileName", "direction": "desc"}},
    )

    assert body["total"] == 6
    assert body["page"] == 2
    assert body["pageSize"] == 2
    assert [item["fileName"] for item in body["items"]] == [
        "d-day-cloudy-front.jpg",
        "c-night-rain-side.jpg",
    ]


def test_invalid_filter_returns_422(client: TestClient, search_context: UUID) -> None:
    response = client.post(
        f"/api/v1/datasets/{search_context}/search",
        json={"page": 0},
    )

    assert response.status_code == 422
    assert "greater than or equal to 1" in response.text


def test_nonexistent_dataset_returns_404(client: TestClient) -> None:
    response = client.post(
        f"/api/v1/datasets/{uuid4()}/search",
        json={},
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "DATASET_NOT_FOUND"
