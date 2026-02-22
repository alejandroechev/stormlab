import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";
import { trackPageView } from "./analytics.js";
import { inject } from "@vercel/analytics";

inject();
trackPageView();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
