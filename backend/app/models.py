from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

ALLOWED_DOCUMENT_TYPES = {"report", "ioc", "alert", "news", "advisory", "other"}


class DocumentIn(BaseModel):
    title: Optional[str] = None
    content: str
    source_name: str
    source_url: Optional[str] = None
    document_type: str
    language: str = "en"
    url: Optional[str] = None
    tags: list = Field(default_factory=list)
    indicator_type: Optional[str] = None
    indicator_value: Optional[str] = None
    confidence: Optional[int] = Field(None, ge=0, le=100)
    published_at: Optional[datetime] = None
    ingested_at: Optional[datetime] = None

    @field_validator("document_type")
    @classmethod
    def validate_document_type(cls, v):
        if v not in ALLOWED_DOCUMENT_TYPES:
            raise ValueError(f"document_type must be one of {ALLOWED_DOCUMENT_TYPES}")
        return v


class IngestRequest(BaseModel):
    documents: list[DocumentIn]


class IngestResponse(BaseModel):
    indexed: int
    saved_to_store: int
    errors: list


class ReindexResponse(BaseModel):
    reindexed: int
    new_index: str
    errors: list
