import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
// The original stylesheet, verbatim: it is what makes this look like the app
// you already have. Component CSS Modules only add layout on top of it.
import "./ui/legacy.css";
import "./ui/tokens.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("No #root element in index.html");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
