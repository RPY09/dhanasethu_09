import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AlertProvider } from "./components/Alert/AlertContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { ThemeProvider } from "./context/ThemeContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AlertProvider>
      <CurrencyProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </CurrencyProvider>
    </AlertProvider>
  </BrowserRouter>
);
