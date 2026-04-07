# Renthouse Tracker - 系統規格與開發藍圖 (Project Spec)

> **實作狀態標記說明**：✅ 已完成 ｜ 🚧 部分完成（骨架存在，有 TODO）｜ ❌ 未完成

## 1. 專案概述 (Project Overview)
本專案為一個租屋物件評估與管理系統，旨在透過整合通勤時間計算、生活圈等時圈分析以及氣候數據，輔助使用者客觀篩選並紀錄租屋物件。

## 2. 技術堆疊 (Tech Stack)
* **Backend Framework**: Python + FastAPI
* **API 文件**: Swagger UI（FastAPI 內建，路徑 `/docs`）
* **Database**: PostgreSQL + **PostGIS 擴充**（預計部署於 Zeabur）
* **ORM / Database Toolkit**: SQLAlchemy（搭配 GeoAlchemy2 處理空間欄位）
* **DB 遷移**: Alembic
* **Background Jobs / Crawler Integration**: 使用 APScheduler（AsyncIOScheduler）定期執行排程抓取，透過可插拔的 `listing_provider` 介面取得物件資料；亦支援透過 `/api/crawler/ingest` 接收外部推送。
* **HTTP Client**: httpx（用於實價登錄 CSV 下載，直接呼叫政府 `/DownloadSeason` 端點）
* **Frontend**: React + Vite + TypeScript（含登入、設定、物件管理、等時圈地圖、實價登錄查詢等完整頁面）
* **套件管理（後端）**: uv
* **套件管理（前端）**: yarn

---

## 3. 核心功能需求 (Core Features)

### 3.1 使用者偏好設定 (User Preferences)
* **條件與願望清單**: 條列式紀錄對租屋的期望（如：採光好、垃圾代收）。
* **現有租屋不滿清單**: 條列式紀錄目前居住地的缺點，作為新物件的避雷參考。
* **公司地址設定**: 設定一筆基準地點（公司/常用地點），用於計算通勤時間與生成等時圈。

### 3.2 物件紀錄與評估 (Property Tracking)
* **手動物件建檔**: 紀錄地區、租金、詳細地址、樓層、管理費、可否養寵、可否開伙、個人評分（1–10）、備忘等欄位。
* **URL 爬蟲輔助建檔**: 貼上租屋網站連結，後端自動解析並填入欄位（`POST /api/houses/scrape`）。
* **自動化資料關聯**: 新增物件時，後端須自動觸發以下行為：
    1. **地理編碼（Geocoding）**: 呼叫 Google Geocoding API，將文字地址轉為經緯度座標（`coordinates`）。✅
    2. **通勤時間計算**: 計算該地址至公司地址的汽/機車通勤時間。✅
    3. **氣候資料關聯**: 檢查並關聯該物件所屬行政區的氣候資料。✅

### 3.3 通勤與生活圈分析 (Commute & Isochrone Analysis)
* **點對點通勤預估**: 根據**抵達時間**（如早上 9:00），分別計算機車與汽車的預估行程時間與距離，並推算需幾點出發；抵達時間記錄於 `CommuteRecords.arrival_time`。✅
* **等時圈篩選 (Isochrone Map)**: 以公司地址為中心，生成「30 分鐘車程」的多邊形範圍 (GeoJSON)，快取於 `IsochroneCache`，用以快速判斷新物件是否落在合理通勤範圍內。✅

### 3.4 氣候數據追蹤 (Climate Data)
* **行政區氣候快取**: 以「行政區」為單位紀錄過去一年的平均濕度與降雨數據。✅
* **API 節流策略**: 僅在資料庫缺乏該行政區資料時，才向外部氣候 API 發出請求並將結果持久化至 DB。✅

### 3.5 爬蟲自動化串接 (Crawler Integration)
* **APScheduler 定期爬取**：透過 `listing_provider` 介面取得物件資料，以排程自動執行，亦可手動觸發或透過 Webhook 推送。✅
* **去重與更新邏輯**: 以 `(source, source_id)` 為唯一鍵。✅
  * 若 DB 中不存在該 `source_id` → 直接新增。
  * 若已存在 → 比對核心欄位（租金、地址、標題），若有變動則更新並記錄 `updated_at`，無變動則跳過。

---

## 4. 認證機制 (Authentication) ✅
本專案為個人使用工具，採**單一管理員帳號 + JWT**的輕量認證策略：
* 管理員帳密以環境變數設定（`ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH`），無需公開註冊。
* 登入後取得 JWT Token，前端存於 `localStorage`，後續 API 請求夾帶 `Authorization: Bearer <token>`。

