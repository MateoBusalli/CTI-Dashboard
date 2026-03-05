INDEX_NAME = "cti-documents"

INDEX_SETTINGS = {
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
    },
    "mappings": {
        "_source": {
            "enabled": True
        },
        "properties": {
            "title": {"type": "text"},
            "content": {"type": "text"},
            "source_name": {"type": "keyword"},
            "source_url": {"type": "keyword"},
            "document_type": {"type": "keyword"},
            "language": {"type": "keyword"},
            "url": {"type": "keyword"},
            "tags": {"type": "keyword"},
            "indicator_type": {"type": "keyword"},
            "indicator_value": {"type": "keyword"},
            "confidence": {"type": "integer"},
            "published_at": {"type": "date"},
            "ingested_at": {"type": "date"},
        }
    }
}
