import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HousesPage from "./pages/HousesPage";
import NewHousePage from "./pages/NewHousePage";
import EditHousePage from "./pages/EditHousePage";
import HouseDetailPage from "./pages/HouseDetailPage";
import PreferencesPage from "./pages/PreferencesPage";
import IsochronePage from "./pages/IsochronePage";
import RealPricePage from "./pages/RealPricePage";
import "./App.css";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

// Demo 模式自動注入假 token，跳過登入
if (DEMO_MODE) {
  localStorage.setItem("token", "demo-token");
}

function RequireAuth({ children }: { children: React.ReactElement }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function DemoBanner() {
  if (!DEMO_MODE) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "rgba(16, 185, 129, 0.92)",
        color: "#fff",
        padding: "8px 20px",
        borderRadius: 99,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.2px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        backdropFilter: "blur(8px)",
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      🌿 Demo 模式 — 所有資料均為示範用假資料
    </div>
  );
}

export default function App() {
  return (
    <div className="organic-root">
      {/* Solarpunk decorative background */}
      <div className="organic-sunbeam" aria-hidden="true" />
      <div className="organic-blob organic-1" aria-hidden="true" />
      <div className="organic-blob organic-2" aria-hidden="true" />
      <div className="organic-blob organic-3" aria-hidden="true" />

      <DemoBanner />
      <div className="organic-content">
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <HousesPage />
                </RequireAuth>
              }
            />
            <Route
              path="/houses/new"
              element={
                <RequireAuth>
                  <NewHousePage />
                </RequireAuth>
              }
            />
            <Route
              path="/houses/:id/edit"
              element={
                <RequireAuth>
                  <EditHousePage />
                </RequireAuth>
              }
            />
            <Route
              path="/houses/:id"
              element={
                <RequireAuth>
                  <HouseDetailPage />
                </RequireAuth>
              }
            />
            <Route
              path="/preferences"
              element={
                <RequireAuth>
                  <PreferencesPage />
                </RequireAuth>
              }
            />
            <Route
              path="/isochrone"
              element={
                <RequireAuth>
                  <IsochronePage />
                </RequireAuth>
              }
            />
            <Route
              path="/real-price"
              element={
                <RequireAuth>
                  <RealPricePage />
                </RequireAuth>
              }
            />
          </Routes>
        </BrowserRouter>
      </div>
    </div>
  );
}