---

## 5. 資料庫架構規劃 (Database Schema)

* **`User`** ✅
    * `id`: UUID
    * `username`: String (UNIQUE)
    * `password_hash`: String
    * `wishlist`: JSONB (願望清單)
    * `dislikes`: JSONB (不滿清單)
    * `company_label`: String (公司名稱標籤，例如：公司A)
    * `company_address`: String (公司文字地址)
    * `company_coordinates`: GEOMETRY(Point, 4326) (公司座標)
    * `current_address`: Text NULLABLE (現居地址)
    * `current_coordinates`: GEOMETRY(Point, 4326) NULLABLE (現居座標，由 Geocoding 自動填入)
    * `current_district`: String(100) NULLABLE (現居行政區)
    * `commute_arrival_times`: JSONB NULLABLE (使用者設定的目標抵達時間清單，例如：["09:00"]，未設定時預設 09:00)
    * `current_commute_cache`: JSONB NULLABLE (現居→公司通勤快取，格式同 CommuteRecords)

* **`Houses`** ✅
    * `id`: UUID
    * `source`: String (Manual, Crawler, FB_Group)
    * `source_id`: String NULLABLE (爬蟲來源的原始 ID，用於去重)
    * `url`: String NULLABLE (物件來源連結)
    * `title`: String (物件名稱)
    * `address`: String (詳細地址)
    * `district`: String NULLABLE (行政區，例如：台北市中山區)
    * `coordinates`: GEOMETRY(Point, 4326) NULLABLE (經緯度，由 Geocoding 自動填入)
    * `rent_price`: Integer NULLABLE
    * `floor`: String NULLABLE
    * `size_ping`: Float NULLABLE (坪數，Alembic v2 新增)
    * `management_fee`: Integer NULLABLE
    * `pet_friendly`: Boolean NULLABLE
    * `cooking_allowed`: Boolean NULLABLE
    * `status`: String (active / rented / dismissed / 待確認，手動新增預設 active，爬蟲預設 待確認)
    * `user_rating`: Integer NULLABLE (個人評分，範圍 1–10)
    * `notes`: Text NULLABLE (個人備忘)
    * `raw_data`: JSONB NULLABLE (爬蟲原始資料備份)
    * `created_at`: Timestamp
    * `updated_at`: Timestamp
    * **UNIQUE CONSTRAINT**: `(source, source_id)` WHERE `source_id IS NOT NULL`

* **`CommuteRecords`** ✅
    * `id`: UUID
    * `house_id`: UUID (Foreign Key → Houses)
    * `company_label`: String (對應 User 的公司標籤)
    * `travel_mode`: String (DRIVE, TWO_WHEELER)
    * `arrival_time`: Time (目標抵達時間，例如：09:00；出發時間由前端以 arrival_time - estimated_time_mins 推算)
    * `estimated_time_mins`: Integer
    * `distance_km`: Float
    * `calculated_at`: Timestamp

* **`IsochroneCache`** ✅
    * `id`: UUID (PK)
    * `company_address_key`: String (公司地址的 hash 或標籤)
    * `travel_mode`: String (DRIVE, TWO_WHEELER)
    * `duration_mins`: Integer (等時圈時間門檻，例如：30)
    * `polygon`: GEOMETRY(Polygon, 4326)
    * `generated_at`: Timestamp

* **`DistrictsClimate`** ✅
    * `district_name`: String (Primary Key)
    * `avg_humidity`: Float
    * `rainy_days_per_year`: Integer
    * `last_updated`: Timestamp

* **`RealPriceRecords`** ✅
    * `id`: String (UUID)
    * `transaction_type`: String (BUY / RENT)
    * `county`: String (縣市，例：台北市)
    * `street`: String (路段名稱，例：中山北路一段)
    * `year`: Integer (西元年)
    * `quarter`: Integer (1~4)
    * `price_min`: Float (買賣：最低每坪單價元；租賃：最低月租金總額元)
    * `price_avg`: Float (買賣：平均每坪單價元；租賃：平均月租金總額元)
    * `price_max`: Float (買賣：最高每坪單價元；租賃：最高月租金總額元)
    * `avg_size_ping`: Float NULLABLE (租賃專用：平均坪數)
    * `sample_count`: Integer (該季該路段筆數)
    * `created_at`: Timestamp
    * **UNIQUE CONSTRAINT**: `(county, street, transaction_type, year, quarter)`

