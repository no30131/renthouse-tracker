import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import Navbar from "../components/Navbar";

interface Preferences {
  company_label: string | null;
  company_address: string | null;
  wishlist: string[];
  dislikes: string[];
  commute_arrival_times: string[] | null;
  current_address: string | null;
  current_district: string | null;
}


function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: "1.5px solid var(--border-light)" }}>
      <span style={{ width: 32, height: 32, background: "var(--brand-xlight)", borderRadius: "55% 45% 60% 40% / 40% 60% 45% 55%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-sub)" }}>{children}</span>
    </div>
  );
}

function EditableList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  function addItem() {
    const trimmed = input.trim();
    if (!trimmed || items.includes(trimmed)) return;
    onChange([...items, trimmed]);
    setInput("");
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  }

  return (
    <div>
      <div className="responsive-form-group" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          className="field-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="btn-primary"
          onClick={addItem}
          style={{ padding: "0 20px", fontSize: 13, minHeight: 42 }}
        >
          新增
        </button>
      </div>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>
          尚無條目
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((item, idx) => (
            <li
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "10px 14px",
                background: "var(--bg-green)",
                borderRadius: 10,
                border: "1.5px solid var(--border-light)",
              }}
            >
              <span style={{ fontSize: 14, color: "var(--text)", fontWeight: 500 }}>{item}</span>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  border: "1.5px solid var(--border)",
                  background: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  flexShrink: 0,
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PreferencesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [companyLabel, setCompanyLabel] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [departureTimes, setDepartureTimes] = useState<string[]>([]);
  const [timeInput, setTimeInput] = useState("09:00");
  const [currentAddress, setCurrentAddress] = useState("");
  const [currentDistrict, setCurrentDistrict] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);

  useEffect(() => {
    api.get<Preferences>("/api/preferences").then((res) => {
      const d = res.data;
      setCompanyLabel(d.company_label ?? "");
      setCompanyAddress(d.company_address ?? "");
      setDepartureTimes(d.commute_arrival_times ?? []);
      setCurrentAddress(d.current_address ?? "");
      setCurrentDistrict(d.current_district ?? null);
      setWishlist(d.wishlist ?? []);
      setDislikes(d.dislikes ?? []);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);
    try {
      const res = await api.put<Preferences>("/api/preferences", {
        company_label: companyLabel || null,
        company_address: companyAddress || null,
        commute_arrival_times: departureTimes,
        current_address: currentAddress || null,
        wishlist,
        dislikes,
      });
      setCurrentDistrict(res.data.current_district ?? null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail ?? "儲存失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100svh", paddingBottom: 80 }}>
      <Navbar />

      <div className="page-wrapper">
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 30, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.5px", margin: 0 }}>
            偏好設定
          </h2>
          <p style={{ marginTop: 6, fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>
            設定公司地址與篩選條件，系統將據此自動計算通勤時間與等時圈
          </p>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 80, borderRadius: 18, background: "var(--brand-xlight)", opacity: 1 - (i - 1) * 0.25 }} />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* 公司地址 */}
            <div className="card">
              <SectionTitle icon="🏢">公司地址</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-sub)", marginBottom: 7 }}>
                    名稱標籤
                  </label>
                  <input
                    className="field-input"
                    value={companyLabel}
                    onChange={(e) => setCompanyLabel(e.target.value)}
                    placeholder="例如：公司A、辦公室"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-sub)", marginBottom: 7 }}>
                    詳細地址
                  </label>
                  <input
                    className="field-input"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="例如：台北市信義區信義路五段7號"
                  />
                  <p style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
                    儲存後系統將自動進行 Geocoding，更新公司座標
                  </p>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-sub)", marginBottom: 7 }}>
                    通勤抵達時間
                  </label>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <input
                      type="time"
                      className="field-input"
                      value={timeInput}
                      onChange={(e) => setTimeInput(e.target.value)}
                      style={{ maxWidth: 160 }}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        if (timeInput && !departureTimes.includes(timeInput)) {
                          setDepartureTimes([...departureTimes, timeInput].sort());
                        }
                      }}
                      style={{ padding: "0 20px", fontSize: 13, minHeight: 42 }}
                    >
                      新增
                    </button>
                  </div>
                  {departureTimes.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>
                      尚無抵達時間，預設以 09:00 計算
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {departureTimes.map((t) => (
                        <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "var(--bg-green)", border: "1.5px solid var(--border-light)", borderRadius: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{t}</span>
                          <button
                            type="button"
                            onClick={() => setDepartureTimes(departureTimes.filter((x) => x !== t))}
                            style={{ width: 20, height: 20, borderRadius: 5, border: "1.5px solid var(--border)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13, lineHeight: 1, padding: 0 }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
                    每個抵達時間點將各自計算一次通勤，並推算需幾點出發
                  </p>
                </div>
              </div>
            </div>

            {/* 現居地址 */}
            <div className="card">
              <SectionTitle icon="🏠">現居地址</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-sub)", marginBottom: 7 }}>
                    詳細地址
                  </label>
                  <input
                    className="field-input"
                    value={currentAddress}
                    onChange={(e) => setCurrentAddress(e.target.value)}
                    placeholder="例如：台北市中山區中山北路二段50號"
                  />
                  <p style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
                    儲存後系統將自動 Geocoding 並抓取行政區氣候資料
                  </p>
                </div>
                {currentDistrict && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--bg-green)", borderRadius: 10, border: "1.5px solid var(--border-light)" }}>
                    <span style={{ fontSize: 13 }}>📍</span>
                    <span style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 600 }}>{currentDistrict}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 願望清單 */}
            <div className="card">
              <SectionTitle icon="✨">租屋願望清單</SectionTitle>
              <p style={{ marginBottom: 14, fontSize: 13, color: "var(--text-muted)" }}>
                列出你對新租屋的期望條件，例如：採光好、垃圾代收
              </p>
              <EditableList
                items={wishlist}
                onChange={setWishlist}
                placeholder="輸入期望條件後按 Enter 或點新增"
              />
            </div>

            {/* 不滿清單 */}
            <div className="card">
              <SectionTitle icon="⚡">現居不滿清單</SectionTitle>
              <p style={{ marginBottom: 14, fontSize: 13, color: "var(--text-muted)" }}>
                列出目前住所的缺點，用來提醒自己選新房時需要避開的問題
              </p>
              <EditableList
                items={dislikes}
                onChange={setDislikes}
                placeholder="輸入不滿條目後按 Enter 或點新增"
              />
            </div>

            {/* Error / Success */}
            {error && (
              <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 12, fontSize: 14, color: "#dc2626", fontWeight: 500 }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ padding: "12px 16px", background: "var(--bg-green)", border: "1.5px solid var(--brand)", borderRadius: 12, fontSize: 14, color: "var(--brand-mid)", fontWeight: 600 }}>
                儲存成功！
              </div>
            )}

            {/* Submit */}
            <div className="responsive-form-group" style={{ display: "flex", gap: 12 }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                style={{ flex: 1, minHeight: 48, fontSize: 15, fontWeight: 700, opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? "儲存中…" : "儲存設定"}
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={() => navigate("/")}
                style={{ minHeight: 48, padding: "0 24px", fontSize: 15 }}
              >
                取消
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
