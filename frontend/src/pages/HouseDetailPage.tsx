import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

interface House {
  id: string;
  title: string;
  address: string;
  district: string | null;
  rent_price: number | null;
  size_ping: number | null;
  floor: string | null;
  pet_friendly: boolean | null;
  cooking_allowed: boolean | null;
  status: string;
  user_rating: number | null;
  notes: string | null;
  url: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  lat: number | null;
  lng: number | null;
}

interface CommuteRecord {
  id: string;
  travel_mode: string;
  arrival_time: string;
  estimated_time_mins: number;
  distance_km: number;
  calculated_at: string;
}

interface CurrentResidenceCommute {
  travel_mode: string;
  arrival_time: string | null;
  estimated_time_mins: number | null;
  distance_km: number | null;
  calculated_at: string;
}

interface Preferences {
  current_address: string | null;
  current_district: string | null;
  current_lat: number | null;
  current_lng: number | null;
}

interface Climate {
  district_name: string;
  avg_humidity: number | null;
  rainy_days_per_year: number | null;
  avg_temp_celsius: number | null;
  sunshine_hours_per_year: number | null;
}

interface ForecastDay {
  date: string;
  weather_icon: string;
  weather_desc: string;
  temp_max: number | null;
  temp_min: number | null;
  precipitation_probability: number | null;
  precipitation_mm: number | null;
  windspeed_max_kmh: number | null;
  uv_index_max: number | null;
}

interface AirQuality {
  pm2_5: number | null;
  pm10: number | null;
  european_aqi: number | null;
  aqi_label: string;
  aqi_color: string;
  pm25_label: string;
  pm25_color: string;
  uv_index_max: number | null;
}

const STATUS_BADGE: Record<string, string> = {
  待確認: "badge-blue",
  考慮中: "badge-amber",
  active: "badge-amber",
  已看房: "badge-teal",
  已租定: "badge-green",
  已放棄: "badge-muted",
};

const STATUS_LABEL: Record<string, string> = {
  active: "考慮中",
};

function NavBar() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  function handleBack() {
    const isoHouseId = sessionStorage.getItem("iso_popup_house_id");
    if (isoHouseId && isoHouseId === id) {
      sessionStorage.removeItem("iso_popup_house_id");
      sessionStorage.setItem("iso_restore_house_id", id);
      navigate("/isochrone");
    } else {
      navigate("/");
    }
  }

  return (
    <nav
      className="nav-wrapper"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        height: 66,
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "rgba(253,252,248,0.88)",
        borderBottom: "1.5px solid var(--border-light)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: "0 2px 12px rgba(16,185,129,0.06)",
      }}
    >
      <button
        className="btn-icon"
        onClick={handleBack}
        aria-label="返回列表"
        title="返回列表"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
      <div>
        <p style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.3px" }}>
          物件詳情
        </p>
      </div>
    </nav>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid var(--border-light)",
      }}
    >
      <span style={{ width: 110, flexShrink: 0, fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </span>
      <span style={{ fontSize: 14, color: "var(--text)", fontWeight: 500 }}>
        {children}
      </span>
    </div>
  );
}

function Dash() {
  return <span style={{ color: "var(--text-muted)" }}>—</span>;
}

function BoolBadge({ value }: { value: boolean | null }) {
  if (value === null) return <Dash />;
  return (
    <span className={`badge ${value ? "badge-green" : "badge-muted"}`}>
      {value ? "是" : "否"}
    </span>
  );
}

