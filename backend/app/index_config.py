from datetime import datetime, timezone

INDEX_ALIAS = "cti-documents"


def new_index_name():
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"{INDEX_ALIAS}-{ts}"


INDEX_BODY = {
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
        "analysis": {
            "filter": {
                "cti_stop": {"type": "stop", "stopwords": "_english_"},
                "cti_stemmer": {"type": "stemmer", "language": "english"},
            },
            "analyzer": {
                "cti_analyzer": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase", "cti_stop", "cti_stemmer"],
                }
            },
        },
    },
    "mappings": {
        "_source": {"enabled": True},
        "properties": {
            "title": {
                "type": "text",
                "analyzer": "cti_analyzer",
                "fields": {"keyword": {"type": "keyword"}},
            },
            "content": {"type": "text", "analyzer": "cti_analyzer"},
            "source_name": {"type": "keyword"},
            "source_url": {"type": "keyword"},
            "document_type": {"type": "keyword"},
            "language": {"type": "keyword"},
            "url": {"type": "keyword"},
            "tags": {"type": "keyword"},
            "indicator_type": {"type": "keyword"},
            "indicator_value": {
                "type": "text",
                "fields": {"keyword": {"type": "keyword"}},
            },
            "confidence": {"type": "integer"},
            "published_at": {"type": "date"},
            "ingested_at": {"type": "date"},
        },
    },
}
