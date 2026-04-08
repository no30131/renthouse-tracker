"""
URL scraper — fetches a rental listing page and extracts structured fields.

Supported sites with dedicated parsers:
  - rent.591.com.tw  → Playwright（真實瀏覽器，解析 window.__NUXT__ 取完整欄位）
  - m.591.com.tw

All other URLs fall back to generic OG / meta-tag extraction via httpx.
"""

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

# ── Generic helpers ─────────────────────────────────────────────────────────────

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
                if 1000 <= val <= 500_000:
                    return val
    return None


def _extract_district(texts: list[str]) -> str | None:
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


# ── 591 Playwright scraper ──────────────────────────────────────────────────────

# 從已渲染的 DOM 提取 591 detail 資料
_JS_EXTRACT_DETAIL = """
(() => {
  const txt = el => el ? el.textContent.trim() : '';
  const find = sel => document.querySelector(sel);
  const findAll = sel => [...document.querySelectorAll(sel)];

  const result = {};

  // 標題
  const titleEl = find('h1') || find('[class*="title"]');
  if (titleEl) result.title = txt(titleEl).replace(/\\s*-\\s*591租屋網.*$/, '').trim();

  // 地址
  const addrEl = find('[class*="address"]') || find('[class*="addr"]');
  if (addrEl) result.address = txt(addrEl);

  // 租金：找包含「元/月」或「/月」的元素
  const allText = document.body.innerText;
  const priceM = allText.match(/(\\d[\\d,]+)\\s*元?\\/月/);
  if (priceM) result.price = parseInt(priceM[1].replace(/,/g, ''));

  // 樓層：多種格式
  // "5/12樓", "5樓/共12樓", "第5層/共12層", "5F/12F"
  const floorPatterns = [
    [/(\\d+)\\s*[\\/／]\\s*(\\d+)\\s*樓/, (m) => m[1]+'F/'+m[2]+'F'],
    [/第\\s*(\\d+)\\s*[層樓][^共]*共\\s*(\\d+)/, (m) => m[1]+'F/'+m[2]+'F'],
    [/(\\d+)\\s*樓\\s*[\\/／]\\s*共\\s*(\\d+)/, (m) => m[1]+'F/'+m[2]+'F'],
    [/(\\d+)\\s*[FfＦ][\\s\\/／]+(\\d+)\\s*[FfＦ]/, (m) => m[1]+'F/'+m[2]+'F'],
    [/樓層[^\\d]*(\\d+)\\s*[\\/／]\\s*(\\d+)/, (m) => m[1]+'F/'+m[2]+'F'],
    [/(\\d+)\\s*樓/, (m) => m[1]+'F'],
  ];
  for (const [pat, fmt] of floorPatterns) {
    const m = allText.match(pat);
    if (m) { result.floor_name = fmt(m); break; }
  }
  // 坪數
  const areaM = allText.match(/([\\d.]+)\\s*坪/);
  if (areaM) result.area = parseFloat(areaM[1]);

  // 行政區（從地址抽）
  const distM = (result.address || allText).match(/[^\\s市縣]{2,4}[區鄉鎮]/);
  if (distM) result.section_name = distM[0];

  // 條件標籤（找所有 tag/label 類元素文字）
  const tagTexts = findAll('[class*="tag"], [class*="label"], [class*="condition"], [class*="feature"]')
    .map(el => txt(el)).filter(t => t.length < 20);
  result._tags = tagTexts;

  return result;
})()
"""


