import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { api } from "../../api";
import { API_BASE } from "../../config";
import { toast } from "../../toast";
import { confirmDialog } from "../../confirm";
import { formatDate, formatINR, amountInWords } from "../../format";

const MODE_LABEL: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank: "Bank Transfer",
  cheque: "Cheque",
  card: "Card",
  other: "Other",
};

export default function ReceiptView() {
  const { clientId, rid } = useParams();
  const navigate = useNavigate();
  const [r, setR] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    setLoading(true);
    api(`/clients/${clientId}/receipts/${rid}`)
      .then(setR)
      .catch((e) => toast(e.message))
      .finally(() => setLoading(false));
  }, [clientId, rid]);

  const remove = async () => {
    const ok = await confirmDialog({
      title: "Delete this receipt?",
      message: "The payments it applied to invoices are reversed and the client balance recalculated.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/clients/${clientId}/receipts/${rid}`, { method: "DELETE" });
      toast("Receipt deleted");
      navigate(`/invoicing/clients/${clientId}`);
    } catch (e: any) {
      toast(e.message);
    }
  };

  if (loading) return <div className="text-muted text-[13px] py-8 text-center">Loading…</div>;
  if (!r) return <div className="text-muted text-[13px] py-8 text-center">Receipt not found.</div>;

  const amt = Number(r.amount);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => navigate("/invoicing/payments")}
          className="flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to payments
        </button>
        <div className="flex gap-2">
          <a
            href={`${API_BASE}/clients/${clientId}/receipts/${rid}/pdf?token=${token}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-soft text-primary rounded-md font-medium text-[12.5px] hover:opacity-90"
          >
            <Download size={16} /> Download PDF
          </a>
          <button
            onClick={remove}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-negative-soft text-negative rounded-md font-medium text-[12.5px] hover:opacity-90"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-line overflow-hidden">
        <div className="h-1 bg-positive" />
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="text-[1.25rem] font-bold text-ink">{r.company_name || "Company"}</div>
              <div className="text-[11.5px] text-muted mt-1">Payment Receipt</div>
            </div>
            <div className="text-right">
              <div className="text-[1.9rem] font-extrabold tracking-tight text-positive leading-none">
                RECEIPT
              </div>
              <div className="text-[12px] text-muted mt-1.5"># {r.number || r.id}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-positive mb-1">
                Received From
              </div>
              <div className="text-[13px] font-semibold text-ink">{r.client_name || "—"}</div>
              <div className="text-[11.5px] text-muted mt-0.5 whitespace-pre-line leading-relaxed">
                {[
                  r.client_address,
                  r.client_phone,
                  r.client_gstin ? `GSTIN: ${r.client_gstin}` : "",
                ]
                  .filter(Boolean)
                  .join("\n")}
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-[13px] text-ink">Date: {formatDate(r.receipt_date)}</div>
              <div className="text-[13px] text-ink">
                Mode: {MODE_LABEL[r.mode] || "Cash"}
                {r.reference ? ` · Ref ${r.reference}` : ""}
              </div>
              {r.bank_name && (
                <div className="text-[12px] text-muted">
                  {r.bank_name}
                  {r.bank_last4 ? ` ••••${r.bank_last4}` : ""}
                </div>
              )}
            </div>
          </div>

          <div className="bg-positive-soft/60 rounded-md p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Amount Received
              </div>
              <div className="text-[11.5px] text-muted italic mt-0.5">{amountInWords(amt)}</div>
            </div>
            <div className="text-[1.5rem] font-bold text-positive tabular-nums">{formatINR(amt)}</div>
          </div>

          {r.allocations.length > 0 && (
            <div className="overflow-x-auto">
              <div className="text-[12.5px] font-semibold text-ink mb-1">Applied to invoices</div>
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="text-[12px] font-semibold text-muted">
                    <th className="px-3 py-2 border-b border-line text-left">Invoice</th>
                    <th className="px-3 py-2 border-b border-line">Date</th>
                    <th className="px-3 py-2 border-b border-line text-right">Applied</th>
                    <th className="px-3 py-2 border-b border-line text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  {r.allocations.map((a: any, i: number) => (
                    <tr
                      key={i}
                      onClick={() => navigate(`/invoicing/invoices/${a.invoice_id}`)}
                      className="hover:bg-hover cursor-pointer"
                    >
                      <td className="px-3 py-2.5 border-b border-line text-ink">
                        {a.invoice_number || `#${a.invoice_id}`}
                      </td>
                      <td className="px-3 py-2.5 border-b border-line text-muted">
                        {formatDate(a.invoice_date)}
                      </td>
                      <td className="px-3 py-2.5 border-b border-line text-right tabular-nums text-positive">
                        {formatINR(a.amount)}
                      </td>
                      <td className="px-3 py-2.5 border-b border-line text-right tabular-nums">
                        {formatINR(a.balance_after)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {Number(r.unapplied) > 0.009 && (
            <div className="text-[12.5px] text-amazon-text">
              {formatINR(r.unapplied)} kept as an advance (no open invoices to apply it to).
            </div>
          )}

          <div className="flex justify-end">
            <div className="w-72 bg-hover/40 rounded-md p-3.5 text-[13px] space-y-1">
              <div className="flex justify-between text-muted">
                <span>Previous Balance</span>
                <span className="tabular-nums">{formatINR(r.previous_balance)}</span>
              </div>
              <div className="flex justify-between text-positive">
                <span>Less: Payment Received</span>
                <span className="tabular-nums">− {formatINR(amt)}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-1.5 mt-1 font-bold text-ink text-[14px]">
                <span>Current Balance</span>
                <span
                  className={`tabular-nums ${
                    Number(r.current_balance) > 0 ? "text-negative" : "text-positive"
                  }`}
                >
                  {formatINR(r.current_balance)}
                </span>
              </div>
            </div>
          </div>

          {r.notes && (
            <div className="border-t border-line pt-3 text-[12px] text-muted">
              <span className="font-semibold text-ink">Note: </span>
              {r.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
