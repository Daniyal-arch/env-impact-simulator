from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # 🔑 API Keys
    GFW_API_KEY: str  # from .env
    GEMINI_API_KEY: str  # from Google AI Studio

    # 🌍 API URLs
    BASE_URL: str = "https://data-api.globalforestwatch.org"  # GFW Base URL
    UMD_TREE_COVER_LOSS_DATASET: str = "umd_tree_cover_loss"
    UMD_TREE_COVER_LOSS_VERSION: str = "v1.9"

    class Config:
        env_file = ".env"

# Instantiate settings so it can be imported everywhere
settings = Settings()
