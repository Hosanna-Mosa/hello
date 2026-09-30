import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";

/**
 * A strict Content-Security-Policy for the BUILT site only (Vite's dev server
 * needs inline scripts). The only place the site may send data is the API —
 * and only from the delete-account page.
 */
function contentSecurityPolicy(apiUrl: string): Plugin {
  // Tolerant: a half-typed VITE_API_URL must not crash the dev server.
  let api = "";
  try {
    api = apiUrl ? new URL(apiUrl).origin : "";
  } catch {
    api = "";
  }
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    `connect-src 'self'${api ? ` ${api}` : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");

  return {
    name: "site-csp",
    apply: "build",
    transformIndexHtml: (html) =>
      html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_DEV_API_TARGET || "http://localhost:4000";

  return {
    plugins: [react(), tailwindcss(), contentSecurityPolicy(env.VITE_API_URL ?? "")],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    server: { port: 5173, strictPort: true, proxy: { "/v1": { target: apiTarget, changeOrigin: true } } },
    preview: { port: 4173, proxy: { "/v1": { target: apiTarget, changeOrigin: true } } },
    build: { sourcemap: false },
  };
});
