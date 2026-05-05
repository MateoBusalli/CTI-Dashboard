import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ELASTICSEARCH_URL: str = "http://elasticsearch:9200"
    DATA_DIR: str = os.path.join(os.path.dirname(__file__), "..", "..", "data")
    OTX_API_KEY: str = ""
    VT_API_KEY: str = ""
    ABUSE_CH_API_KEY: str = ""
    OLLAMA_URL: str = "http://host.docker.internal:11434"
    OLLAMA_MODEL: str = "dolphin-llama3"

    class Config:
        env_file = ".env"


settings = Settings()
