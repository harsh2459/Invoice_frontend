import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Eye, MessageCircle, Search, Download, X } from "lucide-react";
import { api } from "../../api";
import { API_BASE } from "../../config";
import { toast } from "../../toast";
import { formatDate, formatINR } from "../../format";
import DateField from "../DateField";
import { WaSendModal } from "./whatsapp";

type DocType = "sales" | "receipt" | "return";

interface Row {
  id: number;
  doc_type: DocType;
  number: string | null;
  date: string;
  total: number | string;
  amount_paid: number | string;
  balance: number | string;
  payment_status: "unpaid" | "partial" | "paid";
  company_id: number | null;
  client_id: number | null;
  company_name: string | null;
  client_name: string | null;
  client_phone: string | null;
  mode?: string;
  reference?: string | null;
  reason?: string;
  restock?: number;
  against_invoice?: string | null;
  unapplied?: number | string;
}

const TYPE_META: Record<DocType, { label: string; chip: string }> = {
  sales: { label: "Sales Invoice", chip: "bg-primary-soft text-primary" },
  receipt: { label: "Payment", chip: "bg-positive-soft text-positive" },
  return: { label: "Return", chip: "bg-amazon text-amazon-text" },
};
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

/**
 * `only` restricts to one doc type (dedicated pages); omit for the mixed Reports feed.
 */
