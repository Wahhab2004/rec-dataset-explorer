from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.datasets import router as datasets_router
from app.api.routes.dataset_imports import router as dataset_imports_router
from app.api.routes.exports import router as exports_router
from app.api.routes.health import router as health_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix=settings.api_v1_prefix)
app.include_router(datasets_router, prefix=settings.api_v1_prefix)
app.include_router(dataset_imports_router, prefix=settings.api_v1_prefix)
app.include_router(exports_router, prefix=settings.api_v1_prefix)
