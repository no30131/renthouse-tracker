import { useNavigate, useLocation } from "react-router-dom";
import Logo from "./Logo";

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  const navItems = [
    { label: "物件列表", path: "/" },
    { label: "等時圈", path: "/isochrone" },
    { label: "實價登錄", path: "/real-price" },
    { label: "設定", path: "/preferences" },
  ];

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
        justifyContent: "space-between",
        background: "rgba(253,252,248,0.88)",
        borderBottom: "1.5px solid var(--border-light)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: "0 2px 12px rgba(16,185,129,0.06)",
      }}
    >
      {/* Brand */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }}
        onClick={() => navigate("/")}
        role="link"
        aria-label="回到首頁"
      >
        <Logo size={36} />
        <span
          className="nav-brand-text"
          style={{ fontWeight: 700, fontSize: 18, color: "var(--text)", letterSpacing: "-0.3px" }}
        >
          RentHouse
        </span>
      </div>

      {/* Nav items + logout */}
      <div className="header-actions">
        {navItems.map(({ label, path }) => {
          const isActive = pathname === path;
          return (
            <button
              key={path}
              className={isActive ? "btn-primary" : "btn-outline"}
              onClick={() => navigate(path)}
              style={{ padding: "9px 18px", fontSize: 13, minHeight: 40 }}
            >
              {label}
            </button>
          );
        })}
        <button
          className="btn-outline"
          onClick={handleLogout}
          style={{ padding: "9px 18px", fontSize: 13, minHeight: 40 }}
        >
          登出
        </button>
      </div>
    </nav>
  );
}
