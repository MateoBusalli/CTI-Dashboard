import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ELASTICSEARCH_URL: str = "http://elasticsearch:9200"
    DATA_DIR: str = os.path.join(os.path.dirname(__file__), "..", "..", "data")

    class Config:
        env_file = ".env"


settings = Settings()
