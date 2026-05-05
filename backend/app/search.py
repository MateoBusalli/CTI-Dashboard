from app.elasticsearch import es_client
from app.index_config import INDEX_ALIAS


async def run_search(params):
    must = []
    filters = []
    if params.query:
        must.append(
            {
                "multi_match": {
                    "query": params.query,
                    "fields": ["title^3", "content", "indicator_value^2"],
                    "type": "best_fields",
                    "fuzziness": "AUTO",
                }
            }
        )
    if params.document_type:
        filters.append({"term": {"document_type": params.document_type}})
    if params.indicator_type:
        filters.append({"term": {"indicator_type": params.indicator_type}})
    if params.source_name:
        filters.append({"term": {"source_name": params.source_name}})
    if params.tags:
        filters.append({"terms": {"tags": params.tags}})
    if params.confidence_min is not None or params.confidence_max is not None:
        confidence_range = {}
        if params.confidence_min is not None:
            confidence_range["gte"] = params.confidence_min
        if params.confidence_max is not None:
            confidence_range["lte"] = params.confidence_max
        filters.append({"range": {"confidence": confidence_range}})
    if not must and not filters:
        query = {"match_all": {}}
    else:
        query = {
            "bool": {
                "must": must if must else [{"match_all": {}}],
                "filter": filters,
            }
        }
    # When no text query, _score sort is meaningless  fall back to ingested_at
    effective_sort_by = params.sort_by
    if params.sort_by == "_score" and not must:
        effective_sort_by = "ingested_at"

    sort = [{effective_sort_by: {"order": params.sort_order}}]
    if effective_sort_by != "_score":
        sort.append({"_score": {"order": "desc"}})

    body = {
        "query": query,
        "sort": sort,
        "from": (params.page - 1) * params.size,
        "size": params.size,
    }
    # Don't track scores when there's no text query (avoids returning 1.0 for all docs)
    if not must:
        body["track_scores"] = False

    response = await es_client.search(index=INDEX_ALIAS, body=body)
    total = response["hits"]["total"]["value"]
    hits = []
    for hit in response["hits"]["hits"]:
        hits.append(
            {
                "id": hit["_id"],
                "score": hit.get("_score"),
                "source": hit["_source"],
            }
        )
    return total, hits
