import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api";
import Navbar from "../components/Navbar";

interface IsochroneFeature {
  type: "Feature";
  geometry: { type: string; coordinates: unknown };
  properties: {
    travel_mode: string;
    duration_mins: number;
    generated_at: string;
  };
}

interface IsochroneCollection {
  type: "FeatureCollection";
  features: IsochroneFeature[];
}

interface House {
  id: string;
  title: string;
  district: string | null;
  rent_price: number | null;
  size_ping: number | null;
  lat: number | null;
  lng: number | null;
  status: string;
  url: string | null;
  min_distance_km: number | null;
  min_commute_mins: number | null;
}

const RING_STYLE: Record<number, { color: string; fillColor: string; label: string }> = {
  40: { color: "#ef4444", fillColor: "#ef4444", label: "40 分鐘" },
  30: { color: "#f59e0b", fillColor: "#f59e0b", label: "30 分鐘" },
  20: { color: "#10B981", fillColor: "#10B981", label: "20 分鐘" },
};


function formatTime(isoString: string) {
  return new Date(isoString).toLocaleString("zh-TW", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function buildPopupHtml(house: House): string {
  const priceHtml = house.rent_price
    ? `<span style="font-weight:700;color:#059669;">$${house.rent_price.toLocaleString()}</span>`
    : "";
  const sizeHtml = house.size_ping
    ? `<span style="color:#777;font-size:12px;">${house.size_ping} 坪</span>`
    : "";
  const districtHtml = house.district
    ? `<div style="font-size:11px;color:#888;margin-bottom:5px;">${house.district}</div>`
    : "";
  const commuteHtml = (house.min_distance_km != null || house.min_commute_mins != null)
    ? `<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;padding:5px 8px;background:#f0fdf4;border-radius:6px;">
        ${house.min_distance_km != null ? `<span style="font-size:11px;color:#059669;font-weight:600;">📍 ${house.min_distance_km.toFixed(1)} km</span>` : ""}
        ${house.min_commute_mins != null ? `<span style="font-size:11px;color:#059669;font-weight:600;">🚗 約 ${house.min_commute_mins} 分鐘</span>` : ""}
      </div>`
    : "";
  return `
    <div style="font-family:-apple-system,sans-serif;min-width:170px;max-width:230px;">
      <div style="font-weight:700;font-size:13px;line-height:1.3;margin-bottom:4px;color:#1a1a1a;">${house.title}</div>
      ${districtHtml}
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">${priceHtml}${sizeHtml ? `&nbsp;${sizeHtml}` : ""}</div>
      ${commuteHtml}
      <a href="${import.meta.env.BASE_URL}houses/${house.id}" onclick="sessionStorage.setItem('iso_popup_house_id','${house.id}');return true;" style="display:block;text-align:center;padding:5px 0;background:#10B981;color:#fff;border-radius:7px;font-size:12px;font-weight:600;text-decoration:none;">查看詳情</a>
    </div>
  `;
}

export default function IsochronePage() {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Record<number, L.GeoJSON>>({});
  const houseLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Record<string, L.CircleMarker>>({});

  const [collection, setCollection] = useState<IsochroneCollection | null>(null);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState<Set<number>>(new Set([20, 30, 40]));
  const [showHouses, setShowHouses] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<IsochroneCollection>("/api/isochrone"),
      api.get<House[]>("/api/houses"),
    ])
      .then(([isoRes, housesRes]) => {
        setCollection(isoRes.data);
        setHouses(housesRes.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.detail ?? "載入失敗");
        setLoading(false);
      });
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // 初始化地圖（collection 有資料時執行一次）
  useEffect(() => {
    if (!collection?.features.length || !mapContainerRef.current) return;

    mapRef.current?.remove();
    mapRef.current = null;
    layersRef.current = {};
    houseLayerRef.current = null;

    const map = L.map(mapContainerRef.current);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    // 由大到小疊加（40 → 30 → 20）
    const sortedDesc = [...collection.features].sort(
      (a, b) => b.properties.duration_mins - a.properties.duration_mins
    );

    let outerBounds: L.LatLngBounds | null = null;

    sortedDesc.forEach((f) => {
      const mins = f.properties.duration_mins;
      const style = RING_STYLE[mins] ?? { color: "#6b7280", fillColor: "#6b7280", label: `${mins} 分鐘` };

      const layer = L.geoJSON(f as unknown as GeoJSON.Feature, {
        style: { color: style.color, fillColor: style.fillColor, fillOpacity: 0.15, weight: 2 },
      });

      layersRef.current[mins] = layer;

      if (visible.has(mins)) layer.addTo(map);

      if (mins === Math.max(...collection.features.map((x) => x.properties.duration_mins))) {
        outerBounds = layer.getBounds();
      }
    });

    if (outerBounds) map.fitBounds(outerBounds, { padding: [40, 40] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection]);

  // 繪製物件標記（地圖或房源資料更新時重繪）
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 清除舊標記
    if (houseLayerRef.current) {
      houseLayerRef.current.clearLayers();
    } else {
      houseLayerRef.current = L.layerGroup();
    }

    markersRef.current = {};
    if (showHouses) {
      const withCoords = houses.filter((h) => h.lat != null && h.lng != null);
      withCoords.forEach((house) => {
        const marker = L.circleMarker([house.lat!, house.lng!], {
          radius: 8,
          fillColor: house.status === "已放棄" || house.status === "已租定" ? "#9ca3af" : "#10B981",
          color: house.status === "已放棄" || house.status === "已租定" ? "#6b7280" : "#059669",
          weight: 2,
          fillOpacity: 0.85,
        });
        marker.bindPopup(buildPopupHtml(house), { maxWidth: 240 });
        markersRef.current[house.id] = marker;
        houseLayerRef.current!.addLayer(marker);
      });
      houseLayerRef.current.addTo(map);

      // 從物件詳情頁返回時，恢復原本打開的 popup
      const restoreId = sessionStorage.getItem("iso_restore_house_id");
      if (restoreId) {
        sessionStorage.removeItem("iso_restore_house_id");
        const targetMarker = markersRef.current[restoreId];
        if (targetMarker) {
          // 等 fitBounds 動畫結束後再開 popup，避免地圖還在移動時呼叫
          map.once("moveend", () => {
            targetMarker.openPopup();
          });
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [houses, showHouses, collection]); // collection 作為地圖重建的信號

  // 切換 visible 時新增/移除 layer，不重建整張地圖
  function toggleRing(mins: number) {
    const map = mapRef.current;
    const layer = layersRef.current[mins];
    if (!map || !layer) return;

    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(mins)) {
        next.delete(mins);
        map.removeLayer(layer);
      } else {
        next.add(mins);
        layer.addTo(map);
      }
      return next;
    });
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError("");
    setMsg("");
    try {
      const res = await api.post<IsochroneCollection>("/api/isochrone/refresh");
      setCollection(res.data);
      setVisible(new Set([20, 30, 40]));
      setMsg("等時圈已重新生成");
      setTimeout(() => setMsg(""), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail ?? "重新生成失敗，請稍後再試");
    } finally {
      setRefreshing(false);
    }
  }

  const generatedAt = collection?.features[0]?.properties.generated_at;
  const travelMode = collection?.features[0]?.properties.travel_mode;
  const housesWithCoords = houses.filter((h) => h.lat != null && h.lng != null);

  return (
    <div style={{ minHeight: "100svh", paddingBottom: 80 }}>
      <Navbar />

      <div className="page-wrapper">
        {/* Header */}
        <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.5px", margin: 0 }}>
              通勤等時圈
            </h2>
            <p style={{ marginTop: 6, fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>
              以公司地址為中心，顯示 20 / 30 / 40 分鐘車程可到達的範圍
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            style={{ padding: "10px 22px", fontSize: 13, minHeight: 40, opacity: refreshing ? 0.7 : 1 }}
          >
            {refreshing ? "生成中…" : "重新生成"}
          </button>
        </div>

        {msg && (
          <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--bg-green)", border: "1.5px solid var(--brand)", borderRadius: 12, fontSize: 13, fontWeight: 600, color: "var(--brand-mid)" }}>
            {msg}
          </div>
        )}
        {error && (
          <div style={{ marginBottom: 16, padding: "12px 16px", background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 12, fontSize: 14, color: "#dc2626", fontWeight: 500 }}>
            {error}
            {(error.includes("address") || error.includes("公司")) && (
              <span>
                {" "}請先至{" "}
                <button
                  onClick={() => navigate("/preferences")}
                  style={{ background: "none", border: "none", color: "#dc2626", fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0, fontSize: "inherit" }}
                >
                  偏好設定
                </button>
                {" "}填寫公司地址。
              </span>
            )}
          </div>
        )}

        {/* Metadata + 圖例 */}
        {collection && (
          <div className="card" style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>交通方式</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                  {travelMode === "driving" ? "🚗 開車" : travelMode === "cycling" ? "🚲 自行車" : travelMode === "MOTORCYCLE" ? "🛵 機車" : travelMode}
                </span>
              </div>
              {generatedAt && (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>生成時間</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{formatTime(generatedAt)}</span>
                </div>
              )}
            </div>

            {/* 圖例（可點選切換）+ 物件標記開關 */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[20, 30, 40].map((mins) => {
                const s = RING_STYLE[mins];
                const on = visible.has(mins);
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => toggleRing(mins)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 12px",
                      borderRadius: 10,
                      border: `1.5px solid ${on ? s.color : "var(--border-light)"}`,
                      background: on ? `${s.fillColor}18` : "var(--bg-card, #fff)",
                      cursor: "pointer",
                      opacity: on ? 1 : 0.45,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{
                      width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                      background: on ? s.fillColor : "var(--border)",
                      border: `2px solid ${on ? s.color : "var(--border)"}`,
                    }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: on ? "var(--text-sub)" : "var(--text-muted)" }}>
                      {s.label}
                    </span>
                  </button>
                );
              })}

              {/* 物件標記切換 */}
              <button
                type="button"
                onClick={() => setShowHouses((v) => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px",
                  borderRadius: 10,
                  border: `1.5px solid ${showHouses ? "#10B981" : "var(--border-light)"}`,
                  background: showHouses ? "#10B98118" : "var(--bg-card, #fff)",
                  cursor: "pointer",
                  opacity: showHouses ? 1 : 0.45,
                  transition: "all 0.15s",
                }}
              >
                <div style={{
                  width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
                  background: showHouses ? "#10B981" : "var(--border)",
                  border: `2px solid ${showHouses ? "#059669" : "var(--border)"}`,
                }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: showHouses ? "var(--text-sub)" : "var(--text-muted)" }}>
                  物件 {housesWithCoords.length > 0 ? `(${housesWithCoords.length})` : ""}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="card" style={{ padding: 0, overflow: "hidden", borderRadius: 18, border: "1.5px solid var(--border-light)" }}>
          {loading ? (
            <div style={{ height: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--brand-xlight)" }}>
              <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>載入等時圈中…</span>
            </div>
          ) : error && !collection ? (
            <div style={{ height: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--brand-xlight)" }}>
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>無法顯示地圖</span>
            </div>
          ) : (
            <div ref={mapContainerRef} style={{ height: 500, width: "100%" }} />
          )}
        </div>

        <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
          地圖資料來源：OpenStreetMap・等時圈由 Mapbox Isochrone API 生成（靜態分析，不含即時車流）
        </p>
      </div>
    </div>
  );
}
