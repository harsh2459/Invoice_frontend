import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Contact } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { formatDate, formatINR } from "../../format";
import { ClientModal } from "./modals";

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

  const load = () => {
    setLoading(true);
    api(`/clients/${id}/summary`)
      .then(setData)
      .catch((e) => toast(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);
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
        <button
          onClick={() => setEditOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-hover text-ink rounded-md font-medium text-[12.5px] hover:opacity-90"
        >
          <Pencil size={15} /> Edit
        </button>
      </div>

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
