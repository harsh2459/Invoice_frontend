/**
 * Runtime endpoints for the API and the WhatsApp socket.
 *
 * Resolution order:
 *   1. VITE_API_BASE env var (set in the host's build settings) — wins if present.
 *   2. In a production build with no env var → PROD_API_BASE below (the deployed
 *      Railway backend).
 *   3. Dev / same-origin → "" so requests hit "/api" and Vite's proxy
 *      (vite.config.ts) forwards them to the local backend on :8090.
 *
 * The backend URL is NOT a secret — the browser reveals it on every request —
 * so it is safe to keep in the repo.
 */
const PROD_API_BASE = "https://invoicebackend-production-064d.up.railway.app";

const ENV = (import.meta.env.VITE_API_BASE ?? "").trim();
const RAW = (ENV || (import.meta.env.PROD ? PROD_API_BASE : "")).replace(/\/+$/, "");

/** Prefix for every REST call, e.g. "" (same-origin) or "https://host". */
export const API_ORIGIN = RAW;

/** What `api()` prepends to endpoints: "/api" same-origin, or "https://host/api". */
export const API_BASE = `${RAW}/api`;

/** Origin for the Socket.IO connection ("" = same-origin). */
export const SOCKET_ORIGIN = RAW;
