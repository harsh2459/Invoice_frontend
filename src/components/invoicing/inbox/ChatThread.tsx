import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { api } from "../../../api";
import type { WaChat, WaWireMessage } from "../../../waSocket";
import Avatar from "./Avatar";
import Composer from "./Composer";
import MessageBubble from "./MessageBubble";
import SendInvoiceMenu from "./SendInvoiceMenu";
import { chatTitle, dayLabel } from "./util";

// Last-seen messages per chat, so re-opening a chat renders instantly while a
// fresh fetch happens in the background. Lives for the session.
const threadCache = new Map<string, WaWireMessage[]>();
const cacheKey = (companyId: number, jid: string) => `${companyId}:${jid}`;

export default function ChatThread({
  companyId,
  chat,
  connected,
  liveMessage,
  liveUpdate,
  onBack,
}: {
  companyId: number;
  chat: WaChat;
  connected: boolean;
  /** last message pushed over the socket for this chat (or null) */
  liveMessage: WaWireMessage | null;
  liveUpdate: { msgKey: string; status?: number; hasMedia?: boolean; mediaMime?: string } | null;
  onBack?: () => void;
}) {
  const jid = chat.jid;
  const cached = threadCache.get(cacheKey(companyId, jid)) || [];

  const [msgs, setMsgsRaw] = useState<WaWireMessage[]>(cached);
  const [loading, setLoading] = useState(cached.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  // keep the cache warm on every state change
  const setMsgs = useCallback(
    (updater: WaWireMessage[] | ((prev: WaWireMessage[]) => WaWireMessage[])) => {
      setMsgsRaw((prev) => {
        const next = typeof updater === "function" ? (updater as any)(prev) : updater;
        threadCache.set(cacheKey(companyId, jid), next);
        return next;
      });
    },
    [companyId, jid]
  );

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // initial load (cache-first) + mark read
  useEffect(() => {
    let alive = true;
    const hadCache = (threadCache.get(cacheKey(companyId, jid)) || []).length > 0;
    setLoading(!hadCache);
    setAtEnd(false);
    stickToBottom.current = true;
    if (hadCache) setTimeout(() => scrollToBottom(false), 0);

    api(`/whatsapp/${companyId}/chats/${encodeURIComponent(jid)}/messages?limit=40`)
      .then((rows: WaWireMessage[]) => {
        if (!alive) return;
        setMsgs(rows);
        if (stickToBottom.current) setTimeout(() => scrollToBottom(false), 0);
      })
      .finally(() => alive && setLoading(false));
    api(`/whatsapp/${companyId}/chats/${encodeURIComponent(jid)}/read`, { method: "POST" }).catch(
      () => {}
    );
    return () => {
      alive = false;
    };
  }, [companyId, jid, scrollToBottom, setMsgs]);

  // append live message for this chat
  useEffect(() => {
    if (!liveMessage || liveMessage.chatJid !== jid) return;
    setMsgs((prev) => {
      if (prev.some((m) => m.msgKey === liveMessage.msgKey)) {
        return prev.map((m) => (m.msgKey === liveMessage.msgKey ? liveMessage : m));
      }
      return [...prev, liveMessage];
    });
    if (stickToBottom.current) setTimeout(() => scrollToBottom(true), 0);
    // an incoming message we're looking at is effectively read
    if (!liveMessage.fromMe) {
      api(`/whatsapp/${companyId}/chats/${encodeURIComponent(jid)}/read`, {
        method: "POST",
      }).catch(() => {});
    }
  }, [liveMessage, companyId, jid, scrollToBottom]);

  // status / media updates
  useEffect(() => {
    if (!liveUpdate) return;
    setMsgs((prev) =>
      prev.map((m) =>
        m.msgKey === liveUpdate.msgKey
          ? {
              ...m,
              status: liveUpdate.status ?? m.status,
              hasMedia: liveUpdate.hasMedia ?? m.hasMedia,
              mediaMime: liveUpdate.mediaMime ?? m.mediaMime,
            }
          : m
      )
    );
  }, [liveUpdate]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 60 && !loadingMore && !atEnd && msgs.length > 0) {
      loadOlder();
    }
  };

  const loadOlder = async () => {
    const el = scrollRef.current;
    const oldest = msgs[0]?.ts;
    if (!oldest) return;
    setLoadingMore(true);
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const older: WaWireMessage[] = await api(
        `/whatsapp/${companyId}/chats/${encodeURIComponent(jid)}/messages?before=${oldest}&limit=40`
      );
      if (older.length === 0) {
        setAtEnd(true);
      } else {
        setMsgs((prev) => [...older.filter((o) => !prev.some((p) => p.msgKey === o.msgKey)), ...prev]);
        // keep viewport anchored
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prevHeight;
        });
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const title = chat.name || chatTitle(chat);

  // group by day for separators
  let lastDay = "";

  return (
    <div className="flex flex-col h-full min-h-0 bg-hover">
      <div className="flex items-center gap-3 px-3 py-2.5 bg-white border-b border-line shrink-0">
        {onBack && (
          <button onClick={onBack} className="lg:hidden text-muted hover:text-ink p-1">
            <ArrowLeft size={18} />
          </button>
        )}
        <Avatar title={title} picUrl={chat.picUrl} isGroup={chat.isGroup} size={38} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[13.5px] text-ink truncate">{title}</div>
          <div className="text-[11.5px] text-muted truncate">
            {chat.isGroup ? "Group" : "+" + jid.split("@")[0]}
          </div>
        </div>
        {!chat.isGroup && chat.clientId != null && (
          <SendInvoiceMenu
            clientId={chat.clientId}
            phone={chat.phone}
            onSent={() => {
              // the send drops the PDF into this chat; the socket delivers the
              // new message, so nothing else to do here
            }}
          />
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-y-auto py-3 space-y-1"
      >
        {loadingMore && (
          <div className="text-center text-muted text-[11.5px] py-1">
            <Loader2 size={13} className="inline animate-spin" /> loading…
          </div>
        )}
        {atEnd && (
          <div className="text-center text-muted text-[11px] py-1">Start of conversation</div>
        )}
        {loading ? (
          <div className="h-full grid place-items-center text-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : msgs.length === 0 ? (
          <div className="h-full grid place-items-center text-muted text-[12.5px]">
            No messages yet — say hello.
          </div>
        ) : (
          msgs.map((m) => {
            const d = dayLabel(m.ts);
            const sep = d !== lastDay;
            lastDay = d;
            return (
              <div key={m.msgKey}>
                {sep && (
                  <div className="flex justify-center my-2">
                    <span className="text-[11px] bg-white text-muted px-2.5 py-0.5 rounded-full shadow-sm border border-line">
                      {d}
                    </span>
                  </div>
                )}
                <MessageBubble companyId={companyId} m={m} />
              </div>
            );
          })
        )}
      </div>

      <Composer
        companyId={companyId}
        jid={jid}
        disabled={!connected}
        onSent={() => {
          stickToBottom.current = true;
          setTimeout(() => scrollToBottom(true), 50);
        }}
      />
    </div>
  );
}
