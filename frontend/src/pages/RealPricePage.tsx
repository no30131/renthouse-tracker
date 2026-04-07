import { useState } from "react";
import { api } from "../api";
import Navbar from "../components/Navbar";

// ── 縣市清單 ──────────────────────────────────────────────────────────────────
const COUNTIES = [
  "台北市", "新北市", "桃園市", "台中市", "台南市", "高雄市",
  "基隆市", "新竹市", "嘉義市", "新竹縣", "苗栗縣", "彰化縣",
  "南投縣", "雲林縣", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣",
  "台東縣", "澎湖縣", "金門縣", "連江縣",
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface YearlyStats {
  year: number;
  price_min: number | null;
  price_avg: number | null;
  price_max: number | null;
  avg_size_ping: number | null;
  sample_count: number;
}

interface QueryResult {
  county: string;
  street: string;
  transaction_type: "BUY" | "RENT";
  data: YearlyStats[];
}

interface SyncStatus {
  status: string;
  total_quarters: number;
  done_quarters: number;
  message: string | null;
  started_at: string | null;
  finished_at: string | null;
}



// ── 工具函式 ──────────────────────────────────────────────────────────────────
function fmtPrice(val: number | null, unit: string): string {
  if (val == null) return "—";
  if (val >= 10000) return `${(val / 10000).toFixed(1)} 萬${unit}`;
  return `${val.toLocaleString()} ${unit}`;
}

function fmtRent(val: number | null): string {
  if (val == null) return "—";
  if (val >= 10000) return `${(val / 10000).toFixed(1)} 萬元`;
  return `${val.toLocaleString()} 元`;
}

// ── 統計表格 ──────────────────────────────────────────────────────────────────
function StatsTable({ data, type }: { data: YearlyStats[]; type: "BUY" | "RENT" }) {
  if (type === "BUY") {
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-light)" }}>
              <th style={thStyle}>年份</th>
              <th style={thStyle}>最低</th>
              <th style={thStyle}>平均</th>
              <th style={thStyle}>最高</th>
              <th style={thStyle}>筆數</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.year} style={{ borderBottom: "1px solid var(--border-light)" }}>
                <td style={tdStyle}>{row.year}</td>
                <td style={{ ...tdStyle, color: "#10b981" }}>{fmtPrice(row.price_min, "元/坪")}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{fmtPrice(row.price_avg, "元/坪")}</td>
                <td style={{ ...tdStyle, color: "#ef4444" }}>{fmtPrice(row.price_max, "元/坪")}</td>
                <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{row.sample_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // RENT：顯示坪數 + 估算月租金（= 每坪租金 × 平均坪數），每坪租金作為輔助參考
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border-light)" }}>
            <th style={thStyle}>年份</th>
            <th style={thStyle}>平均坪數</th>
            <th style={thStyle}>估算月租金</th>
            <th style={{ ...thStyle, color: "var(--text-muted)", fontWeight: 500 }}>每坪租金（參考）</th>
            <th style={thStyle}>筆數</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.year} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <td style={tdStyle}>{row.year}</td>
              <td style={tdStyle}>{row.avg_size_ping != null ? `${row.avg_size_ping} 坪` : "—"}</td>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{fmtRent(row.price_avg)}</td>
              <td style={{ ...tdStyle, color: "var(--text-muted)", fontSize: 12 }}>
                {row.avg_size_ping != null && row.price_avg != null
                  ? fmtPrice(Math.round(row.price_avg / (row.avg_size_ping || 1)), "元/坪/月")
                  : "—"}
              </td>
              <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{row.sample_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 12px", textAlign: "left", fontWeight: 700,
  fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px",
};
const tdStyle: React.CSSProperties = {
  padding: "9px 12px", color: "var(--text)",
};

