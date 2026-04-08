// ── Demo Mode 假資料 ──────────────────────────────────────────────────────────
// 所有資料均為虛構，僅供展示用途

export const MOCK_HOUSES = [
  {
    id: "demo-house-001",
    title: "信義區精裝兩房 近捷運",
    address: "台北市信義區忠孝東路五段",
    district: "信義區",
    rent_price: 28000,
    size_ping: 14,
    floor: "8F / 12F",
    status: "考慮中",
    user_rating: 8,
    pet_friendly: false,
    cooking_allowed: true,
    notes: "採光很好，離公司近，但價格偏高",
    url: "https://rent.591.com.tw/list?region=1",
    source: "demo",
    created_at: "2026-03-15T10:00:00Z",
    updated_at: "2026-03-20T08:30:00Z",
    lat: 25.0417,
    lng: 121.5654,
    min_distance_km: 1.2,
    min_commute_mins: 8,
  },
  {
    id: "demo-house-002",
    title: "大安區溫馨套房 有陽台",
    address: "台北市大安區和平東路二段",
    district: "大安區",
    rent_price: 16500,
    size_ping: 8,
    floor: "3F / 6F",
    status: "已看房",
    user_rating: 9,
    pet_friendly: true,
    cooking_allowed: true,
    notes: "社區環境超棒，鄰居都很安靜，強烈考慮中",
    url: "https://rent.591.com.tw/list?region=1",
    source: "demo",
    created_at: "2026-03-10T09:00:00Z",
    updated_at: "2026-03-22T11:00:00Z",
    lat: 25.0264,
    lng: 121.5454,
    min_distance_km: 3.4,
    min_commute_mins: 18,
  },
  {
    id: "demo-house-003",
    title: "松山區一房一廳 近捷運",
    address: "台北市松山區南京東路四段",
    district: "松山區",
    rent_price: 19800,
    size_ping: 11,
    floor: "5F / 10F",
    status: "待確認",
    user_rating: 7,
    pet_friendly: null,
    cooking_allowed: false,
    notes: "格局方正，不能開火有點可惜",
    url: "https://rent.591.com.tw/list?region=1",
    source: "demo",
    created_at: "2026-03-25T14:00:00Z",
    updated_at: "2026-03-25T14:00:00Z",
    lat: 25.0504,
    lng: 121.5631,
    min_distance_km: 2.1,
    min_commute_mins: 12,
  },
  {
    id: "demo-house-004",
    title: "中山區北歐風格局 新裝潢",
    address: "台北市中山區民生東路二段",
    district: "中山區",
    rent_price: 22000,
    size_ping: 12,
    floor: "6F / 8F",
    status: "考慮中",
    user_rating: 8,
    pet_friendly: false,
    cooking_allowed: true,
    notes: "裝潢質感很好，但離公司稍遠",
    url: "https://rent.591.com.tw/list?region=1",
    source: "demo",
    created_at: "2026-03-18T16:00:00Z",
    updated_at: "2026-03-28T09:00:00Z",
    lat: 25.0598,
    lng: 121.5313,
    min_distance_km: 4.8,
    min_commute_mins: 25,
  },
  {
    id: "demo-house-005",
    title: "文山區舊公寓 環境幽靜",
    address: "台北市文山區羅斯福路六段",
    district: "文山區",
    rent_price: 11000,
    size_ping: 6,
    floor: "2F / 4F",
    status: "已放棄",
    user_rating: 4,
    pet_friendly: false,
    cooking_allowed: false,
    notes: "太老舊了，通勤也太遠，放棄",
    url: "https://rent.591.com.tw/list?region=1",
    source: "demo",
    created_at: "2026-02-20T10:00:00Z",
    updated_at: "2026-03-01T12:00:00Z",
    lat: 24.9889,
    lng: 121.5702,
    min_distance_km: 8.9,
    min_commute_mins: 42,
  },
];

export const MOCK_PREFERENCES = {
  company_label: "公司",
  company_address: "台北市信義區市府路1號",
  company_lat: 25.0408,
  company_lng: 121.5679,
  wishlist: ["近捷運", "採光好", "安靜", "可開伙"],
  dislikes: ["頂樓加蓋", "潮濕", "西曬"],
  commute_arrival_times: ["09:00", "09:30"],
  current_address: "台北市中正區忠孝東路一段",
  current_district: "中正區",
  current_lat: 25.0444,
  current_lng: 121.5178,
};