function RatingBar({ value }: { value: number | null }) {
  if (value == null) return <Dash />;

  let bgGradient = "linear-gradient(90deg, #10B981, #34d399)";
  let textColor = "var(--brand-mid)";
  if (value < 5) {
    bgGradient = "linear-gradient(90deg, #ef4444, #f87171)";
    textColor = "#dc2626";
  } else if (value < 8) {
    bgGradient = "linear-gradient(90deg, #f59e0b, #fbbf24)";
    textColor = "#d97706";
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 100, height: 8, background: "var(--border-light)", borderRadius: 99, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${(value / 10) * 100}%`,
            background: bgGradient,
            borderRadius: 99,
          }}
        />
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, color: textColor }}>{value} / 10</span>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: "1.5px solid var(--border-light)" }}>
      <span style={{ width: 32, height: 32, background: "var(--brand-xlight)", borderRadius: "55% 45% 60% 40% / 40% 60% 45% 55%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-sub)" }}>{children}</span>
    </div>
  );
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function HouseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [house, setHouse] = useState<House | null>(null);
  const [commutes, setCommutes] = useState<CommuteRecord[]>([]);
  const [climate, setClimate] = useState<Climate | null>(null);
  const [currentPrefs, setCurrentPrefs] = useState<Preferences | null>(null);
  const [currentCommutes, setCurrentCommutes] = useState<CurrentResidenceCommute[]>([]);
  const [currentClimate, setCurrentClimate] = useState<Climate | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [currentForecast, setCurrentForecast] = useState<ForecastDay[]>([]);
  const [airQuality, setAirQuality] = useState<AirQuality | null>(null);
  const [currentAirQuality, setCurrentAirQuality] = useState<AirQuality | null>(null);
  const [refreshingCurrentCommute, setRefreshingCurrentCommute] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshingCommute, setRefreshingCommute] = useState(false);
  const [commuteMsg, setCommuteMsg] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // 主要資料：失敗則導回列表
    Promise.all([
      api.get<House>(`/api/houses/${id}`),
      api.get<CommuteRecord[]>(`/api/houses/${id}/commute`),
    ])
      .then(([hRes, cRes]) => {
        setHouse(hRes.data);
        setCommutes(cRes.data);
        if (hRes.data.district) {
          const h = hRes.data;
          const coordQ = h.lat != null && h.lng != null ? `?lat=${h.lat}&lng=${h.lng}` : "";
          api.get<Climate>(`/api/climate/${encodeURIComponent(h.district!)}${coordQ}`)
            .then((cliRes) => setClimate(cliRes.data))
            .catch(() => setClimate(null));
        }
        api.get<ForecastDay[]>(`/api/houses/${id}/forecast`)
          .then((res) => setForecast(res.data))
          .catch(() => setForecast([]));
        api.get<AirQuality>(`/api/houses/${id}/air-quality`)
          .then((res) => setAirQuality(res.data))
          .catch(() => setAirQuality(null));
      })
      .catch(() => navigate("/"))
      .finally(() => setLoading(false));

    // 現居比較資料：失敗不影響主頁面
    Promise.all([
      api.get<Preferences>("/api/preferences"),
      api.get<CurrentResidenceCommute[]>("/api/preferences/current-residence/commute"),
    ])
      .then(([prefRes, curCommuteRes]) => {
        setCurrentPrefs(prefRes.data);
        setCurrentCommutes(curCommuteRes.data);
        if (prefRes.data.current_district) {
          const p = prefRes.data;
          const coordQ = p.current_lat != null && p.current_lng != null
            ? `?lat=${p.current_lat}&lng=${p.current_lng}` : "";
          api.get<Climate>(`/api/climate/${encodeURIComponent(p.current_district!)}${coordQ}`)
            .then((cliRes) => setCurrentClimate(cliRes.data))
            .catch(() => setCurrentClimate(null));
        }
        api.get<ForecastDay[]>("/api/preferences/current-residence/forecast")
          .then((res) => setCurrentForecast(res.data))
          .catch(() => setCurrentForecast([]));
        api.get<AirQuality>("/api/preferences/current-residence/air-quality")
          .then((res) => setCurrentAirQuality(res.data))
          .catch(() => setCurrentAirQuality(null));
      })
      .catch(() => { /* 現居資料載入失敗，靜默處理 */ });
  }, [id, navigate]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/api/houses/${id}`);
      navigate("/");
    } finally {
      setDeleting(false);
    }
  }

  async function handleRefreshCommute() {
    setRefreshingCommute(true);
    setCommuteMsg("");
    try {
      const res = await api.post<CommuteRecord[]>(`/api/houses/${id}/commute/refresh`);
      setCommutes(res.data);
      setCommuteMsg("通勤資料已更新");
      setTimeout(() => setCommuteMsg(""), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: unknown } };
      const status = e.response?.status;
      const data = e.response?.data as { detail?: string } | undefined;
      const detail = data?.detail ?? JSON.stringify(e.response?.data) ?? "no response";
      setCommuteMsg(`更新失敗 [${status ?? "network"}]：${detail}`);
      setTimeout(() => setCommuteMsg(""), 10000);
    } finally {
      setRefreshingCommute(false);
    }
  }

  async function handleRefreshCurrentCommute() {
    setRefreshingCurrentCommute(true);
    try {
      const res = await api.post<CurrentResidenceCommute[]>("/api/preferences/current-residence/commute/refresh");
      setCurrentCommutes(res.data);
    } catch {
      // silent fail
    } finally {
      setRefreshingCurrentCommute(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100svh" }}>
        <NavBar />
        <div className="page-wrapper" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 100, borderRadius: 18, background: "var(--brand-xlight)", opacity: 1 - (i - 1) * 0.25 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!house) return null;

  return (
    <div style={{ minHeight: "100svh", paddingBottom: 80 }}>
      <NavBar />

      <div className="page-wrapper">
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.5px", margin: 0 }}>
                {house.title}
              </h2>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(house.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="在 Google Maps 開啟"
                style={{ marginTop: 6, fontSize: 14, color: "var(--text-muted)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--brand-mid)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {house.address}
              </a>
            </div>
            <div className="header-actions" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span
                className={`badge ${STATUS_BADGE[house.status] ?? "badge-teal"}`}
                style={{ fontSize: 13, padding: "0 16px", minHeight: 38 }}
              >
                {STATUS_LABEL[house.status] ?? house.status}
              </span>
              <button
                title="編輯"
                onClick={() => navigate(`/houses/${id}/edit`)}
                style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--border)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--brand-mid)", transition: "background 0.15s, border-color 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--brand-xlight)"; e.currentTarget.style.borderColor = "var(--brand)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5z"/>
                </svg>
              </button>
              {house.url && (
                <button
                  title="開啟原網頁"
                  onClick={() => window.open(house.url!, "_blank")}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--border)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--text-muted)", transition: "background 0.15s, border-color 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-xlight)"; e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6.5 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9.5"/>
                    <path d="M10 2h4v4"/>
                    <line x1="14" y1="2" x2="7" y2="9"/>
                  </svg>
                </button>
              )}
              {confirming ? (
                <>
                  <button
                    title="確認刪除"
                    disabled={deleting}
                    onClick={handleDelete}
                    style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid #ef4444", background: "#ef4444", cursor: deleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", transition: "background 0.15s", opacity: deleting ? 0.6 : 1 }}
                    onMouseEnter={e => { if (!deleting) e.currentTarget.style.background = "#dc2626"; }}
                    onMouseLeave={e => { if (!deleting) e.currentTarget.style.background = "#ef4444"; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </button>
                  <button
                    title="取消"
                    disabled={deleting}
                    onClick={() => setConfirming(false)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--border)", background: "#fff", cursor: deleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--text-muted)", transition: "background 0.15s, border-color 0.15s", opacity: deleting ? 0.6 : 1 }}
                    onMouseEnter={e => { if (!deleting) { e.currentTarget.style.background = "var(--brand-xlight)"; e.currentTarget.style.borderColor = "var(--brand)"; } }}
                    onMouseLeave={e => { if (!deleting) { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "var(--border)"; } }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </>
              ) : (
                <button
                  title="刪除"
                  onClick={() => setConfirming(true)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--border)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--text-muted)", transition: "background 0.15s, border-color 0.15s, color 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 5 5 5 13 5"/>
                    <path d="M6 5V3h4v2"/>
                    <path d="M4 5l1 9h6l1-9"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 基本資料 */}
          <div className="card">
            <SectionTitle icon="🏠">基本資料</SectionTitle>
            <InfoRow label="行政區">{house.district ?? <Dash />}</InfoRow>
            <InfoRow label="月租金">
              {house.rent_price ? (
                <span style={{ fontWeight: 700, color: "var(--brand-mid)", fontSize: 16 }}>
                  ${house.rent_price.toLocaleString()}
                </span>
              ) : <Dash />}
            </InfoRow>
            <InfoRow label="坪數">{house.size_ping != null ? `${house.size_ping} 坪` : <Dash />}</InfoRow>
            <InfoRow label="樓層">{house.floor ?? <Dash />}</InfoRow>
            <InfoRow label="可養寵物"><BoolBadge value={house.pet_friendly} /></InfoRow>
            <InfoRow label="可開伙"><BoolBadge value={house.cooking_allowed} /></InfoRow>
            <InfoRow label="來源">{{ Manual: '手動新增' }[house.source as 'Manual'] ?? house.source}</InfoRow>
            <InfoRow label="建立時間">{formatTime(house.created_at)}</InfoRow>
            <InfoRow label="更新時間" >{formatTime(house.updated_at)}</InfoRow>
          </div>

          {/* 評分與備忘 */}
          <div className="card">
            <SectionTitle icon="⭐">評分與備忘</SectionTitle>
            <InfoRow label="個人評分"><RatingBar value={house.user_rating} /></InfoRow>
            {house.notes ? (
              <div style={{ marginTop: 14 }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                  備忘
                </span>
                <div style={{ padding: "14px 16px", background: "var(--bg-green)", borderRadius: 12, border: "1.5px solid var(--border-light)", fontSize: 14, color: "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {house.notes}
                </div>
              </div>
            ) : (
              <InfoRow label="備忘"><Dash /></InfoRow>
            )}
          </div>

          {/* 現居 vs 此物件 比較 */}
          {currentPrefs?.current_address && (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 14, borderBottom: "1.5px solid var(--border-light)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 32, height: 32, background: "var(--brand-xlight)", borderRadius: "55% 45% 60% 40% / 40% 60% 45% 55%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    ⚖️
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-sub)" }}>現居 vs 此物件</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={handleRefreshCurrentCommute}
                    disabled={refreshingCurrentCommute}
                    style={{ fontSize: 12, padding: "6px 14px", opacity: refreshingCurrentCommute ? 0.6 : 1 }}
                  >
                    {refreshingCurrentCommute ? "計算中…" : "重算現居通勤"}
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={handleRefreshCommute}
                    disabled={refreshingCommute}
                    style={{ fontSize: 12, padding: "6px 14px", opacity: refreshingCommute ? 0.6 : 1 }}
                  >
                    {refreshingCommute ? "計算中…" : "重算此物件通勤"}
                  </button>
                </div>
              </div>
              {commuteMsg && (
                <div style={{
                  marginBottom: 14,
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  background: commuteMsg.includes("失敗") ? "#fef2f2" : "var(--bg-green)",
                  border: `1.5px solid ${commuteMsg.includes("失敗") ? "#fecaca" : "var(--brand)"}`,
                  color: commuteMsg.includes("失敗") ? "#dc2626" : "var(--brand-mid)",
                }}>
                  {commuteMsg}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* 現居欄 */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                    現居
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-sub)", marginBottom: 10, wordBreak: "break-all" }}>
                    {currentPrefs.current_address}
                    {currentPrefs.current_district && (
                      <span style={{ marginLeft: 6, padding: "2px 6px", background: "var(--bg-green)", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                        {currentPrefs.current_district}
                      </span>
                    )}
                  </div>
                  {/* 氣候 */}
                  {currentClimate && (
                    <div style={{ marginBottom: 10, padding: "10px 12px", background: "var(--bg-green)", borderRadius: 10, border: "1.5px solid var(--border-light)" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>年均氣候</div>
                      <div style={{ fontSize: 13, color: "var(--text-sub)" }}>🌡️ 均溫 {currentClimate.avg_temp_celsius != null ? `${currentClimate.avg_temp_celsius}°C` : "—"}</div>
                      <div style={{ fontSize: 13, color: "var(--text-sub)" }}>💧 濕度 {currentClimate.avg_humidity != null ? `${currentClimate.avg_humidity}%` : "—"}</div>
                      <div style={{ fontSize: 13, color: "var(--text-sub)" }}>🌧 雨天 {currentClimate.rainy_days_per_year != null ? `${currentClimate.rainy_days_per_year} 天/年` : "—"}</div>
                      <div style={{ fontSize: 13, color: "var(--text-sub)" }}>☀️ 日照 {currentClimate.sunshine_hours_per_year != null ? `${currentClimate.sunshine_hours_per_year} 時/年` : "—"}</div>
                    </div>
                  )}
                  {/* 通勤 */}
                  {currentCommutes.length === 0 ? (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>尚無通勤資料，點「重算現居通勤」</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-green)", borderRadius: 10, border: "1.5px solid var(--border-light)", overflow: "hidden" }}>
                      {currentCommutes.map((c, i) => (
                        <div key={i} style={{ padding: "10px 12px", borderBottom: i < currentCommutes.length - 1 ? "1px solid rgba(16,185,129,0.15)" : "none" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-sub)" }}>
                            {c.travel_mode === "DRIVE" ? "🚗 汽車" : "🛵 機車"}
                            {c.arrival_time ? ` ・${c.arrival_time.slice(0, 5)} 抵達` : ""}
                          </div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--brand-mid)" }}>
                              約 {c.estimated_time_mins} 分鐘
                            </span>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.distance_km?.toFixed(1)} km</span>
                            {c.arrival_time && c.estimated_time_mins != null && (() => {
                              const [h, m] = c.arrival_time.slice(0, 5).split(":").map(Number);
                              const total = h * 60 + m - c.estimated_time_mins;
                              const dh = Math.floor(((total % 1440) + 1440) / 60) % 24;
                              const dm = ((total % 60) + 60) % 60;
                              return <span style={{ fontSize: 12, color: "var(--text-sub)", fontWeight: 600 }}>需 {String(dh).padStart(2, "0")}:{String(dm).padStart(2, "0")} 出發</span>;
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 此物件欄 */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                    此物件
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-sub)", marginBottom: 10, wordBreak: "break-all" }}>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(house.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "inherit", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--brand-mid)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "inherit")}
                    >
                      {house.address}
                    </a>
                    {house.district && (
                      <span style={{ marginLeft: 6, padding: "2px 6px", background: "var(--bg-green)", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                        {house.district}
                      </span>
                    )}
                  </div>
                  {/* 氣候 */}
                  {climate && (
                    <div style={{ marginBottom: 10, padding: "10px 12px", background: "var(--bg-green)", borderRadius: 10, border: "1.5px solid var(--border-light)" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>年均氣候</div>
                      <div style={{ fontSize: 13, color: "var(--text-sub)" }}>🌡️ 均溫 {climate.avg_temp_celsius != null ? `${climate.avg_temp_celsius}°C` : "—"}</div>
                      <div style={{ fontSize: 13, color: "var(--text-sub)" }}>💧 濕度 {climate.avg_humidity != null ? `${climate.avg_humidity}%` : "—"}</div>
                      <div style={{ fontSize: 13, color: "var(--text-sub)" }}>🌧 雨天 {climate.rainy_days_per_year != null ? `${climate.rainy_days_per_year} 天/年` : "—"}</div>
                      <div style={{ fontSize: 13, color: "var(--text-sub)" }}>☀️ 日照 {climate.sunshine_hours_per_year != null ? `${climate.sunshine_hours_per_year} 時/年` : "—"}</div>
                    </div>
                  )}
                  {/* 通勤 */}
                  {commutes.length === 0 ? (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>尚無通勤資料，點「重新計算」</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-green)", borderRadius: 10, border: "1.5px solid var(--border-light)", overflow: "hidden" }}>
                      {commutes.map((c, i) => (
                        <div key={c.id} style={{ padding: "10px 12px", borderBottom: i < commutes.length - 1 ? "1px solid rgba(16,185,129,0.15)" : "none" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-sub)" }}>
                            {c.travel_mode === "DRIVE" ? "🚗 汽車" : "🛵 機車"}
                            {c.arrival_time ? ` ・${c.arrival_time.slice(0, 5)} 抵達` : ""}
                          </div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--brand-mid)" }}>
                              約 {c.estimated_time_mins} 分鐘
                            </span>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.distance_km.toFixed(1)} km</span>
                            {c.arrival_time && (() => {
                              const [h, m] = c.arrival_time.slice(0, 5).split(":").map(Number);
                              const total = h * 60 + m - c.estimated_time_mins;
                              const dh = Math.floor(((total % 1440) + 1440) / 60) % 24;
                              const dm = ((total % 60) + 60) % 60;
                              return <span style={{ fontSize: 12, color: "var(--text-sub)", fontWeight: 600 }}>需 {String(dh).padStart(2, "0")}:{String(dm).padStart(2, "0")} 出發</span>;
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 今日空氣品質 */}
              {(airQuality || currentAirQuality) && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1.5px solid var(--border-light)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                    今日空氣品質
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <AirQualityCard aq={currentAirQuality} />
                    <AirQualityCard aq={airQuality} />
                  </div>
                </div>
              )}

              {/* 近三天天氣預報 */}
              {(forecast.length > 0 || currentForecast.length > 0) && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1.5px solid var(--border-light)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                    近三天天氣
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {/* 現居預報 */}
                    <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-green)", borderRadius: 10, border: "1.5px solid var(--border-light)", overflow: "hidden" }}>
                      {currentForecast.length === 0 ? (
                        <div style={{ padding: "10px 12px" }}>
                          <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>—</p>
                        </div>
                      ) : currentForecast.map((day, i) => (
                        <ForecastCard key={i} day={day} isLast={i === currentForecast.length - 1} />
                      ))}
                    </div>
                    {/* 此物件預報 */}
                    <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-green)", borderRadius: 10, border: "1.5px solid var(--border-light)", overflow: "hidden" }}>
                      {forecast.length === 0 ? (
                        <div style={{ padding: "10px 12px" }}>
                          <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>—</p>
                        </div>
                      ) : forecast.map((day, i) => (
                        <ForecastCard key={i} day={day} isLast={i === forecast.length - 1} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AirQualityCard({ aq }: { aq: AirQuality | null }) {
  if (!aq) return <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>—</p>;
  
  const isWarning = aq.european_aqi != null ? aq.european_aqi > 50 : (aq.aqi_label === "差" || aq.aqi_label === "極差");
  const bgColor = isWarning ? "rgba(245, 158, 11, 0.05)" : "var(--bg-green)";
  const borderColor = isWarning ? "rgba(245, 158, 11, 0.25)" : "var(--border-light)";

  return (
    <div style={{ padding: "10px 12px", background: bgColor, borderRadius: 10, border: `1.5px solid ${borderColor}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: aq.aqi_color }}>{aq.aqi_label}</span>
        {aq.european_aqi != null && (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>AQI {aq.european_aqi}</span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12 }}>
        {aq.pm2_5 != null && (
          <span style={{ color: aq.pm25_color }}>
            PM2.5 {aq.pm2_5} <span style={{ color: "var(--text-muted)" }}>μg/m³ · {aq.pm25_label}</span>
          </span>
        )}
        {aq.pm10 != null && (
          <span style={{ color: "var(--text-muted)" }}>PM10 {aq.pm10} μg/m³</span>
        )}
      </div>
    </div>
  );
}

function ForecastCard({ day, isLast }: { day: ForecastDay, isLast?: boolean }) {
  const date = new Date(day.date + "T00:00:00");
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const label = `${date.getMonth() + 1}/${date.getDate()} (${weekdays[date.getDay()]})`;
  return (
    <div style={{ padding: "10px 12px", borderBottom: isLast ? "none" : "1px solid rgba(16,185,129,0.15)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-sub)" }}>{label}</span>
        <span style={{ fontSize: 16 }}>{day.weather_icon}</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 3 }}>{day.weather_desc}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
        <span style={{ color: "var(--text)", fontWeight: 600 }}>
          {day.temp_max != null ? `${Math.round(day.temp_max)}°` : "—"} / {day.temp_min != null ? `${Math.round(day.temp_min)}°` : "—"}
        </span>
        {day.precipitation_probability != null && (
          <span style={{ color: "#3b82f6" }}>💧 {day.precipitation_probability}%</span>
        )}
        {day.windspeed_max_kmh != null && (
          <span style={{ color: "var(--text-muted)" }}>💨 {Math.round(day.windspeed_max_kmh)} km/h</span>
        )}
        {day.uv_index_max != null && (
          <span style={{ color: day.uv_index_max >= 8 ? "#ef4444" : day.uv_index_max >= 6 ? "#f97316" : day.uv_index_max >= 3 ? "#eab308" : "#22c55e" }}>
            UV {day.uv_index_max.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}
