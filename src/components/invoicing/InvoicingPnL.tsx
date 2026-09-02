import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { TrendingUp, ArrowLeft, ChevronRight } from "lucide-react";
import { api } from "../../api";
import { API_BASE } from "../../config";
import { toast } from "../../toast";
import { formatINR, formatDate } from "../../format";
import DateField from "../DateField";

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);
const num = (n: unknown) => Number(n || 0).toLocaleString("en-IN");

const TABS = [
  ["summary", "Summary"],
  ["by-product", "By Product"],
  ["by-client", "By Client"],
] as const;

export default function InvoicingPnL() {
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get("tab") as (typeof TABS)[number][0]) || "summary";
  const drillProduct = sp.get("product");
  const drillClient = sp.get("client");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState("");

  useEffect(() => {
    api("/companies").then(setCompanies).catch(() => {});
  }, []);

  const qs = () => {
    const p = new URLSearchParams({ from, to });
    if (companyId) p.set("company_id", companyId);
    return p;
  };
  const deps = [from, to, companyId];

  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) v == null ? next.delete(k) : next.set(k, v);
    setSp(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-[1.3rem] font-bold text-ink flex items-center gap-2">
        <TrendingUp size={20} className="text-primary" /> Profit &amp; Loss
      </h1>

      <div className="bg-white border border-line rounded-lg p-3 flex flex-wrap items-end gap-3">
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
          <div className="text-[11.5px] font-semibold text-muted mb-1">Company</div>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="px-2.5 py-1.5 border border-line rounded-md text-[12.5px] bg-white"
          >
            <option value="">All companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!drillProduct && !drillClient && (
        <div className="flex flex-wrap gap-1 border-b border-line">
          {TABS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => go({ tab: k, product: null, client: null })}
              className={`px-3.5 py-2 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${
                tab === k
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {drillProduct ? (
        <ProductDetail
          name={drillProduct}
          qs={qs}
          deps={[...deps, drillProduct]}
          onBack={() => go({ product: null })}
        />
      ) : drillClient ? (
        <ClientDetail
          id={drillClient}
          qs={qs}
          deps={[...deps, drillClient]}
          onBack={() => go({ client: null })}
        />
      ) : tab === "summary" ? (
        <Summary qs={qs} deps={deps} />
      ) : tab === "by-product" ? (
        <ByProduct qs={qs} deps={deps} onOpen={(name) => go({ product: name })} />
      ) : (
        <ByClient qs={qs} deps={deps} onOpen={(id) => go({ client: id })} />
      )}
    </div>
  );
}

function useEndpoint<T>(path: string, deps: any[]): T | null {
  const [d, setD] = useState<T | null>(null);
  useEffect(() => {
    setD(null);
    api(path)
      .then(setD)
      .catch((e) => toast(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return d;
}
const Loading = () => <div className="text-muted text-[13px] py-8 text-center">Loading…</div>;

// ============ Summary ============
function Summary({ qs, deps }: { qs: () => URLSearchParams; deps: any[] }) {
  const d = useEndpoint<any>(`/pnl/summary?${qs()}`, deps);
  if (!d) return <Loading />;
  const L = ({ label, value, strong }: { label: string; value: number; strong?: boolean }) => (
    <div
      className={`flex justify-between py-1.5 ${
        strong ? "font-bold text-ink border-t border-line mt-1 pt-2" : "text-muted"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{formatINR(value)}</span>
    </div>
  );
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Net Sales" value={formatINR(d.net_sales)} />
        <Kpi
          label="Gross Profit"
          value={formatINR(d.gross_profit)}
          tone={d.gross_profit >= 0 ? "pos" : "neg"}
        />
        <Kpi label="Gross Margin" value={`${d.gross_margin_pct}%`} />
        <Kpi label="Net GST Payable" value={formatINR(d.net_gst_payable)} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-line rounded-lg p-5">
          <div className="text-[13.5px] font-semibold text-negative mb-2">Expenses / Spend</div>
          <L label={`Purchases (${d.spend.purchase_count} bills, ex-GST)`} value={d.spend.purchases_ex_gst} />
          <L label={`Sales Returns (${d.spend.returns_count})`} value={d.spend.returns_ex_gst} />
          <L label="Cost of Goods Sold" value={d.spend.cogs} />
          <L label="GST Input (on purchases)" value={d.spend.gst_input} />
          <L label="Total Spend (ex-GST)" value={d.spend.purchases_ex_gst + d.spend.returns_ex_gst} strong />
        </div>
        <div className="bg-white border border-line rounded-lg p-5">
          <div className="text-[13.5px] font-semibold text-positive mb-2">Income / Sales</div>
          <L label={`Sales Invoices (${d.income.sales_count}, ex-GST)`} value={d.income.sales_ex_gst} />
          <L label="GST Output (collected)" value={d.income.gst_output} />
          <L label="Total Billed (incl. GST)" value={d.income.sales_gross} />
          <L label="Payments Received" value={d.payments_received} />
          <L label="Net Sales (after returns)" value={d.net_sales} strong />
        </div>
      </div>
      <div className="bg-white border border-line rounded-lg p-5 text-[13px]">
        <div className="text-[13.5px] font-semibold text-ink mb-2">Trading Result</div>
        <L label="Net Sales" value={d.net_sales} />
        <L label="Less: Cost of Goods Sold" value={-d.spend.cogs} />
        <div
          className={`flex justify-between font-bold text-[15px] border-t border-line mt-1 pt-2 ${
            d.gross_profit >= 0 ? "text-positive" : "text-negative"
          }`}
        >
          <span>Gross Profit</span>
          <span className="tabular-nums">{formatINR(d.gross_profit)}</span>
        </div>
        <p className="text-[11px] text-muted mt-3">
          COGS uses each product's Cost Price (Products page). Purchases come from the Purchases
          module. Operating expenses aren't tracked here.
        </p>
      </div>
    </>
  );
}

// ============ two-column split row ============
function SplitRow({
  title,
  sub,
  left,
  right,
  onClick,
}: {
  title: string;
  sub?: string;
  left: [string, string][];
  right: [string, string][];
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-line rounded-lg p-3.5 hover:border-primary transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="font-semibold text-ink text-[13.5px]">{title}</span>
          {sub && <span className="text-[11.5px] text-muted ml-2">{sub}</span>}
        </div>
        <ChevronRight size={16} className="text-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4 text-[12.5px]">
        <div className="border-r border-line pr-4">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-negative mb-1">
            Out — Bought / Returned
          </div>
          {left.map(([k, v]) => (
            <div key={k} className="flex justify-between py-0.5">
              <span className="text-muted">{k}</span>
              <span className="tabular-nums">{v}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-positive mb-1">
            In — Sold
          </div>
          {right.map(([k, v]) => (
            <div key={k} className="flex justify-between py-0.5">
              <span className="text-muted">{k}</span>
              <span className="tabular-nums">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}

// ============ By Product ============
function ByProduct({
  qs,
  deps,
  onOpen,
}: {
  qs: () => URLSearchParams;
  deps: any[];
  onOpen: (name: string) => void;
}) {
  const d = useEndpoint<any>(`/pnl/by-product?${qs()}`, deps);
  if (!d) return <Loading />;
  if (d.rows.length === 0)
    return (
      <div className="bg-white border border-line rounded-lg p-8 text-center text-muted text-[13px]">
        No sales or purchases in this range.
      </div>
    );
  return (
    <div className="space-y-2">
      {d.rows.map((r: any) => (
        <SplitRow
          key={r.name}
          title={r.name}
          sub={`profit ${formatINR(r.profit)} · ${r.margin_pct}% margin`}
          onClick={() => onOpen(r.name)}
          left={[
            ["Bought qty", r.qty_bought ? num(r.qty_bought) : "—"],
            ["Bought ₹", r.purchase_spend ? formatINR(r.purchase_spend) : "—"],
            ["Returned qty", r.qty_returned ? num(r.qty_returned) : "—"],
            ["Returned ₹", r.return_value ? formatINR(r.return_value) : "—"],
          ]}
          right={[
            ["Sold qty", num(r.qty_sold)],
            ["Revenue", formatINR(r.revenue)],
            ["Net revenue", formatINR(r.net_revenue)],
            ["COGS", formatINR(r.cogs)],
          ]}
        />
      ))}
    </div>
  );
}

// ============ By Client ============
function ByClient({
  qs,
  deps,
  onOpen,
}: {
  qs: () => URLSearchParams;
  deps: any[];
  onOpen: (id: string) => void;
}) {
  const d = useEndpoint<any>(`/pnl/by-client?${qs()}`, deps);
  if (!d) return <Loading />;
  if (d.rows.length === 0)
    return (
      <div className="bg-white border border-line rounded-lg p-8 text-center text-muted text-[13px]">
        No client sales in this range.
      </div>
    );
  return (
    <div className="space-y-2">
      {d.rows.map((r: any) => (
        <SplitRow
          key={r.client_id}
          title={r.name}
          sub={`profit ${formatINR(r.profit)} · ${r.margin_pct}% margin`}
          onClick={() => onOpen(String(r.client_id))}
          left={[
            ["Returns ₹", r.returns_gross ? formatINR(r.returns_gross) : "—"],
            ["Return count", r.return_count ? num(r.return_count) : "—"],
            ["Payments received", formatINR(r.received)],
            ["COGS", formatINR(r.cogs)],
          ]}
          right={[
            ["Invoices", num(r.invoice_count)],
            ["Billed", formatINR(r.billed_gross)],
            ["Net revenue", formatINR(r.net_revenue)],
            ["Profit", formatINR(r.profit)],
          ]}
        />
      ))}
    </div>
  );
}

// ============ Product drill-down ============
function ProductDetail({
  name,
  qs,
  deps,
  onBack,
}: {
  name: string;
  qs: () => URLSearchParams;
  deps: any[];
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const p = qs();
  p.set("name", name);
  const d = useEndpoint<any>(`/pnl/product?${p}`, deps);
  if (!d) return <Loading />;
  const t = d.totals;
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"
      >
        <ArrowLeft size={14} /> Back to products
      </button>
      <h2 className="text-[1.1rem] font-bold text-ink">{name}</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Sold" value={`${num(t.sold.qty)} · ${formatINR(t.sold.value)}`} />
        <Kpi
          label="Returned"
          value={t.returned.qty ? `${num(t.returned.qty)} · ${formatINR(t.returned.value)}` : "—"}
        />
        <Kpi
          label="Bought"
          value={t.bought.qty ? `${num(t.bought.qty)} · ${formatINR(t.bought.value)}` : "—"}
        />
        <Kpi label="Profit" value={formatINR(t.profit)} tone={t.profit >= 0 ? "pos" : "neg"} />
      </div>

      <Section title={`Buyers (${d.buyers.length}) — click to open their P&L`}>
        <SimpleTable
          head={["Client", "Qty", "Revenue", "COGS", "Profit", "Invoices"]}
          rightFrom={1}
          onRowClick={(i) => {
            const cid = d.buyers[i].client_id;
            if (cid) navigate(`/invoicing/pnl?tab=by-client&client=${cid}`);
          }}
          rows={d.buyers.map((b: any) => [
            b.client_name,
            num(b.qty),
            formatINR(b.revenue),
            formatINR(b.cogs),
            <span className={b.profit >= 0 ? "text-positive" : "text-negative"}>
              {formatINR(b.profit)}
            </span>,
            num(b.invoice_count),
          ])}
          empty="No buyers."
        />
      </Section>

      <Section title={`Sale lines (${d.sale_lines.length}) — click to open the invoice`}>
        <SimpleTable
          head={["Date", "Invoice", "Client", "Qty", "Rate", "Amount"]}
          rightFrom={3}
          onRowClick={(i) => navigate(`/invoicing/invoices/${d.sale_lines[i].invoice_id}`)}
          rows={d.sale_lines.map((l: any) => [
            formatDate(l.date),
            l.number || `#${l.invoice_id}`,
            l.client_name || "—",
            num(l.qty),
            formatINR(l.rate),
            formatINR(l.amount),
          ])}
          empty="No sales."
        />
      </Section>

      {d.return_lines.length > 0 && (
        <Section title={`Returns (${d.return_lines.length})`}>
          <SimpleTable
            head={["Date", "Return", "Client", "Reason", "Qty", "Amount"]}
            rightFrom={4}
            onRowClick={(i) => {
              const t = localStorage.getItem("token");
              window.open(
                `${API_BASE}/returns/${d.return_lines[i].return_id}/pdf?token=${t}`,
                "_blank"
              );
            }}
            rows={d.return_lines.map((l: any) => [
              formatDate(l.date),
              l.number,
              l.client_name || "—",
              String(l.reason).replace("_", " ") + (l.restock ? "" : " · not restocked"),
              num(l.qty),
              formatINR(l.amount),
            ])}
            empty=""
          />
        </Section>
      )}

      {d.purchase_lines.length > 0 && (
        <Section title={`Purchases (${d.purchase_lines.length})`}>
          <SimpleTable
            head={["Date", "Bill", "Supplier", "Qty", "Rate", "Amount"]}
            rightFrom={3}
            rows={d.purchase_lines.map((l: any) => [
              formatDate(l.date),
              l.number || `#${l.bill_id}`,
              l.supplier_name || "—",
              num(l.qty),
              formatINR(l.rate),
              formatINR(l.amount),
            ])}
            empty=""
          />
        </Section>
      )}
    </div>
  );
}

// ============ Client drill-down ============
function ClientDetail({
  id,
  qs,
  deps,
  onBack,
}: {
  id: string;
  qs: () => URLSearchParams;
  deps: any[];
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const d = useEndpoint<any>(`/pnl/client/${id}?${qs()}`, deps);
  if (!d) return <Loading />;
  const t = d.totals;
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"
      >
        <ArrowLeft size={14} /> Back to clients
      </button>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-[1.1rem] font-bold text-ink">{d.client.name}</h2>
        <button
          onClick={() => navigate(`/invoicing/clients/${id}`)}
          className="text-[12px] text-primary hover:underline"
        >
          Open full client page →
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Net Revenue" value={formatINR(t.net_revenue)} />
        <Kpi label="COGS" value={formatINR(t.cogs)} />
        <Kpi label="Profit" value={formatINR(t.profit)} tone={t.profit >= 0 ? "pos" : "neg"} />
        <Kpi label="Margin" value={`${t.margin_pct}%`} />
      </div>

      <Section title={`Invoices (${d.invoices.length}) — click to open`}>
        <SimpleTable
          head={["Date", "Number", "Total", "Paid", "Balance", "Profit"]}
          rightFrom={2}
          onRowClick={(idx) => navigate(`/invoicing/invoices/${d.invoices[idx].id}`)}
          rows={d.invoices.map((i: any) => [
            formatDate(i.date),
            i.number || `#${i.id}`,
            formatINR(i.total),
            Number(i.amount_paid) ? formatINR(i.amount_paid) : "—",
            Number(i.balance) > 0 ? (
              <span className="text-negative">{formatINR(i.balance)}</span>
            ) : (
              "—"
            ),
            <span className={i.profit >= 0 ? "text-positive" : "text-negative"}>
              {formatINR(i.profit)}
            </span>,
          ])}
          empty="No invoices."
        />
      </Section>

      {d.returns.length > 0 && (
        <Section title={`Returns (${d.returns.length})`}>
          <SimpleTable
            head={["Date", "Number", "Reason", "Total", "COGS back"]}
            rightFrom={3}
            onRowClick={(idx) => {
              const t = localStorage.getItem("token");
              window.open(`${API_BASE}/returns/${d.returns[idx].id}/pdf?token=${t}`, "_blank");
            }}
            rows={d.returns.map((r: any) => [
              formatDate(r.date),
              r.number,
              String(r.reason).replace("_", " ") + (r.restock ? "" : " · not restocked"),
              formatINR(r.total),
              formatINR(r.cogs),
            ])}
            empty=""
          />
        </Section>
      )}

      <Section title={`Products bought (${d.products.length})`}>
        <SimpleTable
          head={["Product", "Qty", "Revenue", "Returned", "Net Revenue", "COGS", "Profit"]}
          rightFrom={1}
          rows={d.products.map((p: any) => [
            p.name,
            num(p.qty),
            formatINR(p.revenue),
            p.returned_qty ? `${num(p.returned_qty)} · ${formatINR(p.returned_value)}` : "—",
            formatINR(p.net_revenue),
            formatINR(p.cogs),
            <span className={p.profit >= 0 ? "text-positive" : "text-negative"}>
              {formatINR(p.profit)}
            </span>,
          ])}
          empty="Nothing billed."
        />
      </Section>
    </div>
  );
}

// ============ shared ============
function Kpi({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="bg-white border border-line rounded-lg p-3.5">
      <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">{label}</div>
      <div
        className={`text-[1.15rem] font-bold mt-1 tabular-nums ${
          tone === "pos" ? "text-positive" : tone === "neg" ? "text-negative" : "text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-line rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-line text-[13px] font-semibold text-ink">
        {title}
      </div>
      {children}
    </div>
  );
}
function SimpleTable({
  head,
  rows,
  empty,
  rightFrom = 999,
  onRowClick,
}: {
  head: string[];
  rows: React.ReactNode[][];
  empty: string;
  rightFrom?: number;
  onRowClick?: (rowIndex: number) => void;
}) {
  if (rows.length === 0)
    return <div className="p-5 text-center text-muted text-[12.5px]">{empty || "Nothing here."}</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-[12.5px]">
        <thead>
          <tr className="text-[11.5px] font-semibold text-muted">
            {head.map((h, i) => (
              <th
                key={i}
                className={`px-3 py-2 border-b border-line ${i >= rightFrom ? "text-right" : ""}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              onClick={onRowClick ? () => onRowClick(i) : undefined}
              className={`hover:bg-hover ${onRowClick ? "cursor-pointer" : ""}`}
            >
              {r.map((c, j) => (
                <td
                  key={j}
                  className={`px-3 py-2 border-b border-line tabular-nums ${
                    j >= rightFrom ? "text-right" : "text-ink"
                  }`}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
