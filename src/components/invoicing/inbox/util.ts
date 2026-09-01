import type { WaChat } from "../../../waSocket";

/** Display name for a chat: explicit name, else the phone from the JID. */
export function chatTitle(c: Pick<WaChat, "jid" | "name" | "notify">): string {
  if (c.name) return c.name;
  if (c.notify) return c.notify;
  const user = c.jid.split("@")[0];
  if (c.jid.endsWith("@g.us")) return "Group " + user.slice(-4);
  return "+" + user;
}

export function initials(title: string): string {
  const parts = title.replace(/^\+/, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** WhatsApp-style relative time for the chat list. */
export function shortTime(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  ) {
    return "Yesterday";
  }
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** Time shown under a message bubble. */
export function bubbleTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

/** Day header string for the thread ("Today", "Yesterday", or a date). */
export function dayLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}
