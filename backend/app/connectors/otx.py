import httpx

OTX_BASE = "https://otx.alienvault.com/api/v1"

OTX_TYPE_MAP = {
    "IPv4": "ip",
    "IPv6": "ip",
    "domain": "domain",
    "hostname": "domain",
    "URL": "url",
    "FileHash-MD5": "hash",
    "FileHash-SHA1": "hash",
    "FileHash-SHA256": "hash",
    "email": "email",
}

TLP_CONFIDENCE = {
    "red": 90,
    "amber": 75,
    "green": 60,
    "white": 45,
}


def pulse_confidence(pulse):
    base = TLP_CONFIDENCE.get(pulse.get("tlp", "white"), 45)
    if pulse.get("adversary"):
        base = min(base + 15, 100)
    if pulse.get("targeted_countries"):
        base = min(base + 5, 100)
    return base


async def fetch_pulses(api_key, limit=50, modified_since=None):
    headers = {"X-OTX-API-KEY": api_key}
    params = {"limit": limit}
    if modified_since:
        params["modified_since"] = modified_since

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{OTX_BASE}/pulses/subscribed",
            headers=headers,
            params=params,
        )
        resp.raise_for_status()
        data = resp.json()

    pulses = data.get("results", [])
    documents = []

    for pulse in pulses:
        pulse_title = pulse.get("name", "Untitled pulse")
        pulse_description = pulse.get("description", "")
        pulse_tags = pulse.get("tags", [])
        pulse_author = pulse.get("author_name", "OTX AlienVault")
        confidence = pulse_confidence(pulse)

        for indicator in pulse.get("indicators", []):
            raw_type = indicator.get("type", "")
            mapped_type = OTX_TYPE_MAP.get(raw_type)
            if not mapped_type:
                continue

            documents.append({
                "title": pulse_title,
                "content": pulse_description or f"Indicator from OTX pulse: {pulse_title}",
                "document_type": "ioc",
                "indicator_type": mapped_type,
                "indicator_value": indicator.get("indicator"),
                "tags": pulse_tags,
                "confidence": confidence,
                "source_name": f"OTX / {pulse_author}",
            })

    return documents