// ── 折線迷你圖（純 SVG，無額外套件）────────────────────────────────────────────
function SparkLine({ data, type }: { data: YearlyStats[]; type: "BUY" | "RENT" }) {
  const avgs = data.map((d) => d.price_avg ?? 0).filter((v) => v > 0);
  if (avgs.length < 2) return null;

  const W = 400, H = 80, PAD = 8;
  const minV = Math.min(...avgs);
  const maxV = Math.max(...avgs);
  const range = maxV - minV || 1;

  const points = avgs.map((v, i) => {
    const x = PAD + (i / (avgs.length - 1)) * (W - PAD * 2);
    const y = PAD + ((maxV - v) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });

  const color = type === "BUY" ? "#f59e0b" : "#10b981";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, height: H, display: "block", margin: "8px 0" }}>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((pt, i) => {
        const [x, y] = pt.split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r={3.5} fill={color} />;
      })}
    </svg>
  );
}

// ── 結果區塊 ──────────────────────────────────────────────────────────────────
function ResultSection({ result }: { result: QueryResult }) {
  const isBuy = result.transaction_type === "BUY";
  const label = isBuy ? "買賣（每坪單價）" : "租賃（坪數 × 月租金）";
  const accent = isBuy ? "#f59e0b" : "#10b981";

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 4, height: 20, borderRadius: 2, background: accent, flexShrink: 0 }} />
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{label}</h3>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
          共 {result.data.reduce((s, d) => s + d.sample_count, 0)} 筆
        </span>
      </div>
      <SparkLine data={result.data} type={result.transaction_type} />
      <StatsTable data={result.data} type={result.transaction_type} />
    </div>
  );
}