* **`RealPriceSyncStatus`** ✅
    * `id`: Integer (PK, 固定為 1)
    * `status`: String (idle / running / done / error)
    * `total_quarters`: Integer
    * `done_quarters`: Integer
    * `message`: String NULLABLE
    * `started_at`: Timestamp NULLABLE
    * `finished_at`: Timestamp NULLABLE

---

## 6. API 端點規劃 (API Endpoints)

完整互動式文件由 Swagger UI 自動生成，路徑為 `/docs`。

### 認證 (Auth)
| Method | Path | 說明 | 狀態 |
|--------|------|------|------|
| POST | `/api/auth/login` | 登入，回傳 JWT Token | ✅ |

### 使用者偏好 (Preferences)
| Method | Path | 說明 | 狀態 |
|--------|------|------|------|
| GET | `/api/preferences` | 取得目前偏好設定（公司地址、現居地址、願望清單等）| ✅ |
| PUT | `/api/preferences` | 更新偏好設定（含現居地址，自動 Geocoding + 抓氣候）| ✅ |
| GET | `/api/preferences/current-residence/commute` | 取得現居→公司通勤快取 | ✅ |
| POST | `/api/preferences/current-residence/commute/refresh` | 重新計算現居→公司通勤並快取 | ✅ |
| GET | `/api/preferences/current-residence/air-quality` | 取得現居所在區的空氣品質 | ✅ |
| GET | `/api/preferences/current-residence/forecast` | 取得現居所在區的天氣預報 | ✅ |

### 物件管理 (Houses)
| Method | Path | 說明 | 狀態 |
|--------|------|------|------|
| GET | `/api/houses` | 列出物件（支援篩選：`status`, `district`, `min_rent`, `max_rent`, `pet_friendly`）| ✅ |
| POST | `/api/houses` | 手動新增物件（觸發 Geocoding + 通勤計算）| ✅ |
| POST | `/api/houses/scrape` | 貼入 URL，自動解析並回傳預填欄位（591 使用 Playwright 渲染頁面，從 DOM 提取完整欄位；其他網站使用 OG/Meta 降級）| ✅ |
| GET | `/api/houses/{id}` | 取得物件詳情（含通勤記錄）| ✅ |
| PATCH | `/api/houses/{id}` | 更新物件資訊（評分、備忘、狀態等）| ✅ |
| DELETE | `/api/houses/{id}` | 刪除物件 | ✅ |
| POST | `/api/houses/{id}/geocode` | 手動重新 geocode 單筆物件 | ✅ |
| GET | `/api/houses/{id}/air-quality` | 取得物件所在區的空氣品質 | ✅ |
| GET | `/api/houses/{id}/forecast` | 取得物件所在區的天氣預報 | ✅ |

### 通勤 (Commute)
| Method | Path | 說明 | 狀態 |
|--------|------|------|------|
| GET | `/api/houses/{id}/commute` | 取得該物件的通勤記錄 | ✅ |
| POST | `/api/houses/{id}/commute/refresh` | 重新計算通勤時間 | ✅ |

### 等時圈 (Isochrone)
| Method | Path | 說明 | 狀態 |
|--------|------|------|------|
| GET | `/api/isochrone` | 取得目前公司地址的等時圈 GeoJSON | ✅ |
| POST | `/api/isochrone/refresh` | 強制重新生成等時圈（快取失效）| ✅ |

### 氣候 (Climate)
| Method | Path | 說明 | 狀態 |
|--------|------|------|------|
| GET | `/api/climate/{district}` | 取得指定行政區的氣候資料 | ✅ |

### 實價登錄 (RealPrice)
| Method | Path | 說明 | 狀態 |
|--------|------|------|------|
| POST | `/api/real-price/sync` | 觸發背景下載任務（httpx 下載政府 CSV，10 年）| ✅ |
| GET | `/api/real-price/sync/status` | 查詢下載進度 | ✅ |
| GET | `/api/real-price/query?county=台北市&street=中山北路一段` | 查詢路段近 10 年買賣/租賃每坪統計 | ✅ |
| GET | `/api/real-price/debug` | 診斷：回傳縣市資料筆數與範例路段 | ✅ |
| GET | `/api/real-price/debug/csv-headers` | 診斷：下載並回傳 CSV 欄位名稱 | ✅ |

