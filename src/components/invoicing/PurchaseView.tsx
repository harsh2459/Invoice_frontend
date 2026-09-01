import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2, Pencil, X } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { confirmDialog } from "../../confirm";
import { formatDate, formatINR } from "../../format";
import DateField from "../DateField";

interface Item {
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
  bank_name: string | null;
  bank_last4: string | null;
}
interface Bill {
  id: number;
  company_id: number;
  bill_date: string;
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
  payment_status: "unpaid" | "partial" | "paid";
  company_name: string | null;
  supplier_name: string | null;
  items: Item[];
  payments: Payment[];
}

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-positive-soft text-positive",
  partial: "bg-amazon text-amazon-text",
  unpaid: "bg-negative-soft text-negative",
};
const STATUS_LABEL: Record<string, string> = {
  paid: "Paid",
  partial: "Partially Paid",
  unpaid: "Unpaid",
};
const inputCls =
  "w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

function PaymentModal({ bill, onClose, onSaved }: { bill: Bill; onClose: () => void; onSaved: () => void }) {
  const total = Number(bill.total);
  const paid = Number(bill.amount_paid);
  const balance = Math.max(0, total - paid);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [bankId, setBankId] = useState("");
  const [banks, setBanks] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/bank-accounts?company_id=${bill.company_id}`)
      .then(setBanks)
      .catch(() => {});
  }, [bill.company_id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = Number(amount);
    if (!(v > 0)) return toast("Enter an amount");
    setBusy(true);
    try {
      await api(`/purchases/${bill.id}/payment`, {
        method: "POST",
        body: JSON.stringify({ amount: v, paid_on: paidOn, bank_account_id: bankId || null }),
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

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
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
            <span>Payable</span>
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
              placeholder="Amount paid"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setAmount(String(balance))}
              className="text-[11.5px] text-primary hover:underline mt-1"
            >
              Pay full ({formatINR(balance)})
            </button>
          </div>
          <div>
            <div className="text-[12.5px] font-semibold text-ink mb-1.5">Paid from bank account</div>
            <select value={bankId} onChange={(e) => setBankId(e.target.value)} className={inputCls}>
              <option value="">— none —</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.last4 ? ` ••••${b.last4}` : ""}
                </option>
              ))}
            </select>
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

export default function PurchaseView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);

  const load = () => {
    setLoading(true);
    api(`/purchases/${id}`)
      .then(setBill)
      .catch((e) => toast(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const remove = async () => {
    const ok = await confirmDialog({
      title: "Delete this bill?",
      message: "The bill and its line items are removed, and stock is rolled back.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/purchases/${id}`, { method: "DELETE" });
      toast("Bill deleted");
      navigate("/invoicing/purchases");
    } catch (err: any) {
      toast(err.message);
    }
  };

  const delPayment = async (pid: number) => {
    const ok = await confirmDialog({
      title: "Delete this payment?",
      message: "The bill balance will be recalculated.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/purchases/${id}/payments/${pid}`, { method: "DELETE" });
      toast("Payment removed");
      load();
    } catch (err: any) {
      toast(err.message);
    }
  };

  if (loading) return <div className="text-muted text-[13px] py-8 text-center">Loading…</div>;
  if (!bill) return <div className="text-muted text-[13px] py-8 text-center">Bill not found.</div>;

  const total = Number(bill.total);
  const paid = Number(bill.amount_paid);
  const balance = Number(bill.balance ?? total - paid);
  const hasTax = Number(bill.tax_total) > 0;
  const hasDiscount = Number(bill.discount_value) > 0;
  const hasHsn = bill.items.some((it) => it.hsn);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => navigate("/invoicing/purchases")}
          className="flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to purchases
        </button>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => navigate(`/invoicing/purchases/${id}/edit`)}
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
            onClick={remove}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-negative-soft text-negative rounded-md font-medium text-[12.5px] hover:opacity-90"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-line p-5 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-[1.15rem] font-bold text-ink flex items-center gap-2">
              Bill {bill.number ? `#${bill.number}` : `#${bill.id}`}
              <span
                className={`px-2 py-0.5 rounded-xl text-[11px] font-semibold ${
                  STATUS_STYLE[bill.payment_status]
                }`}
              >
                {STATUS_LABEL[bill.payment_status]}
              </span>
            </div>
            <div className="text-[12.5px] text-muted">
              {formatDate(bill.bill_date)}
              {bill.due_date && ` · due ${formatDate(bill.due_date)}`}
            </div>
          </div>
          <div className="text-right text-[13px]">
            <div className="text-[11.5px] text-muted font-semibold uppercase">Buyer</div>
            <div className="text-ink font-medium">{bill.company_name || "—"}</div>
            <div className="text-[11.5px] text-muted font-semibold uppercase mt-1.5">Supplier</div>
            <div className="text-ink font-medium">{bill.supplier_name || "—"}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="text-[12px] font-semibold text-muted">
                {hasHsn && <th className="px-2.5 py-2 border-b border-line text-left w-20">HSN</th>}
                <th className="px-2.5 py-2 border-b border-line text-left">Description</th>
                <th className="px-2.5 py-2 border-b border-line text-right w-16">Qty</th>
                <th className="px-2.5 py-2 border-b border-line text-right w-24">Rate</th>
                {hasTax && (
                  <>
                    <th className="px-2.5 py-2 border-b border-line text-right w-16">GST%</th>
                    <th className="px-2.5 py-2 border-b border-line text-right w-24">Tax</th>
                  </>
                )}
                <th className="px-2.5 py-2 border-b border-line text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((it) => (
                <tr key={it.id}>
                  {hasHsn && (
                    <td className="px-2.5 py-2.5 border-b border-line text-muted">{it.hsn || "—"}</td>
                  )}
                  <td className="px-2.5 py-2.5 border-b border-line text-ink">{it.description}</td>
                  <td className="px-2.5 py-2.5 border-b border-line text-right tabular-nums">
                    {Number(it.qty).toLocaleString("en-IN")}
                  </td>
                  <td className="px-2.5 py-2.5 border-b border-line text-right tabular-nums">
                    {formatINR(it.rate)}
                  </td>
                  {hasTax && (
                    <>
                      <td className="px-2.5 py-2.5 border-b border-line text-right tabular-nums">
                        {Number(it.gst_rate)}%
                      </td>
                      <td className="px-2.5 py-2.5 border-b border-line text-right tabular-nums">
                        {formatINR(it.tax_amount)}
                      </td>
                    </>
                  )}
                  <td className="px-2.5 py-2.5 border-b border-line text-right tabular-nums">
                    {formatINR(it.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-64 text-[13px] space-y-1">
            <div className="flex justify-between">
              <span className="text-muted">Sub Total</span>
              <span className="tabular-nums">{formatINR(bill.subtotal)}</span>
            </div>
            {hasDiscount && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted">
                    Discount{bill.discount_is_pct ? ` (${Number(bill.discount)}%)` : ""}
                  </span>
                  <span className="tabular-nums">− {formatINR(bill.discount_value)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Taxable</span>
                  <span className="tabular-nums">
                    {formatINR(Number(bill.subtotal) - Number(bill.discount_value))}
                  </span>
                </div>
              </>
            )}
            {hasTax && (
              <div className="flex justify-between">
                <span className="text-muted">Total GST (input tax)</span>
                <span className="tabular-nums">{formatINR(bill.tax_total)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-1 font-bold text-ink text-[14px]">
              <span>Grand Total</span>
              <span className="tabular-nums">{formatINR(total)}</span>
            </div>
            {paid > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted">Amount Paid</span>
                  <span className="tabular-nums">− {formatINR(paid)}</span>
                </div>
                <div className="flex justify-between font-bold text-ink">
                  <span>Payable</span>
                  <span className="tabular-nums">{formatINR(balance)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {bill.notes && (
          <div className="text-[12.5px] text-muted border-t border-line pt-3">
            <span className="font-semibold text-ink">Notes: </span>
            {bill.notes}
          </div>
        )}
      </div>

      {bill.payments.length > 0 && (
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
              {bill.payments.map((p) => (
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
                      onClick={() => delPayment(p.id)}
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

      {payOpen && <PaymentModal bill={bill} onClose={() => setPayOpen(false)} onSaved={load} />}
    </div>
  );
}
