import httpx

FEODO_URL = "https://feodotracker.abuse.ch/downloads/ipblocklist.json"


async def fetch_blocklist(limit=300):
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(FEODO_URL)
        resp.raise_for_status()
        data = resp.json()

    # API returns a plain list directly
    entries = data if isinstance(data, list) else data.get("blocklist", [])

    documents = []
    for item in entries[:limit]:
        malware = item.get("malware", "unknown")
        country = item.get("country", "")
        as_name = item.get("as_name", "")
        status = item.get("status", "")

        content_parts = [f"C2 server for {malware} botnet. Status: {status}."]
        if country:
            content_parts.append(f"Country: {country}.")
        if as_name:
            content_parts.append(f"AS: {as_name}.")

        documents.append({
            "title": f"Feodo Tracker: {malware} C2",
            "content": " ".join(content_parts),
            "document_type": "ioc",
            "indicator_type": "ip",
            "indicator_value": item.get("ip_address"),
            "tags": [malware.lower(), "command-and-control", "botnet"],
            "confidence": 90,
            "source_name": "Feodo Tracker / Abuse.ch",
        })

    return documents
