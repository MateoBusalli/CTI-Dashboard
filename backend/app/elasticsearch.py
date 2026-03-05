from elasticsearch import AsyncElasticsearch
from app.config import settings

es_client = AsyncElasticsearch(hosts=[settings.ELASTICSEARCH_URL])
