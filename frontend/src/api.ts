import axios, { type AxiosInstance } from "axios";
import {
  MOCK_HOUSES,
  MOCK_PREFERENCES,
  MOCK_COMMUTE_BY_HOUSE,
  MOCK_CURRENT_COMMUTE,
  MOCK_CLIMATE_BY_DISTRICT,
  MOCK_FORECAST,
  MOCK_AIR_QUALITY,
  MOCK_ISOCHRONE,
  MOCK_REAL_PRICE,
  MOCK_SCRAPE_RESULT,
} from "./demo/mockData";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

// ── Real API ──────────────────────────────────────────────────────────────────
const realApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

realApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

realApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Demo API ──────────────────────────────────────────────────────────────────
function mockOk(data: unknown) {
  return Promise.resolve({ data, status: 200, statusText: "OK", headers: {}, config: {} });
}

function getDemoData(url: string): unknown {
  // Auth
  if (url === "/api/auth/login") return { access_token: "demo-token" };

  // Houses list
  if (url === "/api/houses") return MOCK_HOUSES;

  // Isochrone
  if (url === "/api/isochrone") return MOCK_ISOCHRONE;

  // Preferences
  if (url === "/api/preferences") return MOCK_PREFERENCES;

  // Current residence commute / forecast / air-quality
  if (url === "/api/preferences/current-residence/commute") return MOCK_CURRENT_COMMUTE;
  if (url === "/api/preferences/current-residence/forecast") return MOCK_FORECAST;
  if (url === "/api/preferences/current-residence/air-quality") return MOCK_AIR_QUALITY;

  // Climate by district
  if (url.startsWith("/api/climate/")) {
    const district = decodeURIComponent(url.split("/api/climate/")[1].split("?")[0]);
    return MOCK_CLIMATE_BY_DISTRICT[district] ?? MOCK_CLIMATE_BY_DISTRICT["default"];
  }

  // Real price
  if (url.startsWith("/api/real-price/query")) return MOCK_REAL_PRICE;
  if (url.startsWith("/api/real-price/debug")) return { total_records: 1240 };
  if (url.startsWith("/api/real-price/sync/status")) {
    return { status: "done", total_quarters: 4, done_quarters: 4, message: null, started_at: null, finished_at: null };
  }

  // House detail  /api/houses/:id
  const houseMatch = url.match(/^\/api\/houses\/([\w-]+)$/);
  if (houseMatch) {
    const id = houseMatch[1];
    return MOCK_HOUSES.find((h) => h.id === id) ?? MOCK_HOUSES[0];
  }

  // Commute  /api/houses/:id/commute
  const commuteMatch = url.match(/^\/api\/houses\/([\w-]+)\/commute$/);
  if (commuteMatch) {
    const id = commuteMatch[1];
    return MOCK_COMMUTE_BY_HOUSE[id] ?? MOCK_COMMUTE_BY_HOUSE["default"];
  }

  // Forecast  /api/houses/:id/forecast
  if (url.match(/^\/api\/houses\/[\w-]+\/forecast$/)) return MOCK_FORECAST;

  // Air quality  /api/houses/:id/air-quality
  if (url.match(/^\/api\/houses\/[\w-]+\/air-quality$/)) return MOCK_AIR_QUALITY;

  return {};
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const demoApi: any = {
  get: (url: string) => mockOk(getDemoData(url)),
  post: async (url: string) => {
    if (url === "/api/houses/scrape") {
      await delay(1200);
      return mockOk(MOCK_SCRAPE_RESULT);
    }
    return mockOk(getDemoData(url));
  },
  put: () => mockOk(MOCK_PREFERENCES),
  patch: (_url: string, data: unknown) => mockOk(data ?? {}),
  delete: () => mockOk({}),
};

export const api: AxiosInstance = DEMO_MODE ? demoApi : realApi;
