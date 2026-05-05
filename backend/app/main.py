import os
import json
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse

from app import ingestion, json_store, search
from app.config import settings
from app.elasticsearch import es_client
from app.index_config import INDEX_ALIAS, INDEX_BODY, new_index_name
from app.connectors import otx as otx_connector
from app.connectors import virustotal as vt_connector
from app.connectors import urlhaus as urlhaus_connector
from app.connectors import threatfox as threatfox_connector
from app.connectors import malwarebazaar as malwarebazaar_connector
from app.connectors import feodotracker as feodotracker_connector
from app.connectors import cisa_kev as cisa_kev_connector
from app.connectors import cert_fr as cert_fr_connector
from app.connectors import nvd as nvd_connector
from app.connectors import rss_news as rss_news_connector
from app.models import (
    FetchOTXRequest,
    FetchVTRequest,
    FetchSimpleRequest,
    FetchThreatFoxRequest,
    FetchResponse,
    IngestRequest,
    IngestResponse,
    ReindexResponse,
    SearchRequest,
    SearchResponse,
    FetchCisaKevRequest,
    FetchCertFrRequest,
    FetchNvdRequest,
    FetchRssRequest,
    DeleteRequest,
    DeleteResponse,
    ChatRequest,
    ChatMessage,
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


@app.get("/config")
async def get_config():
    return {"abuse_ch_key_configured": bool(settings.ABUSE_CH_API_KEY)}


@app.get("/enrich/{indicator_type}/{indicator_value:path}")
async def enrich(indicator_type: str, indicator_value: str):
    """Passive enrichment  WHOIS/ASN for IPs, DNS records for domains/URLs."""
    import httpx
    result = {"indicator_type": indicator_type, "indicator_value": indicator_value}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            if indicator_type == "ip":
                r = await client.get(f"http://ip-api.com/json/{indicator_value}?fields=status,message,country,countryCode,region,regionName,city,isp,org,as,reverse,query")
                data = r.json()
                if data.get("status") == "success":
                    result.update({
                        "country": data.get("country"),
                        "country_code": data.get("countryCode"),
                        "city": data.get("city"),
                        "isp": data.get("isp"),
                        "org": data.get("org"),
                        "asn": data.get("as"),
                        "reverse_dns": data.get("reverse"),
                    })
            elif indicator_type in ("domain", "url"):
                # Extract hostname from URL
                from urllib.parse import urlparse
                hostname = urlparse(indicator_value).hostname or indicator_value
                r = await client.get(f"https://dns.google/resolve?name={hostname}&type=A")
                data = r.json()
                answers = [a["data"] for a in data.get("Answer", []) if a.get("type") == 1]
                result["dns_a_records"] = answers
                # Also get MX
                r2 = await client.get(f"https://dns.google/resolve?name={hostname}&type=MX")
                d2 = r2.json()
                mx = [a["data"] for a in d2.get("Answer", []) if a.get("type") == 15]
                result["dns_mx_records"] = mx
                result["hostname"] = hostname
    except Exception as e:
        result["error"] = str(e)
    return result


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


CYBER_SYSTEM_PROMPT = """You are CyberMind, an expert AI assistant specialized in cybersecurity, threat intelligence, and CTI (Cyber Threat Intelligence) analysis. You assist security analysts with:
- Malware analysis and IOC investigation
- Threat actor profiling (APTs, criminal groups)
- CVE/vulnerability assessment
- OSINT and open-source intelligence
- Incident response guidance
- MITRE ATT&CK framework mapping
- Network forensics and log analysis
Be precise, technical, and concise. Use markdown for structured output.
When [CTI_CONTEXT] is provided, prioritize that data to answer the question. Always mention the source when citing CTI data."""


async def _rag_context(query: str, max_docs: int = 5) -> str | None:
    """Search ES for documents relevant to the query, return a formatted context block."""
    try:
        body = {
            "query": {
                "multi_match": {
                    "query": query,
                    "fields": ["title^3", "indicator_value^3", "content", "tags^2", "cve_id^3"],
                    "type": "best_fields",
                    "fuzziness": "AUTO",
                }
            },
            "size": max_docs,
            "_source": ["title", "content", "document_type", "source_name",
                        "indicator_type", "indicator_value", "tags", "cve_id",
                        "severity", "confidence", "ingested_at"],
        }
        resp = await es_client.search(index=INDEX_ALIAS, body=body)
        hits = resp["hits"]["hits"]
        if not hits:
            return None

        lines = ["[CTI_CONTEXT]  Relevant documents from the local CTI database:\n"]
        for i, hit in enumerate(hits, 1):
            s = hit["_source"]
            doc_type   = s.get("document_type", "?")
            title      = s.get("title", "")
            source     = s.get("source_name", "?")
            ioc_val    = s.get("indicator_value", "")
            ioc_type   = s.get("indicator_type", "")
            cve_id     = s.get("cve_id", "")
            tags       = ", ".join(s.get("tags") or [])
            severity   = s.get("severity", "")
            confidence = s.get("confidence", "")
            content    = (s.get("content") or "")[:600].strip()

            entry = [f"--- Doc {i} [{doc_type}] from {source}"]
            entry.append(f"  Title: {title}")
            if cve_id:      entry.append(f"  CVE: {cve_id}")
            if ioc_val:     entry.append(f"  IOC ({ioc_type}): {ioc_val}")
            if severity:    entry.append(f"  Severity: {severity}")
            if confidence:  entry.append(f"  Confidence: {confidence}")
            if tags:        entry.append(f"  Tags: {tags}")
            if content:     entry.append(f"  Summary: {content}")
            lines.append("\n".join(entry))

        return "\n\n".join(lines)
    except Exception:
        return None


@app.post("/chat")
async def chat(payload: ChatRequest):
    model = payload.model or settings.OLLAMA_MODEL

    # RAG: search ES with the last user message
    last_user_msg = next(
        (m.content for m in reversed(payload.messages) if m.role == "user"), None
    )
    rag_ctx = await _rag_context(last_user_msg) if last_user_msg else None

    system_messages = [{"role": "system", "content": CYBER_SYSTEM_PROMPT}]
    if rag_ctx:
        system_messages.append({"role": "system", "content": rag_ctx})

    messages = system_messages + [
        {"role": m.role, "content": m.content} for m in payload.messages
    ]

    async def stream_ollama():
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{settings.OLLAMA_URL}/api/chat",
                    json={"model": model, "messages": messages, "stream": True},
                ) as resp:
                    if resp.status_code != 200:
                        yield json.dumps({"error": f"Ollama error {resp.status_code}"}) + "\n"
                        return
                    async for line in resp.aiter_lines():
                        if line.strip():
                            yield line + "\n"
        except httpx.ConnectError:
            yield json.dumps({"error": "Ollama unreachable. Run: docker-compose up -d ollama"}) + "\n"
        except Exception as e:
            yield json.dumps({"error": str(e)}) + "\n"

    return StreamingResponse(stream_ollama(), media_type="application/x-ndjson")


