import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ErrorBoundary } from "./os/ErrorBoundary";
import App from "./App.tsx";

import "./styles/base.css";
import "./styles/keyframes.css";
import "./styles/misc.css";
import "./styles/tokens.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
