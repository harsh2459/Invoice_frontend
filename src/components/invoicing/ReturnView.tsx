import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { api } from "../../api";
import { API_BASE } from "../../config";
import { toast } from "../../toast";
import { confirmDialog } from "../../confirm";
import { formatDate, formatINR, amountInWords } from "../../format";

const REASON: Record<string, string> = {
  damaged: "Damaged",
  wrong_item: "Wrong item",
  excess: "Excess supply",
  not_needed: "Not needed",
  other: "Other",
};

export default function ReturnView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [r, setR] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    setLoading(true);
    api(`/returns/${id}`)
      .then(setR)
      .catch((e) => toast(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const remove = async () => {
    const ok = await confirmDialog({
      title: "Delete this return?",
      message: "Stock and the client's balance are restored.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await api(`/returns/${id}`, { method: "DELETE" });
      toast("Return deleted");
      navigate(r?.client_id ? `/invoicing/clients/${r.client_id}` : "/invoicing/returns");
      void res;
    } catch (e: any) {
      toast(e.message);
    }
  };

  if (loading) return <div className="text-muted text-[13px] py-8 text-center">Loading…</div>;
  if (!r) return <div className="text-muted text-[13px] py-8 text-center">Return not found.</div>;

  const hasHsn = (r.items || []).some((it: any) => it.hsn);
  const total = Number(r.total);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => navigate("/invoicing/returns")}
          className="flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to returns
        </button>
        <div className="flex gap-2">
          <a
            href={`${API_BASE}/returns/${id}/pdf?token=${token}`}
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
        <div className="h-1 bg-amazon-text" />
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="text-[1.25rem] font-bold text-ink">{r.company_name || "Company"}</div>
              <div className="text-[11.5px] text-muted mt-1">Sales Return / Credit Note</div>
            </div>
            <div className="text-right">
              <div className="text-[1.6rem] font-extrabold tracking-tight text-amazon-text leading-none">
                CREDIT NOTE
              </div>
              <div className="text-[12px] text-muted mt-1.5"># {r.number || r.id}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-amazon-text mb-1">
                Return From
              </div>
              <div className="text-[13px] font-semibold text-ink">{r.client_name || "—"}</div>
              <div className="text-[11.5px] text-muted mt-0.5 whitespace-pre-line leading-relaxed">
                {[r.client_address, r.client_phone, r.client_gstin ? `GSTIN: ${r.client_gstin}` : ""]
                  .filter(Boolean)
                  .join("\n")}
              </div>
            </div>
            <div className="sm:text-right text-[13px] text-ink space-y-0.5">
              <div>Date: {formatDate(r.return_date)}</div>
              <div>Reason: {REASON[r.reason] || r.reason}</div>
              <div>Restocked: {r.restock ? "Yes" : "No"}</div>
              {r.invoice_number && <div>Against: {r.invoice_number}</div>}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-amazon text-amazon-text text-[11px] font-semibold uppercase tracking-wide">
                  <th className="px-3 py-2 text-center w-8">#</th>
                  {hasHsn && <th className="px-3 py-2 text-left w-16">HSN</th>}
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-right w-16">Qty</th>
                  <th className="px-3 py-2 text-right w-24">Rate</th>
                  <th className="px-3 py-2 text-right w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(r.items || []).map((it: any, i: number) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2.5 text-center text-muted border-b border-line">
                      {i + 1}
                    </td>
                    {hasHsn && (
                      <td className="px-3 py-2.5 text-muted border-b border-line">{it.hsn || "—"}</td>
                    )}
                    <td className="px-3 py-2.5 text-ink border-b border-line">{it.description}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border-b border-line">
                      {Number(it.qty).toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums border-b border-line">
                      {formatINR(it.rate)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums border-b border-line text-negative">
                      − {formatINR(it.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
            <div className="text-[11.5px] text-muted italic max-w-xs pt-1">
              Amount in words: {amountInWords(total)}
            </div>
            <div className="w-full sm:w-72 bg-amazon/40 rounded-md p-3.5 text-[13px] space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">Sub Total</span>
                <span className="tabular-nums">{formatINR(r.subtotal)}</span>
              </div>
              {Number(r.tax_total) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">Total GST</span>
                  <span className="tabular-nums">{formatINR(r.tax_total)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-amazon-text/20 pt-1.5 mt-1 font-bold text-amazon-text text-[14px]">
                <span>Credit Total</span>
                <span className="tabular-nums">− {formatINR(total)}</span>
              </div>
              {r.previous_balance != null && (
                <>
                  <div className="flex justify-between border-t border-amazon-text/20 pt-1.5 mt-1 text-muted">
                    <span>Previous Balance</span>
                    <span className="tabular-nums">{formatINR(r.previous_balance)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-negative text-[14px]">
                    <span>Current Balance</span>
                    <span className="tabular-nums">{formatINR(r.current_balance)}</span>
                  </div>
                </>
              )}
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
