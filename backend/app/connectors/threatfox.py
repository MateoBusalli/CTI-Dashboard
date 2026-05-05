import httpx

THREATFOX_API = "https://threatfox-api.abuse.ch/api/v1/"

IOC_TYPE_MAP = {
    "ip:port": "ip",
    "domain": "domain",
    "url": "url",
    "md5_hash": "hash",
    "sha256_hash": "hash",
}


async def fetch_iocs(days=3, limit=200, auth_key: str = None):
    headers = {"Auth-Key": auth_key} if auth_key else {}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            THREATFOX_API,
            json={"query": "get_iocs", "days": days},
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()

    documents = []
    for item in (data.get("data") or [])[:limit]:
        raw_type = item.get("ioc_type", "")
        mapped_type = IOC_TYPE_MAP.get(raw_type)
        if not mapped_type:
            continue

        value = item.get("ioc", "")
        if raw_type == "ip:port" and ":" in value:
            value = value.rsplit(":", 1)[0]

        confidence = min(int(item.get("confidence_level") or 50), 100)
        tags = item.get("tags") or []
        malware = item.get("malware", "unknown")

        documents.append({
            "title": f"ThreatFox: {malware}",
            "content": f"IOC reported on ThreatFox. Malware: {malware}. First seen: {item.get('first_seen', '')}",
            "document_type": "ioc",
            "indicator_type": mapped_type,
            "indicator_value": value,
            "tags": tags,
            "confidence": confidence,
            "source_name": f"ThreatFox / {item.get('reporter', 'anonymous')}",
        })

    return documents
