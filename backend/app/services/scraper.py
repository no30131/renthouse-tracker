"""
URL scraper — fetches a rental listing page and extracts structured fields.

Supported sites with dedicated parsers:
  - rent.591.com.tw
  - m.591.com.tw

All other URLs fall back to generic OG / meta-tag extraction.
"""

import json
import re
from typing import Any

import httpx
from bs4 import BeautifulSoup

# ── Constants ──────────────────────────────────────────────────────────────────

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

_TW_CITIES = (
    "台北市", "臺北市", "新北市", "桃園市", "台中市", "臺中市",
    "台南市", "臺南市", "高雄市", "基隆市", "新竹市", "新竹縣",
    "苗栗縣", "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣",
    "屏東縣", "宜蘭縣", "花蓮縣", "台東縣", "臺東縣",
    "澎湖縣", "金門縣", "連江縣",
)

# ── Helpers ────────────────────────────────────────────────────────────────────

def _og(soup: BeautifulSoup, prop: str) -> str:
    tag = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
    if tag and tag.get("content"):
        return tag["content"].strip()
    return ""


def _extract_price(texts: list[str]) -> int | None:
    patterns = [
        r"([\d,]+)\s*元\s*/\s*月",
        r"([\d,]+)\s*/\s*月",
        r"月租\s*([\d,]+)",
        r"租金[：:]\s*([\d,]+)",
    ]
    for text in texts:
        for pat in patterns:
            m = re.search(pat, text or "")
            if m:
                val = int(m.group(1).replace(",", ""))
                if 1000 <= val <= 500_000:   # sanity range
                    return val
    return None


def _extract_district(texts: list[str]) -> str | None:
    # Match "XX區" or "XX鄉" or "XX鎮" optionally preceded by city name
    city_prefix = "|".join(re.escape(c) for c in _TW_CITIES)
    pat = rf"(?:{city_prefix})?([^\s,，｜|()（）\d]{{2,4}}[區鄉鎮])"
    for text in texts:
        m = re.search(pat, text or "")
        if m:
            return m.group(1)
    return None


def _extract_floor(texts: list[str]) -> str | None:
    for text in texts:
        m = re.search(r"(\d+)\s*/\s*(\d+)\s*樓", text or "")
        if m:
            return f"{m.group(1)}F/{m.group(2)}F"
        m = re.search(r"(\d+)\s*樓", text or "")
        if m:
            return f"{m.group(1)}F"
    return None


# ── 591 parser ─────────────────────────────────────────────────────────────────

def _parse_591(url: str, soup: BeautifulSoup) -> dict[str, Any]:
    result: dict[str, Any] = {"source": "591", "url": url}

    # source_id from URL
    if m := re.search(r"rent-detail-(\d+)", url):
        result["source_id"] = m.group(1)

    # Try embedded JSON (Vue app may inject window.__INITIAL_STATE__ or similar)
    for script in soup.find_all("script"):
        text = script.string or ""
        # 591 sometimes embeds data as window.pageDetail = {...}
        for pattern in [
            r"window\.__INITIAL_STATE__\s*=\s*(\{.+?\});?\s*(?:</script>|window\.)",
            r"window\.pageDetail\s*=\s*(\{.+?\});",
        ]:
            jm = re.search(pattern, text, re.DOTALL)
            if jm:
                try:
                    data = json.loads(jm.group(1))
                    _apply_591_json(data, result)
                except Exception:
                    pass

    # OG / meta fallback
    og_title = _og(soup, "og:title")
    og_desc = _og(soup, "og:description")
    page_title_tag = soup.find("title")
    page_title = page_title_tag.get_text() if page_title_tag else ""

    # Clean page title: strip "- 591租屋網" suffix
    clean_page_title = re.sub(r"\s*[-–—]\s*591租屋網.*$", "", page_title).strip()

    texts = [og_title, og_desc, clean_page_title, page_title]

    if "title" not in result:
        raw = og_title or clean_page_title
        if raw:
            result["title"] = raw

    if "rent_price" not in result:
        price = _extract_price(texts)
        if price:
            result["rent_price"] = price

    if "district" not in result:
        district = _extract_district(texts)
        if district:
            result["district"] = district

    if "floor" not in result:
        floor = _extract_floor(texts)
        if floor:
            result["floor"] = floor

    # Try address from og:description (often starts with "地址：...")
    if "address" not in result:
        for text in [og_desc, og_title]:
            am = re.search(r"(?:地址[：:]?\s*)([^\s,，。!！]+(?:[路街道巷弄號][^\s,，。!！]{0,10})?)", text or "")
            if am:
                result["address"] = am.group(1)
                break

    # Pet / cooking from description keywords
    if "pet_friendly" not in result and og_desc:
        if "可養寵" in og_desc or "寵物友善" in og_desc:
            result["pet_friendly"] = True
        elif "不可養寵" in og_desc or "禁止養寵" in og_desc:
            result["pet_friendly"] = False

    if "cooking_allowed" not in result and og_desc:
        if "可開伙" in og_desc or "允許開伙" in og_desc:
            result["cooking_allowed"] = True
        elif "不可開伙" in og_desc or "禁止開伙" in og_desc:
            result["cooking_allowed"] = False

    return result


def _apply_591_json(data: dict, result: dict) -> None:
    """Best-effort extraction from whatever JSON shape 591 embeds."""
    def _get(*keys: str) -> Any:
        node = data
        for k in keys:
            if not isinstance(node, dict):
                return None
            node = node.get(k)
        return node

    if title := _get("detail", "title") or _get("info", "title"):
        result["title"] = title
    if price := _get("detail", "price") or _get("info", "price"):
        try:
            result["rent_price"] = int(str(price).replace(",", ""))
        except ValueError:
            pass
    if address := _get("detail", "address") or _get("info", "address"):
        result["address"] = address
    if district := _get("detail", "region_name") or _get("info", "section_name"):
        result["district"] = district
    if floor := _get("detail", "floor_name"):
        result["floor"] = str(floor)


# ── Generic parser ─────────────────────────────────────────────────────────────

def _parse_generic(url: str, soup: BeautifulSoup) -> dict[str, Any]:
    result: dict[str, Any] = {"source": "Manual", "url": url}

    og_title = _og(soup, "og:title")
    og_desc = _og(soup, "og:description")
    page_title_tag = soup.find("title")
    page_title = page_title_tag.get_text() if page_title_tag else ""

    texts = [og_title, og_desc, page_title]

    if og_title or page_title:
        result["title"] = og_title or page_title.strip()

    price = _extract_price(texts)
    if price:
        result["rent_price"] = price

    district = _extract_district(texts)
    if district:
        result["district"] = district

    floor = _extract_floor(texts)
    if floor:
        result["floor"] = floor

    return result


# ── Public entry point ─────────────────────────────────────────────────────────

async def scrape_url(url: str) -> dict[str, Any]:
    """
    Fetch *url* and return a dict of extracted house fields.
    Never raises — on any error returns {"url": url, "source": "Manual", "error": "..."}.
    """
    try:
        async with httpx.AsyncClient(
            headers=_HEADERS,
            follow_redirects=True,
            timeout=12,
            verify=False,   # 部分台灣網站（如 591）SSL 憑證不符規範
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
    except Exception as exc:
        return {"url": url, "source": "Manual", "error": f"無法取得頁面：{exc}"}

    soup = BeautifulSoup(resp.text, "html.parser")

    if "591.com.tw" in url:
        return _parse_591(url, soup)

    return _parse_generic(url, soup)
