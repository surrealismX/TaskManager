// frontend/src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./ui/Layout";

import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";

import Dashboard from "./pages/Dashboard";
import ProjectsPage from "./pages/Projects";
import ProjectDetailPage from "./pages/ProjectDetail";
import Finance from "./pages/Finance";

import { useAuth } from "./auth/AuthContext";

// Private wrapper
function Private({ children }) {
  const { isAuthed, loadingMe } = useAuth();

  if (loadingMe) {
    return <div style={{ padding: 20, opacity: 0.6 }}>Loading session…</div>;
  }

  return isAuthed ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { isAuthed, loadingMe } = useAuth();

  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route
        path="/login"
        element={!loadingMe && isAuthed ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={!loadingMe && isAuthed ? <Navigate to="/" replace /> : <RegisterPage />}
      />

      {/* PROTECTED ROUTES */}
      <Route
        path="/"
        element={
          <Private>
            <Layout />
          </Private>
        }
      >
        {/* HOME = PROJECTS */}
        <Route index element={<ProjectsPage />} />

        {/* PROJECT DETAILS */}
        <Route path="projects/:projectKey" element={<ProjectDetailPage />} />

        {/* FINANCE */}
        <Route path="finance" element={<Finance />} />

        {/* DASHBOARD */}
        <Route path="dashboard" element={<Dashboard />} />
      </Route>

      {/* FALLBACK */}
      <Route
        path="*"
        element={<Navigate to={isAuthed ? "/" : "/login"} replace />}
      />
    </Routes>
  );
}
