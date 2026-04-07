import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import Logo from "../components/Logo";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append("username", username);
      form.append("password", password);
      const res = await api.post("/api/auth/login", form);
      localStorage.setItem("token", res.data.access_token);
      navigate("/");
    } catch {
      setError("帳號或密碼錯誤，請再試一次");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100svh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo card */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          {/* Unified house logo mark */}
          <Logo size={64} style={{ display: "block", margin: "0 auto 16px" }} />
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--text)",
              letterSpacing: "-0.4px",
              margin: 0,
            }}
          >
            RentHouse
          </h1>
          <p style={{ marginTop: 6, fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>
            租屋願望實現系統
          </p>
        </div>

        {/* Form card */}
        <div className="card" style={{ padding: "40px 36px" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            <div>
              <label
                htmlFor="username"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-sub)",
                  marginBottom: 7,
                  letterSpacing: "0.2px",
                }}
              >
                帳號
              </label>
              <input
                id="username"
                className="field-input"
                placeholder="請輸入帳號"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-sub)",
                  marginBottom: 7,
                  letterSpacing: "0.2px",
                }}
              >
                密碼
              </label>
              <input
                id="password"
                className="field-input"
                type="password"
                placeholder="請輸入密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p
                role="alert"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#92400e",
                  padding: "11px 16px",
                  background: "#fef3c7",
                  border: "1.5px solid #fde68a",
                  borderRadius: 14,
                }}
              >
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: 4, width: "100%" }}
            >
              {loading ? "登入中…" : "登入"}
            </button>
          </form>
        </div>

        {/* Footer hint */}
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
          World Vegan, World Peace.
        </p>
      </div>
    </main>
  );
}
