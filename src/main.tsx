import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// Apply a 15-second timeout to every fetch that doesn't already have a signal.
// This prevents API calls from hanging indefinitely if the server is unresponsive.
const _fetch = window.fetch.bind(window);
window.fetch = (input, init) =>
  _fetch(input, init?.signal ? init : { ...init, signal: AbortSignal.timeout(15_000) });

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");
createRoot(container).render(<App />);
