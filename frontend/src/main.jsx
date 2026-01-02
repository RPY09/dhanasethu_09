import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AlertProvider } from "./components/Alert/AlertContext";
import { CurrencyProvider } from "./context/CurrencyContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AlertProvider>
      <CurrencyProvider>
        <App />
      </CurrencyProvider>
    </AlertProvider>
  </BrowserRouter>
);
