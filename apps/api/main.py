from typing import Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from http_client import lifespan
from routers import auth, menu, qr

_docs_enabled = settings.api_enable_docs
app = FastAPI(
    title="Restaurant SaaS API",
    version="1.0.0",
    # Each of these needs its own path. They were all set to "/docs", so the
    # OpenAPI JSON route shadowed the Swagger UI route and /docs served raw JSON.
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    openapi_url="/openapi.json" if _docs_enabled else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(menu.router, prefix="/v1", tags=["menu"])
app.include_router(qr.router, prefix="/v1", tags=["qr"])
app.include_router(auth.router, prefix="/v1", tags=["auth"])


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}
