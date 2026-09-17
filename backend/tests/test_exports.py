from __future__ import annotations

import io
import json
import zipfile
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
from app.services.storage_service import StorageService, get_storage_service


@pytest.fixture(scope="module")
def export_context(tmp_path_factory: pytest.TempPathFactory) -> Generator[dict[str, object], None, None]:
    configured_url = make_url("postgresql+psycopg://postgres:postgres@localhost:5432/rec_dataset_explorer")
    database_name = f"rec_dataset_explorer_export_{uuid4().hex[:12]}"
    admin_url = configured_url.set(drivername="postgresql", database="postgres")
    with psycopg.connect(admin_url.render_as_string(hide_password=False), autocommit=True) as connection:
        connection.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name)))
    engine = create_engine(configured_url.set(database=database_name).render_as_string(hide_password=False))
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)
    storage = StorageService(tmp_path_factory.mktemp("export-storage"))

    with SessionLocal() as session:
        dataset = Dataset(name="Export Dataset")
        person = DatasetClass(class_index=0, class_name="person", dataset=dataset)
        car = DatasetClass(class_index=2, class_name="car", dataset=dataset)
        image_one = Image(
            file_name="one.jpg", file_path="datasets/source/images/one.jpg", annotation_path="datasets/source/labels/one.txt",
            time_of_day="daytime", weather="sunny", installation_location="front", location="Taipei", tags=["urban"], dataset=dataset,
        )
        image_two = Image(
            file_name="two.jpg", file_path="datasets/source/images/two.jpg", annotation_path="datasets/source/labels/two.txt",
            time_of_day="nighttime", weather="rainy", installation_location="rear", location="Hsinchu", tags=["wet-road"], dataset=dataset,
        )
        other_dataset = Dataset(name="Other Export Dataset")
        other_class = DatasetClass(class_index=0, class_name="person", dataset=other_dataset)
        other_image = Image(
            file_name="other.jpg",
            file_path="datasets/other/images/other.jpg",
            annotation_path="datasets/other/labels/other.txt",
            dataset=other_dataset,
        )
        person_annotation = Annotation(image=image_one, dataset_class=person, x_center=.5, y_center=.5, width=.2, height=.3, area=.06)
        car_annotation = Annotation(image=image_one, dataset_class=car, x_center=.4, y_center=.6, width=.1, height=.2, area=.02)
        small_person_annotation = Annotation(image=image_one, dataset_class=person, x_center=.7, y_center=.3, width=.05, height=.1, area=.005)
        other_image_annotation = Annotation(image=image_two, dataset_class=person, x_center=.3, y_center=.4, width=.4, height=.4, area=.16)
        other_dataset_annotation = Annotation(
            image=other_image,
            dataset_class=other_class,
            x_center=.2,
            y_center=.2,
            width=.1,
            height=.1,
            area=.01,
        )
        session.add_all([dataset, other_dataset])
        session.commit()
        dataset_id, image_one_id, image_two_id = dataset.id, image_one.id, image_two.id
        annotation_ids = {
            "person": person_annotation.id,
            "car": car_annotation.id,
            "person_small": small_person_annotation.id,
            "other_image": other_image_annotation.id,
            "other_dataset": other_dataset_annotation.id,
        }

    storage.create_dataset_directories(dataset_id)
    storage.image_path(dataset_id, "one.jpg").write_bytes(b"one-image")
    storage.image_path(dataset_id, "two.jpg").write_bytes(b"two-image")
    storage.annotation_path(dataset_id, "one.txt").write_text(
        "0 0.500 0.500 0.200 0.300\n2 0.400 0.600 0.100 0.200\n0 0.700 0.300 0.050 0.100\n",
        encoding="utf-8",
    )

    def override_get_db() -> Generator[Session, None, None]:
        with SessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_storage_service] = lambda: storage
    try:
        yield {
            "dataset_id": dataset_id,
            "image_one_id": image_one_id,
            "image_two_id": image_two_id,
            "annotation_ids": annotation_ids,
            "source_label": storage.annotation_path(dataset_id, "one.txt"),
        }
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
        engine.dispose()
        with psycopg.connect(admin_url.render_as_string(hide_password=False), autocommit=True) as connection:
            connection.execute(sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(database_name)))


@pytest.fixture
def client(export_context: dict[str, object]) -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


