import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { respectReducedMotion } from "./lib/motion";
import { wedding } from "./config/wedding";
import "./index.css";

// Theme colours & fonts from the config become CSS variables (used by Tailwind tokens in index.css).
const t = wedding.theme;
const vars: Record<string, string> = {
  "--w-ivory": t.ivory, "--w-paper": t.paper, "--w-ink": t.ink, "--w-accent": t.accent, "--w-button": t.button,
  "--w-gold": t.gold, "--w-sand": t.sand, "--w-sand-dark": t.sandDark, "--w-water": t.water, "--w-gold-light": t.goldLight, "--w-blush": t.blush, "--w-leaf": t.leaf,
  "--w-font-script": t.fontScript, "--w-font-display": t.fontDisplay, "--w-font-body": t.fontBody,
};
Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));

// Agentation feedback toolbar: local development only, never shipped to guests.
const Agentation = import.meta.env.DEV ? lazy(() => import("agentation").then((m) => ({ default: m.Agentation }))) : null;

// /photos (guests) and /admin (photographer) are separate pages, loaded only when visited.
const path = window.location.pathname;
const previewName = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("scenePreview") : null; // dev-only scene viewer
const Root = previewName
  ? lazy(() => import("./components/story/Preview").then((m) => ({ default: () => <m.default name={previewName} /> })))
  : path.startsWith("/admin")
  ? lazy(() => import("./photos/AdminApp"))
  : path.startsWith("/photos")
    ? lazy(() => import("./photos/GuestApp"))
    : null;

// the site plays its animations even if the device says "reduce motion" (unless the config opts in to honouring it)
if (!respectReducedMotion) document.documentElement.classList.add("motion-ok");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {Root ? <Suspense fallback={null}><Root /></Suspense> : <App />}
    {Agentation && (
      <Suspense fallback={null}>
        <Agentation appName="Wedding Invitation" useHashLocation className="z-[100]" />
      </Suspense>
    )}
  </StrictMode>
);
