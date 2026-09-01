import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Trash2, Pencil, X, MessageCircle } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { confirmDialog } from "../../confirm";
import { formatDate, formatINR, amountInWords } from "../../format";
import { API_BASE } from "../../config";
import DateField from "../DateField";
import { WaSendModal, WaSendHistory } from "./whatsapp";

interface InvoiceItem {
  id: number;
  description: string;
  hsn: string | null;
  qty: number | string;
  rate: number | string;
  amount: number | string;
  gst_rate: number | string;
  tax_amount: number | string;
}
interface Payment {
  id: number;
  paid_on: string;
  amount: number | string;
  bank_account_id: number | null;
  bank_name: string | null;
  bank_last4: string | null;
}
interface Invoice {
  id: number;
  company_id: number;
  invoice_date: string;
  due_date: string | null;
  number: string | null;
  notes: string | null;
  subtotal: number | string;
  discount: number | string;
  discount_is_pct: number;
  discount_value: number | string;
  tax_total: number | string;
  total: number | string;
  amount_paid: number | string;
  balance: number | string;
  previous_balance?: number | string;
  current_balance?: number | string;
  payment_status: "unpaid" | "partial" | "paid";
  company_name: string | null;
  company_address?: string | null;
  company_phone?: string | null;
  company_email?: string | null;
  company_gstin?: string | null;
  company_logo?: string | null;
  client_name: string | null;
  client_address?: string | null;
  client_gstin?: string | null;
  client_email?: string | null;
  client_phone: string | null;
  items: InvoiceItem[];
  payments: Payment[];
}

function termsLabel(invoiceDate: string, dueDate: string | null): string {
  if (!dueDate) return "Due on Receipt";
  const a = new Date(invoiceDate.slice(0, 10)).getTime();
  const b = new Date(dueDate.slice(0, 10)).getTime();
  const days = Math.round((b - a) / 86400000);
  if (!Number.isFinite(days) || days <= 0) return "Due on Receipt";
  return `Net ${days}${[15, 30, 45, 60, 90].includes(days) ? "" : " days"}`;
}

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-positive-soft text-positive",
  partial: "bg-amazon text-amazon-text",
  unpaid: "bg-negative-soft text-negative",
};
const STATUS_LABEL: Record<string, string> = {
  paid: "Fully Paid",
  partial: "Partially Paid",
  unpaid: "Payment Pending",
};