def _map_591_detail(raw: dict, post_id: str, url: str) -> dict[str, Any]:
    """將從 window.__NUXT__ 取出的物件轉換為 house fields。"""
    result: dict[str, Any] = {"source": "591", "url": url, "source_id": post_id}

    if title := raw.get("title") or raw.get("name"):
        # 清除 "- 591租屋網" 後綴
        result["title"] = re.sub(r"\s*[-–—]\s*591租屋網.*$", "", str(title)).strip()

    price_raw = raw.get("price") or raw.get("rent_price") or ""
    try:
        result["rent_price"] = int(str(price_raw).replace(",", "").strip())
    except (ValueError, AttributeError):
        pass

    # 行政區：section_name / region_name，fallback 從 address 抽取
    section_raw = str(raw.get("section_name") or "").strip()
    # 過濾掉「址:」等前綴，只保留行政區部分
    m_sec = re.search(r"[^\s:：市縣]{2,4}[區鄉鎮]", section_raw)
    section = m_sec.group(0) if m_sec else ""
    region = str(raw.get("region_name") or "").strip()
    address_raw = re.sub(r"^地址[：:]\s*", "", str(raw.get("address") or "").strip())
    if section:
        result["district"] = section
    elif region:
        result["district"] = region
    elif address_raw:
        m = re.search(r"(?<=[市縣])[^\s市縣]{2,4}[區鄉鎮]|^[^\s市縣]{2,4}[區鄉鎮]", address_raw)
        if m:
            result["district"] = m.group(0)

    if address_raw:
        result["address"] = address_raw.replace("-", "")

    # 樓層：多個可能的欄位名稱
    floor_raw = (raw.get("floor_name") or raw.get("floor") or
                 raw.get("storey") or raw.get("floorName") or "")
    if floor_raw:
        result["floor"] = str(floor_raw).strip()

    area_raw = raw.get("area") or raw.get("ping") or raw.get("area_ping") or ""
    try:
        result["size_ping"] = float(str(area_raw).strip())
    except (ValueError, AttributeError):
        pass

    # 可養寵物 / 可開伙：tags / facility / condition / label / _tags 都試
    def _iter_text(key: str) -> str:
        items = raw.get(key) or []
        if not isinstance(items, list):
            return str(items)
        parts = []
        for item in items:
            if isinstance(item, dict):
                parts.append(str(item.get("name") or item.get("value") or item.get("desc") or ""))
            else:
                parts.append(str(item))
        return " ".join(parts)

    full_text = " ".join([
        _iter_text("tags"), _iter_text("facility"), _iter_text("_tags"),
        _iter_text("condition"), _iter_text("label"),
        str(raw.get("pet") or ""), str(raw.get("cook") or ""),
    ])

    if "可養寵" in full_text or "寵物友善" in full_text:
        result["pet_friendly"] = True
    elif "不可養寵" in full_text or "禁止養寵" in full_text:
        result["pet_friendly"] = False

    if "可開伙" in full_text or "允許開伙" in full_text:
        result["cooking_allowed"] = True
    elif "不可開伙" in full_text or "禁止開伙" in full_text:
        result["cooking_allowed"] = False

    return result


def _extract_591_post_id(url: str) -> str | None:
    if m := re.search(r"rent-detail-(\d+)", url):
        return m.group(1)
    if m := re.search(r"591\.com\.tw/(\d{6,})", url):
        return m.group(1)
    return None


async def _scrape_591_playwright(url: str, post_id: str) -> dict[str, Any]:
    import asyncio
    from playwright.async_api import async_playwright

    captured: dict = {}

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
            ],
        )
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            locale="zh-TW",
            timezone_id="Asia/Taipei",
        )
        await context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        page = await context.new_page()

        async def on_response(response):
            if "bff-house.591.com.tw/v1/rent/community" in response.url:
                try:
                    import json as _json
                    body = _json.loads(await response.body())
                    if isinstance(body.get("data"), dict):
                        captured.update(body["data"])
                except Exception:
                    pass

        page.on("response", on_response)

        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
            for _ in range(6):
                if captured:
                    break
                await asyncio.sleep(0.5)
            raw = await page.evaluate(_JS_EXTRACT_DETAIL)
        finally:
            await browser.close()

    if captured:
        return _map_591_detail(captured, post_id, url)

    if raw:
        return _map_591_detail(raw, post_id, url)

    return {"url": url, "source": "591", "source_id": post_id,
            "error": "無法取得完整資料，請手動補充"}


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

_DEMO_DATA: dict[str, Any] = {
    "source": "591",
    "source_id": "20000000",
    "url": "",
    "title": "中山商圈精品屋",
    "address": "中山區新生北路一段",
    "district": "中山區",
    "rent_price": 40000,
    "size_ping": 30,
    "floor": "7F/10F",
    "pet_friendly": False,
    "cooking_allowed": True,
}


async def scrape_url(url: str) -> dict[str, Any]:
    """
    Fetch *url* and return a dict of extracted house fields.
    Never raises — on any error returns {"url": url, "source": "Manual", "error": "..."}.
    """
    if "20xxxxxxx" in url.lower():
        return {**_DEMO_DATA, "url": url}

    if "591.com.tw" in url:
        post_id = _extract_591_post_id(url)
        if not post_id:
            return {"url": url, "source": "591", "error": "無法從網址中解析物件 ID"}
        try:
            return await _scrape_591_playwright(url, post_id)
        except Exception as exc:
            return {"url": url, "source": "591", "error": f"Playwright 錯誤：{exc}"}

    # 其他網站：OG meta 爬蟲
    try:
        async with httpx.AsyncClient(
            headers=_HEADERS,
            follow_redirects=True,
            timeout=12,
            verify=False,
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
    except Exception as exc:
        return {"url": url, "source": "Manual", "error": f"無法取得頁面：{exc}"}

    soup = BeautifulSoup(resp.text, "html.parser")
    return _parse_generic(url, soup)
