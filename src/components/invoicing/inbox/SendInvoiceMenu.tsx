/**
 * "Send invoice / reminder" dropdown for the chat header. Lists this client's
 * invoices; sending fires the existing /api/whatsapp/send/{invoice|reminder}/:id
 * routes, which render the PDF and drop it into this chat.
 *
 * Reminders are offered only for invoices with a pending balance.
 */
import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Send, BellRing, ChevronDown, CheckCircle2 } from "lucide-react";
import { api } from "../../../api";
import { toast } from "../../../toast";
import { formatDate, formatINR } from "../../../format";

type Row = {
  id: number;
  number: string | null;
  invoice_date: string;
  total: number | string;
  balance: number | string;
  payment_status: "unpaid" | "partial" | "paid";
};

const STATUS: Record<Row["payment_status"], { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-positive-soft text-positive" },
  partial: { label: "Partial", cls: "bg-amazon text-amazon-text" },
  unpaid: { label: "Unpaid", cls: "bg-negative-soft text-negative" },
};

export default function SendInvoiceMenu({
  clientId,
  phone,
  onSent,
}: {
  clientId: number;
  phone: string | null;
  onSent?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || rows) return;
    api(`/invoices?client_id=${clientId}`)
      .then(setRows)
      .catch((e) => {
        toast(e.message);
        setRows([]);
      });
  }, [open, rows, clientId]);

  // reload when the menu is reopened after a send (balances change)
  useEffect(() => {
    if (!open) setRows(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const send = async (row: Row, kind: "invoice" | "reminder") => {
    setBusyId(row.id);
    try {
      await api(`/whatsapp/send/${kind}/${row.id}`, {
        method: "POST",
        body: JSON.stringify(phone ? { phone } : {}),
      });
      toast(kind === "reminder" ? "Reminder sent" : "Invoice sent");
      onSent?.();
      setOpen(false);
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary text-white text-[12px] font-semibold hover:bg-[#1B7FD6]"
      >
        <FileText size={14} /> Send invoice
        <ChevronDown size={13} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-[320px] max-h-[380px] overflow-y-auto bg-white border border-line rounded-lg shadow-lg z-30">
          {rows === null ? (
            <div className="p-4 text-center text-muted text-[12px]">
              <Loader2 size={14} className="inline animate-spin" /> loading invoices…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-4 text-center text-muted text-[12px]">
              No invoices for this client yet.
            </div>
          ) : (
            <ul className="divide-y divide-line/50">
              {rows.map((r) => {
                const balance = Number(r.balance) || 0;
                const pending = balance > 0.005;
                const busy = busyId === r.id;
                return (
                  <li key={r.id} className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold text-ink truncate">
                          {r.number || `#${r.id}`}
                        </div>
                        <div className="text-[11px] text-muted">
                          {formatDate(r.invoice_date)} · {formatINR(r.total)}
                          {pending && (
                            <>
                              {" "}
                              · <span className="text-negative">due {formatINR(balance)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          STATUS[r.payment_status].cls
                        }`}
                      >
                        {STATUS[r.payment_status].label}
                      </span>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <button
                        onClick={() => send(r, "invoice")}
                        disabled={busy}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary-soft text-primary text-[11px] font-semibold hover:opacity-90 disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Send size={12} />
                        )}
                        Send invoice
                      </button>
                      {pending && (
                        <button
                          onClick={() => send(r, "reminder")}
                          disabled={busy}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-amazon text-amazon-text text-[11px] font-semibold hover:opacity-90 disabled:opacity-50"
                        >
                          {busy ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <BellRing size={12} />
                          )}
                          Send reminder
                        </button>
                      )}
                      {!pending && (
                        <span className="flex items-center gap-1 px-2 py-1 text-[11px] text-positive">
                          <CheckCircle2 size={12} /> Paid
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