def create_export(client: TestClient, dataset_id, payload: dict):
    response = client.post(f"/api/v1/datasets/{dataset_id}/exports", json=payload)
    assert response.status_code == 202, response.text
    export_id = response.json()["exportId"]
    status = client.get(f"/api/v1/exports/{export_id}")
    assert status.status_code == 200
    return export_id, status.json()


def get_zip(client: TestClient, export_id: str) -> zipfile.ZipFile:
    response = client.get(f"/api/v1/exports/{export_id}/download")
    assert response.status_code == 200
    return zipfile.ZipFile(io.BytesIO(response.content))


def test_explicit_selection_and_filtered_yolo(client: TestClient, export_context: dict[str, object]) -> None:
    export_id, status = create_export(client, export_context["dataset_id"], {
        "exportType": "images_and_annotations",
        "selection": {"mode": "explicit", "imageIds": [str(export_context["image_one_id"])]},
        "filters": {"annotationFilters": {"categories": ["person"], "bbox": {
            "width": {"operator": "gt", "value": .05},
            "height": {"operator": "gt", "value": .1},
            "area": {"operator": "gte", "value": .01},
        }}},
    })
    assert status["status"] == "completed"
    archive = get_zip(client, export_id)
    assert set(archive.namelist()) == {"images/one.jpg", "labels/one.txt"}
    assert archive.read("labels/one.txt").decode() == "0 0.500 0.500 0.200 0.300"


def test_all_filtered_image_filter(client: TestClient, export_context: dict[str, object]) -> None:
    export_id, _ = create_export(client, export_context["dataset_id"], {
        "exportType": "annotations_only",
        "selection": {"mode": "all_filtered"},
        "filters": {"imageFilters": {"timeOfDay": ["nighttime"]}},
    })
    assert set(get_zip(client, export_id).namelist()) == {"labels/two.txt"}


def test_no_annotation_filters_preserves_all_rows(client: TestClient, export_context: dict[str, object]) -> None:
    export_id, _ = create_export(client, export_context["dataset_id"], {
        "exportType": "annotations_only",
        "selection": {"mode": "explicit", "imageIds": [str(export_context["image_one_id"])]},
    })
    assert get_zip(client, export_id).read("labels/one.txt").decode().count("\n") == 2


def test_category_filter_exports_all_matching_annotations(
    client: TestClient,
    export_context: dict[str, object],
) -> None:
    source_before = export_context["source_label"].read_bytes()
    detail_before = client.get(
        f"/api/v1/datasets/{export_context['dataset_id']}"
        f"/images/{export_context['image_one_id']}",
    ).json()

    export_id, status = create_export(client, export_context["dataset_id"], {
        "exportType": "annotations_only",
        "selection": {"mode": "explicit", "imageIds": [str(export_context["image_one_id"])]},
        "filters": {"annotationFilters": {"categories": ["person"]}},
    })

    assert status["status"] == "completed"
    assert get_zip(client, export_id).read("labels/one.txt").decode() == (
        "0 0.500 0.500 0.200 0.300\n0 0.700 0.300 0.050 0.100"
    )
    assert export_context["source_label"].read_bytes() == source_before
    assert client.get(
        f"/api/v1/datasets/{export_context['dataset_id']}"
        f"/images/{export_context['image_one_id']}",
    ).json()["annotations"] == detail_before["annotations"]


def test_exclusion_is_applied_after_annotation_filtering(
    client: TestClient,
    export_context: dict[str, object],
) -> None:
    export_id, status = create_export(client, export_context["dataset_id"], {
        "exportType": "annotations_only",
        "selection": {"mode": "explicit", "imageIds": [str(export_context["image_one_id"])]},
        "filters": {"annotationFilters": {"categories": ["person"]}},
        "excludedAnnotationIds": [str(export_context["annotation_ids"]["person_small"])],
    })

    assert status["status"] == "completed"
    assert get_zip(client, export_id).read("labels/one.txt").decode() == "0 0.500 0.500 0.200 0.300"


def test_bbox_filter_writes_only_matching_annotation(
    client: TestClient,
    export_context: dict[str, object],
) -> None:
    export_id, _ = create_export(client, export_context["dataset_id"], {
        "exportType": "annotations_only",
        "selection": {"mode": "explicit", "imageIds": [str(export_context["image_one_id"])]},
        "filters": {"annotationFilters": {"bbox": {"area": {"operator": "gt", "value": 0.03}}}},
    })
    assert get_zip(client, export_id).read("labels/one.txt").decode() == "0 0.500 0.500 0.200 0.300"


