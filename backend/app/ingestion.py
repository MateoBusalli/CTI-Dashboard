from datetime import datetime, timezone

from elasticsearch.helpers import async_bulk

from app.index_config import INDEX_ALIAS
from app.models import DocumentIn


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
        actions.append({"_index": index, "_source": doc})

    success, failed = await async_bulk(es, actions, raise_on_error=False, stats_only=False)
    return success, failed if isinstance(failed, list) else []
