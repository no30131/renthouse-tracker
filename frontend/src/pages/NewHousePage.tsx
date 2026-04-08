import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { DEMO_SCRAPE_URL } from "../demo/mockData";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

const STATUS_OPTIONS = ["考慮中", "已看房", "已租定", "已放棄"];

type FormState = {
  title: string;
  address: string;
  district: string;
  rent_price: string;
  size_ping: string;
  floor: string;
  status: string;
  user_rating: string;
  pet_friendly: string;
  cooking_allowed: string;
  notes: string;
  url: string;
  source: string;
  source_id: string;
};

const EMPTY_FORM: FormState = {
  title: "", address: "", district: "", rent_price: "", size_ping: "", floor: "",
  status: "考慮中", user_rating: "", pet_friendly: "", cooking_allowed: "",
  notes: "", url: "", source: "Manual", source_id: "",
};

// Fields that were auto-filled by scraper (for visual hint)
type AutoFilled = Partial<Record<keyof FormState, boolean>>;

function FieldLabel({
  required,
  auto,
  children,
}: {
  required?: boolean;
  auto?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 700,
        color: "var(--text-sub)",
        marginBottom: 7,
      }}
    >
      {children}
      {required && <span style={{ color: "var(--brand)" }}>*</span>}
      {auto && (
        <span
          title="自動帶入"
          style={{
            fontSize: 10,
            fontWeight: 700,
            background: "var(--brand-light)",
            color: "var(--brand-mid)",
            padding: "1px 7px",
            borderRadius: 99,
            letterSpacing: "0.2px",
          }}
        >
          自動帶入
        </span>
      )}
    </label>
  );
}

function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 20,
        paddingBottom: 14,
        borderBottom: "1.5px solid var(--border-light)",
      }}
    >
      <span
        style={{
          width: 32, height: 32,
          background: "var(--brand-xlight)",
          borderRadius: "55% 45% 60% 40% / 40% 60% 45% 55%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-sub)" }}>
        {children}
      </span>
    </div>
  );
}

