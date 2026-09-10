# REC Dataset Explorer API

FastAPI foundation for the REC Dataset Explorer backend.

## Requirements

- Python 3.12 or newer
- PostgreSQL with a database available for the configured application user

The backend uses synchronous SQLAlchemy sessions with the psycopg driver. Alembic manages database schema revisions. No application models or domain endpoints are included in this step.

## Virtual Environment

From the `backend/` directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

On macOS or Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

## Install Dependencies

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Configuration

Copy `.env.example` to `.env` and adjust values as needed:

```powershell
Copy-Item .env.example .env
```

No real credentials should be committed to the repository.

`DATABASE_URL` must use a SQLAlchemy PostgreSQL URL and reference an existing database. The development example is:

```text
postgresql+psycopg://postgres:postgres@localhost:5432/rec_dataset_explorer
```

## Database and Migrations

Start PostgreSQL, create the configured database if it does not already exist, and apply the available Alembic revisions from the `backend/` directory:

```bash
alembic upgrade head
```

To inspect the current revision and migration history:

```bash
alembic current
alembic history
```

Both the API and Alembic read the connection URL from `DATABASE_URL` through the application settings.

## Run Locally

From the `backend/` directory with the virtual environment activated:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

## Health Check

```text
GET http://localhost:8000/api/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "REC Dataset Explorer API",
  "database": "connected"
}
```

The health endpoint executes `SELECT 1` through the application database session. If PostgreSQL is unavailable, it responds with HTTP `503` without exposing connection details:

```json
{
  "status": "degraded",
  "service": "REC Dataset Explorer API",
  "database": "unavailable"
}
```

Swagger documentation is available at `http://localhost:8000/docs`.