@app.delete("/documents", response_model=DeleteResponse)
async def delete_documents(payload: DeleteRequest):
    type_filter = payload.document_type

    if payload.mode == "last_n":
        if not payload.n:
            raise HTTPException(status_code=400, detail="'n' is required for last_n mode")
        query = (
            {"bool": {"filter": [{"term": {"document_type": type_filter}}]}}
            if type_filter
            else {"match_all": {}}
        )
        search_res = await es_client.search(
            index=INDEX_ALIAS,
            body={"query": query, "sort": [{"ingested_at": {"order": "desc"}}], "size": payload.n, "_source": False},
        )
        ids = [hit["_id"] for hit in search_res["hits"]["hits"]]
        if not ids:
            return DeleteResponse(deleted=0, document_type=type_filter, mode=payload.mode)
        from elasticsearch.helpers import async_bulk
        delete_actions = [{"_op_type": "delete", "_index": INDEX_ALIAS, "_id": _id} for _id in ids]
        success, _ = await async_bulk(es_client, delete_actions, raise_on_error=False)
        deleted = success
    else:
        q = {"term": {"document_type": type_filter}} if type_filter else {"match_all": {}}
        resp = await es_client.delete_by_query(
            index=INDEX_ALIAS,
            body={"query": q},
            wait_for_completion=True,
        )
        deleted = resp.get("deleted", 0)

    await es_client.indices.refresh(index=INDEX_ALIAS)
    json_store.delete_documents(document_type=type_filter, mode=payload.mode, n=payload.n)
    return DeleteResponse(deleted=deleted, document_type=type_filter, mode=payload.mode)


