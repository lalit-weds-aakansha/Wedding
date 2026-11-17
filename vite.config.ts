import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { wedding } from "./src/config/wedding";

/** Fills the page title, description and Open Graph tags from the wedding config. */
function weddingMeta(siteUrl: string): Plugin {
  const base = siteUrl.replace(/\/$/, "");
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const values: Record<string, string> = {
    WEDDING_TITLE: esc(wedding.share.title),
    WEDDING_DESCRIPTION: esc(wedding.share.description),
    WEDDING_URL: base ? `${base}/` : "/",
    // WhatsApp/Facebook need an absolute image URL — set VITE_SITE_URL in production.
    WEDDING_OG_IMAGE: `${base}/og-image.png`,
  };
  return {
    name: "wedding-meta",
    transformIndexHtml: (html) => html.replace(/%(WEDDING_[A-Z_]+)%/g, (m, k) => values[k] ?? m),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss(), weddingMeta(env.VITE_SITE_URL || wedding.share.siteUrl || "")],
    // In development the photo server runs separately; forward its API calls.
    server: { proxy: { "/api": "http://localhost:8787" }, watch: { ignored: ["**/_test-photos/**", "**/_test-data/**", "**/_mock-drive*/**", "**/_mock-drive-key.json", "**/server/data/**", "**/_backup-*/**"] } },
  };
});
