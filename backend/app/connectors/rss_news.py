import re
import httpx
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

FEEDS = {
    "bleepingcomputer": {
        "name": "BleepingComputer",
        "url": "https://www.bleepingcomputer.com/feed/",
        "doc_type": "news",
        "confidence": 65,
        "tags": ["news", "security-news"],
    },
    "thehackernews": {
        "name": "The Hacker News",
        "url": "https://feeds.feedburner.com/TheHackersNews",
        "doc_type": "news",
        "confidence": 65,
        "tags": ["news", "security-news"],
    },
    "sans_isc": {
        "name": "SANS ISC Diary",
        "url": "https://isc.sans.edu/rssfeed.xml",
        "doc_type": "report",
        "confidence": 75,
        "tags": ["report", "threat-analysis", "sans-isc"],
    },
    "krebs": {
        "name": "Krebs on Security",
        "url": "https://krebsonsecurity.com/feed/",
        "doc_type": "news",
        "confidence": 70,
        "tags": ["news", "investigation"],
    },
    "securelist": {
        "name": "Securelist (Kaspersky)",
        "url": "https://securelist.com/feed/",
        "doc_type": "report",
        "confidence": 75,
        "tags": ["report", "apt", "malware-analysis"],
    },
}

FEED_KEYS = list(FEEDS.keys())


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", text or "").strip()


def _parse_iso(date_str: str):
    """Try ISO 8601 date parsing."""
    try:
        from datetime import datetime
        return datetime.fromisoformat(date_str.replace("Z", "+00:00")).isoformat()
    except Exception:
        return None


def _parse_rfc2822(date_str: str):
    """Try RFC 2822 date parsing (RSS pubDate)."""
    try:
        return parsedate_to_datetime(date_str).isoformat()
    except Exception:
        return None


def _parse_feed(xml_text: str, feed_config: dict, limit: int) -> list:
    NS_ATOM = "http://www.w3.org/2005/Atom"
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []

    channel = root.find("channel")
    if channel is not None:
        # RSS 2.0
        items = channel.findall("item")[:limit]
        is_rss = True
    else:
        # Atom
        items = root.findall(f"{{{NS_ATOM}}}entry")[:limit]
        is_rss = False

    documents = []
    for item in items:
        if is_rss:
            title = (item.findtext("title") or "").strip()
            link  = (item.findtext("link")  or "").strip()
            desc  = item.findtext("description") or ""
            pub   = item.findtext("pubDate") or ""
        else:
            title = (item.findtext(f"{{{NS_ATOM}}}title") or "").strip()
            link_el = item.find(f"{{{NS_ATOM}}}link")
            link = (link_el.get("href") if link_el is not None else "") or ""
            desc  = item.findtext(f"{{{NS_ATOM}}}summary") or item.findtext(f"{{{NS_ATOM}}}content") or ""
            pub   = item.findtext(f"{{{NS_ATOM}}}published") or item.findtext(f"{{{NS_ATOM}}}updated") or ""

        content = _strip_html(desc)
        if len(content) > 600:
            content = content[:600] + "…"

        doc = {
            "title": title or "(no title)",
            "content": content or title,
            "document_type": feed_config["doc_type"],
            "tags": list(feed_config["tags"]),
            "confidence": feed_config["confidence"],
            "source_name": feed_config["name"],
            "source_url": link,
        }

        if pub:
            parsed = _parse_rfc2822(pub) or _parse_iso(pub)
            if parsed:
                doc["published_at"] = parsed

        documents.append(doc)

    return documents


async def fetch_news(feed_keys: list = None, limit_per_feed: int = 20) -> list:
    if feed_keys is None:
        selected = list(FEEDS.values())
    else:
        selected = [FEEDS[k] for k in feed_keys if k in FEEDS]

    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; CTI-Dashboard/1.0; +https://github.com)",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
    }
    all_docs = []
    for feed in selected:
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                resp = await client.get(feed["url"], headers=headers)
                resp.raise_for_status()
            docs = _parse_feed(resp.text, feed, limit_per_feed)
            all_docs.extend(docs)
        except Exception:
            pass  # skip failed feeds silently

    return all_docs
