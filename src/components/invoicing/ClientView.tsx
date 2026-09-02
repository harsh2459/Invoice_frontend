import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Contact,
  IndianRupee,
  Download,
  Plus,
  FileText,
  Undo2,
  ChevronDown,
  X,
} from "lucide-react";
import { api } from "../../api";
import { API_BASE } from "../../config";
import { toast } from "../../toast";
import { formatDate, formatINR } from "../../format";
import DateField from "../DateField";
import { ClientModal } from "./modals";
import ReceiveForm from "./ReceiveForm";
import ReturnForm from "./ReturnForm";

/** keyed wrapper so a group of <tr>s can be returned from .map without a real DOM node */
const FragmentRows = ({ children }: { children: React.ReactNode }) => <>{children}</>;

interface StatementRow {
  date: string;
  source_type: string;
  source_id: number | null;
  ref: string;
  particulars: string;
  kind_label: string;
  debit: number;
  credit: number;
  balance: number;
  children?: Omit<StatementRow, "children" | "balance">[];
}

interface InvoiceRow {
  id: number;
  number: string | null;
  invoice_date: string;
  due_date: string | null;
  total: number | string;
  amount_paid: number | string;
  balance: number | string;
  payment_status: "unpaid" | "partial" | "paid";
  company_name: string | null;
}
interface ProductRow {
  description: string;
  qty: number | string;
  value: number | string;
  invoice_count: number;
  last_bought: string | null;
}
interface Summary {
  client: {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    gstin: string | null;
  };
  kpis: {
    invoice_count: number;
    total_invoiced: number;
    total_paid: number;
    outstanding: number;
    unpaid_count: number;
    first_invoice: string | null;
    last_invoice: string | null;
  };
  invoices: InvoiceRow[];
  products: ProductRow[];
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

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "negative" | "positive" }) {
  return (
    <div className="bg-white border border-line rounded-lg p-3.5">
      <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">{label}</div>
      <div
        className={`text-[1.25rem] font-bold mt-1 tabular-nums ${
          tone === "negative" ? "text-negative" : tone === "positive" ? "text-positive" : "text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export default function ClientView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [clientCompanies, setClientCompanies] = useState<{ id: number; name: string }[]>([]);
  // inline "New Document" panel
  const [docKind, setDocKind] = useState<null | "sale" | "receipt" | "return">(null);
  const [docCompanyId, setDocCompanyId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [created, setCreated] = useState<{ label: string; href: string }[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const [stmt, setStmt] = useState<{
    opening_balance: number;
    closing_balance: number;
    rows: StatementRow[];
    totals: { debit: number; credit: number };
  } | null>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const loadStatement = () => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    api(`/clients/${id}/statement?${q}`).then(setStmt).catch(() => setStmt(null));
  };

  const load = () => {
    setLoading(true);
    api(`/clients/${id}/summary`)
      .then(setData)
      .catch((e) => toast(e.message))
      .finally(() => setLoading(false));
    loadStatement();
    api(`/clients/${id}/receipts`).then(setReceipts).catch(() => setReceipts([]));
  };
  useEffect(load, [id]);
  useEffect(loadStatement, [from, to]);
  useEffect(() => {
    api(`/clients/${id}`)
      .then((c: any) => {
        const cos = c.companies ?? [];
        setClientCompanies(cos);
        setDocCompanyId((prev) => prev || (cos[0] ? String(cos[0].id) : ""));
      })
      .catch(() => {});
  }, [id]);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const token = localStorage.getItem("token");
  const stmtPdfUrl = () => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (token) q.set("token", token);
    return `${API_BASE}/clients/${id}/statement/pdf?${q}`;
  };
  useEffect(() => {
    api("/companies").then(setCompanies).catch(() => {});
  }, []);

  if (loading) return <div className="text-muted text-[13px] py-8 text-center">Loading…</div>;
  if (!data) return <div className="text-muted text-[13px] py-8 text-center">Client not found.</div>;

  const { client, kpis, invoices, products } = data;

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => navigate("/invoicing/clients")}
          className="flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to clients
        </button>
        <div className="flex gap-2">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-md font-semibold text-[12.5px] hover:bg-[#1B7FD6]"
            >
              <Plus size={15} /> New Document <ChevronDown size={13} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-white border border-line rounded-md shadow-lg z-30 py-1">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(`/invoicing/invoices/new?type=sales`);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-ink hover:bg-hover"
                >
                  <FileText size={14} className="text-primary" /> Sales Invoice
                </button>
                <button
                  onClick={() => {
                    setDocKind("receipt");
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-ink hover:bg-hover"
                >
                  <IndianRupee size={14} className="text-positive" /> Payment Received
                </button>
                <button
                  onClick={() => {
                    setDocKind("return");
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-ink hover:bg-hover"
                >
                  <Undo2 size={14} className="text-amazon-text" /> Sales Return
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-hover text-ink rounded-md font-medium text-[12.5px] hover:opacity-90"
          >
            <Pencil size={15} /> Edit
          </button>
        </div>
      </div>

      {docKind && (
        <div className="bg-white border border-primary/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[13.5px] font-semibold text-ink">
              New {docKind === "receipt" ? "Payment Received" : "Sales Return"} · {client.name}
            </div>
            <button onClick={() => setDocKind(null)} className="text-muted hover:text-ink p-1">
              <X size={16} />
            </button>
          </div>

          {clientCompanies.length > 1 && (
            <div className="max-w-xs">
              <div className="text-[12px] font-semibold text-ink mb-1">For company</div>
              <select
                value={docCompanyId}
                onChange={(e) => setDocCompanyId(e.target.value)}
                className="w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white"
              >
                {clientCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {docKind === "receipt" && (
            <ReceiveForm
              lockClientId={Number(id)}
              lockCompanyId={docCompanyId ? Number(docCompanyId) : undefined}
              onDone={(r) => {
                setCreated((c) => [
                  {
                    label: `Receipt ${r.number}`,
                    href: `${API_BASE}/clients/${id}/receipts/${r.id}/pdf?token=${token}`,
                  },
                  ...c,
                ]);
                load();
              }}
            />
          )}
          {docKind === "return" && (
            <ReturnForm
              lockClientId={Number(id)}
              lockCompanyId={docCompanyId ? Number(docCompanyId) : undefined}
              onDone={(r) => {
                setCreated((c) => [
                  { label: `Return ${r.number}`, href: `${API_BASE}/returns/${r.id}/pdf?token=${token}` },
                  ...c,
                ]);
                load();
              }}
            />
          )}

          {created.length > 0 && (
            <div className="text-[11.5px] text-muted border-t border-line pt-2">
              Created this session:{" "}
              {created.map((c, i) => (
                <span key={i}>
                  {i > 0 && " · "}
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {c.label}
                  </a>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* header card */}
      <div className="bg-white rounded-lg border border-line p-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <Contact size={22} />
          </div>
          <div>
            <div className="text-[1.15rem] font-bold text-ink">{client.name}</div>
            <div className="text-[12.5px] text-muted mt-0.5 whitespace-pre-line leading-relaxed">
              {[
                client.address,
                [client.phone, client.email].filter(Boolean).join("  •  "),
                client.gstin ? `GSTIN: ${client.gstin}` : "",
              ]
                .filter(Boolean)
                .join("\n") || "No contact details"}
            </div>
            {(kpis.first_invoice || kpis.last_invoice) && (
              <div className="text-[11.5px] text-muted mt-1.5">
                {kpis.first_invoice && `First invoice ${formatDate(kpis.first_invoice)}`}
                {kpis.first_invoice && kpis.last_invoice && " · "}
                {kpis.last_invoice && `Latest ${formatDate(kpis.last_invoice)}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Total Invoiced" value={formatINR(kpis.total_invoiced)} />
        <Kpi label="Total Received" value={formatINR(kpis.total_paid)} tone="positive" />
        <Kpi
          label="Outstanding"
          value={formatINR(kpis.outstanding)}
          tone={kpis.outstanding > 0 ? "negative" : "positive"}
        />
        <Kpi
          label="Invoices"
          value={`${kpis.invoice_count}${kpis.unpaid_count ? ` · ${kpis.unpaid_count} unpaid` : ""}`}
        />
      </div>

      {/* invoices */}
      <div className="bg-white rounded-lg border border-line overflow-hidden">
        <div className="px-4 py-3 border-b border-line text-[13.5px] font-semibold text-ink">
          Invoices ({invoices.length})
        </div>
        {invoices.length === 0 ? (
          <div className="p-6 text-center text-muted text-[13px]">No invoices for this client yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="text-[12px] font-semibold text-muted">
                  <th className="px-4 py-2 border-b border-line">Date</th>
                  <th className="px-4 py-2 border-b border-line">Number</th>
                  <th className="px-4 py-2 border-b border-line">Company</th>
                  <th className="px-4 py-2 border-b border-line">Status</th>
                  <th className="px-4 py-2 border-b border-line text-right">Total</th>
                  <th className="px-4 py-2 border-b border-line text-right">Paid</th>
                  <th className="px-4 py-2 border-b border-line text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoicing/invoices/${inv.id}`)}
                    className="hover:bg-hover transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5 border-b border-line whitespace-nowrap text-ink">
                      {formatDate(inv.invoice_date)}
                    </td>
                    <td className="px-4 py-2.5 border-b border-line text-muted">
                      {inv.number || `#${inv.id}`}
                    </td>
                    <td className="px-4 py-2.5 border-b border-line text-muted">
                      {inv.company_name || "—"}
                    </td>
                    <td className="px-4 py-2.5 border-b border-line">
                      <span
                        className={`px-2 py-0.5 rounded-xl text-[11px] font-semibold ${
                          STATUS_STYLE[inv.payment_status]
                        }`}
                      >
                        {STATUS_LABEL[inv.payment_status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 border-b border-line text-right tabular-nums text-ink">
                      {formatINR(inv.total)}
                    </td>
                    <td className="px-4 py-2.5 border-b border-line text-right tabular-nums text-positive">
                      {Number(inv.amount_paid) > 0 ? formatINR(inv.amount_paid) : "—"}
                    </td>
                    <td className="px-4 py-2.5 border-b border-line text-right tabular-nums text-negative">
                      {Number(inv.balance) > 0 ? formatINR(inv.balance) : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold text-ink bg-hover/40">
                  <td className="px-4 py-2.5" colSpan={4}>
                    Total
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatINR(kpis.total_invoiced)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-positive">
                    {formatINR(kpis.total_paid)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-negative">
                    {formatINR(kpis.outstanding)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* statement / passbook */}
      <div className="bg-white rounded-lg border border-line overflow-hidden">
        <div className="px-4 py-3 border-b border-line flex items-center justify-between flex-wrap gap-2">
          <span className="text-[13.5px] font-semibold text-ink">Account Statement</span>
          <div className="flex items-end gap-2 flex-wrap">
            <div>
              <div className="text-[10.5px] font-semibold text-muted mb-0.5">From</div>
              <div className="w-[122px]">
                <DateField value={from} onChange={setFrom} />
              </div>
            </div>
            <div>
              <div className="text-[10.5px] font-semibold text-muted mb-0.5">To</div>
              <div className="w-[122px]">
                <DateField value={to} onChange={setTo} />
              </div>
            </div>
            {(from || to) && (
              <button
                onClick={() => {
                  setFrom("");
                  setTo("");
                }}
                className="text-[11.5px] text-muted hover:text-ink pb-2"
              >
                Clear
              </button>
            )}
            <a
              href={stmtPdfUrl()}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-soft text-primary rounded-md font-medium text-[12px] hover:opacity-90"
            >
              <Download size={14} /> Statement PDF
            </a>
          </div>
        </div>
        {!stmt || (stmt.rows.length === 0 && stmt.opening_balance === 0) ? (
          <div className="p-6 text-center text-muted text-[13px]">No transactions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <p className="px-4 pt-2 text-[11px] text-muted">
              <span className="font-semibold">Billed (+)</span> = invoices raised ·{" "}
              <span className="font-semibold">Received / Returned (−)</span> = payments and credit
              notes
            </p>
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="text-[12px] font-semibold text-muted">
                  <th className="px-4 py-2 border-b border-line">Date</th>
                  <th className="px-4 py-2 border-b border-line">Particulars</th>
                  <th className="px-4 py-2 border-b border-line">Ref</th>
                  <th className="px-4 py-2 border-b border-line text-right">Billed (+)</th>
                  <th className="px-4 py-2 border-b border-line text-right">
                    Received / Returned (−)
                  </th>
                  <th className="px-4 py-2 border-b border-line text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-muted italic">
                  <td className="px-4 py-2 border-b border-line" colSpan={5}>
                    Opening Balance
                  </td>
                  <td className="px-4 py-2 border-b border-line text-right tabular-nums">
                    {formatINR(stmt.opening_balance)}
                  </td>
                </tr>
                {stmt.rows.map((r, i) => {
                  const open = () => {
                    if (r.source_type === "invoice" && r.source_id)
                      navigate(`/invoicing/invoices/${r.source_id}`);
                    else if (r.source_type === "sales_return" && r.source_id)
                      navigate(`/invoicing/returns/${r.source_id}`);
                    else if (r.source_type === "receipt") {
                      const rc = receipts.find((x) => x.number === r.ref);
                      if (rc) navigate(`/invoicing/clients/${id}/receipts/${rc.id}`);
                    }
                  };
                  return (
                    <FragmentRows key={i}>
                      <tr
                        onClick={open}
                        className="cursor-pointer hover:bg-hover transition-colors"
                      >
                        <td className="px-4 py-2.5 border-b border-line whitespace-nowrap text-ink">
                          {formatDate(r.date)}
                        </td>
                        <td className="px-4 py-2.5 border-b border-line text-ink">
                          {r.kind_label || r.particulars}
                          {r.children && r.children.length > 0 && (
                            <span className="text-[11px] text-muted ml-1.5">
                              + {r.children.map((c) => c.kind_label).join(" + ")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 border-b border-line text-muted whitespace-nowrap">
                          {r.ref}
                        </td>
                        <td className="px-4 py-2.5 border-b border-line text-right tabular-nums">
                          {r.debit ? formatINR(r.debit) : "—"}
                        </td>
                        <td className="px-4 py-2.5 border-b border-line text-right tabular-nums text-positive">
                          {r.credit ? formatINR(r.credit) : "—"}
                        </td>
                        <td
                          className={`px-4 py-2.5 border-b border-line text-right tabular-nums font-medium ${
                            r.balance > 0 ? "text-negative" : "text-ink"
                          }`}
                        >
                          {formatINR(r.balance)}
                        </td>
                      </tr>
                      {r.children?.map((c, j) => (
                        <tr key={`${i}-${j}`} className="text-[12px] text-muted bg-hover/20">
                          <td className="px-4 py-1.5 border-b border-line"></td>
                          <td className="px-4 py-1.5 border-b border-line pl-8">↳ {c.kind_label}</td>
                          <td className="px-4 py-1.5 border-b border-line">{c.ref}</td>
                          <td className="px-4 py-1.5 border-b border-line text-right tabular-nums">
                            {c.debit ? formatINR(c.debit) : ""}
                          </td>
                          <td className="px-4 py-1.5 border-b border-line text-right tabular-nums text-positive">
                            {c.credit ? formatINR(c.credit) : ""}
                          </td>
                          <td className="px-4 py-1.5 border-b border-line"></td>
                        </tr>
                      ))}
                    </FragmentRows>
                  );
                })}
                <tr className="font-bold text-ink bg-hover/40">
                  <td className="px-4 py-2.5" colSpan={3}>
                    Total
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatINR(stmt.totals.debit)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-positive">
                    {formatINR(stmt.totals.credit)}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right tabular-nums ${
                      stmt.closing_balance > 0 ? "text-negative" : "text-positive"
                    }`}
                  >
                    {formatINR(stmt.closing_balance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {stmt && (
          <div className="px-4 py-2.5 border-t border-line flex justify-between text-[12.5px] bg-hover/30">
            <span className="text-muted">Closing Balance (amount due)</span>
            <span
              className={`font-bold tabular-nums ${
                stmt.closing_balance > 0 ? "text-negative" : "text-positive"
              }`}
            >
              {formatINR(stmt.closing_balance)}
            </span>
          </div>
        )}
      </div>

      {/* products bought */}
      <div className="bg-white rounded-lg border border-line overflow-hidden">
        <div className="px-4 py-3 border-b border-line text-[13.5px] font-semibold text-ink">
          Products purchased ({products.length})
        </div>
        {products.length === 0 ? (
          <div className="p-6 text-center text-muted text-[13px]">Nothing billed yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="text-[12px] font-semibold text-muted">
                  <th className="px-4 py-2 border-b border-line">Item</th>
                  <th className="px-4 py-2 border-b border-line text-right">Qty</th>
                  <th className="px-4 py-2 border-b border-line text-right">Value</th>
                  <th className="px-4 py-2 border-b border-line text-right">Times billed</th>
                  <th className="px-4 py-2 border-b border-line">Last bought</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.description} className="hover:bg-hover transition-colors">
                    <td className="px-4 py-2.5 border-b border-line text-ink">{p.description}</td>
                    <td className="px-4 py-2.5 border-b border-line text-right tabular-nums">
                      {Number(p.qty).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-2.5 border-b border-line text-right tabular-nums">
                      {formatINR(p.value)}
                    </td>
                    <td className="px-4 py-2.5 border-b border-line text-right tabular-nums text-muted">
                      {p.invoice_count}
                    </td>
                    <td className="px-4 py-2.5 border-b border-line text-muted whitespace-nowrap">
                      {p.last_bought ? formatDate(p.last_bought) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editOpen && (
        <ClientModal
          initialId={client.id}
          companies={companies}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            load();
          }}
        />
      )}

    </div>
  );
}
