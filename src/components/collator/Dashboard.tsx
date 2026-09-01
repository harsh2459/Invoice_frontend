import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { LayoutDashboard } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { formatINR } from "../../format";
import { CompanyFilter, YearMonthPicker, KpiCard, PageHeader } from "./shared";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PLAT_COLOR: Record<string, string> = {
  amazon: "#B87300",
  flipkart: "#2059C4",
  meesho: "#9F2B68",
};

type Summary = {
  total_gross: number;
  total_returns: number;
  net_revenue: number;
  platforms: Record<string, { gross: number; returns: number; orders: number }>;
};
type TrendPoint = { year: number; month: number; revenue: number };

export default function CollatorDashboard() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState("");
  const [company, setCompany] = useState("");

  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<Record<string, TrendPoint[]>>({});
  const [share, setShare] = useState<{ platform: string; gross: number; share: number }[]>([]);
  const [bank, setBank] = useState<any>(null);
  const [topPlat, setTopPlat] = useState<"amazon" | "flipkart" | "meesho">("amazon");
  const [topSkus, setTopSkus] = useState<{ sku: string; revenue: number }[]>([]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (year) p.set("year", year);
    if (month) p.set("month", month);
    if (company) p.set("company_id", company);
    Promise.all([
      api(`/collator/dashboard/summary?${p}`),
      api(`/collator/dashboard/monthly-trend?year=${year}`),
      api(`/collator/dashboard/platform-share?${p}`),
      api(`/collator/dashboard/bank-summary`),
    ])
      .then(([s, t, sh, b]) => {
        setSummary(s);
        setTrend(t);
        setShare(sh);
        setBank(b);
      })
      .catch((e) => toast(e.message));
  }, [year, month, company]);

  useEffect(() => {
    const p = new URLSearchParams({ platform: topPlat, limit: "8" });
    if (year) p.set("year", year);
    if (month) p.set("month", month);
    api(`/collator/dashboard/top-skus?${p}`)
      .then((r) => setTopSkus(r.map((x: any) => ({ sku: x.sku, revenue: Number(x.revenue) }))))
      .catch(() => setTopSkus([]));
  }, [topPlat, year, month]);

  const trendData = useMemo(() => {
    const byKey: Record<string, any> = {};
    for (const plat of ["amazon", "flipkart", "meesho"]) {
      for (const pt of trend[plat] || []) {
        const k = `${MONTHS[pt.month - 1]} ${String(pt.year).slice(2)}`;
        byKey[k] = byKey[k] || { name: k };
        byKey[k][plat] = Number(pt.revenue);
      }
    }
    return Object.values(byKey);
  }, [trend]);

  const maxTop = Math.max(1, ...topSkus.map((s) => s.revenue));
  const selCls =
    "px-2.5 py-1.5 border border-line rounded-md text-[12.5px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" icon={<LayoutDashboard size={20} className="text-primary" />}>
        <YearMonthPicker year={year} month={month} onYear={setYear} onMonth={setMonth} />
        <CompanyFilter value={company} onChange={setCompany} />
      </PageHeader>

      {/* overall */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard label="Gross Revenue" value={summary?.total_gross ?? 0} tone="primary" />
        <KpiCard label="Total Returns" value={summary?.total_returns ?? 0} tone="negative" />
        <KpiCard label="Net Revenue" value={summary?.net_revenue ?? 0} tone="positive" />
      </div>

      {/* per platform */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["amazon", "flipkart", "meesho"] as const).map((k) => {
          const p = summary?.platforms[k];
          const net = (p?.gross ?? 0) - (p?.returns ?? 0);
          return (
            <div key={k} className="bg-white rounded-lg border border-line p-4">
              <div
                className="text-[12px] font-bold uppercase tracking-wide"
                style={{ color: PLAT_COLOR[k] }}
              >
                {k}
              </div>
              <div className="text-[1.15rem] font-bold text-ink tabular-nums mt-1">
                {formatINR(net)}
              </div>
              <div className="text-[11.5px] text-muted mt-1 space-y-0.5">
                <div className="flex justify-between">
                  <span>Gross</span>
                  <span className="tabular-nums">{formatINR(p?.gross ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Returns</span>
                  <span className="tabular-nums">{formatINR(p?.returns ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Orders</span>
                  <span className="tabular-nums">{(p?.orders ?? 0).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-line p-4">
          <div className="text-[13px] font-semibold text-ink mb-3">Monthly Revenue Trend</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <Tooltip formatter={(v: any) => formatINR(v)} />
              <Line type="monotone" dataKey="amazon" stroke={PLAT_COLOR.amazon} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="flipkart" stroke={PLAT_COLOR.flipkart} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="meesho" stroke={PLAT_COLOR.meesho} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-line p-4">
          <div className="text-[13px] font-semibold text-ink mb-3">Platform Share (Gross)</div>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie
                  data={share}
                  dataKey="gross"
                  nameKey="platform"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {share.map((s) => (
                    <Cell key={s.platform} fill={PLAT_COLOR[s.platform.toLowerCase()] || "#8D99A6"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatINR(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5 text-[12px]">
              {share.map((s) => (
                <div key={s.platform} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: PLAT_COLOR[s.platform.toLowerCase()] || "#8D99A6" }}
                  />
                  <span className="flex-1 text-muted">{s.platform}</span>
                  <span className="font-semibold text-ink">{s.share}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-line p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-semibold text-ink">Top SKUs by Revenue</div>
            <select value={topPlat} onChange={(e) => setTopPlat(e.target.value as any)} className={selCls}>
              <option value="amazon">Amazon</option>
              <option value="flipkart">Flipkart</option>
              <option value="meesho">Meesho</option>
            </select>
          </div>
          {topSkus.length === 0 ? (
            <div className="text-[12.5px] text-muted py-4 text-center">No data.</div>
          ) : (
            <div className="space-y-2">
              {topSkus.map((s) => (
                <div key={s.sku}>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-ink truncate max-w-[60%]">{s.sku}</span>
                    <span className="tabular-nums text-muted">{formatINR(s.revenue)}</span>
                  </div>
                  <div className="h-1.5 bg-hover rounded-full mt-0.5">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(s.revenue / maxTop) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-line p-4">
          <div className="text-[13px] font-semibold text-ink mb-3">Bank Summary</div>
          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
            <div>
              <div className="text-muted">Total Credit</div>
              <div className="font-bold text-positive tabular-nums text-[1.05rem]">
                {formatINR(bank?.total_credit ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-muted">Total Debit</div>
              <div className="font-bold text-negative tabular-nums text-[1.05rem]">
                {formatINR(bank?.total_debit ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-muted">Net</div>
              <div className="font-bold text-ink tabular-nums text-[1.05rem]">
                {formatINR(bank?.net ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-muted">Transactions</div>
              <div className="font-bold text-ink tabular-nums text-[1.05rem]">
                {(bank?.transaction_count ?? 0).toLocaleString("en-IN")}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-muted mt-3">
            Bank data appears here once bank-statement import is enabled (later phase).
          </div>
        </div>
      </div>
    </div>
  );
}
