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

function RequireAuth({ children }: { children: React.ReactElement }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <div className="organic-root">
      {/* Solarpunk decorative background */}
      <div className="organic-sunbeam" aria-hidden="true" />
      <div className="organic-blob organic-1" aria-hidden="true" />
      <div className="organic-blob organic-2" aria-hidden="true" />
      <div className="organic-blob organic-3" aria-hidden="true" />

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
