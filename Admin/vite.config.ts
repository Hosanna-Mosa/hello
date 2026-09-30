import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { createLogger, defineConfig, loadEnv, type Plugin } from "vite";

/**
 * A strict Content-Security-Policy, injected into the BUILT page only — Vite's
 * dev server needs inline scripts for hot reload, which a real CSP forbids.
 * `connect-src` names the API origin so the panel can talk to nothing else.
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
    name: "admin-csp",
    apply: "build",
    transformIndexHtml: (html) =>
      html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`),
  };
}

/**
 * The live-connection proxy's socket errors, made quiet.
 *
 * `write ECONNABORTED` / `ECONNRESET` / `EPIPE` on `/socket.io` mean one end
 * went away mid-frame — a tab reload, an HMR refresh, the backend restarting
 * under `tsx watch`. socket.io reconnects on its own, so a red stack trace here
 * is noise. Vite always logs these itself (a `configure` hook cannot stop it),
 * so they are filtered at the logger: one grey line, and every OTHER proxy
 * error still prints in full.
 */
const BENIGN_SOCKET_CODES = new Set(["ECONNABORTED", "ECONNRESET", "EPIPE", "ECONNREFUSED"]);

function quietProxyLogger() {
  const logger = createLogger();
  const error = logger.error.bind(logger);
  logger.error = (msg, options) => {
    const code = (options?.error as NodeJS.ErrnoException | null | undefined)?.code;
    if (msg.includes("ws proxy") && code && BENIGN_SOCKET_CODES.has(code)) {
      logger.info(`live connection dropped (${code}) — the panel reconnects on its own`, { timestamp: true });
      return;
    }
    error(msg, options);
  };
  return logger;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_DEV_API_TARGET || "http://localhost:4000";

  return {
    customLogger: quietProxyLogger(),
    plugins: [react(), tailwindcss(), contentSecurityPolicy(env.VITE_API_URL ?? "")],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    server: {
      port: 5174,
      // Not strict: if 5174 is taken (e.g. a stray server), Vite picks the next
      // free port. The /v1 proxy keeps the API same-origin on any port.
      strictPort: false,
      // Same-origin in development: the session cookie is first-party and the
      // API needs no CORS entry for the panel. `/socket.io` is the live
      // connection (support chat) — `ws: true` forwards the WebSocket upgrade.
      proxy: {
        "/v1": { target: apiTarget, changeOrigin: true },
        "/socket.io": { target: apiTarget, changeOrigin: true, ws: true },
      },
    },
    preview: {
      port: 4174,
      proxy: {
        "/v1": { target: apiTarget, changeOrigin: true },
        "/socket.io": { target: apiTarget, changeOrigin: true, ws: true },
      },
    },
    build: { sourcemap: false },
  };
});
