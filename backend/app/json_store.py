import json
import os
from datetime import datetime, timezone
from typing import Any
from app.config import settings

RAW_FILE = os.path.join(settings.DATA_DIR, "raw_documents.json")


def _read_store() -> list[dict[str, Any]]:
    if not os.path.exists(RAW_FILE):
        return []
    with open(RAW_FILE, "r") as f:
        return json.load(f)


def _write_store(data: list[dict[str, Any]]) -> None:
    os.makedirs(os.path.dirname(RAW_FILE), exist_ok=True)
    with open(RAW_FILE, "w") as f:
        json.dump(data, f, indent=2, default=str)


def append_documents(documents: list[dict[str, Any]]) -> int:
    store = _read_store()
    for doc in documents:
        doc.setdefault("ingested_at", datetime.now(timezone.utc).isoformat())
        store.append(doc)
    _write_store(store)
    return len(documents)


def read_all_documents() -> list[dict[str, Any]]:
    return _read_store()


def clear_store() -> None:
    if os.path.exists(RAW_FILE):
        os.remove(RAW_FILE)
