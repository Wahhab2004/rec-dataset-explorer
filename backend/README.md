# REC Dataset Explorer API

FastAPI foundation for the REC Dataset Explorer backend.

## Requirements

- Python 3.12 or newer
- PostgreSQL is not required for this foundation step

The dependency list includes the planned FastAPI, Uvicorn, Pydantic, settings, SQLAlchemy, Alembic, and psycopg stack. Database connections and models are intentionally not implemented yet.

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
  "service": "REC Dataset Explorer API"
}
```

Swagger documentation is available at `http://localhost:8000/docs`.
