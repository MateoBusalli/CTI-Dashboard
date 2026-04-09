import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from app import ingestion, json_store, search
from app.config import settings
from app.elasticsearch import es_client
from app.index_config import INDEX_ALIAS, INDEX_BODY, new_index_name
from app.models import (
    IngestRequest,
    IngestResponse,
    ReindexResponse,
    SearchRequest,
    SearchResponse,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.DATA_DIR, exist_ok=True)
    if not await es_client.indices.exists_alias(name=INDEX_ALIAS):
        index_name = new_index_name()
        await es_client.indices.create(index=index_name, body=INDEX_BODY)
        await es_client.indices.put_alias(index=index_name, name=INDEX_ALIAS)
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


@app.post("/search", response_model=SearchResponse)
async def search_documents(params: SearchRequest):
    total, hits = await search.run_search(params)
    return SearchResponse(total=total, page=params.page, size=params.size, results=hits)


@app.post("/ingest", response_model=IngestResponse)
async def ingest(payload: IngestRequest):
    raw_docs = []
    for doc in payload.documents:
        raw_docs.append(doc.model_dump(mode="json", exclude_none=True))
    valid_docs, validation_errors = ingestion.validate_documents(raw_docs)
    if not valid_docs:
        raise HTTPException(status_code=422, detail=validation_errors)
    saved = json_store.append_documents(valid_docs)
    indexed, bulk_errors = await ingestion.bulk_ingest(es_client, valid_docs)
    await es_client.indices.refresh(index=INDEX_ALIAS)

    return IngestResponse(
        indexed=indexed,
        saved_to_store=saved,
        errors=validation_errors + bulk_errors,
    )


@app.post("/reindex", response_model=ReindexResponse)
async def reindex():
    all_docs = json_store.read_all_documents()
    new_index = new_index_name()
    await es_client.indices.create(index=new_index, body=INDEX_BODY)
    indexed = 0
    errors = []
    if all_docs:
        valid_docs, validation_errors = ingestion.validate_documents(all_docs)
        indexed, bulk_errors = await ingestion.bulk_ingest(
            es_client, valid_docs, index=new_index
        )
        errors = validation_errors + bulk_errors
    await es_client.indices.refresh(index=new_index)
    # find which indices are currently behind the alias
    old_indices = []
    if await es_client.indices.exists_alias(name=INDEX_ALIAS):
        alias_info = await es_client.indices.get_alias(name=INDEX_ALIAS)
        old_indices = list(alias_info.keys())
    # swap alias to the new index
    actions = []
    for old in old_indices:
        actions.append({"remove": {"index": old, "alias": INDEX_ALIAS}})
    actions.append({"add": {"index": new_index, "alias": INDEX_ALIAS}})
    await es_client.indices.update_aliases(body={"actions": actions})
    # delete old indices
    for old in old_indices:
        await es_client.indices.delete(index=old, ignore_unavailable=True)
    return ReindexResponse(reindexed=indexed, new_index=new_index, errors=errors)
