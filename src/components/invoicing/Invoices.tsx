import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Eye, Pencil, Trash2, X, MessageCircle, Search, IndianRupee } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { confirmDialog } from "../../confirm";
import { formatDate, formatINR } from "../../format";
import ReceivePaymentModal from "./ReceivePaymentModal";
import DateField from "../DateField";
import { WaSendModal } from "./whatsapp";

interface InvoiceRow {
  id: number;
  invoice_date: string;
  due_date: string | null;
  number: string | null;
  company_id: number | null;
  client_id: number | null;
  company_name: string | null;
  client_name: string | null;
  client_phone: string | null;
  total: number | string;
  amount_paid: number | string;
  balance: number | string;
  payment_status: "unpaid" | "partial" | "paid";
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

const selectCls =
  "px-2.5 py-1.5 border border-line rounded-md text-[12.5px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

export default function Invoices() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [clientId, setClientId] = useState("");
  const [waFor, setWaFor] = useState<null | { row: InvoiceRow; kind: "invoice" | "reminder" }>(
    null
  );
  const [payFor, setPayFor] = useState<InvoiceRow | null>(null);

  const load = () => {
    setLoading(true);
    api("/invoices")
      .then(setRows)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  // Company / client option lists derived from the invoices we have.
  const companyOpts = useMemo(() => {
    const m = new Map<number, string>();
    rows.forEach((r) => r.company_id && m.set(r.company_id, r.company_name || `#${r.company_id}`));
    return [...m].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);
  const clientOpts = useMemo(() => {
    const m = new Map<number, string>();
    rows.forEach((r) => {
      if (!r.client_id) return;
      if (companyId && String(r.company_id) !== companyId) return;
      m.set(r.client_id, r.client_name || `#${r.client_id}`);
    });
    return [...m].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows, companyId]);

  // Reset client filter if it no longer belongs to the chosen company.
  useEffect(() => {
    if (clientId && !clientOpts.some(([id]) => String(id) === clientId)) setClientId("");
  }, [clientOpts, clientId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const d = String(r.invoice_date).slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (status && r.payment_status !== status) return false;
      if (companyId && String(r.company_id) !== companyId) return false;
      if (clientId && String(r.client_id) !== clientId) return false;
      if (
        needle &&
        !(
          (r.number || "").toLowerCase().includes(needle) ||
          (r.client_name || "").toLowerCase().includes(needle) ||
          (r.company_name || "").toLowerCase().includes(needle) ||
          (r.client_phone || "").toLowerCase().includes(needle)
        )
      )
        return false;
      return true;
    });
  }, [rows, from, to, status, q, companyId, clientId]);

  const totals = useMemo(
    () => ({
      total: filtered.reduce((s, r) => s + Number(r.total || 0), 0),
      due: filtered.reduce((s, r) => s + Number(r.balance || 0), 0),
    }),
    [filtered]
  );

  const filtersActive = from || to || status || q || companyId || clientId;
  const clearAll = () => {
    setFrom("");
    setTo("");
    setStatus("");
    setQ("");
    setCompanyId("");
    setClientId("");
  };

