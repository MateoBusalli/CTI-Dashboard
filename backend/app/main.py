import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.config import settings
from app.elasticsearch import es_client
from app.index_config import INDEX_NAME, INDEX_SETTINGS
from app import json_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.DATA_DIR, exist_ok=True)
    if not await es_client.indices.exists(index=INDEX_NAME):
        await es_client.indices.create(index=INDEX_NAME, body=INDEX_SETTINGS)
    yield
    await es_client.close()


app = FastAPI(title="CTI Dashboard API", version="0.1.0", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/health/es")
async def health_es():
    info = await es_client.info()
    return {
        "elasticsearch": "connected",
        "cluster_name": info["cluster_name"],
        "version": info["version"]["number"],
    }


@app.post("/reindex")
async def reindex():
    documents = json_store.read_all_documents()
    if not documents:
        return {"reindexed": 0}
    if await es_client.indices.exists(index=INDEX_NAME):
        await es_client.indices.delete(index=INDEX_NAME)
    await es_client.indices.create(index=INDEX_NAME, body=INDEX_SETTINGS)
    for doc in documents:
        await es_client.index(index=INDEX_NAME, document=doc)
    await es_client.indices.refresh(index=INDEX_NAME)
    return {"reindexed": len(documents)}
