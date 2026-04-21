import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./ui/ui.css";
import { AuthProvider } from "./auth/AuthContext.jsx";
import { ToastProvider } from "./ui/Toast.jsx";
import { loadTheme } from "./utils/theme.js";

loadTheme();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>
);
