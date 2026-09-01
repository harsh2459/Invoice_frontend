/**
 * Invoicing → WhatsApp. Everything here is scoped to a chosen company via the
 * picker at the top. Tabs:
 *   Inbox     — full chat client for that company (list + thread + composer)
 *   Connect   — pair that company's number via QR, status, disconnect
 *
 * The connection lifecycle lives entirely in the backend. This page only reads
 * state and shows a QR when a company has never been paired. A refresh or a
 * backend restart never requires re-pairing.
 */
import { useEffect, useState } from "react";
import {
  MessageCircle,
  Loader2,
  CheckCircle2,
  LogOut,
  RefreshCw,
  Inbox as InboxIcon,
  QrCode,
  ChevronDown,
} from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { confirmDialog } from "../../confirm";
import { useWaStatus } from "./whatsapp";
import type { WaSessionRow } from "../../waSocket";
import WhatsAppInbox from "./inbox/WhatsAppInbox";

type Tab = "inbox" | "connect";

const STATUS_DOT: Record<WaSessionRow["status"], string> = {
  connected: "bg-positive",
  connecting: "bg-amazon-text",
  qr: "bg-amazon-text",
  idle: "bg-line",
  logged_out: "bg-negative",
  error: "bg-negative",
};
const STATUS_WORD: Record<WaSessionRow["status"], string> = {
  connected: "Connected",
  connecting: "Reconnecting…",
  qr: "Scan to connect",
  idle: "Not set up",
  logged_out: "Needs re-scan",
  error: "Error",
};

