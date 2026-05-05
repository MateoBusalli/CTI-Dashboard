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


class SearchRequest(BaseModel):
    query: str = ""
    document_type: Optional[str] = None
    tags: list = Field(default_factory=list)
    indicator_type: Optional[str] = None
    source_name: Optional[str] = None
    confidence_min: Optional[int] = Field(None, ge=0, le=100)
    confidence_max: Optional[int] = Field(None, ge=0, le=100)
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=500)
    sort_by: str = "_score"
    sort_order: str = "desc"


class SearchHit(BaseModel):
    id: str
    score: Optional[float]
    source: dict


class SearchResponse(BaseModel):
    total: int
    page: int
    size: int
    results: list[SearchHit]


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


class FetchOTXRequest(BaseModel):
    api_key: Optional[str] = None
    limit: int = Field(50, ge=1, le=200)
    modified_since: Optional[str] = None


class IndicatorItem(BaseModel):
    value: str
    type: str


class FetchVTRequest(BaseModel):
    api_key: Optional[str] = None
    indicators: list[IndicatorItem]


class FetchSimpleRequest(BaseModel):
    limit: int = Field(200, ge=1, le=500)
    auth_key: Optional[str] = None


class FetchThreatFoxRequest(BaseModel):
    days: int = Field(3, ge=1, le=7)
    limit: int = Field(200, ge=1, le=500)
    auth_key: Optional[str] = None


class FetchResponse(BaseModel):
    source: str
    fetched: int
    indexed: int
    errors: list


class FetchCisaKevRequest(BaseModel):
    limit: int = Field(200, ge=1, le=1000)


class FetchCertFrRequest(BaseModel):
    limit: int = Field(50, ge=1, le=200)
    feed_type: str = "alerte"


class FetchNvdRequest(BaseModel):
    limit: int = Field(50, ge=1, le=200)
    days: int = Field(7, ge=1, le=30)
    api_key: Optional[str] = None


class FetchRssRequest(BaseModel):
    feed_keys: Optional[list] = None  # None = all feeds
    limit_per_feed: int = Field(20, ge=1, le=50)


class DeleteRequest(BaseModel):
    document_type: Optional[str] = None  # None = all types
    mode: str = "all"  # "all" | "last_n"
    n: Optional[int] = Field(None, ge=1)


class DeleteResponse(BaseModel):
    deleted: int
    document_type: Optional[str]
    mode: str


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: Optional[str] = None  # override OLLAMA_MODEL if provided
