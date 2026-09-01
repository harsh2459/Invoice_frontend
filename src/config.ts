/**
 * Runtime endpoints for the API and the WhatsApp socket.
 *
 * - Local dev: leave VITE_API_BASE unset. Requests go to "/api" and Vite's
 *   proxy (vite.config.ts) forwards them to the backend on :8090.
 * - Single-server deploy (backend serves the built frontend): also leave it
 *   unset — same-origin "/api" just works.
 * - Split deploy (frontend on Vercel, backend elsewhere): set
 *   VITE_API_BASE = "https://api.your-domain.com" in the frontend host's env.
 *   The socket then connects to that origin's /whatsapp namespace.
 */
const RAW = (import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");

/** Prefix for every REST call, e.g. "" (same-origin) or "https://api.example.com". */
export const API_ORIGIN = RAW;

/** What `api()` prepends to endpoints: "/api" same-origin, or "https://host/api". */
export const API_BASE = `${RAW}/api`;

/** Origin for the Socket.IO connection ("" = same-origin). */
export const SOCKET_ORIGIN = RAW;