export default function NewHousePage() {
  const navigate = useNavigate();
  const [urlInput, setUrlInput] = useState(DEMO_MODE ? DEMO_SCRAPE_URL : "");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");
  const [scraped, setScraped] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [autoFilled, setAutoFilled] = useState<AutoFilled>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ── Scrape ──────────────────────────────────────────────
  async function handleScrape() {
    if (!urlInput.trim()) return;
    setScraping(true);
    setScrapeError("");
    try {
      const res = await api.post("/api/houses/scrape", { url: urlInput.trim() });
      const data = res.data as Record<string, unknown>;

      if (data.error) {
        setScrapeError(data.error as string);
        return;
      }

      const filled: AutoFilled = {};
      const next = { ...EMPTY_FORM, url: urlInput.trim() };

      const map: Array<[keyof FormState, string]> = [
        ["title", "title"], ["address", "address"], ["district", "district"],
        ["rent_price", "rent_price"], ["size_ping", "size_ping"], ["floor", "floor"],
        ["source", "source"], ["source_id", "source_id"],
        ["pet_friendly", "pet_friendly"], ["cooking_allowed", "cooking_allowed"],
      ];
      for (const [field, key] of map) {
        if (data[key] != null && data[key] !== "") {
          next[field] = String(data[key]);
          filled[field] = true;
        }
      }

      setForm(next);
      setAutoFilled(filled);
      setScraped(true);
    } catch {
      setScrapeError("無法解析該網址，請手動填寫");
    } finally {
      setScraping(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const key = e.target.name as keyof FormState;
    setForm({ ...form, [key]: e.target.value });
    // Once user edits a field, clear its auto-fill badge
    if (autoFilled[key]) {
      setAutoFilled({ ...autoFilled, [key]: false });
    }
  }

  // ── Submit ───────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        source: form.source || "Manual",
        source_id: form.source_id || null,
        url: form.url || null,
        title: form.title,
        address: form.address,
        district: form.district || null,
        rent_price: form.rent_price ? Number(form.rent_price) : null,
        size_ping: form.size_ping ? Number(form.size_ping) : null,
        floor: form.floor || null,
        status: form.status,
        user_rating: form.user_rating ? Number(form.user_rating) : null,
        pet_friendly: form.pet_friendly === "" ? null : form.pet_friendly === "true",
        cooking_allowed: form.cooking_allowed === "" ? null : form.cooking_allowed === "true",
        notes: form.notes || null,
      };
      await api.post("/api/houses", payload);
      navigate("/");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setSubmitError(msg || "新增失敗，請再試一次");
    } finally {
      setSubmitting(false);
    }
  }

  const autoCount = Object.values(autoFilled).filter(Boolean).length;

  return (
    <div style={{ minHeight: "100svh", paddingBottom: 80 }}>

      {/* ── Nav ── */}
      <nav
        className="nav-wrapper"
        style={{
          position: "sticky", top: 0, zIndex: 10,
          height: 66,
          display: "flex", alignItems: "center", gap: 14,
          background: "rgba(253,252,248,0.88)",
          borderBottom: "1.5px solid var(--border-light)",
          backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
          boxShadow: "0 2px 12px rgba(16,185,129,0.06)",
        }}
      >
        <button className="btn-icon" onClick={() => navigate("/")} aria-label="返回" title="返回">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        </button>
        <div>
          <p style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.3px" }}>
            新增物件
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1, fontWeight: 500 }}>
            貼入網址自動帶入，或直接手動填寫
          </p>
        </div>
      </nav>

      <div className="page-wrapper">

        {/* ── Step 1: URL input ── */}
        <div className="card" style={{ padding: "28px 32px", marginBottom: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>
            🔗 貼入物件連結（支援多數租屋網站）
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              className="field-input"
              type="url"
              placeholder="https://..."
              value={urlInput}
              onChange={DEMO_MODE ? undefined : (e) => setUrlInput(e.target.value)}
              onKeyDown={DEMO_MODE ? undefined : (e) => e.key === "Enter" && (e.preventDefault(), handleScrape())}
              readOnly={DEMO_MODE}
              style={{ flex: 1, ...(DEMO_MODE ? { cursor: "default", opacity: 0.75 } : {}) }}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={handleScrape}
              disabled={scraping || !urlInput.trim()}
              style={{ minWidth: 100, flexShrink: 0 }}
            >
              {scraping ? "解析中…" : "帶入資訊"}
            </button>
          </div>

          {scrapeError && (
            <p style={{ marginTop: 10, fontSize: 13, color: "#92400e", fontWeight: 600 }}>
              ⚠️ {scrapeError}
            </p>
          )}

          {scraped && autoCount > 0 && (
            <p style={{ marginTop: 10, fontSize: 13, color: "var(--brand-mid)", fontWeight: 600 }}>
              ✅ 成功帶入 {autoCount} 個欄位，請確認並補填剩餘資訊
            </p>
          )}
          {scraped && autoCount === 0 && !scrapeError && (
            <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
              頁面解析完成，但未能自動擷取欄位，請手動填寫
            </p>
          )}
        </div>

        {/* ── Step 2: Form ── */}
        <form onSubmit={handleSubmit}>
          <div
            className="card"
            style={{ padding: "36px 40px", display: "flex", flexDirection: "column", gap: 36 }}
          >

            {/* 基本資訊 */}
            <section>
              <SectionTitle icon="📍">基本資訊</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <FieldLabel required auto={autoFilled.title}>名稱</FieldLabel>
                  <input
                    className="field-input"
                    name="title"
                    required
                    value={form.title}
                    onChange={handleChange}
                    placeholder="例：信義區兩房一廳"
                    style={autoFilled.title ? { borderColor: "var(--brand)", background: "var(--brand-xlight)" } : {}}
                  />
                </div>
                <div>
                  <FieldLabel required auto={autoFilled.address}>地址</FieldLabel>
                  <input
                    className="field-input"
                    name="address"
                    required
                    value={form.address}
                    onChange={handleChange}
                    placeholder="例：台北市信義區松仁路 100 號"
                    style={autoFilled.address ? { borderColor: "var(--brand)", background: "var(--brand-xlight)" } : {}}
                  />
                </div>
              </div>
            </section>

            {/* 詳細條件 */}
            <section>
              <SectionTitle icon="🔍">詳細條件</SectionTitle>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                  gap: 18,
                }}
              >
                {(
                  [
                    { name: "district", label: "行政區", placeholder: "例：信義區", type: "text", auto: autoFilled.district },
                    { name: "rent_price", label: "月租金（元）", placeholder: "例：25000", type: "number", auto: autoFilled.rent_price },
                    { name: "size_ping", label: "坪數", placeholder: "例：12.5", type: "number", auto: autoFilled.size_ping },
                    { name: "floor", label: "樓層", placeholder: "例：5F 或 3F/12F", type: "text", auto: autoFilled.floor },
                  ] as const
                ).map(({ name, label, placeholder, type, auto }) => (
                  <div key={name}>
                    <FieldLabel auto={auto}>{label}</FieldLabel>
                    <input
                      className="field-input"
                      name={name}
                      type={type ?? "text"}
                      value={form[name as keyof FormState]}
                      onChange={handleChange}
                      placeholder={placeholder}
                      style={auto ? { borderColor: "var(--brand)", background: "var(--brand-xlight)" } : {}}
                    />
                  </div>
                ))}
                <div>
                  <FieldLabel>狀態</FieldLabel>
                  <select className="field-input" name="status" value={form.status} onChange={handleChange}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>個人評分（1–10）</FieldLabel>
                  <input
                    className="field-input"
                    name="user_rating"
                    type="number"
                    min="1" max="10"
                    value={form.user_rating}
                    onChange={handleChange}
                    placeholder="1–10"
                  />
                </div>
                <div>
                  <FieldLabel auto={autoFilled.pet_friendly}>可養寵物</FieldLabel>
                  <select
                    className="field-input"
                    name="pet_friendly"
                    value={form.pet_friendly}
                    onChange={handleChange}
                    style={autoFilled.pet_friendly ? { borderColor: "var(--brand)", background: "var(--brand-xlight)" } : {}}
                  >
                    <option value="">不確定</option>
                    <option value="true">是</option>
                    <option value="false">否</option>
                  </select>
                </div>
                <div>
                  <FieldLabel auto={autoFilled.cooking_allowed}>可開伙</FieldLabel>
                  <select
                    className="field-input"
                    name="cooking_allowed"
                    value={form.cooking_allowed}
                    onChange={handleChange}
                    style={autoFilled.cooking_allowed ? { borderColor: "var(--brand)", background: "var(--brand-xlight)" } : {}}
                  >
                    <option value="">不確定</option>
                    <option value="true">是</option>
                    <option value="false">否</option>
                  </select>
                </div>
              </div>
            </section>

            {/* 備註 */}
            <section>
              <SectionTitle icon="📝">備註</SectionTitle>
              <textarea
                className="field-input"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={4}
                placeholder="任何補充說明、看房心得…"
                style={{ resize: "vertical", lineHeight: 1.65 }}
              />
            </section>

            {submitError && (
              <p
                role="alert"
                style={{
                  fontSize: 13, fontWeight: 600, color: "#92400e",
                  padding: "12px 16px",
                  background: "#fef3c7", border: "1.5px solid #fde68a",
                  borderRadius: 14, marginTop: -12,
                }}
              >
                ⚠️ {submitError}
              </p>
            )}

            {/* Actions */}
            <div
              style={{
                display: "flex", gap: 12, justifyContent: "flex-end",
                paddingTop: 4, borderTop: "1.5px solid var(--border-light)",
              }}
            >
              <button type="button" className="btn-outline" onClick={() => navigate("/")}>
                取消
              </button>
              <button type="submit" className="btn-primary" disabled={submitting} style={{ minWidth: 120 }}>
                {submitting ? "新增中…" : "新增物件"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
