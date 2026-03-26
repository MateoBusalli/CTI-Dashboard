import json
import os
from datetime import datetime, timezone
from app.config import settings

RAW_FILE = os.path.join(settings.DATA_DIR, "raw_documents.json")


def load_documents():
    if not os.path.exists(RAW_FILE):
        return []
    with open(RAW_FILE, "r") as f:
        return json.load(f)


def save_documents(data):
    os.makedirs(os.path.dirname(RAW_FILE), exist_ok=True)
    with open(RAW_FILE, "w") as f:
        json.dump(data, f, indent=2, default=str)


def append_documents(documents):
    store = load_documents()
    for doc in documents:
        doc.setdefault("ingested_at", datetime.now(timezone.utc).isoformat())
        store.append(doc)
    save_documents(store)
    return len(documents)


def read_all_documents():
    return load_documents()


def clear_store():
    if os.path.exists(RAW_FILE):
        os.remove(RAW_FILE)
