import httpx

URLHAUS_API = "https://urlhaus-api.abuse.ch/v1"


async def fetch_recent(limit=200, auth_key: str = None):
    headers = {"Auth-Key": auth_key} if auth_key else {}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{URLHAUS_API}/urls/recent/limit/{limit}/",
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()

    documents = []
    for item in data.get("urls", []):
        if item.get("url_status") not in ("online", "unknown"):
            continue
        tags_raw = item.get("tags") or []
        tags = [t["tag"] if isinstance(t, dict) else t for t in tags_raw]
        threat = item.get("threat", "malware")
        documents.append({
            "title": f"URLhaus: {threat}",
            "content": f"Malicious URL reported on URLhaus. Status: {item.get('url_status')}. Ref: {item.get('urlhaus_reference', '')}",
            "document_type": "ioc",
            "indicator_type": "url",
            "indicator_value": item.get("url"),
            "tags": tags,
            "confidence": 75,
            "source_name": "URLhaus / Abuse.ch",
        })

    return documents
