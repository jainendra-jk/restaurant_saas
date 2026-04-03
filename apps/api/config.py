from pathlib import Path
from typing import List

from dotenv import load_dotenv
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_repo_root = Path(__file__).resolve().parents[2]
load_dotenv(_repo_root / ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_repo_root / ".env"), extra="ignore")

    google_api_key: str = Field(default="", validation_alias="GOOGLE_API_KEY")
    supabase_url: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_URL", "VITE_SUPABASE_URL"),
    )
    supabase_service_role_key: str = Field(default="", validation_alias="SUPABASE_SERVICE_ROLE_KEY")
    customer_app_origin: str = Field(default="", validation_alias="CUSTOMER_APP_ORIGIN")
    api_port: int = Field(default=8000, validation_alias="API_PORT")
    api_cors_origins: str = Field(default="", validation_alias="API_CORS_ORIGINS")
    menu_extract_max_concurrent_pages: int = Field(
        default=3,
        validation_alias="MENU_EXTRACT_MAX_CONCURRENT_PAGES",
    )
    menu_extract_retry_count: int = Field(
        default=2,
        validation_alias="MENU_EXTRACT_RETRY_COUNT",
    )
    menu_extract_retry_backoff_seconds: float = Field(
        default=0.75,
        validation_alias="MENU_EXTRACT_RETRY_BACKOFF_SECONDS",
    )
    menu_extract_max_pages: int = Field(
        default=60,
        validation_alias="MENU_EXTRACT_MAX_PAGES",
    )
    menu_extract_page_cap_mode: str = Field(
        default="truncate",
        validation_alias="MENU_EXTRACT_PAGE_CAP_MODE",
    )
    menu_extract_pdf_dpi: int = Field(
        default=150,
        validation_alias="MENU_EXTRACT_PDF_DPI",
    )

    def cors_list(self) -> List[str]:
        raw = self.api_cors_origins.strip()
        if raw:
            return [o.strip() for o in raw.split(",") if o.strip()]
        return [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
            "http://localhost:5176",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "http://127.0.0.1:5175",
            "http://127.0.0.1:5176",
        ]

    def supabase_base(self) -> str:
        url = self.supabase_url.strip().rstrip("/")
        if not url:
            return ""
        return url


settings = Settings()
