import hashlib
from datetime import datetime, timezone

from elasticsearch.helpers import async_bulk

from app.index_config import INDEX_ALIAS
from app.models import DocumentIn


def make_doc_id(doc: dict) -> str:
    """Deterministic document ID to prevent duplicate ingestion."""
    indicator_value = doc.get("indicator_value")
    indicator_type = doc.get("indicator_type", "")
    source_url = doc.get("source_url", "")
    source_name = doc.get("source_name", "")
    title = doc.get("title", "")

    if indicator_value:
        key = f"ioc:{indicator_type}:{indicator_value}"
    elif source_url:
        key = f"url:{source_url}"
    else:
        key = f"doc:{source_name}:{title}"

    return hashlib.sha1(key.encode()).hexdigest()


def validate_documents(raw_docs):
    valid = []
    errors = []
    for i, raw in enumerate(raw_docs):
        try:
            doc = DocumentIn(**raw)
            valid.append(doc.model_dump(mode="json", exclude_none=True))
        except Exception as e:
            errors.append({"index": i, "error": str(e)})
    return valid, errors


async def bulk_ingest(es, documents, index=INDEX_ALIAS):
    actions = []
    for doc in documents:
        doc.setdefault("ingested_at", datetime.now(timezone.utc).isoformat())
        actions.append({
            "_op_type": "index",
            "_index": index,
            "_id": make_doc_id(doc),
            "_source": doc,
        })

    success, failed = await async_bulk(es, actions, raise_on_error=False, stats_only=False)
    return success, failed if isinstance(failed, list) else []