def test_excluded_annotation_is_removed_and_source_data_is_unchanged(
    client: TestClient,
    export_context: dict[str, object],
) -> None:
    source_before = export_context["source_label"].read_bytes()
    detail_before = client.get(
        f"/api/v1/datasets/{export_context['dataset_id']}"
        f"/images/{export_context['image_one_id']}"
    ).json()

    export_id, status = create_export(client, export_context["dataset_id"], {
        "exportType": "annotations_only",
        "selection": {"mode": "explicit", "imageIds": [str(export_context["image_one_id"])]},
        "excludedAnnotationIds": [str(export_context["annotation_ids"]["person"])],
    })

    assert status["status"] == "completed"
    assert get_zip(client, export_id).read("labels/one.txt").decode() == (
        "2 0.400 0.600 0.100 0.200\n0 0.700 0.300 0.050 0.100"
    )
    assert export_context["source_label"].read_bytes() == source_before
    assert client.get(
        f"/api/v1/datasets/{export_context['dataset_id']}"
        f"/images/{export_context['image_one_id']}"
    ).json()["annotations"] == detail_before["annotations"]


def test_multiple_duplicate_exclusions_generate_empty_label(
    client: TestClient,
    export_context: dict[str, object],
) -> None:
    annotation_ids = export_context["annotation_ids"]
    export_id, status = create_export(client, export_context["dataset_id"], {
        "exportType": "annotations_only",
        "selection": {"mode": "explicit", "imageIds": [str(export_context["image_one_id"])]},
        "excludedAnnotationIds": [
            str(annotation_ids["person"]),
            str(annotation_ids["car"]),
            str(annotation_ids["person_small"]),
            str(annotation_ids["person"]),
        ],
    })

    assert status["status"] == "completed"
    assert get_zip(client, export_id).read("labels/one.txt").decode() == ""


def test_invalid_or_unselected_annotation_exclusion_fails_export(
    client: TestClient,
    export_context: dict[str, object],
) -> None:
    for annotation_id in (
        uuid4(),
        export_context["annotation_ids"]["other_image"],
        export_context["annotation_ids"]["other_dataset"],
    ):
        response = client.post(f"/api/v1/datasets/{export_context['dataset_id']}/exports", json={
            "exportType": "annotations_only",
            "selection": {"mode": "explicit", "imageIds": [str(export_context["image_one_id"])]},
            "excludedAnnotationIds": [str(annotation_id)],
        })
        assert response.status_code == 202
        status = client.get(f"/api/v1/exports/{response.json()['exportId']}" ).json()
        assert status["status"] == "failed"
        assert status["error"]["code"] == "INVALID_ANNOTATION_ID"


def test_complete_package_metadata_and_download_errors(client: TestClient, export_context: dict[str, object]) -> None:
    export_id, status = create_export(client, export_context["dataset_id"], {
        "exportType": "complete_dataset",
        "selection": {"mode": "all_filtered"},
    })
    archive = get_zip(client, export_id)
    names = set(archive.namelist())
    assert names == {"images/one.jpg", "images/two.jpg", "labels/one.txt", "labels/two.txt", "metadata/metadata.json"}
    metadata = json.loads(archive.read("metadata/metadata.json"))
    assert len(metadata["classes"]) == 2
    assert len(metadata["images"]) == 2


def test_invalid_image_id_and_empty_result(client: TestClient, export_context: dict[str, object]) -> None:
    response = client.post(f"/api/v1/datasets/{export_context['dataset_id']}/exports", json={
        "exportType": "images_and_annotations",
        "selection": {"mode": "explicit", "imageIds": [str(uuid4())]},
    })
    export_id = response.json()["exportId"]
    assert client.get(f"/api/v1/exports/{export_id}").json()["status"] == "failed"

    response = client.post(f"/api/v1/datasets/{export_context['dataset_id']}/exports", json={
        "exportType": "images_and_annotations",
        "selection": {"mode": "all_filtered"},
        "filters": {"imageFilters": {"location": "Unknown"}},
    })
    assert response.status_code == 202
    assert client.get(f"/api/v1/exports/{response.json()['exportId']}").json()["status"] == "failed"


def test_missing_export_job_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/v1/exports/{uuid4()}")
    assert response.status_code == 404
