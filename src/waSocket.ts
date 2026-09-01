/**
 * Singleton Socket.IO client for the per-company WhatsApp inbox.
 *
 * One connection for the whole app; you join/leave a company room as the picker
 * changes. Every event payload carries `companyId` — components filter on it.
 *
 * Server events (namespace /whatsapp):
 *   wa:status          full status object for a company
 *   wa:chat            one chat row (upsert)
 *   wa:message         one new message
 *   wa:message-update  { companyId, msgKey, status?, hasMedia?, mediaMime? }
 *   wa:contact         { companyId, jid, picUrl }
 */
import { io, type Socket } from "socket.io-client";
import { SOCKET_ORIGIN } from "./config";

let socket: Socket | null = null;
let joined: number | null = null;

export function getWaSocket(): Socket {
  if (socket) return socket;
  const token = localStorage.getItem("token") || "";
  socket = io(`${SOCKET_ORIGIN}/whatsapp`, {
    path: "/socket.io",
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  // re-join the active room after a socket reconnect
  socket.on("connect", () => {
    if (joined != null) socket!.emit("join", joined);
  });
  return socket;
}

/** Switch the room this socket is subscribed to. */
export function joinCompany(companyId: number) {
  const s = getWaSocket();
  if (joined === companyId) return;
  if (joined != null) s.emit("leave", joined);
  joined = companyId;
  s.emit("join", companyId);
}

export function leaveCompany() {
  if (socket && joined != null) socket.emit("leave", joined);
  joined = null;
}

export function closeWaSocket() {
  socket?.close();
  socket = null;
  joined = null;
}

export type WaWireMessage = {
  companyId: number;
  msgKey: string;
  chatJid: string;
  fromMe: boolean;
  senderJid: string | null;
  ts: number;
  type: string;
  text: string | null;
  hasMedia: boolean;
  mediaMime: string | null;
  filename: string | null;
  status: number;
  quotedKey: string | null;
};

export type WaChat = {
  companyId: number;
  clientId: number;
  jid: string;
  name: string; // client name
  phone: string | null;
  isGroup: boolean;
  lastMessageText: string | null;
  lastMessageTs: number; // 0 = no conversation yet
  unreadCount: number;
  archived: boolean;
  pinned: boolean;
  picUrl: string | null;
  notify: string | null;
};

export type WaSessionRow = {
  companyId: number;
  companyName: string;
  status: "idle" | "connecting" | "qr" | "connected" | "logged_out" | "error";
  phoneNumber: string | null;
  displayName: string | null;
  lastConnectedAt: string | null;
};

export type WaState = {
  companyId: number;
  status: WaSessionRow["status"];
  qrDataUrl: string | null;
  me: { name: string; number: string } | null;
  lastError: string | null;
  queued: number;
  updatedAt: string;
};
