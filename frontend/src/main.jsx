import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AlertProvider } from "./components/Alert/AlertContext"; // Add this

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AlertProvider>
      <App />
    </AlertProvider>
  </BrowserRouter>
);
