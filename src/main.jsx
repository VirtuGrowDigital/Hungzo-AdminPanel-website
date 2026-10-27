/**
 * Project Developer: Sandeep Gupta
 * github:https://github.com/Sandeepgupta078
 * Role: Full Stack Developer
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./Context/AuthProvider.jsx";
import { LocationProvider } from "./Context/LocationProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LocationProvider>
          <App />
        </LocationProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