function PaymentModal({
  invoice,
  onClose,
  onSaved,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSaved: () => void;
}) {
  const total = Number(invoice.total);
  const paid = Number(invoice.amount_paid);
  const balance = Math.max(0, total - paid);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [bankId, setBankId] = useState("");
  const [banks, setBanks] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/bank-accounts?company_id=${invoice.company_id}`)
      .then(setBanks)
      .catch(() => {});
  }, [invoice.company_id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = Number(amount);
    if (!(v > 0)) return toast("Enter an amount");
    setBusy(true);
    try {
      await api(`/invoices/${invoice.id}/payment`, {
        method: "POST",
        body: JSON.stringify({
          amount: v,
          paid_on: paidOn,
          bank_account_id: bankId || null,
        }),
      });
      toast("Payment recorded");
      onSaved();
      onClose();
    } catch (err: any) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-line w-full max-w-sm p-4.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1.05rem] font-bold text-ink">Record Payment</h2>
          <button onClick={onClose} className="text-muted hover:text-ink p-1">
            <X size={18} />
          </button>
        </div>
        <div className="text-[12.5px] text-muted mb-3 space-y-0.5">
          <div className="flex justify-between">
            <span>Grand Total</span>
            <span className="tabular-nums text-ink">{formatINR(total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Already Paid</span>
            <span className="tabular-nums text-ink">{formatINR(paid)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Balance</span>
            <span className="tabular-nums text-ink">{formatINR(balance)}</span>
          </div>
        </div>
        <form onSubmit={save} className="space-y-3">
          <div>
            <div className="text-[12.5px] font-semibold text-ink mb-1.5">Date</div>
            <DateField value={paidOn} onChange={setPaidOn} />
          </div>
          <div>
            <div className="text-[12.5px] font-semibold text-ink mb-1.5">Amount</div>
            <input
              autoFocus
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount received"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setAmount(String(balance))}
              className="text-[11.5px] text-primary hover:underline mt-1"
            >
              Pay full balance ({formatINR(balance)})
            </button>
          </div>
          <div>
            <div className="text-[12.5px] font-semibold text-ink mb-1.5">Bank account</div>
            <select
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className={inputCls}
            >
              <option value="">— none —</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.last4 ? ` ••••${b.last4}` : ""}
                </option>
              ))}
            </select>
            {banks.length === 0 && (
              <p className="text-[11.5px] text-muted mt-1">
                No bank accounts for this company yet — add them under Invoicing → Banks.
              </p>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="bg-primary text-white px-4 py-2 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6] disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-line text-muted font-medium text-[13px] hover:bg-hover"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [waKind, setWaKind] = useState<null | "invoice" | "reminder">(null);
  const [waHistoryKey, setWaHistoryKey] = useState(0);

  const load = () => {
    setLoading(true);
    api(`/invoices/${id}`)
      .then(setInv)
      .catch((e) => toast(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const remove = async () => {
    const ok = await confirmDialog({
      title: "Delete this invoice?",
      message: "The invoice and its line items are removed. This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/invoices/${id}`, { method: "DELETE" });
      toast("Invoice deleted");
      navigate("/invoicing/invoices");
    } catch (err: any) {
      toast(err.message);
    }
  };

  if (loading) {
    return <div className="text-muted text-[13px] py-8 text-center">Loading…</div>;
  }
  if (!inv) {
    return <div className="text-muted text-[13px] py-8 text-center">Invoice not found.</div>;
  }

  const total = Number(inv.total);
  const paid = Number(inv.amount_paid);
  const balance = Number(inv.balance ?? total - paid);
  const isPaid = inv.payment_status === "paid" || balance <= 0.009;
  const hasTax = Number(inv.tax_total) > 0;
  const hasDiscount = Number(inv.discount_value) > 0;
  const hasHsn = inv.items.some((it) => it.hsn);

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => navigate("/invoicing/invoices")}
          className="flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to invoices
        </button>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => navigate(`/invoicing/invoices/${id}/edit`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-hover text-ink rounded-md font-medium text-[12.5px] hover:opacity-90"
          >
            <Pencil size={16} /> Edit
          </button>
          <button
            onClick={() => setPayOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-positive-soft text-positive rounded-md font-medium text-[12.5px] hover:opacity-90"
          >
            Record Payment
          </button>
          <button
            onClick={() => setWaKind("invoice")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-positive text-white rounded-md font-medium text-[12.5px] hover:opacity-90"
          >
            <MessageCircle size={16} /> Send Invoice
          </button>
          {balance > 0 && (
            <button
              onClick={() => setWaKind("reminder")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amazon text-amazon-text rounded-md font-medium text-[12.5px] hover:opacity-90"
            >
              <MessageCircle size={16} /> Send Reminder
            </button>
          )}
          <button
            onClick={() => {
              const token = localStorage.getItem("token");
              window.open(`${API_BASE}/invoices/${id}/pdf?token=${token}`, "_blank");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-soft text-primary rounded-md font-medium text-[12.5px] hover:opacity-90"
          >
            <Download size={16} /> Download PDF
          </button>
          <button
            onClick={remove}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-negative-soft text-negative rounded-md font-medium text-[12.5px] hover:opacity-90"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* ============ invoice document ============ */}
      <div className="bg-white rounded-lg border border-line overflow-hidden">
        <div className="h-1 bg-primary" />
        <div className="p-6 sm:p-8 space-y-6">
          {/* masthead */}
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4 max-w-[420px]">
              {inv.company_logo && (
                <img
                  src={inv.company_logo}
                  alt=""
                  className="w-20 h-20 object-contain shrink-0 rounded"
                />
              )}
              <div>
                <div className="text-[1.25rem] font-bold text-ink">
                  {inv.company_name || "Company"}
                </div>
                <div className="text-[11.5px] text-muted mt-1 whitespace-pre-line leading-relaxed">
                  {[
                    inv.company_address,
                    [inv.company_phone, inv.company_email].filter(Boolean).join("  •  "),
                    inv.company_gstin ? `GSTIN: ${inv.company_gstin}` : "",
                  ]
                    .filter(Boolean)
                    .join("\n")}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[2.1rem] font-extrabold tracking-tight text-primary leading-none">
                INVOICE
              </div>
              <div className="text-[12px] text-muted mt-1.5"># {inv.number || inv.id}</div>
              <span
                className={`inline-block mt-2 px-2 py-0.5 rounded-xl text-[11px] font-semibold ${
                  STATUS_STYLE[inv.payment_status]
                }`}
              >
                {STATUS_LABEL[inv.payment_status]}
              </span>
            </div>
          </div>

          {/* meta grid (full width) */}
          <div className="flex flex-wrap border border-line rounded-md overflow-hidden text-[12px]">
            {[
              ["Invoice#", inv.number || `INV-${String(inv.id).padStart(6, "0")}`],
              ["Invoice Date", formatDate(inv.invoice_date)],
              ...(inv.due_date
                ? ([
                    ["Terms", termsLabel(inv.invoice_date, inv.due_date)],
                    ["Due Date", formatDate(inv.due_date)],
                  ] as [string, string][])
                : []),
            ].map(([k, v], i) => (
              <div
                key={k}
                className={`flex-1 min-w-[140px] px-3 py-2 ${i > 0 ? "border-l border-line" : ""}`}
              >
                <div className="text-muted text-[10.5px] uppercase tracking-wide">{k}</div>
                <div className="text-ink font-semibold mt-0.5">{v}</div>
              </div>
            ))}
          </div>

          {/* parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {(["Bill To", "Ship To"] as const).map((label) => (
              <div key={label}>
                <div className="text-[10.5px] font-semibold uppercase tracking-wide text-primary mb-1">
                  {label}
                </div>
                <div className="text-[13px] font-semibold text-ink">{inv.client_name || "—"}</div>
                <div className="text-[11.5px] text-muted mt-0.5 whitespace-pre-line leading-relaxed">
                  {(label === "Bill To"
                    ? [
                        inv.client_address,
                        inv.client_gstin ? `GSTIN: ${inv.client_gstin}` : "",
                        [inv.client_phone, inv.client_email].filter(Boolean).join("  •  "),
                      ]
                    : [inv.client_address]
                  )
                    .filter(Boolean)
                    .join("\n")}
                </div>
              </div>
            ))}
          </div>

          {/* items */}
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-primary text-white text-[11px] font-semibold uppercase tracking-wide">
                  <th className="px-3 py-2 text-center w-8">#</th>
                  {hasHsn && <th className="px-3 py-2 text-left w-16">HSN</th>}
                  <th className="px-3 py-2 text-left">Item &amp; Description</th>
                  <th className="px-3 py-2 text-right w-16">Qty</th>
                  <th className="px-3 py-2 text-right w-24">Rate</th>
                  {hasTax && <th className="px-3 py-2 text-right w-16">GST</th>}
                  <th className="px-3 py-2 text-right w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.items.map((it, i) => (
                  <tr key={it.id} className={i % 2 ? "bg-primary-soft/40" : ""}>
                    <td className="px-3 py-2.5 text-center text-muted border-b border-line align-top">
                      {i + 1}
                    </td>
                    {hasHsn && (
                      <td className="px-3 py-2.5 text-muted border-b border-line align-top">
                        {it.hsn || "—"}
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-ink border-b border-line">{it.description}</td>
                    <td className="px-3 py-2.5 text-right border-b border-line align-top">
                      <div className="tabular-nums">{Number(it.qty).toLocaleString("en-IN")}</div>
                      <div className="text-[10.5px] text-muted">Piece</div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums border-b border-line align-top">
                      {formatINR(it.rate)}
                    </td>
                    {hasTax && (
                      <td className="px-3 py-2.5 text-right tabular-nums border-b border-line align-top">
                        {Number(it.gst_rate)}%
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-right tabular-nums border-b border-line align-top">
                      {formatINR(it.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* totals */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
            <div className="text-[11.5px] text-muted italic max-w-xs pt-1">
              Amount in words: {amountInWords(total)}
            </div>
            <div className="w-full sm:w-72">
              <div className="bg-primary-soft/60 rounded-md p-3.5 text-[13px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted">Sub Total</span>
                  <span className="tabular-nums">{formatINR(inv.subtotal)}</span>
                </div>
                {hasDiscount && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted">
                        Discount{inv.discount_is_pct ? ` (${Number(inv.discount)}%)` : ""}
                      </span>
                      <span className="tabular-nums">− {formatINR(inv.discount_value)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Taxable</span>
                      <span className="tabular-nums">
                        {formatINR(Number(inv.subtotal) - Number(inv.discount_value))}
                      </span>
                    </div>
                  </>
                )}
                {hasTax && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted">Tax Rate</span>
                      <span className="tabular-nums">
                        {(() => {
                          const t = Number(inv.subtotal) - Number(inv.discount_value || 0);
                          return t > 0
                            ? `${Math.round((Number(inv.tax_total) / t) * 10000) / 100}%`
                            : "—";
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Total GST</span>
                      <span className="tabular-nums">{formatINR(inv.tax_total)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-t border-primary/20 pt-1.5 mt-1 font-bold text-primary text-[14px]">
                  <span>Grand Total</span>
                  <span className="tabular-nums">{formatINR(total)}</span>
                </div>
                {paid > 0 && (
                  <div className="flex justify-between text-positive">
                    <span>Amount Paid</span>
                    <span className="tabular-nums">− {formatINR(paid)}</span>
                  </div>
                )}
                <div
                  className={`flex justify-between font-bold text-[14px] ${
                    isPaid ? "text-positive" : "text-negative"
                  }`}
                >
                  <span>{isPaid ? "Amount Due" : "Balance Due"}</span>
                  <span className="tabular-nums">{formatINR(isPaid ? 0 : balance)}</span>
                </div>
                {Number(inv.previous_balance || 0) > 0 && (
                  <>
                    <div className="flex justify-between border-t border-primary/20 pt-1.5 mt-1 text-muted">
                      <span>Previous Balance</span>
                      <span className="tabular-nums">{formatINR(inv.previous_balance)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-negative text-[14px]">
                      <span>Current Balance</span>
                      <span className="tabular-nums">{formatINR(inv.current_balance)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="border-t border-line pt-4 text-[12px] text-muted space-y-3">
            <div className="font-semibold text-ink">Thanks for your business.</div>
            {inv.notes && inv.notes.trim() && (
              <div>
                <div className="font-semibold text-ink mb-0.5">Notes / Additional Info</div>
                <div className="whitespace-pre-line">{inv.notes}</div>
              </div>
            )}
            <div>
              <div className="font-semibold text-ink mb-0.5">Terms &amp; Conditions</div>
              <div>
                Full payment is due upon receipt of this invoice. Late payments may incur additional
                charges or interest as per applicable laws.
              </div>
            </div>
          </div>
        </div>
      </div>

      {inv.payments.length > 0 && (
        <div className="bg-white rounded-lg border border-line overflow-hidden">
          <div className="px-4 py-3 border-b border-line text-[13.5px] font-semibold text-ink">
            Payments
          </div>
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="text-[12px] font-semibold text-muted">
                <th className="px-4 py-2 border-b border-line">Date</th>
                <th className="px-4 py-2 border-b border-line">Bank</th>
                <th className="px-4 py-2 border-b border-line text-right">Amount</th>
                <th className="px-4 py-2 border-b border-line w-10"></th>
              </tr>
            </thead>
            <tbody>
              {inv.payments.map((p) => (
                <tr key={p.id} className="hover:bg-hover transition-colors">
                  <td className="px-4 py-2.5 border-b border-line whitespace-nowrap">
                    {formatDate(p.paid_on)}
                  </td>
                  <td className="px-4 py-2.5 border-b border-line text-muted">
                    {p.bank_name
                      ? `${p.bank_name}${p.bank_last4 ? ` ••••${p.bank_last4}` : ""}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 border-b border-line text-right tabular-nums">
                    {formatINR(p.amount)}
                  </td>
                  <td className="px-4 py-2.5 border-b border-line text-right">
                    <button
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: "Delete this payment?",
                          message: "The invoice balance will be recalculated.",
                          confirmLabel: "Delete",
                          danger: true,
                        });
                        if (!ok) return;
                        try {
                          await api(`/invoices/${id}/payments/${p.id}`, { method: "DELETE" });
                          toast("Payment removed");
                          load();
                        } catch (err: any) {
                          toast(err.message);
                        }
                      }}
                      className="text-muted hover:text-negative p-1 rounded hover:bg-negative-soft transition-colors"
                      title="Delete payment"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <WaSendHistory invoiceId={inv.id} refreshKey={waHistoryKey} />

      {payOpen && (
        <PaymentModal invoice={inv} onClose={() => setPayOpen(false)} onSaved={load} />
      )}

      {waKind && (
        <WaSendModal
          invoiceId={inv.id}
          companyId={inv.company_id}
          kind={waKind}
          defaultPhone={inv.client_phone || ""}
          clientName={inv.client_name}
          onClose={() => setWaKind(null)}
          onSent={() => setWaHistoryKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