export const MOCK_COMMUTE_BY_HOUSE: Record<string, object[]> = {
  default: [
    {
      id: "commute-001",
      travel_mode: "MOTORCYCLE",
      arrival_time: "09:00",
      estimated_time_mins: 15,
      distance_km: 4.2,
      calculated_at: "2026-03-20T08:00:00Z",
    },
    {
      id: "commute-002",
      travel_mode: "DRIVE",
      arrival_time: "09:00",
      estimated_time_mins: 22,
      distance_km: 5.1,
      calculated_at: "2026-03-20T08:00:00Z",
    },
  ],
  "demo-house-001": [
    {
      id: "commute-h1-001",
      travel_mode: "MOTORCYCLE",
      arrival_time: "09:00",
      estimated_time_mins: 8,
      distance_km: 1.2,
      calculated_at: "2026-03-20T08:00:00Z",
    },
    {
      id: "commute-h1-002",
      travel_mode: "DRIVE",
      arrival_time: "09:00",
      estimated_time_mins: 12,
      distance_km: 1.8,
      calculated_at: "2026-03-20T08:00:00Z",
    },
  ],
  "demo-house-002": [
    {
      id: "commute-h2-001",
      travel_mode: "MOTORCYCLE",
      arrival_time: "09:00",
      estimated_time_mins: 18,
      distance_km: 3.4,
      calculated_at: "2026-03-20T08:00:00Z",
    },
    {
      id: "commute-h2-002",
      travel_mode: "DRIVE",
      arrival_time: "09:00",
      estimated_time_mins: 28,
      distance_km: 4.2,
      calculated_at: "2026-03-20T08:00:00Z",
    },
  ],
};

export const MOCK_CURRENT_COMMUTE = [
  {
    travel_mode: "MOTORCYCLE",
    arrival_time: "09:00",
    estimated_time_mins: 20,
    distance_km: 6.3,
    calculated_at: "2026-03-20T08:00:00Z",
  },
  {
    travel_mode: "DRIVE",
    arrival_time: "09:00",
    estimated_time_mins: 30,
    distance_km: 7.1,
    calculated_at: "2026-03-20T08:00:00Z",
  },
];

export const MOCK_CLIMATE_BY_DISTRICT: Record<string, object> = {
  default: {
    district_name: "信義區",
    avg_humidity: 76.4,
    rainy_days_per_year: 98,
    avg_temp_celsius: 24.1,
    sunshine_hours_per_year: 1823,
  },
  信義區: {
    district_name: "信義區",
    avg_humidity: 76.4,
    rainy_days_per_year: 98,
    avg_temp_celsius: 24.1,
    sunshine_hours_per_year: 1823,
  },
  大安區: {
    district_name: "大安區",
    avg_humidity: 77.1,
    rainy_days_per_year: 102,
    avg_temp_celsius: 23.8,
    sunshine_hours_per_year: 1790,
  },
  松山區: {
    district_name: "松山區",
    avg_humidity: 75.8,
    rainy_days_per_year: 96,
    avg_temp_celsius: 24.3,
    sunshine_hours_per_year: 1845,
  },
  中山區: {
    district_name: "中山區",
    avg_humidity: 76.0,
    rainy_days_per_year: 99,
    avg_temp_celsius: 24.0,
    sunshine_hours_per_year: 1810,
  },
  文山區: {
    district_name: "文山區",
    avg_humidity: 80.2,
    rainy_days_per_year: 115,
    avg_temp_celsius: 23.2,
    sunshine_hours_per_year: 1650,
  },
  中正區: {
    district_name: "中正區",
    avg_humidity: 75.5,
    rainy_days_per_year: 95,
    avg_temp_celsius: 24.2,
    sunshine_hours_per_year: 1860,
  },
};

const MOCK_FORECAST = [
  { date: "2026-04-08", weather_icon: "01d", weather_desc: "晴天", temp_max: 29, temp_min: 22, precipitation_probability: 5, precipitation_mm: 0, windspeed_max_kmh: 12, uv_index_max: 8 },
  { date: "2026-04-09", weather_icon: "02d", weather_desc: "多雲時晴", temp_max: 27, temp_min: 21, precipitation_probability: 15, precipitation_mm: 0.2, windspeed_max_kmh: 15, uv_index_max: 6 },
  { date: "2026-04-10", weather_icon: "10d", weather_desc: "陣雨", temp_max: 24, temp_min: 20, precipitation_probability: 70, precipitation_mm: 8.5, windspeed_max_kmh: 20, uv_index_max: 2 },
  { date: "2026-04-11", weather_icon: "10d", weather_desc: "小雨", temp_max: 22, temp_min: 19, precipitation_probability: 60, precipitation_mm: 5.2, windspeed_max_kmh: 18, uv_index_max: 1 },
  { date: "2026-04-12", weather_icon: "03d", weather_desc: "陰天", temp_max: 25, temp_min: 20, precipitation_probability: 30, precipitation_mm: 1.0, windspeed_max_kmh: 14, uv_index_max: 3 },
  { date: "2026-04-13", weather_icon: "02d", weather_desc: "多雲", temp_max: 28, temp_min: 22, precipitation_probability: 10, precipitation_mm: 0, windspeed_max_kmh: 10, uv_index_max: 7 },
  { date: "2026-04-14", weather_icon: "01d", weather_desc: "晴天", temp_max: 31, temp_min: 23, precipitation_probability: 5, precipitation_mm: 0, windspeed_max_kmh: 8, uv_index_max: 9 },
];
export { MOCK_FORECAST };

