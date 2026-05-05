import httpx

CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"


async def fetch_kev(limit=200):
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(CISA_KEV_URL)
        resp.raise_for_status()
        data = resp.json()

    vulnerabilities = data.get("vulnerabilities", [])
    documents = []
    for item in vulnerabilities[:limit]:
        cve_id = item.get("cveID", "")
        vendor = item.get("vendorProject", "")
        product = item.get("product", "")
        vuln_name = item.get("vulnerabilityName", "")
        description = item.get("shortDescription", "")
        date_added = item.get("dateAdded", "")
        due_date = item.get("dueDate", "")

        tags = ["vulnerability", "exploited", "in-the-wild"]
        if vendor:
            tags.append(vendor.lower().replace(" ", "-"))

        content = description
        if date_added:
            content += f" Added to KEV: {date_added}."
        if due_date:
            content += f" Remediation due: {due_date}."

        documents.append({
            "title": f"{cve_id}  {vuln_name}",
            "content": content,
            "document_type": "advisory",
            "indicator_type": "cve",
            "indicator_value": cve_id,
            "tags": tags,
            "confidence": 95,
            "source_name": "CISA KEV",
            "source_url": "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
        })

    return documents