  const remove = async (r: InvoiceRow) => {
    const ok = await confirmDialog({
      title: "Delete this invoice?",
      message: "The invoice and its line items are removed. This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/invoices/${r.id}`, { method: "DELETE" });
      toast("Invoice deleted");
      load();
    } catch (err: any) {
      toast(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[1.3rem] font-bold text-ink flex items-center gap-2">
          <FileText size={20} className="text-primary" /> Invoices
        </h1>
        <button
          onClick={() => navigate("/invoicing/invoices/new")}
          className="bg-primary text-white px-3.5 py-2 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6] transition-colors"
        >
          New Invoice
        </button>
      </div>

      <div className="bg-white border border-line rounded-lg p-3 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="text-[11.5px] font-semibold text-muted mb-1">Search</div>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Invoice #, client, company, phone…"
                className={`${selectCls} w-full pl-8`}
              />
            </div>
          </div>
          <div>
            <div className="text-[11.5px] font-semibold text-muted mb-1">Company</div>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className={selectCls}
            >
              <option value="">All companies</option>
              {companyOpts.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-[11.5px] font-semibold text-muted mb-1">Client</div>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={selectCls}
            >
              <option value="">All clients</option>
              {clientOpts.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
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
              <option value="unpaid">Payment Pending</option>
              <option value="partial">Partially Paid</option>
              <option value="paid">Fully Paid</option>
            </select>
          </div>
          {filtersActive && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-[12.5px] text-muted hover:text-ink py-1.5"
            >
              <X size={14} /> Clear all
            </button>
          )}
          <div className="ml-auto text-right">
            <div className="text-[11.5px] text-muted">
              {filtered.length} {filtered.length === 1 ? "invoice" : "invoices"} · due{" "}
              <span className="font-semibold text-ink">{formatINR(totals.due)}</span>
            </div>
            <div className="text-[14px] font-bold text-ink tabular-nums">
              {formatINR(totals.total)}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-line overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted text-[13px]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted text-[13px]">
            {rows.length === 0 ? "No invoices yet." : "No invoices match the filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="text-[12px] font-semibold text-muted">
                  <th className="px-2.5 py-2 border-b border-line">Date</th>
                  <th className="px-2.5 py-2 border-b border-line">Number</th>
                  <th className="px-2.5 py-2 border-b border-line">Client</th>
                  <th className="px-2.5 py-2 border-b border-line">Company</th>
                  <th className="px-2.5 py-2 border-b border-line">Status</th>
                  <th className="px-2.5 py-2 border-b border-line text-right">Total</th>
                  <th className="px-2.5 py-2 border-b border-line text-right">Balance</th>
                  <th className="px-2.5 py-2 border-b border-line w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-hover transition-colors cursor-pointer"
                    onClick={() => navigate(`/invoicing/invoices/${r.id}`)}
                  >
                    <td className="px-2.5 py-2.5 border-b border-line whitespace-nowrap text-ink">
                      {formatDate(r.invoice_date)}
                    </td>
                    <td className="px-2.5 py-2.5 border-b border-line text-muted">
                      {r.number || "—"}
                    </td>
                    <td className="px-2.5 py-2.5 border-b border-line text-ink">
                      {r.client_name || "—"}
                    </td>
                    <td className="px-2.5 py-2.5 border-b border-line text-muted">
                      {r.company_name || "—"}
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
                      {r.client_id && (
                        <button
                          onClick={() => setPayFor(r)}
                          className="text-muted hover:text-positive p-1 rounded hover:bg-positive-soft transition-colors"
                          title="Receive payment from this client"
                        >
                          <IndianRupee size={16} />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setWaFor({
                            row: r,
                            kind: r.payment_status === "paid" ? "invoice" : "reminder",
                          })
                        }
                        className="text-muted hover:text-positive p-1 rounded hover:bg-positive-soft transition-colors ml-1"
                        title={
                          r.payment_status === "paid"
                            ? "Send invoice on WhatsApp"
                            : "Send reminder on WhatsApp"
                        }
                      >
                        <MessageCircle size={16} />
                      </button>
                      <button
                        onClick={() => navigate(`/invoicing/invoices/${r.id}`)}
                        className="text-muted hover:text-primary p-1 rounded hover:bg-primary-soft transition-colors ml-1"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => navigate(`/invoicing/invoices/${r.id}/edit`)}
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

      {waFor && (
        <WaSendModal
          invoiceId={waFor.row.id}
          companyId={waFor.row.company_id}
          kind={waFor.kind}
          defaultPhone={waFor.row.client_phone || ""}
          clientName={waFor.row.client_name}
          onClose={() => setWaFor(null)}
        />
      )}

      {payFor && payFor.client_id && (
        <ReceivePaymentModal
          clientId={payFor.client_id}
          clientName={payFor.client_name}
          companyId={payFor.company_id}
          onClose={() => setPayFor(null)}
          onSaved={() => {
            setPayFor(null);
            load();
          }}
        />
      )}
    </div>
  );
}
