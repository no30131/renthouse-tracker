import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import Navbar from "../components/Navbar";

interface House {
  id: string;
  title: string;
  address: string;
  district: string | null;
  rent_price: number | null;
  size_ping: number | null;
  floor: string | null;
  status: string;
  user_rating: number | null;
  pet_friendly: boolean | null;
  cooking_allowed: boolean | null;
  notes: string | null;
  url: string | null;
  min_distance_km: number | null;
}

const STATUS_BADGE: Record<string, string> = {
  待確認: "badge-blue",
  考慮中: "badge-amber",
  active: "badge-amber",
  已看房: "badge-teal",
  已租定: "badge-green",
  已放棄: "badge-muted",
};

// 將 DB 原始 status 值轉成顯示文字（正規化舊的 active 值）
const STATUS_LABEL: Record<string, string> = {
  active: "考慮中",
};

function RatingBar({ value }: { value: number | null }) {
  if (value == null)
    return <span style={{ color: "var(--text-muted)", fontSize: 13 }}>—</span>;

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
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 72,
          height: 7,
          background: "var(--border-light)",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(value / 10) * 100}%`,
            background: bgGradient,
            borderRadius: 99,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: textColor }}>
        {value}
      </span>
    </div>
  );
}

type SortKey = "rent_asc" | "rent_desc" | "rating_asc" | "rating_desc" | "size_asc" | "size_desc" | "dist_asc" | "dist_desc";

const SESSION_KEY = "houses-page-state";

function loadSavedState() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as { sortKey: SortKey | null; selectedDistricts: string[]; selectedStatuses: string[]; scrollY: number };
  } catch { /* ignore */ }
  return null;
}

export default function HousesPage() {
  const navigate = useNavigate();
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [recalcingIds, setRecalcingIds] = useState<Set<string>>(new Set());
  const [recalcingAll, setRecalcingAll] = useState(false);
  const housesRef = useRef<House[]>([]);

  // filter / sort state — 從 sessionStorage 恢復
  const saved = loadSavedState();
  const [sortKey, setSortKey] = useState<SortKey | null>(saved?.sortKey ?? null);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>(saved?.selectedDistricts ?? []);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(saved?.selectedStatuses ?? []);

  function fetchHouses() {
    return api.get("/api/houses").then((res) => {
      setHouses(res.data);
      housesRef.current = res.data;
      setLoading(false);
    });
  }

  useEffect(() => {
    fetchHouses();
  }, []);

  // 資料載入完成後，恢復滾動位置並清除快取
  useEffect(() => {
    if (loading) return;
    const savedState = loadSavedState();
    if (savedState?.scrollY) {
      requestAnimationFrame(() => window.scrollTo({ top: savedState.scrollY, behavior: "instant" }));
    }
    sessionStorage.removeItem(SESSION_KEY);
  }, [loading]);

  // 將 status 原始值轉為顯示文字
  const statusDisplay = (s: string) => STATUS_LABEL[s] ?? s;

  // 舊資料只有區名，用 lookup table 補縣市
  const DISTRICT_CITY: Record<string, string> = {
    // 台北市
    中正區:"台北市",大同區:"台北市",中山區:"台北市",松山區:"台北市",大安區:"台北市",
    萬華區:"台北市",信義區:"台北市",士林區:"台北市",北投區:"台北市",內湖區:"台北市",
    南港區:"台北市",文山區:"台北市",
    // 基隆市（先於新北市，讓重名區優先標基隆）
    仁愛區:"基隆市",安樂區:"基隆市",暖暖區:"基隆市",七堵區:"基隆市",
    // 新北市
    板橋區:"新北市",三重區:"新北市",中和區:"新北市",永和區:"新北市",新莊區:"新北市",
    新店區:"新北市",樹林區:"新北市",鶯歌區:"新北市",三峽區:"新北市",淡水區:"新北市",
    汐止區:"新北市",瑞芳區:"新北市",土城區:"新北市",蘆洲區:"新北市",五股區:"新北市",
    泰山區:"新北市",林口區:"新北市",深坑區:"新北市",石碇區:"新北市",坪林區:"新北市",
    三芝區:"新北市",石門區:"新北市",八里區:"新北市",平溪區:"新北市",雙溪區:"新北市",
    貢寮區:"新北市",金山區:"新北市",萬里區:"新北市",烏來區:"新北市",
  };

  // derived option lists — 按縣市分組，相容「台北市中山區」和舊的「中山區」兩種格式
  const districtsByCity = (() => {
    const map = new Map<string, string[]>();
    for (const h of houses) {
      if (!h.district) continue;
      let city: string;
      // 新格式：開頭3字為縣市（如「台北市」「新北市」「基隆市」）
      if (h.district.length > 3 && /市$|縣$/.test(h.district.slice(0, 3))) {
        city = h.district.slice(0, 3);
      } else {
        city = DISTRICT_CITY[h.district] ?? "其他";
      }
      if (!map.has(city)) map.set(city, []);
      if (!map.get(city)!.includes(h.district)) map.get(city)!.push(h.district);
    }
    for (const arr of map.values()) arr.sort();
    return map;
  })();
  // 以顯示文字去重（避免 "active" 和 "考慮中" 各出現一個）
  const allStatusLabels = Array.from(
    new Set(houses.map((h) => statusDisplay(h.status)))
  ).sort();

  function toggleDistrict(d: string) {
    setSelectedDistricts((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }
  function toggleStatus(s: string) {
    setSelectedStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  // apply filter + sort（狀態用 display label 比對，讓 active 和 考慮中 合一）
  let displayedHouses = houses
    .filter((h) =>
      selectedDistricts.length === 0
        ? true
        : h.district != null && selectedDistricts.includes(h.district)
    )
    .filter((h) =>
      selectedStatuses.length === 0 ? true : selectedStatuses.includes(statusDisplay(h.status))
    );

  if (sortKey === "rent_asc")
    displayedHouses = [...displayedHouses].sort(
      (a, b) => (a.rent_price ?? 0) - (b.rent_price ?? 0)
    );
  else if (sortKey === "rent_desc")
    displayedHouses = [...displayedHouses].sort(
      (a, b) => (b.rent_price ?? 0) - (a.rent_price ?? 0)
    );
  else if (sortKey === "rating_asc")
    displayedHouses = [...displayedHouses].sort(
      (a, b) => (a.user_rating ?? 0) - (b.user_rating ?? 0)
    );
  else if (sortKey === "rating_desc")
    displayedHouses = [...displayedHouses].sort(
      (a, b) => (b.user_rating ?? 0) - (a.user_rating ?? 0)
    );
  else if (sortKey === "size_asc")
    displayedHouses = [...displayedHouses].sort(
      (a, b) => (a.size_ping ?? 0) - (b.size_ping ?? 0)
    );
  else if (sortKey === "size_desc")
    displayedHouses = [...displayedHouses].sort(
      (a, b) => (b.size_ping ?? 0) - (a.size_ping ?? 0)
    );
  else if (sortKey === "dist_asc")
    displayedHouses = [...displayedHouses].sort((a, b) => {
      if (a.min_distance_km == null && b.min_distance_km == null) return 0;
      if (a.min_distance_km == null) return 1;
      if (b.min_distance_km == null) return -1;
      return a.min_distance_km - b.min_distance_km;
    });
  else if (sortKey === "dist_desc")
    displayedHouses = [...displayedHouses].sort((a, b) => {
      if (a.min_distance_km == null && b.min_distance_km == null) return 0;
      if (a.min_distance_km == null) return 1;
      if (b.min_distance_km == null) return -1;
      return b.min_distance_km - a.min_distance_km;
    });

  async function handleRecalc(id: string) {
    setRecalcingIds((prev) => new Set(prev).add(id));
    try {
      await api.post(`/api/houses/${id}/geocode`);
      await fetchHouses();
    } finally {
      setRecalcingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function handleRecalcAll() {
    const missing = houses.filter((h) => h.min_distance_km == null);
    if (missing.length === 0) return;
    setRecalcingAll(true);
    const ids = missing.map((h) => h.id);
    setRecalcingIds(new Set(ids));
    try {
      for (const id of ids) {
        try { await api.post(`/api/houses/${id}/geocode`); } catch { /* 單筆失敗不中斷 */ }
        setRecalcingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      }
      await fetchHouses();
    } finally {
      setRecalcingAll(false);
      setRecalcingIds(new Set());
    }
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    try {
      await api.delete(`/api/houses/${id}`);
      setHouses((prev) => prev.filter((h) => h.id !== id));
    } finally {
      setDeletingId(null);
      setDeleteLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100svh", paddingBottom: 80 }}>

      {/* ── Nav ── */}
      <Navbar />

      {/* ── Page content ── */}
      <div className="page-wrapper">

        {/* Page header */}
        <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: "var(--text)",
                letterSpacing: "-0.5px",
                margin: 0,
              }}
            >
              物件列表
            </h2>
            <p style={{ marginTop: 6, fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>
              {loading
                ? "載入中…"
                : displayedHouses.length === houses.length
                ? `共 ${houses.length} 筆物件`
                : `顯示 ${displayedHouses.length} / ${houses.length} 筆物件`}
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() => navigate("/houses/new")}
            style={{ padding: "9px 20px", fontSize: 13, minHeight: 40, flexShrink: 0, marginTop: 4 }}
          >
            + 新增物件
          </button>
        </div>

        {/* ── Filter / Sort bar ── */}
        {!loading && houses.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 20,
              padding: "16px 20px",
              background: "var(--bg-green)",
              borderRadius: 16,
              border: "1.5px solid var(--border-light)",
            }}
          >
            {/* Sort */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-sub)", marginRight: 4, letterSpacing: "0.4px" }}>
                排序
              </span>
              {(
                [
                  { key: "rent_desc", label: "租金", dir: "desc" },
                  { key: "rent_asc", label: "租金", dir: "asc" },
                  { key: "rating_desc", label: "評分", dir: "desc" },
                  { key: "rating_asc", label: "評分", dir: "asc" },
                  { key: "size_desc", label: "坪數", dir: "desc" },
                  { key: "size_asc", label: "坪數", dir: "asc" },
                  { key: "dist_asc", label: "距離", dir: "asc" },
                  { key: "dist_desc", label: "距離", dir: "desc" },
                ] as { key: SortKey; label: string; dir: "asc" | "desc" }[]
              ).map(({ key, label, dir }) => (
                <button
                  key={key}
                  onClick={() => setSortKey((prev) => (prev === key ? null : key))}
                  style={{
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 99,
                    border: "1.5px solid",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    borderColor: sortKey === key ? "var(--brand)" : "var(--border)",
                    background: sortKey === key ? "var(--brand)" : "#fff",
                    color: sortKey === key ? "#fff" : "var(--text-sub)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {label}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {dir === "desc"
                      ? <path d="M2 3l3 4 3-4" />
                      : <path d="M2 7l3-4 3 4" />}
                  </svg>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch" }} />

            {/* District filter — 按縣市分組 */}
            {districtsByCity.size > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                {Array.from(districtsByCity.entries()).map(([city, districts]) => (
                  <div key={city} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      letterSpacing: "0.4px",
                      minWidth: 36,
                      textAlign: "right",
                      marginRight: 2,
                    }}>
                      {city}
                    </span>
                    {districts.map((d) => (
                      <button
                        key={d}
                        onClick={() => toggleDistrict(d)}
                        style={{
                          padding: "4px 11px",
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 99,
                          border: "1.5px solid",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          borderColor: selectedDistricts.includes(d) ? "var(--brand)" : "var(--border)",
                          background: selectedDistricts.includes(d) ? "var(--brand)" : "#fff",
                          color: selectedDistricts.includes(d) ? "#fff" : "var(--text-sub)",
                        }}
                      >
                        {d.length > 3 && /市$|縣$/.test(d.slice(0, 3)) ? d.slice(3) : d}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Divider */}
            {districtsByCity.size > 0 && (
              <div style={{ width: "100%", height: 1, background: "var(--border-light)" }} />
            )}

            {/* Status filter */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-sub)", marginRight: 4, letterSpacing: "0.4px" }}>
                狀態
              </span>
              {allStatusLabels.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  style={{
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 99,
                    border: "1.5px solid",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    borderColor: selectedStatuses.includes(s) ? "var(--brand)" : "var(--border)",
                    background: selectedStatuses.includes(s) ? "var(--brand)" : "#fff",
                    color: selectedStatuses.includes(s) ? "#fff" : "var(--text-sub)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Right-side actions */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              {houses.some((h) => h.min_distance_km == null) && (
                <button
                  onClick={handleRecalcAll}
                  disabled={recalcingAll}
                  style={{
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 99,
                    border: "1.5px solid var(--brand)",
                    background: recalcingAll ? "var(--bg-green)" : "#fff",
                    color: recalcingAll ? "var(--text-muted)" : "var(--brand-mid)",
                    cursor: recalcingAll ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    whiteSpace: "nowrap",
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 8a7 7 0 1 0 7-7"/>
                    <polyline points="1 3 1 8 6 8"/>
                  </svg>
                  {recalcingAll
                    ? `重算中… (${recalcingIds.size} 筆剩餘)`
                    : `全部重算 (${houses.filter((h) => h.min_distance_km == null).length} 筆)`}
                </button>
              )}
              {(sortKey || selectedDistricts.length > 0 || selectedStatuses.length > 0) && (
                <button
                  onClick={() => { setSortKey(null); setSelectedDistricts([]); setSelectedStatuses([]); }}
                  style={{
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 99,
                    border: "1.5px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  清除篩選
                </button>
              )}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 60,
                  borderRadius: 18,
                  background: "var(--brand-xlight)",
                  opacity: 1 - (i - 1) * 0.25,
                }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && houses.length === 0 && (
          <div
            className="card"
            style={{ textAlign: "center", padding: "80px 32px" }}
          >
            <div style={{ fontSize: 56, marginBottom: 18 }}>🏘️</div>
            <p
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: 10,
              }}
            >
              還沒有任何物件
            </p>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-muted)",
                fontWeight: 500,
                marginBottom: 32,
              }}
            >
              點擊下方按鈕新增你的第一筆物件
            </p>
            <button
              className="btn-primary"
              onClick={() => navigate("/houses/new")}
            >
              + 新增物件
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && houses.length > 0 && (
          <div className="card" style={{ overflow: "hidden", padding: 0 }}>
            {displayedHouses.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 32px", color: "var(--text-muted)", fontSize: 14, fontWeight: 500 }}>
                沒有符合條件的物件
              </div>
            ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      background: "var(--bg-green)",
                      borderBottom: "1.5px solid var(--border)",
                    }}
                  >
                    {[
                      "#",
                      "名稱",
                      "地址",
                      "月租金",
                      "坪數",
                      "樓層",
                      "距離",
                      "狀態",
                      "評分",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "14px 12px",
                          textAlign: "left",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--text-sub)",
                          letterSpacing: "0.6px",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedHouses.map((h, idx) => (
                    <tr
                      key={h.id}
                      style={{
                        borderBottom: idx < houses.length - 1 ? "1px solid var(--border-light)" : "none",
                        background: hoveredId === h.id ? "var(--bg-green)" : "",
                        transition: "background 0.15s",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ sortKey, selectedDistricts, selectedStatuses, scrollY: window.scrollY }));
                        navigate(`/houses/${h.id}`);
                      }}
                      onMouseEnter={() => setHoveredId(h.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* 序號 */}
                      <td style={{ padding: "15px 12px 15px 16px", width: 40 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
                          {idx + 1}
                        </span>
                      </td>
                      <td style={{ padding: "15px 12px", width: 168 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", display: "block", width: 168, wordBreak: "break-all" }}>
                          {h.title}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "15px 12px",
                          fontSize: 13,
                          color: "var(--text-sub)",
                          fontWeight: 500,
                          maxWidth: 180,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h.address}
                      </td>
                      <td style={{ padding: "15px 12px", whiteSpace: "nowrap" }}>
                        {h.rent_price ? (
                          <span style={{ fontWeight: 700, color: "var(--brand-mid)", fontSize: 14 }}>
                            ${h.rent_price.toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "15px 12px", fontSize: 13, color: "var(--text-sub)", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {h.size_ping != null ? `${h.size_ping} 坪` : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td style={{ padding: "15px 12px", fontSize: 13, color: "var(--text-sub)", fontWeight: 500 }}>
                        {h.floor ?? <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td style={{ padding: "15px 12px", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                        {h.min_distance_km != null ? (
                          <span style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 500 }}>
                            {h.min_distance_km.toFixed(1)} km
                          </span>
                        ) : (
                          <button
                            title="補算距離"
                            disabled={recalcingIds.has(h.id)}
                            onClick={() => handleRecalc(h.id)}
                            style={{
                              padding: "3px 8px",
                              fontSize: 11,
                              fontWeight: 600,
                              borderRadius: 6,
                              border: "1.5px solid var(--border)",
                              background: recalcingIds.has(h.id) ? "var(--bg-green)" : "#fff",
                              color: recalcingIds.has(h.id) ? "var(--text-muted)" : "var(--brand-mid)",
                              cursor: recalcingIds.has(h.id) ? "default" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {recalcingIds.has(h.id) ? (
                              "計算中…"
                            ) : (
                              <>
                                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 8a7 7 0 1 0 7-7"/>
                                  <polyline points="1 3 1 8 6 8"/>
                                </svg>
                                重算
                              </>
                            )}
                          </button>
                        )}
                      </td>
                      <td style={{ padding: "15px 12px" }}>
                        <span
                          className={`badge ${STATUS_BADGE[h.status] ?? "badge-teal"}`}
                          style={{ minWidth: "4em", justifyContent: "center", whiteSpace: "nowrap" }}
                        >
                          {statusDisplay(h.status)}
                        </span>
                      </td>
                      <td style={{ padding: "15px 12px" }}>
                        <RatingBar value={h.user_rating} />
                      </td>
                      {/* 操作 */}
                      <td style={{ padding: "15px 10px", width: 112 }} onClick={(e) => e.stopPropagation()}>
                        {deletingId === h.id ? (
                          /* ── 二次確認 ── */
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <button
                              disabled={deleteLoading}
                              onClick={() => handleDelete(h.id)}
                              style={{ padding: "4px 10px", fontSize: 12, fontWeight: 700, borderRadius: 7, border: "1.5px solid #ef4444", background: "#ef4444", color: "#fff", cursor: "pointer", whiteSpace: "nowrap", opacity: deleteLoading ? 0.6 : 1 }}
                            >
                              {deleteLoading ? "刪除中…" : "確認刪除"}
                            </button>
                            <button
                              disabled={deleteLoading}
                              onClick={() => setDeletingId(null)}
                              style={{ padding: "4px 10px", fontSize: 12, fontWeight: 600, borderRadius: 7, border: "1.5px solid var(--border)", background: "#fff", color: "var(--text-sub)", cursor: "pointer", whiteSpace: "nowrap" }}
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          /* ── 一般操作按鈕 ── */
                          <div style={{ display: "flex", gap: 6, opacity: hoveredId === h.id ? 1 : 0, transition: "opacity 0.15s" }}>
                            <button
                              title="編輯"
                              onClick={() => navigate(`/houses/${h.id}/edit`)}
                              style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--border)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--brand-mid)", transition: "background 0.15s, border-color 0.15s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--brand-xlight)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--brand)"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
                            >
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5z"/>
                              </svg>
                            </button>
                            {h.url && (
                              <button
                                title="開啟網頁"
                                onClick={() => window.open(h.url!, "_blank")}
                                style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--border)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--text-muted)", transition: "background 0.15s, border-color 0.15s" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-xlight)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
                              >
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M6.5 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9.5"/>
                                  <path d="M10 2h4v4"/>
                                  <line x1="14" y1="2" x2="7" y2="9"/>
                                </svg>
                              </button>
                            )}
                            <button
                              title="刪除"
                              onClick={() => setDeletingId(h.id)}
                              style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--border)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--text-muted)", transition: "background 0.15s, border-color 0.15s, color 0.15s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
                            >
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 5 5 5 13 5"/>
                                <path d="M6 5V3h4v2"/>
                                <path d="M4 5l1 9h6l1-9"/>
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