### 爬蟲排程 (Crawler)
| Method | Path | 說明 | 狀態 |
|--------|------|------|------|
| POST | `/api/crawler/run` | 手動觸發爬蟲（背景執行，需 JWT）| ✅ |
| GET | `/api/crawler/status` | 查詢爬蟲最近執行時間與結果（需 JWT）| ✅ |
| POST | `/api/crawler/ingest` | 接收外部推送的物件清單（需 JWT）| ✅ |

---

## 7. 外部 API 與服務 (External Services)

1. **Google Geocoding API**: 將文字地址轉為經緯度座標（手動建檔與爬蟲資料皆需）。✅
2. **Google Maps Routes API**: 用於精準計算物件到公司的汽/機車通勤時間（含出發時間參數）。✅
3. **Mapbox Isochrone API（或 TravelTime API）**: 用於取得公司周邊 30 分鐘車程的多邊形範圍 (GeoJSON)。✅
4. **CWA（中央氣象署）或 Open-Meteo API**: 取得行政區層級的歷史濕度與降雨資料。✅（使用 Open-Meteo Archive API，無需 Key）
5. **物件資料來源**：透過可插拔的 `listing_provider` 介面取得物件清單，以 APScheduler 定期執行；亦支援 `/api/crawler/ingest` Webhook 接收外部推送。✅

---

## 8. 前端現有頁面清單

| 路由 | 元件 | 狀態 |
|------|------|------|
| `/login` | LoginPage | ✅ |
| `/` | HousesPage（物件列表＋篩選排序＋刪除，NavBar 含等時圈入口；進入詳情後回上頁可恢復排序篩選與滾動位置） | ✅ |
| `/houses/new` | NewHousePage（URL 自動帶入 + 手動填寫） | ✅ |
| `/houses/:id/edit` | EditHousePage（編輯欄位） | ✅ |
| `/houses/:id` | HouseDetailPage（完整資訊＋通勤時程預估＋現居 vs 此物件比較）| ✅ |
| `/preferences` | PreferencesPage（公司地址＋願望清單＋不滿清單） | ✅ |
| `/isochrone` | IsochronePage（Leaflet 地圖＋重新生成＋物件座標標記＋popup 含詳情連結） | ✅ |
| `/real-price` | RealPricePage（縣市＋路段查詢，買賣/租賃折線圖＋統計表，首次觸發政府資料下載） | ✅ |

---

## 9. 爬蟲自動化串接 ✅

以 APScheduler 在後端直接排程，由 `listing_provider.py` 提供物件資料。

### 架構

| 元件 | 路徑 |
|------|------|
| 物件資料 Provider 介面 | `backend/app/services/listing_provider.py` |
| APScheduler 排程器 | `backend/app/scheduler.py` |
| 手動觸發 / 狀態查詢 API | `backend/app/routers/crawler.py` |

### 搜尋條件設定

直接修改 `backend/app/crawler_config.py`：

```python
REGION_IDS = [1, 3]   # 台北 + 新北
KIND = "1"            # 整層住家（排除套房/雅房/分租/共生）
RENT_MAX = 25000      # 租金上限
AREA_MIN = 30         # 30 坪以上
PET = True
COOK = True
CRON = "0 8 * * 1,3,5"  # 一三五早上 8 點
```

### `.env` 只需設定開關

```
CRAWLER_ENABLED=true
```

### 爬蟲流程

1. 呼叫 `listing_provider.fetch_listings()` 取得物件清單（支援分頁）
2. 每筆物件套用 **關鍵字過濾** → **geocoding** → **(source, source_id) 去重** → **新增或更新**

### Provider 介面 Schema

`fetch_listings()` 回傳格式：

```python
{
    "source":     str,           # 資料來源名稱
    "source_id":  str,           # 來源平台的物件 ID（用於去重）
    "title":      str,
    "address":    str,
    "district":   str | None,
    "rent_price": int | None,
    "floor":      str | None,
    "size_ping":  float | None,
    "url":        str | None,
    "raw_data":   dict | None,
}
```

### API 端點

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/crawler/run` | 手動立即觸發爬蟲（需 JWT）|
| GET | `/api/crawler/status` | 查詢最近一次執行時間與結果（需 JWT）|
| POST | `/api/crawler/ingest` | 接收外部推送的物件清單（本地爬蟲 + Webhook 共用）|

### 注意事項
- `listing_provider.py` 預設為空實作，需自行依目標平台實作 `fetch_listings()`
- 爬蟲僅抓清單摘要資料（address 通常只有行政區），詳細地址需另爬詳情頁或手動補充
- 亦可透過 `/api/crawler/ingest` 從本地腳本（`scripts/crawl_and_push.py`）推送資料

