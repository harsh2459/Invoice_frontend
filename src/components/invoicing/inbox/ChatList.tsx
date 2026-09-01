import { useMemo, useState } from "react";
import { Search, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { WaChat } from "../../../waSocket";
import Avatar from "./Avatar";
import { chatTitle, shortTime } from "./util";

export default function ChatList({
  chats,
  activeJid,
  onSelect,
  collapsed,
  onToggleCollapsed,
}: {
  chats: WaChat[];
  activeJid: string | null;
  onSelect: (jid: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const sorted = [...chats].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if ((a.lastMessageTs > 0) !== (b.lastMessageTs > 0)) return a.lastMessageTs > 0 ? -1 : 1;
      if (a.lastMessageTs !== b.lastMessageTs) return b.lastMessageTs - a.lastMessageTs;
      return a.name.localeCompare(b.name);
    });
    if (!needle) return sorted;
    return sorted.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        (c.phone || "").includes(needle) ||
        (c.lastMessageText || "").toLowerCase().includes(needle) ||
        c.jid.includes(needle)
    );
  }, [chats, q]);

  // ---- collapsed: narrow avatar rail ----
  if (collapsed) {
    return (
      <div className="flex flex-col h-full min-h-0 items-center">
        <button
          onClick={onToggleCollapsed}
          title="Expand chat list"
          className="shrink-0 p-2 my-1.5 text-muted hover:text-ink hover:bg-hover rounded-md"
        >
          <PanelLeftOpen size={17} />
        </button>
        <div className="flex-1 min-h-0 overflow-y-auto w-full flex flex-col items-center gap-0.5 pb-2">
          {filtered.map((c) => {
            const title = c.name || chatTitle(c);
            const active = c.jid === activeJid;
            return (
              <button
                key={c.jid}
                onClick={() => onSelect(c.jid)}
                title={title}
                className={`relative p-1.5 rounded-md transition-colors ${
                  active ? "bg-primary-soft" : "hover:bg-hover"
                }`}
              >
                <Avatar title={title} picUrl={c.picUrl} isGroup={c.isGroup} size={34} />
                {c.unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-positive text-white text-[9px] font-bold grid place-items-center">
                    {c.unreadCount > 9 ? "9+" : c.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- expanded ----
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1.5 p-2 border-b border-line shrink-0">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="w-full pl-7 pr-2 py-1.5 rounded-md bg-hover text-[12px] focus:outline-none focus:ring-2 focus:ring-primary-soft"
          />
        </div>
        <button
          onClick={onToggleCollapsed}
          title="Collapse chat list"
          className="shrink-0 p-1.5 text-muted hover:text-ink hover:bg-hover rounded-md"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-line/40">
        {chats.length === 0 ? (
          <div className="p-6 text-center text-muted text-[12px]">
            No clients for this company yet. Add clients under Invoicing → Clients.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-muted text-[12px]">No clients match.</div>
        ) : (
          filtered.map((c) => {
            const title = c.name || chatTitle(c);
            const active = c.jid === activeJid;
            const hasChat = c.lastMessageTs > 0;
            return (
              <button
                key={c.jid}
                onClick={() => onSelect(c.jid)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors ${
                  active ? "bg-primary-soft" : "hover:bg-hover"
                }`}
              >
                <Avatar title={title} picUrl={c.picUrl} isGroup={c.isGroup} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-[12.5px] text-ink truncate">{title}</span>
                    {hasChat && (
                      <span className="text-[10px] text-muted shrink-0">
                        {shortTime(c.lastMessageTs)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11.5px] truncate ${
                        hasChat ? "text-muted" : "text-muted/60 italic"
                      }`}
                    >
                      {hasChat
                        ? c.lastMessageText || ""
                        : c.phone
                        ? "Tap to start a conversation"
                        : "No phone number on file"}
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="shrink-0 min-w-[17px] h-[17px] px-1 rounded-full bg-positive text-white text-[10px] font-bold grid place-items-center">
                        {c.unreadCount > 99 ? "99+" : c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
