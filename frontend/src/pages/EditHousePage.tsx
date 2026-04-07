import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

const STATUS_OPTIONS = ["待確認", "考慮中", "已看房", "已租定", "已放棄"];

type FormState = {
  title: string; address: string; district: string;
  rent_price: string; size_ping: string; floor: string; status: string;
  user_rating: string; pet_friendly: string; cooking_allowed: string;
  notes: string; url: string;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-sub)", marginBottom: 7 }}>
      {children}
    </label>
  );
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

export default function EditHousePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>({
    title: "", address: "", district: "", rent_price: "", size_ping: "", floor: "",
    status: "考慮中", user_rating: "", pet_friendly: "", cooking_allowed: "",
    notes: "", url: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/api/houses/${id}`).then((res) => {
      const h = res.data;
      setForm({
        title: h.title ?? "",
        address: h.address ?? "",
        district: h.district ?? "",
        rent_price: h.rent_price != null ? String(h.rent_price) : "",
        size_ping: h.size_ping != null ? String(h.size_ping) : "",
        floor: h.floor ?? "",
        status: h.status ?? "考慮中",
        user_rating: h.user_rating != null ? String(h.user_rating) : "",
        pet_friendly: h.pet_friendly != null ? String(h.pet_friendly) : "",
        cooking_allowed: h.cooking_allowed != null ? String(h.cooking_allowed) : "",
        notes: h.notes ?? "",
        url: h.url ?? "",
      });
      setLoading(false);
    }).catch(() => navigate("/"));
  }, [id, navigate]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        address: form.address,
        district: form.district || null,
        url: form.url || null,
        rent_price: form.rent_price ? Number(form.rent_price) : null,
        size_ping: form.size_ping ? Number(form.size_ping) : null,
        floor: form.floor || null,
        status: form.status,
        user_rating: form.user_rating ? Number(form.user_rating) : null,
        pet_friendly: form.pet_friendly === "" ? null : form.pet_friendly === "true",
        cooking_allowed: form.cooking_allowed === "" ? null : form.cooking_allowed === "true",
        notes: form.notes || null,
      };
      await api.patch(`/api/houses/${id}`, payload);
      navigate("/");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "儲存失敗，請再試一次");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>載入中…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100svh", paddingBottom: 80 }}>
      {/* Nav */}
      <nav className="nav-wrapper" style={{ position: "sticky", top: 0, zIndex: 10, height: 66, display: "flex", alignItems: "center", gap: 14, background: "rgba(253,252,248,0.88)", borderBottom: "1.5px solid var(--border-light)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", boxShadow: "0 2px 12px rgba(16,185,129,0.06)" }}>
        <button className="btn-icon" onClick={() => navigate("/")} aria-label="返回列表" title="返回">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        </button>
        <div>
          <p style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.3px" }}>編輯物件</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1, fontWeight: 500 }}>修改後點儲存生效</p>
        </div>
      </nav>

      <div className="page-wrapper">
        <form onSubmit={handleSubmit}>
          <div className="card" style={{ padding: "36px 40px", display: "flex", flexDirection: "column", gap: 36 }}>

            <section>
              <SectionTitle icon="📍">基本資訊</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <FieldLabel>名稱 *</FieldLabel>
                  <input className="field-input" name="title" required value={form.title} onChange={handleChange} />
                </div>
                <div>
                  <FieldLabel>地址 *</FieldLabel>
                  <input className="field-input" name="address" required value={form.address} onChange={handleChange} />
                </div>
                <div>
                  <FieldLabel>物件連結</FieldLabel>
                  <input className="field-input" name="url" type="url" value={form.url} onChange={handleChange} placeholder="https://..." />
                </div>
              </div>
            </section>

            <section>
              <SectionTitle icon="🔍">詳細條件</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 18 }}>
                {([ ["district","行政區","text","例：信義區"], ["rent_price","月租金（元）","number","例：25000"], ["size_ping","坪數","number","例：12.5"], ["floor","樓層","text","例：5F"] ] as const).map(([name, label, type, placeholder]) => (
                  <div key={name}>
                    <FieldLabel>{label}</FieldLabel>
                    <input className="field-input" name={name} type={type} value={form[name]} onChange={handleChange} placeholder={placeholder} />
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
                  <input className="field-input" name="user_rating" type="number" min="1" max="10" value={form.user_rating} onChange={handleChange} placeholder="1–10" />
                </div>
                <div>
                  <FieldLabel>可養寵物</FieldLabel>
                  <select className="field-input" name="pet_friendly" value={form.pet_friendly} onChange={handleChange}>
                    <option value="">不確定</option><option value="true">是</option><option value="false">否</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>可開伙</FieldLabel>
                  <select className="field-input" name="cooking_allowed" value={form.cooking_allowed} onChange={handleChange}>
                    <option value="">不確定</option><option value="true">是</option><option value="false">否</option>
                  </select>
                </div>
              </div>
            </section>

            <section>
              <SectionTitle icon="📝">備註</SectionTitle>
              <textarea className="field-input" name="notes" value={form.notes} onChange={handleChange} rows={4} style={{ resize: "vertical", lineHeight: 1.65 }} />
            </section>

            {error && (
              <p role="alert" style={{ fontSize: 13, fontWeight: 600, color: "#92400e", padding: "12px 16px", background: "#fef3c7", border: "1.5px solid #fde68a", borderRadius: 14, marginTop: -12 }}>
                ⚠️ {error}
              </p>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 4, borderTop: "1.5px solid var(--border-light)" }}>
              <button type="button" className="btn-outline" onClick={() => navigate("/")}>取消</button>
              <button type="submit" className="btn-primary" disabled={submitting} style={{ minWidth: 120 }}>
                {submitting ? "儲存中…" : "儲存變更"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
