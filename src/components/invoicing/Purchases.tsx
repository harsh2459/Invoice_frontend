import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Eye, Pencil, Trash2, X } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { confirmDialog } from "../../confirm";
import { formatDate, formatINR } from "../../format";
import DateField from "../DateField";

interface BillRow {
  id: number;
  bill_date: string;
  due_date: string | null;
  number: string | null;
  company_name: string | null;
  supplier_name: string | null;
  total: number | string;
  balance: number | string;
  payment_status: "unpaid" | "partial" | "paid";
}

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-positive-soft text-positive",
  partial: "bg-amazon text-amazon-text",
  unpaid: "bg-negative-soft text-negative",
};
const STATUS_LABEL: Record<string, string> = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
};
const selectCls =
  "px-2.5 py-1.5 border border-line rounded-md text-[12.5px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

export default function Purchases() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<BillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");

  const load = () => {
    setLoading(true);
    api("/purchases")
      .then(setRows)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const d = String(r.bill_date).slice(0, 10);
        if (from && d < from) return false;
        if (to && d > to) return false;
        if (status && r.payment_status !== status) return false;
        return true;
      }),
    [rows, from, to, status]
  );

  const totals = useMemo(
    () => ({
      total: filtered.reduce((s, r) => s + Number(r.total || 0), 0),
      due: filtered.reduce((s, r) => s + Number(r.balance || 0), 0),
    }),
    [filtered]
  );
  const filtersActive = from || to || status;

  const remove = async (r: BillRow) => {
    const ok = await confirmDialog({
      title: "Delete this bill?",
      message: "The bill and its line items are removed, and stock is rolled back. This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/purchases/${r.id}`, { method: "DELETE" });
      toast("Bill deleted");
      load();
    } catch (err: any) {
      toast(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[1.3rem] font-bold text-ink flex items-center gap-2">
          <ShoppingCart size={20} className="text-primary" /> Purchases
        </h1>
        <button
          onClick={() => navigate("/invoicing/purchases/new")}
          className="bg-primary text-white px-3.5 py-2 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6] transition-colors"
        >
          New Bill
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-white border border-line rounded-lg p-3">
        <div>
          <div className="text-[11.5px] font-semibold text-muted mb-1">From</div>
          <div className="w-[130px]">
            <DateField value={from} onChange={setFrom} />
          </div>
        </div>
        <div>
          <div className="text-[11.5px] font-semibold text-muted mb-1">To</div>
          <div className="w-[130px]">
            <DateField value={to} onChange={setTo} />
          </div>
        </div>
        <div>
          <div className="text-[11.5px] font-semibold text-muted mb-1">Status</div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
            <option value="">All</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partially Paid</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        {filtersActive && (
          <button
            onClick={() => {
              setFrom("");
              setTo("");
              setStatus("");
            }}
            className="flex items-center gap-1 text-[12.5px] text-muted hover:text-ink py-1.5"
          >
            <X size={14} /> Clear
          </button>
        )}
        <div className="ml-auto text-right">
          <div className="text-[11.5px] text-muted">
            {filtered.length} {filtered.length === 1 ? "bill" : "bills"} · payable{" "}
            <span className="font-semibold text-ink">{formatINR(totals.due)}</span>
          </div>
          <div className="text-[14px] font-bold text-ink tabular-nums">{formatINR(totals.total)}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-line overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted text-[13px]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted text-[13px]">
            {rows.length === 0 ? "No purchase bills yet." : "No bills match the filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="text-[12px] font-semibold text-muted">
                  <th className="px-2.5 py-2 border-b border-line">Date</th>
                  <th className="px-2.5 py-2 border-b border-line">Bill No.</th>
                  <th className="px-2.5 py-2 border-b border-line">Supplier</th>
                  <th className="px-2.5 py-2 border-b border-line">Status</th>
                  <th className="px-2.5 py-2 border-b border-line text-right">Total</th>
                  <th className="px-2.5 py-2 border-b border-line text-right">Payable</th>
                  <th className="px-2.5 py-2 border-b border-line w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-hover transition-colors cursor-pointer"
                    onClick={() => navigate(`/invoicing/purchases/${r.id}`)}
                  >
                    <td className="px-2.5 py-2.5 border-b border-line whitespace-nowrap text-ink">
                      {formatDate(r.bill_date)}
                    </td>
                    <td className="px-2.5 py-2.5 border-b border-line text-muted">
                      {r.number || "—"}
                    </td>
                    <td className="px-2.5 py-2.5 border-b border-line text-ink">
                      {r.supplier_name || "—"}
                    </td>
                    <td className="px-2.5 py-2.5 border-b border-line">
                      <span
                        className={`px-2 py-0.5 rounded-xl text-[11px] font-semibold ${
                          STATUS_STYLE[r.payment_status]
                        }`}
                      >
                        {STATUS_LABEL[r.payment_status]}
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5 border-b border-line text-right font-medium text-ink tabular-nums">
                      {formatINR(r.total)}
                    </td>
                    <td className="px-2.5 py-2.5 border-b border-line text-right tabular-nums text-muted">
                      {Number(r.balance) > 0 ? formatINR(r.balance) : "—"}
                    </td>
                    <td
                      className="px-2.5 py-2.5 border-b border-line text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => navigate(`/invoicing/purchases/${r.id}`)}
                        className="text-muted hover:text-primary p-1 rounded hover:bg-primary-soft transition-colors"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => navigate(`/invoicing/purchases/${r.id}/edit`)}
                        className="text-muted hover:text-primary p-1 rounded hover:bg-primary-soft transition-colors ml-1"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => remove(r)}
                        className="text-muted hover:text-negative p-1 rounded hover:bg-negative-soft transition-colors ml-1"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