@app.post("/fetch/otx", response_model=FetchResponse)
async def fetch_otx(payload: FetchOTXRequest):
    api_key = payload.api_key or settings.OTX_API_KEY
    if not api_key:
        raise HTTPException(status_code=400, detail="OTX API key required. Set OTX_API_KEY in .env or pass it in the request body.")
    try:
        raw_docs = await otx_connector.fetch_pulses(
            api_key=api_key,
            limit=payload.limit,
            modified_since=payload.modified_since,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OTX fetch failed: {e}")
    if not raw_docs:
        return FetchResponse(source="otx", fetched=0, indexed=0, errors=[])
    valid_docs, validation_errors = ingestion.validate_documents(raw_docs)
    indexed, bulk_errors = await ingestion.bulk_ingest(es_client, valid_docs)
    json_store.append_documents(valid_docs)
    await es_client.indices.refresh(index=INDEX_ALIAS)
    return FetchResponse(
        source="otx",
        fetched=len(raw_docs),
        indexed=indexed,
        errors=validation_errors + bulk_errors,
    )


@app.post("/fetch/virustotal", response_model=FetchResponse)
async def fetch_virustotal(payload: FetchVTRequest):
    api_key = payload.api_key or settings.VT_API_KEY
    if not api_key:
        raise HTTPException(status_code=400, detail="VirusTotal API key required. Set VT_API_KEY in .env or pass it in the request body.")
    if not payload.indicators:
        raise HTTPException(status_code=400, detail="Provide at least one indicator.")
    try:
        raw_docs = await vt_connector.lookup_indicators(
            api_key=api_key,
            indicators=[i.model_dump() for i in payload.indicators],
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"VirusTotal fetch failed: {e}")
    if not raw_docs:
        return FetchResponse(source="virustotal", fetched=0, indexed=0, errors=[])
    valid_docs, validation_errors = ingestion.validate_documents(raw_docs)
    indexed, bulk_errors = await ingestion.bulk_ingest(es_client, valid_docs)
    json_store.append_documents(valid_docs)
    await es_client.indices.refresh(index=INDEX_ALIAS)
    return FetchResponse(
        source="virustotal",
        fetched=len(raw_docs),
        indexed=indexed,
        errors=validation_errors + bulk_errors,
    )


async def _ingest_and_respond(source, raw_docs):
    if not raw_docs:
        return FetchResponse(source=source, fetched=0, indexed=0, errors=[])
    valid_docs, validation_errors = ingestion.validate_documents(raw_docs)
    indexed, bulk_errors = await ingestion.bulk_ingest(es_client, valid_docs)
    json_store.append_documents(valid_docs)
    await es_client.indices.refresh(index=INDEX_ALIAS)
    return FetchResponse(source=source, fetched=len(raw_docs), indexed=indexed, errors=validation_errors + bulk_errors)


@app.post("/fetch/urlhaus", response_model=FetchResponse)
async def fetch_urlhaus(payload: FetchSimpleRequest):
    try:
        raw_docs = await urlhaus_connector.fetch_recent(limit=payload.limit, auth_key=payload.auth_key or settings.ABUSE_CH_API_KEY)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"URLhaus fetch failed: {e}")
    return await _ingest_and_respond("urlhaus", raw_docs)


@app.post("/fetch/threatfox", response_model=FetchResponse)
async def fetch_threatfox(payload: FetchThreatFoxRequest):
    try:
        raw_docs = await threatfox_connector.fetch_iocs(days=payload.days, limit=payload.limit, auth_key=payload.auth_key or settings.ABUSE_CH_API_KEY)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"ThreatFox fetch failed: {e}")
    return await _ingest_and_respond("threatfox", raw_docs)


@app.post("/fetch/malwarebazaar", response_model=FetchResponse)
async def fetch_malwarebazaar(payload: FetchSimpleRequest):
    try:
        raw_docs = await malwarebazaar_connector.fetch_recent(limit=payload.limit, auth_key=payload.auth_key or settings.ABUSE_CH_API_KEY)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"MalwareBazaar fetch failed: {e}")
    return await _ingest_and_respond("malwarebazaar", raw_docs)


@app.post("/fetch/feodotracker", response_model=FetchResponse)
async def fetch_feodotracker(payload: FetchSimpleRequest):
    try:
        raw_docs = await feodotracker_connector.fetch_blocklist(limit=payload.limit)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Feodo Tracker fetch failed: {e}")
    return await _ingest_and_respond("feodotracker", raw_docs)


@app.post("/fetch/cisa-kev", response_model=FetchResponse)
async def fetch_cisa_kev(payload: FetchCisaKevRequest):
    try:
        raw_docs = await cisa_kev_connector.fetch_kev(limit=payload.limit)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"CISA KEV fetch failed: {e}")
    return await _ingest_and_respond("cisa-kev", raw_docs)


@app.post("/fetch/cert-fr", response_model=FetchResponse)
async def fetch_cert_fr(payload: FetchCertFrRequest):
    try:
        raw_docs = await cert_fr_connector.fetch_advisories(limit=payload.limit, feed_type=payload.feed_type)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"CERT-FR fetch failed: {e}")
    return await _ingest_and_respond("cert-fr", raw_docs)


@app.post("/fetch/nvd", response_model=FetchResponse)
async def fetch_nvd(payload: FetchNvdRequest):
    try:
        raw_docs = await nvd_connector.fetch_recent(limit=payload.limit, days=payload.days, api_key=payload.api_key)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"NVD fetch failed: {e}")
    return await _ingest_and_respond("nvd", raw_docs)


@app.post("/fetch/rss-news", response_model=FetchResponse)
async def fetch_rss_news(payload: FetchRssRequest):
    try:
        raw_docs = await rss_news_connector.fetch_news(
            feed_keys=payload.feed_keys,
            limit_per_feed=payload.limit_per_feed,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"RSS fetch failed: {e}")
    return await _ingest_and_respond("rss-news", raw_docs)