export default function DocumentsList({
  only,
  title,
  icon,
}: {
  only?: DocType;
  title: string;
  icon?: React.ReactNode;
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"" | DocType>(only ?? "");
  const [companyId, setCompanyId] = useState("");
  const [clientId, setClientId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [waFor, setWaFor] = useState<null | { row: Row; kind: "invoice" | "reminder" }>(null);

  const token = localStorage.getItem("token");

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (only || type) p.set("type", (only || type) as string);
    if (q.trim()) p.set("q", q.trim());
    if (companyId) p.set("company_id", companyId);
    if (clientId) p.set("client_id", clientId);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    api(`/documents?${p}`)
      .then((r) => setRows(Array.isArray(r) ? r : []))
      .catch((e) => toast(e.message))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [only, type, q, companyId, clientId, from, to]);

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

  const totals = useMemo(
    () => ({
      count: rows.length,
      value: rows.reduce((s, r) => s + Number(r.total || 0), 0),
      due: rows.reduce((s, r) => s + Number(r.balance || 0), 0),
    }),
    [rows]
  );

  const pdfUrl = (r: Row) => {
    if (r.doc_type === "sales") return `${API_BASE}/invoices/${r.id}/pdf?token=${token}`;
    if (r.doc_type === "receipt")
      return `${API_BASE}/clients/${r.client_id}/receipts/${r.id}/pdf?token=${token}`;
    return `${API_BASE}/returns/${r.id}/pdf?token=${token}`;
  };
  const viewLink = (r: Row) =>
    r.doc_type === "sales"
      ? `/invoicing/invoices/${r.id}`
      : r.doc_type === "receipt"
      ? `/invoicing/clients/${r.client_id}/receipts/${r.id}`
      : `/invoicing/returns/${r.id}`;

  const filtersActive = q || type || companyId || clientId || from || to;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[1.3rem] font-bold text-ink flex items-center gap-2">
          {icon ?? <FileText size={20} className="text-primary" />} {title}
        </h1>
        <button
          onClick={() => navigate("/invoicing/invoices/new")}
          className="bg-primary text-white px-3.5 py-2 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6]"
        >
          New Document
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
                placeholder="Number, client, phone…"
                className={`${selectCls} w-full pl-8`}
              />
            </div>
          </div>
          {!only && (
            <div>
              <div className="text-[11.5px] font-semibold text-muted mb-1">Type</div>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className={selectCls}
              >
                <option value="">All types</option>
                <option value="sales">Sales Invoice</option>
                <option value="receipt">Payment Received</option>
                <option value="return">Sales Return</option>
              </select>
            </div>
          )}
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
          {filtersActive && (
            <button
              onClick={() => {
                setQ("");
                setType(only ?? "");
                setCompanyId("");
                setClientId("");
                setFrom("");
                setTo("");
              }}
              className="flex items-center gap-1 text-[12.5px] text-muted hover:text-ink py-1.5"
            >
              <X size={14} /> Clear
            </button>
          )}
          <div className="ml-auto text-right">
            <div className="text-[11.5px] text-muted">
              {totals.count} {totals.count === 1 ? "document" : "documents"}
              {totals.due > 0 && (
                <>
                  {" "}
                  · due <span className="font-semibold text-negative">{formatINR(totals.due)}</span>
                </>
              )}
            </div>
            <div className="text-[14px] font-bold text-ink tabular-nums">{formatINR(totals.value)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-line overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted text-[13px]">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted text-[13px]">Nothing here yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="text-[12px] font-semibold text-muted">
                  <th className="px-2.5 py-2 border-b border-line">Date</th>
                  {!only && <th className="px-2.5 py-2 border-b border-line">Type</th>}
                  <th className="px-2.5 py-2 border-b border-line">Number</th>
                  <th className="px-2.5 py-2 border-b border-line">Client</th>
                  <th className="px-2.5 py-2 border-b border-line">Company</th>
                  <th className="px-2.5 py-2 border-b border-line">Detail</th>
                  <th className="px-2.5 py-2 border-b border-line text-right">Amount</th>
                  <th className="px-2.5 py-2 border-b border-line text-right">Balance</th>
                  <th className="px-2.5 py-2 border-b border-line w-24"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={`${r.doc_type}-${r.id}`}
                    onClick={() => navigate(viewLink(r))}
                    className="hover:bg-hover transition-colors cursor-pointer"
                  >
                    <td className="px-2.5 py-2.5 border-b border-line whitespace-nowrap text-ink">
                      {formatDate(r.date)}
                    </td>
                    {!only && (
                      <td className="px-2.5 py-2.5 border-b border-line">
                        <span
                          className={`px-2 py-0.5 rounded-xl text-[11px] font-semibold ${TYPE_META[r.doc_type].chip}`}
                        >
                          {TYPE_META[r.doc_type].label}
                        </span>
                      </td>
                    )}
                    <td className="px-2.5 py-2.5 border-b border-line text-muted">
                      {r.number || `#${r.id}`}
                    </td>
                    <td className="px-2.5 py-2.5 border-b border-line text-ink">
                      {r.client_name || "—"}
                    </td>
                    <td className="px-2.5 py-2.5 border-b border-line text-muted">
                      {r.company_name || "—"}
                    </td>
                    <td className="px-2.5 py-2.5 border-b border-line text-muted text-[12px]">
                      {r.doc_type === "sales" && (
                        <span
                          className={`px-2 py-0.5 rounded-xl text-[11px] font-semibold ${
                            STATUS_STYLE[r.payment_status]
                          }`}
                        >
                          {STATUS_LABEL[r.payment_status]}
                        </span>
                      )}
                      {r.doc_type === "receipt" &&
                        `${(r.mode || "cash").toUpperCase()}${r.reference ? ` · ${r.reference}` : ""}${
                          Number(r.unapplied) > 0 ? ` · ${formatINR(r.unapplied)} advance` : ""
                        }`}
                      {r.doc_type === "return" &&
                        `${(r.reason || "other").replace("_", " ")}${
                          r.against_invoice ? ` · vs ${r.against_invoice}` : ""
                        }${r.restock ? "" : " · not restocked"}`}
                    </td>
                    <td
                      className={`px-2.5 py-2.5 border-b border-line text-right font-medium tabular-nums ${
                        r.doc_type === "sales" ? "text-ink" : "text-positive"
                      }`}
                    >
                      {r.doc_type === "sales" ? "" : r.doc_type === "return" ? "− " : "+ "}
                      {formatINR(r.total)}
                    </td>
                    <td className="px-2.5 py-2.5 border-b border-line text-right tabular-nums text-negative">
                      {Number(r.balance) > 0 ? formatINR(r.balance) : "—"}
                    </td>
                    <td
                      className="px-2.5 py-2.5 border-b border-line text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {r.doc_type === "sales" && r.client_id && (
                        <button
                          onClick={() =>
                            setWaFor({
                              row: r,
                              kind: r.payment_status === "paid" ? "invoice" : "reminder",
                            })
                          }
                          className="text-muted hover:text-positive p-1 rounded hover:bg-positive-soft"
                          title="Send on WhatsApp"
                        >
                          <MessageCircle size={16} />
                        </button>
                      )}
                      <a
                        href={pdfUrl(r)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted hover:text-primary p-1 rounded hover:bg-primary-soft ml-1 inline-block"
                        title="Download PDF"
                      >
                        <Download size={16} />
                      </a>
                      <button
                        onClick={() => navigate(viewLink(r))}
                        className="text-muted hover:text-primary p-1 rounded hover:bg-primary-soft ml-1"
                        title="View"
                      >
                        <Eye size={16} />
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
    </div>
  );
}
