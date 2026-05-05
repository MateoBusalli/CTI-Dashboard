import base64
import httpx

VT_BASE = "https://www.virustotal.com/api/v3"

ENDPOINT_MAP = {
    "ip": "ip_addresses",
    "domain": "domains",
    "hash": "files",
    "url": "urls",
}


def vt_url_id(url):
    return base64.urlsafe_b64encode(url.encode()).rstrip(b"=").decode()


def vt_confidence(stats):
    total = sum(stats.values())
    if total == 0:
        return 30
    malicious = stats.get("malicious", 0)
    suspicious = stats.get("suspicious", 0)
    ratio = (malicious + suspicious) / total
    if ratio >= 0.5:
        return 95
    if ratio >= 0.2:
        return 75
    if ratio >= 0.05:
        return 55
    return 30


async def lookup_indicators(api_key, indicators):
    headers = {"x-apikey": api_key}
    documents = []

    async with httpx.AsyncClient(timeout=30) as client:
        for item in indicators:
            indicator_type = item["type"]
            indicator_value = item["value"]

            endpoint = ENDPOINT_MAP.get(indicator_type)
            if not endpoint:
                continue

            if indicator_type == "url":
                path = f"{VT_BASE}/{endpoint}/{vt_url_id(indicator_value)}"
            else:
                path = f"{VT_BASE}/{endpoint}/{indicator_value}"

            try:
                resp = await client.get(path, headers=headers)
                resp.raise_for_status()
                data = resp.json().get("data", {})
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    continue
                raise

            attrs = data.get("attributes", {})
            stats = attrs.get("last_analysis_stats", {})
            confidence = vt_confidence(stats)
            malicious = stats.get("malicious", 0)
            total = sum(stats.values()) if stats else 0

            tags = []
            for tag in attrs.get("tags", [])[:10]:
                tags.append(tag)

            content_parts = []
            if stats:
                content_parts.append(f"{malicious}/{total} engines detected as malicious.")
            names = attrs.get("meaningful_name") or attrs.get("name") or attrs.get("last_dns_records")
            if isinstance(names, str):
                content_parts.append(names)

            documents.append({
                "title": f"VT lookup: {indicator_value}",
                "content": " ".join(content_parts) or f"VirusTotal analysis for {indicator_value}",
                "document_type": "ioc",
                "indicator_type": indicator_type,
                "indicator_value": indicator_value,
                "tags": tags,
                "confidence": confidence,
                "source_name": "VirusTotal",
            })

    return documents
