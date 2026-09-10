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
from app.services.storage_service import StorageService, get_storage_service


@pytest.fixture(scope="module")
def import_context() -> Generator[None, None, None]:
    configured_url = make_url("postgresql+psycopg://postgres:postgres@localhost:5432/rec_dataset_explorer")
    database_name = f"rec_dataset_explorer_import_api_{uuid4().hex[:12]}"
    admin_url = configured_url.set(drivername="postgresql", database="postgres")
    with psycopg.connect(admin_url.render_as_string(hide_password=False), autocommit=True) as connection:
        connection.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name)))
    test_url = configured_url.set(database=database_name).render_as_string(hide_password=False)
    engine = create_engine(test_url)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)
    storage = StorageService()

    def override_get_db() -> Generator[Session, None, None]:
        with SessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_storage_service] = lambda: storage
    try:
        yield
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
        engine.dispose()
        with psycopg.connect(admin_url.render_as_string(hide_password=False), autocommit=True) as connection:
            connection.execute(sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(database_name)))


@pytest.fixture
def client(import_context: None) -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


def make_zip(files: dict[str, str | bytes]) -> io.BytesIO:
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as archive:
        for name, content in files.items():
            archive.writestr(name, content)
    stream.seek(0)
    return stream


def valid_files() -> dict[str, str | bytes]:
    return {
        "images/image_000001.jpg": b"jpeg-demo",
        "labels/image_000001.txt": "0 0.5 0.5 0.2 0.3\n",
        "metadata/metadata.json": json.dumps({
            "classes": [{"index": 0, "name": "person"}],
            "images": [{"fileName": "image_000001.jpg", "tags": ["urban"]}],
        }),
    }


def upload(client: TestClient, files: dict[str, str | bytes]):
    stream = make_zip(files)
    return client.post(
        "/api/v1/dataset-imports",
        data={"name": "Uploaded Demo", "annotationFormat": "YOLO"},
        files={"file": ("dataset.zip", stream, "application/zip")},
    )


def get_status(client: TestClient, response):
    import_id = response.json()["importId"]
    return client.get(f"/api/v1/dataset-imports/{import_id}")


def test_valid_structured_zip_is_validated(client: TestClient) -> None:
    response = upload(client, valid_files())
    assert response.status_code == 202
    status = get_status(client, response)
    assert status.status_code == 200
    assert status.json()["status"] == "processing"
    assert status.json()["stage"] == "validated"
    assert status.json()["summary"]["images"] == 1


def test_invalid_zip_is_reported(client: TestClient) -> None:
    response = upload(client, {"not-a-dataset.txt": "invalid"})
    assert response.status_code == 202
    status = get_status(client, response)
    assert status.json()["status"] == "failed"
    assert any(error["code"] == "INVALID_STRUCTURE" for error in status.json()["errors"])


@pytest.mark.parametrize(
    ("files", "code"),
    [
        ({"labels/image_000001.txt": "0 0.5 0.5 0.2 0.3", "metadata/metadata.json": "{}"}, "INVALID_STRUCTURE"),
        ({"images/image_000001.jpg": b"x", "metadata/metadata.json": "{}"}, "INVALID_STRUCTURE"),
        ({"images/image_000001.jpg": b"x", "labels/image_000001.txt": "0 0.5 0.5 0.2 0.3"}, "INVALID_STRUCTURE"),
        ({**valid_files(), "labels/other.txt": "0 0.5 0.5 0.2 0.3"}, "UNMATCHED_ANNOTATION"),
        ({"images/image_000001.jpg": b"x", "labels/image_000001.txt": "0 0.5 0.5 0.2 0.3", "metadata/metadata.json": json.dumps({"classes": [{"index": 0, "name": "person"}], "images": []})}, "MISSING_IMAGE_METADATA"),
        ({"images/image_000001.jpg": b"x", "labels/image_000001.txt": "9 0.5 0.5 0.2 0.3", "metadata/metadata.json": json.dumps({"classes": [{"index": 0, "name": "person"}], "images": [{"fileName": "image_000001.jpg"}]})}, "UNKNOWN_CLASS_INDEX"),
        ({"images/image_000001.jpg": b"x", "labels/image_000001.txt": "0 0.5 0.5", "metadata/metadata.json": json.dumps({"classes": [{"index": 0, "name": "person"}], "images": [{"fileName": "image_000001.jpg"}]})}, "INVALID_YOLO_ROW"),
        ({"images/image_000001.jpg": b"x", "labels/image_000001.txt": "0 1.2 0.5 0.2 0.3", "metadata/metadata.json": json.dumps({"classes": [{"index": 0, "name": "person"}], "images": [{"fileName": "image_000001.jpg"}]})}, "INVALID_BBOX_VALUE"),
        ({"images/a/image.jpg": b"x", "images/b/image.jpg": b"x", "labels/image.txt": "", "metadata/metadata.json": json.dumps({"classes": [], "images": [{"fileName": "image.jpg"}]})}, "DUPLICATE_IMAGE"),
    ],
)
def test_validation_errors(client: TestClient, files: dict[str, str | bytes], code: str) -> None:
    response = upload(client, files)
    assert response.status_code == 202
    status = get_status(client, response)
    assert status.json()["status"] == "failed"
    assert any(error["code"] == code for error in status.json()["errors"])


def test_zip_slip_is_rejected(client: TestClient) -> None:
    response = upload(client, {"../escape.txt": "nope"})
    status = get_status(client, response)
    assert any(error["code"] == "UNSAFE_ARCHIVE_PATH" for error in status.json()["errors"])


def test_nonexistent_import_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/v1/dataset-imports/{uuid4()}")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "IMPORT_NOT_FOUND"
