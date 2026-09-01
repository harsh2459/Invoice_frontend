/**
 * Shared WhatsApp bits for the invoicing module:
 *  - useWaStatus()     poll connection state
 *  - WaSendModal       compose + send an invoice / reminder / free text
 *  - WaSendHistory     per-invoice log of what was sent
 *
 * All endpoints are admin-only under /api/whatsapp.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X, Paperclip, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { formatDate } from "../../format";

export type WaStatus = {
  companyId: number;
  status: "idle" | "connecting" | "qr" | "connected" | "logged_out" | "error";
  qrDataUrl: string | null;
  me: { name: string; number: string } | null;
  lastError: string | null;
  queued: number;
  updatedAt: string;
};

/**
 * Poll GET /api/whatsapp/:companyId/status. Pass `companyId` null to stay idle
 * (nothing selected yet). `intervalMs` 0 disables polling.
 */
export function useWaStatus(companyId: number | null, intervalMs = 4000) {
  const [state, setState] = useState<WaStatus | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (companyId == null) {
      setState(null);
      return;
    }
    try {
      setState(await api(`/whatsapp/${companyId}/status`));
    } catch {
      /* keep last known */
    }
  }, [companyId]);

  useEffect(() => {
    refresh();
    if (intervalMs > 0 && companyId != null) {
      timer.current = setInterval(refresh, intervalMs);
      return () => {
        if (timer.current) clearInterval(timer.current);
      };
    }
  }, [refresh, intervalMs, companyId]);

  return { state, refresh };
}

const inputCls =
  "w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

type SendKind = "invoice" | "reminder" | "text";

