import httpx
from datetime import datetime, timedelta, timezone

NVD_API = "https://services.nvd.nist.gov/rest/json/cves/2.0"


async def fetch_recent(limit=50, days=7, api_key=None):
    now = datetime.now(timezone.utc)
    pub_start = (now - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%S.000")
    pub_end = now.strftime("%Y-%m-%dT%H:%M:%S.000")

    params = {
        "pubStartDate": pub_start,
        "pubEndDate": pub_end,
        "resultsPerPage": min(limit, 2000),
    }
    headers = {}
    if api_key:
        headers["apiKey"] = api_key

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(NVD_API, params=params, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    documents = []
    for item in data.get("vulnerabilities", [])[:limit]:
        cve = item.get("cve", {})
        cve_id = cve.get("id", "")

        descriptions = cve.get("descriptions", [])
        desc_en = next((d["value"] for d in descriptions if d.get("lang") == "en"), "")

        # Extract best available CVSS score
        metrics = cve.get("metrics", {})
        cvss_score = None
        severity = None
        for key in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
            if metrics.get(key):
                m = metrics[key][0]
                cvss_score = m.get("cvssData", {}).get("baseScore")
                severity = m.get("cvssData", {}).get("baseSeverity")
                break

        published = cve.get("published", "")

        references = cve.get("references", [])
        ref_url = references[0].get("url", "") if references else ""

        tags = ["vulnerability", "cve"]
        if severity:
            tags.append(severity.lower())

        confidence = 80
        if cvss_score is not None:
            confidence = min(95, int(cvss_score * 10))

        title = cve_id
        if cvss_score is not None:
            title += f"  CVSS {cvss_score}"
            if severity:
                title += f" ({severity})"

        content = desc_en
        if cvss_score is not None:
            content += f" CVSS: {cvss_score}."

        doc = {
            "title": title,
            "content": content or title,
            "document_type": "advisory",
            "indicator_type": "cve",
            "indicator_value": cve_id,
            "tags": tags,
            "confidence": confidence,
            "source_name": "NVD / NIST",
            "source_url": ref_url or f"https://nvd.nist.gov/vuln/detail/{cve_id}",
        }
        if published:
            doc["published_at"] = published

        documents.append(doc)

    return documents
