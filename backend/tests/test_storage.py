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
from app.models.dataset import Dataset
from app.models.image import Image
from app.services.storage_service import (
    StorageService,
    UnsafeStoragePathError,
    get_storage_service,
)


@pytest.fixture(scope="module")
def storage_context(tmp_path_factory: pytest.TempPathFactory) -> Generator[dict[str, object], None, None]:
    configured_url = make_url("postgresql+psycopg://postgres:postgres@localhost:5432/rec_dataset_explorer")
    database_name = f"rec_dataset_explorer_storage_{uuid4().hex[:12]}"
    admin_url = configured_url.set(drivername="postgresql", database="postgres")

    with psycopg.connect(admin_url.render_as_string(hide_password=False), autocommit=True) as connection:
        connection.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name)))

    database_url = configured_url.set(database=database_name).render_as_string(hide_password=False)
    engine = create_engine(database_url)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)
    storage = StorageService(tmp_path_factory.mktemp("storage"))

    with SessionLocal() as session:
        dataset = Dataset(name="Storage Test Dataset")
        image = Image(
            file_name="placeholder.jpg",
            file_path="demo/storage/images/placeholder.jpg",
            dataset=dataset,
        )
        session.add(dataset)
        session.commit()
        dataset_id = dataset.id
        image_id = image.id

    storage.create_dataset_directories(dataset_id)
    storage.image_path(dataset_id, "placeholder.jpg").write_bytes(b"demo-image")

    def override_get_db() -> Generator[Session, None, None]:
        with SessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_storage_service] = lambda: storage
    try:
        yield {
            "dataset_id": dataset_id,
            "image_id": image_id,
            "storage": storage,
        }
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
def client(storage_context: dict[str, object]) -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


def test_existing_image_file_returns_200(
    client: TestClient,
    storage_context: dict[str, object],
) -> None:
    response = client.get(
        f"/api/v1/datasets/{storage_context['dataset_id']}"
        "/files/images/placeholder.jpg"
    )

    assert response.status_code == 200
    assert response.content == b"demo-image"


def test_missing_image_file_returns_404(
    client: TestClient,
    storage_context: dict[str, object],
) -> None:
    response = client.get(
        f"/api/v1/datasets/{storage_context['dataset_id']}"
        "/files/images/missing.jpg"
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "IMAGE_FILE_NOT_FOUND"


def test_nonexistent_dataset_returns_404(client: TestClient) -> None:
    response = client.get(
        f"/api/v1/datasets/{uuid4()}/files/images/placeholder.jpg",
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "DATASET_NOT_FOUND"


def test_path_traversal_is_rejected(
    client: TestClient,
    storage_context: dict[str, object],
) -> None:
    storage = storage_context["storage"]
    assert isinstance(storage, StorageService)
    with pytest.raises(UnsafeStoragePathError):
        storage.image_path(storage_context["dataset_id"], "../../secret.txt")

    response = client.get(
        f"/api/v1/datasets/{storage_context['dataset_id']}"
        "/files/images/%2E%2E/%2E%2E/secret.txt"
    )

    assert response.status_code == 404
