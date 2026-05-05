import httpx
import xml.etree.ElementTree as ET

CERT_FR_FEEDS = {
    "alerte": "https://www.cert.ssi.gouv.fr/alerte/feed/",
    "avis": "https://www.cert.ssi.gouv.fr/avis/feed/",
}

ATOM_NS = "http://www.w3.org/2005/Atom"


def _text(elem, tag):
    """Try namespaced then bare tag."""
    v = elem.findtext(f"{{{ATOM_NS}}}{tag}")
    return (v or elem.findtext(tag) or "").strip()


async def fetch_advisories(limit=50, feed_type="alerte"):
    url = CERT_FR_FEEDS.get(feed_type, CERT_FR_FEEDS["alerte"])
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        xml_content = resp.text

    root = ET.fromstring(xml_content)

    # Support both Atom <entry> and RSS <item>
    entries = root.findall(f"{{{ATOM_NS}}}entry") or root.findall("entry")
    if not entries:
        # Try RSS channel/item
        channel = root.find("channel")
        if channel is not None:
            entries = channel.findall("item")

    documents = []
    for entry in entries[:limit]:
        title = _text(entry, "title") or entry.findtext("title", "")
        summary = _text(entry, "summary") or _text(entry, "content") or entry.findtext("description", "")
        updated = _text(entry, "updated") or _text(entry, "published") or entry.findtext("pubDate", "")

        link_elem = entry.find(f"{{{ATOM_NS}}}link") or entry.find("link")
        if link_elem is not None:
            link = link_elem.get("href") or link_elem.text or ""
        else:
            link = ""

        entry_id = _text(entry, "id") or entry.findtext("guid", "")
        cert_ref = entry_id.rstrip("/").split("/")[-1] if entry_id else ""

        feed_label = "alert" if feed_type == "alerte" else "notice"
        tags = ["advisory", "cert-fr", feed_label]

        doc = {
            "title": title or cert_ref,
            "content": summary or title,
            "document_type": "advisory",
            "tags": tags,
            "confidence": 90,
            "source_name": "CERT-FR / ANSSI",
            "source_url": link.strip(),
        }
        if updated:
            try:
                from datetime import datetime, timezone
                # Handle both ISO and RFC 2822
                for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ", "%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S %Z"):
                    try:
                        dt = datetime.strptime(updated, fmt)
                        doc["published_at"] = dt.isoformat()
                        break
                    except ValueError:
                        continue
            except Exception:
                pass

        documents.append(doc)

    return documents