// ── 同步狀態 ──────────────────────────────────────────────────────────────────
function SyncPanel({ county }: { county: string }) {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncError, setSyncError] = useState("");
  const [polling, setPolling] = useState(false);

  async function handleSync() {
    setSyncing(true);
    setSyncError("");
    try {
      await api.post("/api/real-price/sync", null, { params: { counties: county } });
      setPolling(true);
      pollStatus();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setSyncError(err.response?.data?.detail ?? "啟動失敗");
      setSyncing(false);
    }
  }

  async function pollStatus() {
    const interval = setInterval(async () => {
      try {
        const res = await api.get<SyncStatus>("/api/real-price/sync/status");
        setSyncStatus(res.data);
        if (res.data.status !== "running") {
          clearInterval(interval);
          setSyncing(false);
          setPolling(false);
        }
      } catch {
        clearInterval(interval);
        setSyncing(false);
        setPolling(false);
      }
    }, 3000);
  }

  const progress = syncStatus && syncStatus.total_quarters > 0
    ? Math.round((syncStatus.done_quarters / syncStatus.total_quarters) * 100)
    : 0;

  return (
    <div className="card" style={{ marginBottom: 24, background: "var(--bg-green)", border: "1.5px solid var(--brand)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
            尚無資料，請先下載政府實價登錄資料
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            資料來源：內政部不動產交易實價查詢服務網（免費開放資料）· 下載全台 10 年約需 5~15 分鐘
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={handleSync}
          disabled={syncing || polling}
          style={{ padding: "10px 22px", fontSize: 13, minHeight: 40, flexShrink: 0 }}
        >
          {syncing || polling ? "下載中…" : "開始下載資料"}
        </button>
      </div>

      {syncError && (
        <p style={{ marginTop: 10, fontSize: 13, color: "#dc2626" }}>{syncError}</p>
      )}

      {syncStatus && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, color: "var(--text-muted)" }}>
            <span>{syncStatus.message}</span>
            <span>{syncStatus.done_quarters} / {syncStatus.total_quarters}</span>
          </div>
          <div style={{ height: 6, background: "var(--border-light)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "var(--brand)", borderRadius: 99, transition: "width 0.4s" }} />
          </div>
          {syncStatus.status === "done" && (
            <p style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "var(--brand-mid)" }}>
              同步完成，請重新查詢。
            </p>
          )}
          {syncStatus.status === "error" && (
            <p style={{ marginTop: 8, fontSize: 13, color: "#dc2626" }}>
              同步失敗：{syncStatus.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── 主頁面 ────────────────────────────────────────────────────────────────────
export default function RealPricePage() {
  const [county, setCounty] = useState("台北市");
  const [street, setStreet] = useState("");
  const [results, setResults] = useState<QueryResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // "sync-needed" = 從未下載過  |  "no-results" = 下載過但此路段無資料  |  null = 有資料或未查詢
  const [emptyReason, setEmptyReason] = useState<"sync-needed" | "no-results" | null>(null);

  async function handleQuery() {
    if (!street.trim()) return;
    setLoading(true);
    setError("");
    setResults(null);
    setEmptyReason(null);
    try {
      const [queryRes] = await Promise.all([
        api.get<QueryResult[]>("/api/real-price/query", {
          params: { county, street: street.trim() },
        }),
      ]);

      if (queryRes.data.length === 0) {
        // 用 debug endpoint 確認「這個縣市」是否有資料，而非看全域 sync 狀態
        // （避免：下載新北後查台北，誤判為「路段無資料」）
        const debugRes = await api.get<{ total_records: number }>("/api/real-price/debug", {
          params: { county },
        });
        const hasCountyData = debugRes.data.total_records > 0;
        setEmptyReason(hasCountyData ? "no-results" : "sync-needed");
      } else {
        setResults(queryRes.data);
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail ?? "查詢失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100svh", paddingBottom: 80 }}>
      <Navbar />

      <div className="page-wrapper">
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.5px", margin: 0 }}>
            實價登錄查詢
          </h2>
          <p style={{ marginTop: 6, fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>
            輸入路段名稱，查看近 10 年買賣與租賃的每坪價格統計
          </p>
        </div>

        {/* 查詢表單 */}
        <div className="card" style={{ marginBottom: 24, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 140 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              縣市
            </label>
            <select
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              style={{
                padding: "9px 12px", borderRadius: 10, border: "1.5px solid var(--border-light)",
                fontSize: 14, background: "var(--bg-card, #fff)", color: "var(--text)",
                cursor: "pointer",
              }}
            >
              {COUNTIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              路段名稱
            </label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuery()}
              placeholder="例：中山北路一段"
              style={{
                padding: "9px 12px", borderRadius: 10, border: "1.5px solid var(--border-light)",
                fontSize: 14, background: "var(--bg-card, #fff)", color: "var(--text)",
                outline: "none",
              }}
            />
          </div>

          <button
            className="btn-primary"
            onClick={handleQuery}
            disabled={loading || !street.trim()}
            style={{ padding: "10px 28px", fontSize: 14, minHeight: 44, alignSelf: "flex-end" }}
          >
            {loading ? "查詢中…" : "查詢"}
          </button>
        </div>

        {/* 錯誤 */}
        {error && (
          <div style={{ marginBottom: 16, padding: "12px 16px", background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 12, fontSize: 14, color: "#dc2626", fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* 從未下載過 → 顯示下載面板 */}
        {emptyReason === "sync-needed" && <SyncPanel county={county} />}

        {/* 下載過但此路段無資料 */}
        {emptyReason === "no-results" && (
          <div className="card" style={{ textAlign: "center", padding: "32px 20px" }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 6px" }}>
              查無「{street}」的實價登錄紀錄
            </p>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              此路段在 {county} 的實價登錄資料庫中沒有成交紀錄，可能是路段名稱有誤、或該路段確實無登錄資料。
            </p>
          </div>
        )}

        {/* 結果 */}
        {results && results.length > 0 && (
          <>
            <div style={{ marginBottom: 16, fontSize: 13, color: "var(--text-muted)" }}>
              {county} · {street} · 近 10 年統計
            </div>
            {results.map((r) => (
              <ResultSection key={r.transaction_type} result={r} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