export function WaSendModal({
  invoiceId,
  companyId,
  kind,
  defaultPhone,
  clientName,
  onClose,
  onSent,
}: {
  invoiceId: number;
  companyId: number | null;
  kind: SendKind;
  defaultPhone: string;
  clientName?: string | null;
  onClose: () => void;
  onSent?: () => void;
}) {
  const { state } = useWaStatus(companyId, 4000);
  const [phone, setPhone] = useState(defaultPhone || "");
  const [message, setMessage] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(kind !== "text");
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState<null | { onWhatsApp: boolean }>(null);
  const [checking, setChecking] = useState(false);

  const connected = state?.status === "connected";
  // Backend queues sends during a brief reconnect, so "connecting" is still OK.
  // "idle" / "qr" / "logged_out" mean there's no usable pairing.
  const canSend =
    !!state && (state.status === "connected" || state.status === "connecting");
  const title =
    kind === "invoice"
      ? "Send invoice on WhatsApp"
      : kind === "reminder"
      ? "Send payment reminder"
      : "Send WhatsApp message";

  // Pull the filled template as the starting message (invoice/reminder only).
  useEffect(() => {
    if (kind === "text") return;
    let alive = true;
    (async () => {
      try {
        const tpls = await api("/whatsapp/templates");
        // The server fills placeholders on send; here we just seed the raw
        // template so the user can edit. Placeholders stay visible until sent —
        // that's fine and matches "one-click with a chance to tweak".
        if (alive) setMessage(kind === "invoice" ? tpls.invoice : tpls.reminder);
      } catch {
        /* leave empty */
      } finally {
        if (alive) setLoadingPreview(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [kind]);

  const runCheck = async () => {
    if (!phone.trim() || companyId == null) return;
    setChecking(true);
    setCheck(null);
    try {
      const r = await api(`/whatsapp/${companyId}/check`, {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      setCheck({ onWhatsApp: !!r.onWhatsApp });
    } catch (e: any) {
      toast(e.message);
    } finally {
      setChecking(false);
    }
  };

  const send = async () => {
    if (!canSend) return toast("This company's WhatsApp is not connected");
    if (!phone.trim()) return toast("Enter a phone number");
    if (kind === "text" && !message.trim()) return toast("Message is empty");
    setBusy(true);
    try {
      const path =
        kind === "invoice"
          ? `/whatsapp/send/invoice/${invoiceId}`
          : kind === "reminder"
          ? `/whatsapp/send/reminder/${invoiceId}`
          : `/whatsapp/send/text/${invoiceId}`;
      await api(path, {
        method: "POST",
        body: JSON.stringify({ phone, message: message.trim() ? message : undefined }),
      });
      toast(
        kind === "text" ? "Message sent" : kind === "reminder" ? "Reminder sent" : "Invoice sent"
      );
      onSent?.();
      onClose();
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-line w-full max-w-md p-4.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[1.05rem] font-bold text-ink flex items-center gap-2">
            <MessageCircle size={18} className="text-positive" /> {title}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink p-1">
            <X size={18} />
          </button>
        </div>

        {!canSend && (
          <div className="mb-3 text-[12.5px] rounded-md bg-negative-soft text-negative px-3 py-2">
            This company's WhatsApp is {state?.status ?? "…"}. Pair it under{" "}
            <span className="font-semibold">Invoicing → WhatsApp</span> first.
          </div>
        )}
        {canSend && !connected && (
          <div className="mb-3 text-[12.5px] rounded-md bg-amazon text-amazon-text px-3 py-2">
            Reconnecting… your message will send as soon as the link is back.
          </div>
        )}

        {clientName && (
          <div className="text-[12.5px] text-muted mb-2">
            To <span className="font-semibold text-ink">{clientName}</span>
          </div>
        )}

        <label className="block text-[12.5px] font-semibold text-ink mb-1.5">Phone number</label>
        <div className="flex gap-2">
          <input
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setCheck(null);
            }}
            placeholder="10-digit or with country code"
            inputMode="tel"
            className={inputCls}
          />
          <button
            type="button"
            onClick={runCheck}
            disabled={checking || !phone.trim() || !connected}
            title={connected ? "" : "Connect this company's WhatsApp to verify numbers"}
            className="shrink-0 px-2.5 py-2 rounded-md border border-line text-[12px] text-muted hover:bg-hover disabled:opacity-50"
          >
            {checking ? <Loader2 size={14} className="animate-spin" /> : "Check"}
          </button>
        </div>
        {check && (
          <div
            className={`mt-1.5 text-[11.5px] flex items-center gap-1 ${
              check.onWhatsApp ? "text-positive" : "text-negative"
            }`}
          >
            {check.onWhatsApp ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            {check.onWhatsApp ? "This number is on WhatsApp" : "Not found on WhatsApp"}
          </div>
        )}

        <label className="block text-[12.5px] font-semibold text-ink mb-1.5 mt-3">
          Message {kind !== "text" && <span className="text-muted font-normal">(editable)</span>}
        </label>
        <textarea
          rows={kind === "text" ? 4 : 6}
          value={loadingPreview ? "Loading template…" : message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={loadingPreview}
          className={inputCls + " resize-y font-mono text-[12px] leading-relaxed"}
        />
        {kind !== "text" && (
          <div className="mt-1.5 text-[11.5px] text-muted flex items-center gap-1.5">
            <Paperclip size={12} /> The invoice PDF is attached automatically.
            <span className="text-line">·</span>
            Placeholders like <code className="text-ink">{"{{client_name}}"}</code> are filled when
            sent.
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <button
            onClick={send}
            disabled={busy || !canSend}
            className="bg-positive text-white px-4 py-2 rounded-md font-semibold text-[13px] hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {kind === "text" ? "Send" : kind === "reminder" ? "Send reminder" : "Send invoice"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-line text-muted font-medium text-[13px] hover:bg-hover"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- per-invoice send history ----

type LogRow = {
  id: number;
  phone: string;
  kind: SendKind;
  status: "sent" | "failed";
  error: string | null;
  body: string;
  created_at: string;
  sent_by: string | null;
};

const KIND_LABEL: Record<SendKind, string> = {
  invoice: "Invoice",
  reminder: "Reminder",
  text: "Message",
};

export function WaSendHistory({ invoiceId, refreshKey }: { invoiceId: number; refreshKey: number }) {
  const [rows, setRows] = useState<LogRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    api(`/whatsapp/log/${invoiceId}`)
      .then((r) => alive && setRows(r))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [invoiceId, refreshKey]);

  if (!rows || rows.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-line overflow-hidden">
      <div className="px-4 py-3 border-b border-line text-[13.5px] font-semibold text-ink flex items-center gap-2">
        <MessageCircle size={15} className="text-positive" /> WhatsApp history
      </div>
      <table className="w-full text-left border-collapse text-[13px]">
        <thead>
          <tr className="text-[12px] font-semibold text-muted">
            <th className="px-4 py-2 border-b border-line">When</th>
            <th className="px-4 py-2 border-b border-line">Type</th>
            <th className="px-4 py-2 border-b border-line">To</th>
            <th className="px-4 py-2 border-b border-line">Status</th>
            <th className="px-4 py-2 border-b border-line">By</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="align-top">
              <td className="px-4 py-2.5 border-b border-line whitespace-nowrap text-muted">
                {formatDate(r.created_at)}
              </td>
              <td className="px-4 py-2.5 border-b border-line text-ink">{KIND_LABEL[r.kind]}</td>
              <td className="px-4 py-2.5 border-b border-line text-muted tabular-nums">{r.phone}</td>
              <td className="px-4 py-2.5 border-b border-line">
                {r.status === "sent" ? (
                  <span className="inline-flex items-center gap-1 text-positive text-[12px] font-semibold">
                    <CheckCircle2 size={13} /> Sent
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 text-negative text-[12px] font-semibold"
                    title={r.error || ""}
                  >
                    <XCircle size={13} /> Failed
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 border-b border-line text-muted">{r.sent_by || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
