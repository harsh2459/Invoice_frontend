import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { formatINR } from "../../format";
import { CompanyFilter, YearMonthPicker, KpiCard, PageHeader } from "./shared";

const PLAT_COLOR: Record<string, string> = {
  amazon_igst: "#B87300",
  flipkart_tax: "#2059C4",
  meesho_tax: "#9F2B68",
};
const PLAT_LABEL: Record<string, string> = {
  amazon_igst: "Amazon",
  flipkart_tax: "Flipkart",
  meesho_tax: "Meesho",
};

type Summary = {
  revenue: { total: number };
  platform_fees: { taxable: number; gst: number; total: number };
  gross_profit: number;
  expenses: { salary: number; logistics: number; interest: number; other: number; total: number };
  ebitda: number;
  net_profit: number;
  net_margin: number;
};
type Gst = {
  gst_collected: { amazon_igst: number; flipkart_tax: number; meesho_tax: number; total: number };
  itc: { igst: number; cgst: number; sgst: number; total: number };
  net_gst_payable: number;
  note: string;
};

export default function TaxDashboard() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [company, setCompany] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [gst, setGst] = useState<Gst | null>(null);

  useEffect(() => {
    const p = new URLSearchParams();
    if (year) p.set("year", year);
    if (month) p.set("month", month);
    if (company) p.set("company_id", company);
    Promise.all([api(`/collator/pnl/summary?${p}`), api(`/collator/pnl/gst-summary?${p}`)])
      .then(([s, g]) => {
        setSummary(s);
        setGst(g);
      })
      .catch((e) => toast(e.message));
  }, [year, month, company]);

  const netPayable = gst?.net_gst_payable ?? 0;
  const collectedRows = gst
    ? (["amazon_igst", "flipkart_tax", "meesho_tax"] as const).map((k) => ({
        key: k,
        value: gst.gst_collected[k],
      }))
    : [];
  const maxCollected = Math.max(1, ...collectedRows.map((r) => r.value));

  const waterfall: { label: string; value: number; strong?: boolean; sub?: boolean }[] = summary
    ? [
        { label: "Total Revenue", value: summary.revenue.total, strong: true },
        { label: "− Platform Fees", value: -summary.platform_fees.taxable, sub: true },
        { label: "Gross Profit", value: summary.gross_profit, strong: true },
        { label: "− Salary", value: -summary.expenses.salary, sub: true },
        { label: "− Logistics", value: -summary.expenses.logistics, sub: true },
        { label: "− Other", value: -summary.expenses.other, sub: true },
        { label: "EBITDA", value: summary.ebitda, strong: true },
        { label: "− Interest", value: -summary.expenses.interest, sub: true },
        { label: "Net Profit", value: summary.net_profit, strong: true },
      ]
    : [];

  return (
    <div className="space-y-5">
      <PageHeader title="Tax & GST" icon={<Receipt size={20} className="text-primary" />}>
        <YearMonthPicker year={year} month={month} onYear={setYear} onMonth={setMonth} />
        <CompanyFilter value={company} onChange={setCompany} />
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Revenue" value={summary?.revenue.total ?? 0} tone="primary" />
        <KpiCard label="GST Collected" value={gst?.gst_collected.total ?? 0} tone="muted" />
        <KpiCard
          label="Net GST Payable"
          value={netPayable}
          tone={netPayable >= 0 ? "negative" : "positive"}
          sub={netPayable >= 0 ? "payable to GST" : "excess ITC"}
        />
        <KpiCard
          label="Net Revenue After Tax"
          value={(summary?.revenue.total ?? 0) - netPayable}
          tone="positive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* GST collected by platform */}
        <div className="bg-white rounded-lg border border-line overflow-hidden">
          <div className="px-4 py-3 border-b border-line text-[13px] font-semibold text-ink">
            GST Collected by Platform
          </div>
          <table className="w-full text-left border-collapse text-[13px]">
            <tbody>
              {collectedRows.map((r) => {
                const pct = gst?.gst_collected.total
                  ? Math.round((r.value / gst.gst_collected.total) * 100)
                  : 0;
                return (
                  <tr key={r.key} className="border-b border-line/60">
                    <td className="px-4 py-2.5" style={{ color: PLAT_COLOR[r.key] }}>
                      <span className="font-medium">{PLAT_LABEL[r.key]}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums w-24">{formatINR(r.value)}</span>
                        <div className="flex-1 h-1.5 bg-hover rounded-full">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(r.value / maxCollected) * 100}%`,
                              background: PLAT_COLOR[r.key],
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted">{pct}%</td>
                  </tr>
                );
              })}
              <tr className="font-bold text-ink bg-hover">
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 tabular-nums">
                  {formatINR(gst?.gst_collected.total ?? 0)}
                </td>
                <td className="px-4 py-2.5 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ITC + net payable */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-line p-4">
            <div className="text-[13px] font-semibold text-ink mb-2">Input Tax Credit (ITC)</div>
            <div className="text-[12.5px] space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">IGST</span>
                <span className="tabular-nums">{formatINR(gst?.itc.igst ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">CGST</span>
                <span className="tabular-nums">{formatINR(gst?.itc.cgst ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">SGST</span>
                <span className="tabular-nums">{formatINR(gst?.itc.sgst ?? 0)}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-1 font-bold text-ink">
                <span>Total ITC</span>
                <span className="tabular-nums">{formatINR(gst?.itc.total ?? 0)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-line p-4">
            <div className="text-[13px] font-semibold text-ink mb-2">Net GST Payable</div>
            <div className="text-[12.5px] space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">GST Collected</span>
                <span className="tabular-nums">{formatINR(gst?.gst_collected.total ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">− ITC</span>
                <span className="tabular-nums">− {formatINR(gst?.itc.total ?? 0)}</span>
              </div>
              <div
                className={`flex justify-between border-t border-line pt-1 font-bold ${
                  netPayable >= 0 ? "text-negative" : "text-positive"
                }`}
              >
                <span>Net Payable</span>
                <span className="tabular-nums">{formatINR(netPayable)}</span>
              </div>
            </div>
            {gst?.note && <div className="text-[11px] text-muted mt-2">{gst.note}</div>}
          </div>
        </div>
      </div>

      {/* full P&L waterfall */}
      <div className="bg-white rounded-lg border border-line overflow-hidden">
        <div className="px-4 py-3 border-b border-line text-[13px] font-semibold text-ink">
          Revenue → Net Profit
        </div>
        <div className="divide-y divide-line/50">
          {waterfall.map((w) => (
            <div
              key={w.label}
              className={`flex justify-between px-4 py-2 text-[13px] ${
                w.strong ? "font-bold text-ink bg-hover" : w.sub ? "text-muted pl-8" : "text-ink"
              }`}
            >
              <span>{w.label}</span>
              <span className={`tabular-nums ${w.value < 0 ? "text-negative" : ""}`}>
                {formatINR(w.value)}
              </span>
            </div>
          ))}
          {summary && (
            <div className="flex justify-between px-4 py-2 text-[13px] text-muted">
              <span className="pl-8">Net Margin</span>
              <span className="tabular-nums">{summary.net_margin}%</span>
            </div>
          )}
        </div>
        <div className="px-4 py-2 text-[11px] text-muted border-t border-line">
          Platform fees come from imported fee invoices (Phase C); salary / logistics / interest come
          from bank-statement classification (Phase D). Until then they show ₹0.
        </div>
      </div>
    </div>
  );
}
