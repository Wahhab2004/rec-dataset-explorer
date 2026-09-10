from collections.abc import Generator
from uuid import uuid4

import psycopg
import pytest
from psycopg import sql
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.models.dataset import Dataset
from app.models.import_job import ImportJob


@pytest.fixture(scope="module")
def model_database_url() -> Generator[str, None, None]:
    configured_url = make_url("postgresql+psycopg://postgres:postgres@localhost:5432/rec_dataset_explorer")
    database_name = f"rec_dataset_explorer_import_{uuid4().hex[:12]}"
    admin_url = configured_url.set(drivername="postgresql", database="postgres")

    with psycopg.connect(admin_url.render_as_string(hide_password=False), autocommit=True) as connection:
        connection.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name)))

    test_url = configured_url.set(database=database_name).render_as_string(hide_password=False)
    try:
        yield test_url
    finally:
        with psycopg.connect(admin_url.render_as_string(hide_password=False), autocommit=True) as connection:
            connection.execute(
                sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(
                    sql.Identifier(database_name),
                ),
            )


@pytest.fixture
def db(model_database_url: str) -> Generator[Session, None, None]:
    engine = create_engine(model_database_url)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)
    with SessionLocal() as session:
        yield session
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_import_job_defaults_and_dataset_relationship(db: Session) -> None:
    dataset = Dataset(name="Imported Dataset")
    job = ImportJob(
        name="dataset.zip",
        source_file_name="dataset.zip",
        errors=[{"code": "MISSING_ANNOTATION"}],
        summary={"images": 12},
        dataset=dataset,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    assert job.dataset_id == dataset.id
    assert job.status == "pending"
    assert job.progress == 0
    assert job.annotation_format == "YOLO"
    assert job.errors == [{"code": "MISSING_ANNOTATION"}]
    assert job.summary == {"images": 12}


def test_import_job_allows_null_dataset_id(db: Session) -> None:
    job = ImportJob(name="pending-import")
    db.add(job)
    db.commit()

    assert job.dataset_id is None


def test_import_job_rejects_progress_outside_range(db: Session) -> None:
    db.add(ImportJob(name="invalid-import", progress=101))

    with pytest.raises(IntegrityError):
        db.commit()

    db.rollback()