const MOCK_AIR_QUALITY = {
  pm2_5: 12.3,
  pm10: 28.5,
  european_aqi: 25,
  aqi_label: "良好",
  aqi_color: "#10B981",
  pm25_label: "良好",
  pm25_color: "#10B981",
  uv_index_max: 8,
};
export { MOCK_AIR_QUALITY };

// 等時圈 GeoJSON（以台北市府附近為中心，手繪近似多邊形）
export const MOCK_ISOCHRONE = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [121.615, 25.041], [121.608, 25.068], [121.580, 25.085],
          [121.548, 25.080], [121.525, 25.058], [121.528, 25.028],
          [121.550, 25.010], [121.582, 25.008], [121.610, 25.022],
          [121.615, 25.041],
        ]],
      },
      properties: { travel_mode: "MOTORCYCLE", duration_mins: 20, generated_at: "2026-03-20T08:00:00Z" },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [121.650, 25.041], [121.638, 25.085], [121.610, 25.108],
          [121.565, 25.112], [121.528, 25.105], [121.502, 25.078],
          [121.495, 25.045], [121.505, 25.010], [121.535, 24.985],
          [121.572, 24.980], [121.610, 24.988], [121.638, 25.012],
          [121.650, 25.041],
        ]],
      },
      properties: { travel_mode: "MOTORCYCLE", duration_mins: 30, generated_at: "2026-03-20T08:00:00Z" },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [121.690, 25.041], [121.672, 25.102], [121.638, 25.132],
          [121.578, 25.140], [121.522, 25.132], [121.485, 25.098],
          [121.472, 25.052], [121.480, 25.008], [121.510, 24.968],
          [121.558, 24.952], [121.605, 24.955], [121.648, 24.975],
          [121.678, 25.010], [121.690, 25.041],
        ]],
      },
      properties: { travel_mode: "MOTORCYCLE", duration_mins: 40, generated_at: "2026-03-20T08:00:00Z" },
    },
  ],
};

export const DEMO_SCRAPE_URL = "https://rent.591.com.tw/20xxxxxxx";

export const MOCK_SCRAPE_RESULT = {
  title: "中山商圈精品屋",
  address: "中山區新生北路一段",
  district: "中山區",
  rent_price: 40000,
  size_ping: 30,
  floor: "7F/10F",
  source: "591",
  source_id: "20xxxxxxx",
  pet_friendly: false,
  cooking_allowed: true,
};

export const MOCK_REAL_PRICE: object[] = [
  {
    county: "台北市",
    street: "信義路五段",
    transaction_type: "RENT",
    data: [
      { year: 2016, price_min: 950, price_avg: 1250, price_max: 1800, avg_size_ping: 18, sample_count: 42 },
      { year: 2017, price_min: 980, price_avg: 1290, price_max: 1850, avg_size_ping: 17, sample_count: 38 },
      { year: 2018, price_min: 1000, price_avg: 1320, price_max: 1900, avg_size_ping: 17, sample_count: 45 },
      { year: 2019, price_min: 1050, price_avg: 1380, price_max: 2000, avg_size_ping: 16, sample_count: 51 },
      { year: 2020, price_min: 1020, price_avg: 1350, price_max: 1980, avg_size_ping: 16, sample_count: 39 },
      { year: 2021, price_min: 1080, price_avg: 1420, price_max: 2100, avg_size_ping: 15, sample_count: 47 },
      { year: 2022, price_min: 1150, price_avg: 1520, price_max: 2250, avg_size_ping: 15, sample_count: 53 },
      { year: 2023, price_min: 1200, price_avg: 1600, price_max: 2400, avg_size_ping: 14, sample_count: 61 },
      { year: 2024, price_min: 1280, price_avg: 1680, price_max: 2550, avg_size_ping: 14, sample_count: 58 },
      { year: 2025, price_min: 1350, price_avg: 1780, price_max: 2700, avg_size_ping: 13, sample_count: 44 },
    ],
  },
];