export default function WhatsAppConnect() {
  const [tab, setTab] = useState<Tab>("inbox");
  const [sessions, setSessions] = useState<WaSessionRow[] | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadSessions = async () => {
    try {
      const rows: WaSessionRow[] = await api("/whatsapp/sessions");
      setSessions(rows);
      setCompanyId((cur) => cur ?? rows[0]?.companyId ?? null);
    } catch (e: any) {
      toast(e.message);
    }
  };

  useEffect(() => {
    loadSessions();
    // Slow fallback only — the inbox's socket keeps the active company's badge
    // live; this just catches other companies' status drift.
    const t = setInterval(loadSessions, 30000);
    return () => clearInterval(t);
  }, []);

  const active = sessions?.find((s) => s.companyId === companyId) || null;

  // Layout gives this page the full main area (flex-1, min-h-0). We are a flex
  // column: a fixed toolbar, then the inbox filling everything below it.
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between flex-wrap gap-3 px-4 sm:px-6 py-2.5 border-b border-line bg-white shrink-0">
        <h1 className="text-[1.1rem] font-bold text-ink flex items-center gap-2">
          <MessageCircle size={18} className="text-positive" /> WhatsApp
        </h1>

        <div className="flex items-center gap-2 flex-wrap">
          {/* company picker */}
          <div className="relative">
            <button
              onClick={() => setPickerOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-line bg-white text-[12.5px] font-medium hover:bg-hover min-w-[180px]"
            >
              {active ? (
                <>
                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT[active.status]}`} />
                  <span className="truncate flex-1 text-left">{active.companyName}</span>
                </>
              ) : (
                <span className="text-muted flex-1 text-left">Select a company</span>
              )}
              <ChevronDown size={14} className="text-muted" />
            </button>
            {pickerOpen && sessions && (
              <div className="absolute right-0 mt-1 w-64 max-h-72 overflow-y-auto bg-white border border-line rounded-md shadow-lg z-20">
                {sessions.length === 0 && (
                  <div className="px-3 py-2 text-[12px] text-muted">
                    No companies yet — add one under Invoicing → Companies.
                  </div>
                )}
                {sessions.map((s) => (
                  <button
                    key={s.companyId}
                    onClick={() => {
                      setCompanyId(s.companyId);
                      setPickerOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[12.5px] hover:bg-hover ${
                      s.companyId === companyId ? "bg-primary-soft" : ""
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s.status]}`} />
                    <span className="truncate flex-1">{s.companyName}</span>
                    <span className="text-[10.5px] text-muted shrink-0">
                      {STATUS_WORD[s.status]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* tabs */}
          <div className="flex gap-1 bg-hover rounded-lg p-1">
            {(
              [
                ["inbox", "Inbox", <InboxIcon size={14} key="i" />],
                ["connect", "Connect", <QrCode size={14} key="c" />],
              ] as [Tab, string, React.ReactNode][]
            ).map(([key, label, icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-colors ${
                  tab === key ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {companyId == null ? (
          <div className="h-full grid place-items-center text-muted text-[13px]">
            {sessions === null ? "Loading…" : "Pick a company above to manage its WhatsApp."}
          </div>
        ) : tab === "inbox" ? (
          <WhatsAppInbox companyId={companyId} companyName={active?.companyName || ""} />
        ) : (
          <div className="p-4 sm:p-7 overflow-y-auto h-full">
            <ConnectPanel
              companyId={companyId}
              companyName={active?.companyName || ""}
              onChange={loadSessions}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Connect tab ----

function ConnectPanel({
  companyId,
  companyName,
  onChange,
}: {
  companyId: number;
  companyName: string;
  onChange: () => void;
}) {
  const { state, refresh } = useWaStatus(companyId, 2500);
  const [acting, setActing] = useState(false);

  const connectNow = async () => {
    setActing(true);
    try {
      await api(`/whatsapp/${companyId}/connect`, { method: "POST" });
      await refresh();
      onChange();
    } catch (e: any) {
      toast(e.message);
    } finally {
      setActing(false);
    }
  };

  const reconnect = async () => {
    setActing(true);
    try {
      await api(`/whatsapp/${companyId}/reconnect`, { method: "POST" });
      await refresh();
    } catch (e: any) {
      toast(e.message);
    } finally {
      setActing(false);
    }
  };

  const logout = async () => {
    const ok = await confirmDialog({
      title: `Disconnect ${companyName}'s WhatsApp?`,
      message:
        "The paired session is removed. You'll need to scan the QR again to send or receive for this company.",
      confirmLabel: "Disconnect",
      danger: true,
    });
    if (!ok) return;
    setActing(true);
    try {
      await api(`/whatsapp/${companyId}/logout`, { method: "POST" });
      await refresh();
      onChange();
      toast("Disconnected");
    } catch (e: any) {
      toast(e.message);
    } finally {
      setActing(false);
    }
  };

  const s = state?.status;
  const connected = s === "connected";

  return (
    <div className="bg-white rounded-lg border border-line p-5 max-w-3xl">
      <div className="text-[12.5px] text-muted mb-4">
        WhatsApp for <span className="font-semibold text-ink">{companyName}</span>
      </div>

      {!state ? (
        <div className="flex items-center gap-2 text-muted text-[13px]">
          <Loader2 size={15} className="animate-spin" /> Checking status…
        </div>
      ) : connected ? (
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-positive-soft grid place-items-center">
              <CheckCircle2 size={20} className="text-positive" />
            </div>
            <div>
              <div className="text-[14px] font-bold text-ink">Connected</div>
              <div className="text-[12.5px] text-muted">
                {state.me?.name}
                {state.me?.number ? ` · +${state.me.number}` : ""}
              </div>
              <div className="text-[11px] text-muted mt-0.5">
                Stays connected in the background — you won't need to scan again.
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            disabled={acting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line text-negative font-medium text-[12.5px] hover:bg-negative-soft disabled:opacity-50"
          >
            <LogOut size={15} /> Disconnect
          </button>
        </div>
      ) : s === "idle" ? (
        <div className="text-center py-6">
          <QrCode size={40} className="mx-auto mb-3 text-line" />
          <div className="text-[13.5px] font-semibold text-ink mb-1">
            {companyName} isn't linked yet
          </div>
          <p className="text-[12.5px] text-muted mb-4">
            Link a WhatsApp number for this company. It only has to be done once.
          </p>
          <button
            onClick={connectNow}
            disabled={acting}
            className="bg-primary text-white px-4 py-2 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6] disabled:opacity-50"
          >
            {acting ? "Starting…" : "Link WhatsApp"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="shrink-0">
            {state.qrDataUrl ? (
              <img
                src={state.qrDataUrl}
                alt="WhatsApp pairing QR"
                className="w-[220px] h-[220px] rounded-md border border-line bg-white"
              />
            ) : (
              <div className="w-[220px] h-[220px] rounded-md border border-line grid place-items-center text-muted">
                <Loader2 size={22} className="animate-spin" />
              </div>
            )}
          </div>
          <div className="text-[13px] text-muted space-y-2">
            <div className="text-[14px] font-bold text-ink">
              {s === "qr"
                ? "Scan to connect"
                : s === "connecting"
                ? "Reconnecting…"
                : s === "logged_out"
                ? "Session ended — scan again"
                : s}
            </div>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Open WhatsApp on the phone for this company</li>
              <li>
                <span className="font-semibold text-ink">Linked devices</span> →{" "}
                <span className="font-semibold text-ink">Link a device</span>
              </li>
              <li>Point it at this QR code</li>
            </ol>
            {state.lastError && <div className="text-negative text-[12px]">{state.lastError}</div>}
            <button
              onClick={reconnect}
              disabled={acting}
              className="flex items-center gap-1.5 text-primary text-[12.5px] font-medium hover:underline disabled:opacity-50"
            >
              <RefreshCw size={13} /> Refresh / new QR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
