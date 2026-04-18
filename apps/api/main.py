from typing import Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import auth, menu, qr

_docs = "/docs" if settings.api_enable_docs else None
app = FastAPI(
    title="Restaurant SaaS API",
    version="1.0.0",
    docs_url=_docs,
    redoc_url=_docs,
    openapi_url=_docs,
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
