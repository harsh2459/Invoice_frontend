import { useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { formatINR } from "../../format";
import { CompanyFilter, YearMonthPicker, KpiCard, PageHeader } from "./shared";

const PLAT_COLOR: Record<string, string> = {
  amazon: "#B87300",
  flipkart: "#2059C4",
  meesho: "#9F2B68",
};

type PlatRev = { gross: number; returns: number; net: number; orders: number };
type Summary = {
  revenue: { amazon: PlatRev; flipkart: PlatRev; meesho: PlatRev; total: number };
};

export default function PnLPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [company, setCompany] = useState("");
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    const p = new URLSearchParams();
    if (year) p.set("year", year);
    if (month) p.set("month", month);
    if (company) p.set("company_id", company);
    api(`/collator/pnl/summary?${p}`)
      .then(setData)
      .catch((e) => toast(e.message));
  }, [year, month, company]);

  const rev = data?.revenue;
  const rows = useMemo(
    () =>
      rev
        ? (["amazon", "flipkart", "meesho"] as const).map((k) => ({ key: k, ...rev[k] }))
        : [],
    [rev]
  );
  const totalGross = rows.reduce((s, r) => s + r.gross, 0);
  const totalReturns = rows.reduce((s, r) => s + r.returns, 0);
  const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
  const maxNet = Math.max(1, ...rows.map((r) => r.net));

  return (
    <div className="space-y-5">
      <PageHeader title="Revenue by Platform" icon={<TrendingUp size={20} className="text-primary" />}>
        <YearMonthPicker year={year} month={month} onYear={setYear} onMonth={setMonth} />
        <CompanyFilter value={company} onChange={setCompany} />
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          label="Total Gross Sales"
          value={totalGross}
          sub={`${totalOrders.toLocaleString("en-IN")} orders`}
          tone="primary"
        />
        <KpiCard label="Total Returns" value={totalReturns} tone="negative" />
        <KpiCard label="Net Revenue" value={rev?.total ?? 0} tone="positive" />
      </div>

      <div className="bg-white rounded-lg border border-line overflow-hidden">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead>
            <tr className="text-[12px] font-semibold text-muted">
              <th className="px-3 py-2.5 border-b border-line">Platform</th>
              <th className="px-3 py-2.5 border-b border-line text-right">Gross Sales</th>
              <th className="px-3 py-2.5 border-b border-line text-right">Returns</th>
              <th className="px-3 py-2.5 border-b border-line">Net Revenue</th>
              <th className="px-3 py-2.5 border-b border-line text-right">Orders</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pct = rev?.total ? Math.round((r.net / rev.total) * 100) : 0;
              return (
                <tr key={r.key} className="hover:bg-hover transition-colors">
                  <td className="px-3 py-2.5 border-b border-line">
                    <span className="font-semibold" style={{ color: PLAT_COLOR[r.key] }}>
                      {r.key[0].toUpperCase() + r.key.slice(1)}
                    </span>
                    <span className="text-muted text-[11.5px] ml-2">{pct}% of sales</span>
                  </td>
                  <td className="px-3 py-2.5 border-b border-line text-right tabular-nums">
                    {formatINR(r.gross)}
                  </td>
                  <td className="px-3 py-2.5 border-b border-line text-right tabular-nums text-muted">
                    {formatINR(r.returns)}
                  </td>
                  <td className="px-3 py-2.5 border-b border-line">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums w-24">{formatINR(r.net)}</span>
                      <div className="flex-1 h-1.5 bg-hover rounded-full">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(r.net / maxNet) * 100}%`, background: PLAT_COLOR[r.key] }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 border-b border-line text-right tabular-nums">
                    {r.orders.toLocaleString("en-IN")}
                  </td>
                </tr>
              );
            })}
            <tr className="font-bold text-ink bg-hover">
              <td className="px-3 py-2.5">Total</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{formatINR(totalGross)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{formatINR(totalReturns)}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatINR(rev?.total ?? 0)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {totalOrders.toLocaleString("en-IN")}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg border border-line p-4">
        <div className="text-[13px] font-semibold text-ink mb-3">Net Revenue Share</div>
        <div className="space-y-2">
          {rows.map((r) => {
            const pct = rev?.total ? (r.net / rev.total) * 100 : 0;
            return (
              <div key={r.key}>
                <div className="flex justify-between text-[12px]">
                  <span style={{ color: PLAT_COLOR[r.key] }} className="font-medium">
                    {r.key[0].toUpperCase() + r.key.slice(1)}
                  </span>
                  <span className="tabular-nums text-muted">{Math.round(pct)}%</span>
                </div>
                <div className="h-2 bg-hover rounded-full mt-0.5">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: PLAT_COLOR[r.key] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
