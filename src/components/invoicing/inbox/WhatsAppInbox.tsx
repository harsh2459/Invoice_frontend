import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { api } from "../../../api";
import { getWaSocket, joinCompany } from "../../../waSocket";
import type { WaChat, WaWireMessage, WaState } from "../../../waSocket";
import ChatList from "./ChatList";
import ChatThread from "./ChatThread";

/**
 * Two-pane inbox for ONE company. Owns the shared Socket.IO connection's room
 * membership, this company's chat list, and the last live message/update the
 * open thread consumes. Re-mounts (key) when the company changes.
 */
export default function WhatsAppInbox({
  companyId,
  companyName,
}: {
  companyId: number;
  companyName: string;
}) {
  const [chats, setChats] = useState<WaChat[]>([]);
  const [activeJid, setActiveJid] = useState<string | null>(null);
  const [status, setStatus] = useState<WaState["status"]>("connecting");
  const [loadingChats, setLoadingChats] = useState(true);
  const [listCollapsed, setListCollapsed] = useState(
    () => localStorage.getItem("wa.listCollapsed") === "1"
  );
  const toggleList = () =>
    setListCollapsed((v) => {
      localStorage.setItem("wa.listCollapsed", v ? "0" : "1");
      return !v;
    });

  const [liveMessage, setLiveMessage] = useState<WaWireMessage | null>(null);
  const [liveUpdate, setLiveUpdate] = useState<
    { msgKey: string; status?: number; hasMedia?: boolean; mediaMime?: string } | null
  >(null);
  const picRequested = useRef<Set<string>>(new Set());

  const connected = status === "connected";
  const canChat = status !== "idle" && status !== "logged_out";

  // reset everything when the company changes
  useEffect(() => {
    setChats([]);
    setActiveJid(null);
    setLoadingChats(true);
    picRequested.current = new Set();

    api(`/whatsapp/${companyId}/chats`)
      .then(setChats)
      .catch(() => {})
      .finally(() => setLoadingChats(false));
    api(`/whatsapp/${companyId}/status`)
      .then((s) => setStatus(s.status))
      .catch(() => {});
  }, [companyId]);

  // socket: join this company's room, subscribe to its events
  useEffect(() => {
    const s = getWaSocket();
    joinCompany(companyId);

    const forThisCompany = (p: any) => p && p.companyId === companyId;

    const onStatus = (st: WaState) => forThisCompany(st) && setStatus(st.status);
    // The list is the full client roster (from GET /chats). Socket chat events
    // only carry conversation deltas — merge into the matching client row, never
    // add a new one (non-clients are filtered out server-side anyway).
    const onChat = (c: Partial<WaChat> & { jid: string }) => {
      if ((c as any).companyId !== companyId) return;
      setChats((prev) => {
        const i = prev.findIndex((x) => x.jid === c.jid);
        if (i < 0) return prev;
        const next = [...prev];
        next[i] = { ...prev[i], ...c, name: prev[i].name, clientId: prev[i].clientId };
        return next.sort((a, b) => {
          if ((a.lastMessageTs > 0) !== (b.lastMessageTs > 0)) return a.lastMessageTs > 0 ? -1 : 1;
          if (a.lastMessageTs !== b.lastMessageTs) return b.lastMessageTs - a.lastMessageTs;
          return a.name.localeCompare(b.name);
        });
      });
    };
    const onMessage = (m: WaWireMessage) => forThisCompany(m) && setLiveMessage(m);
    const onMsgUpdate = (u: any) => forThisCompany(u) && setLiveUpdate(u);
    const onContact = (c: { companyId: number; jid: string; picUrl: string | null }) => {
      if (!forThisCompany(c)) return;
      setChats((prev) => prev.map((x) => (x.jid === c.jid ? { ...x, picUrl: c.picUrl } : x)));
    };

    s.on("wa:status", onStatus);
    s.on("wa:chat", onChat);
    s.on("wa:message", onMessage);
    s.on("wa:message-update", onMsgUpdate);
    s.on("wa:contact", onContact);

    return () => {
      s.off("wa:status", onStatus);
      s.off("wa:chat", onChat);
      s.off("wa:message", onMessage);
      s.off("wa:message-update", onMsgUpdate);
      s.off("wa:contact", onContact);
    };
  }, [companyId]);

  // Lazily fetch profile pics — only for clients you've actually chatted with,
  // a few at a time, so a big roster doesn't fire hundreds of requests.
  useEffect(() => {
    if (!connected) return;
    const targets = chats
      .filter((c) => c.lastMessageTs > 0 && !c.picUrl && !picRequested.current.has(c.jid))
      .slice(0, 12);
    if (targets.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const c of targets) {
        if (cancelled) return;
        picRequested.current.add(c.jid);
        try {
          const r = await api(
            `/whatsapp/${companyId}/chats/${encodeURIComponent(c.jid)}/pic`,
            { method: "POST" }
          );
          if (!cancelled && r?.picUrl) {
            setChats((prev) =>
              prev.map((x) => (x.jid === c.jid ? { ...x, picUrl: r.picUrl } : x))
            );
          }
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chats, connected, companyId]);

  const activeChat = useMemo(
    () => chats.find((c) => c.jid === activeJid) || null,
    [chats, activeJid]
  );

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {!connected && (
        <div className="px-4 py-1.5 text-[12px] bg-amazon text-amazon-text flex items-center gap-2 border-b border-line shrink-0">
          {status === "connecting" ? (
            <>
              <Loader2 size={13} className="animate-spin" /> {companyName}: reconnecting… (queued
              messages will still send)
            </>
          ) : !canChat ? (
            <>
              {companyName}&apos;s WhatsApp is <span className="font-semibold">{status}</span> — pair
              it on the <span className="font-semibold">Connect</span> tab.
            </>
          ) : (
            <>
              {companyName}: <span className="font-semibold">{status}</span>
            </>
          )}
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div
          className={`border-r border-line flex-col min-h-0 bg-white transition-[width] duration-150 ${
            listCollapsed ? "w-[56px]" : "w-full lg:w-[248px] xl:w-[280px]"
          } ${activeJid && !listCollapsed ? "hidden lg:flex" : "flex"}`}
        >
          {loadingChats ? (
            <div className="flex-1 grid place-items-center text-muted">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : (
            <ChatList
              chats={chats}
              activeJid={activeJid}
              onSelect={setActiveJid}
              collapsed={listCollapsed}
              onToggleCollapsed={toggleList}
            />
          )}
        </div>

        <div className={`flex-1 min-h-0 ${activeJid ? "flex" : "hidden lg:flex"} flex-col`}>
          {activeChat ? (
            <ChatThread
              key={activeChat.jid}
              companyId={companyId}
              chat={activeChat}
              connected={canChat}
              liveMessage={liveMessage}
              liveUpdate={liveUpdate}
              onBack={() => setActiveJid(null)}
            />
          ) : (
            <div className="flex-1 grid place-items-center text-muted text-[13px]">
              <div className="text-center">
                <MessageCircle size={40} className="mx-auto mb-2 text-line" />
                {chats.length === 0 && canChat
                  ? "No chats yet for this company."
                  : "Select a chat to start messaging"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
