import { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../api";
import { formatDate } from "../format";
import DateField from "./DateField";

const PLATFORM_BADGE: Record<string, string> = {
  amazon: "bg-amazon text-amazon-text",
  flipkart: "bg-flipkart text-flipkart-text",
  meesho: "bg-meesho text-meesho-text",
};
const badgeClass = (p: string) => PLATFORM_BADGE[(p || "").toLowerCase()] || "bg-other text-other-text";

const fmt = (n: number) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const pad = (n: number) => String(n).padStart(2, "0");
const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type Period = "today" | "week" | "month" | "all" | "custom";

function getRange(period: Period, customStart: string, customEnd: string): [string, string] | null {
  const now = new Date();
  if (period === "today") {
    const t = toStr(now);
    return [t, t];
  }
  if (period === "week") {
    const day = now.getDay();
    const monOffset = day === 0 ? 6 : day - 1;
    const start = new Date(now);
    start.setDate(now.getDate() - monOffset);
    return [toStr(start), toStr(now)];
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return [toStr(start), toStr(now)];
  }
  if (period === "custom") {
    return [customStart || toStr(now), customEnd || toStr(now)];
  }
  return null; // all time
}

const PERIODS: [Period, string][] = [
  ["today", "Today"],
  ["week", "This Week"],
  ["month", "This Month"],
  ["all", "All Time"],
  ["custom", "Custom"],
];

export default function Dashboard() {
  const { user } = useOutletContext<{ user: any }>();
  const isAdmin = user.role === "admin";

  const [period, setPeriod] = useState<Period>("week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [summary, setSummary] = useState({
    sales: 0,
    payments: 0,
    expenses: 0,
    net: 0,
    invoiced: 0,
    invoiceOutstanding: 0,
  });
  const [byPlatform, setByPlatform] = useState<any[]>([]);
  const [byEmployee, setByEmployee] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const range = getRange(period, customStart, customEnd);
    const qs = range ? `?start=${range[0]}&end=${range[1]}` : "";
    Promise.all([
      api(`/reports/summary${qs}`),
      api(`/reports/by-platform${qs}`),
      isAdmin ? api(`/reports/by-employee${qs}`) : Promise.resolve([]),
      isAdmin ? api(`/reports/expenses${qs}`) : Promise.resolve([]),
    ])
      .then(([s, p, e, x]) => {
        setSummary(s);
        setByPlatform(p);
        setByEmployee(e);
        setExpenses(x);
      })
      .finally(() => setLoading(false));
  }, [period, customStart, customEnd, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const selectPeriod = (k: Period) => {
    if (k === "custom" && !customStart) {
      const t = toStr(new Date());
      setCustomStart(t);
      setCustomEnd(t);
    }
    setPeriod(k);
  };

  const card = "bg-white border border-line rounded-lg p-4";
  const cardTitle = "text-[13.5px] font-semibold text-ink mb-3.5";
  const empty = "text-muted text-[13px] py-5 text-center";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <h1 className="text-[1.3rem] font-bold text-ink">Dashboard</h1>
        <div className="flex gap-1.5 flex-wrap items-center">
          {PERIODS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => selectPeriod(k)}
              className={`text-[12px] font-semibold px-3 py-1.5 rounded-2xl border transition-colors ${
                period === k
                  ? "bg-primary border-primary text-white"
                  : "bg-white border-line text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
          {period === "custom" && (
            <span className="flex items-center gap-1.5">
              <div className="w-[130px]">
                <DateField value={customStart} onChange={setCustomStart} />
              </div>
              <span className="text-muted text-[12px]">to</span>
              <div className="w-[130px]">
                <DateField value={customEnd} onChange={setCustomEnd} />
              </div>
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-muted text-[13px] py-8 text-center">Loading…</div>
      ) : (
        <>
          <div className={`grid gap-3.5 ${isAdmin ? "sm:grid-cols-3" : "sm:grid-cols-1"}`}>
            <div className={card}>
              <div className="text-[12px] text-muted font-medium">Total Sales Logged</div>
              <div className="text-[1.35rem] font-bold mt-1.5">{fmt(summary.sales)}</div>
            </div>
            {isAdmin && (
              <>
                <div className={card}>
                  <div className="text-[12px] text-muted font-medium">Payments Received</div>
                  <div className="text-[1.35rem] font-bold mt-1.5 text-positive">
                    {fmt(summary.payments)}
                  </div>
                </div>
                <div className={card}>
                  <div className="text-[12px] text-muted font-medium">Total Expenses</div>
                  <div className="text-[1.35rem] font-bold mt-1.5 text-negative">
                    {fmt(summary.expenses)}
                  </div>
                </div>
              </>
            )}
          </div>

          {isAdmin && (
            <div className={card}>
              <div className={cardTitle}>Net (Payments − Expenses)</div>
              <div
                className={`text-[1.5rem] font-bold ${
                  summary.net < 0 ? "text-negative" : "text-positive"
                }`}
              >
                {summary.net < 0 ? "-" : ""}
                {fmt(Math.abs(summary.net))}
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className={card}>
                <div className="text-[12px] text-muted font-medium">Invoiced (this period)</div>
                <div className="text-[1.35rem] font-bold mt-1.5">{fmt(summary.invoiced)}</div>
              </div>
              <div className={card}>
                <div className="text-[12px] text-muted font-medium">Invoice Outstanding</div>
                <div className="text-[1.35rem] font-bold mt-1.5 text-negative">
                  {fmt(summary.invoiceOutstanding)}
                </div>
              </div>
            </div>
          )}

          <div className={card}>
            <div className={cardTitle}>Payments by Platform</div>
            {byPlatform.length === 0 ? (
              <div className={empty}>No payments for this period yet.</div>
            ) : (
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="text-[12px] font-semibold text-muted">
                    <th className="text-left py-2 border-b border-line">Platform</th>
                    <th className="text-right py-2 border-b border-line">Payments</th>
                  </tr>
                </thead>
                <tbody>
                  {byPlatform.map((r) => (
                    <tr key={r.platform} className="hover:bg-hover">
                      <td className="py-2 border-b border-line">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-xl text-[11.5px] font-semibold ${badgeClass(
                            r.platform
                          )}`}
                        >
                          {r.platform}
                        </span>
                      </td>
                      <td className="py-2 border-b border-line text-right tabular-nums">
                        {fmt(r.payments)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {isAdmin && (
            <div className={card}>
              <div className={cardTitle}>Breakdown by Employee</div>
              {byEmployee.length === 0 ? (
                <div className={empty}>No sales entries for this period yet.</div>
              ) : (
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="text-[12px] font-semibold text-muted">
                      <th className="text-left py-2 border-b border-line">Employee</th>
                      <th className="text-right py-2 border-b border-line">Entries</th>
                      <th className="text-right py-2 border-b border-line">Total Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byEmployee.map((r) => (
                      <tr key={r.employee_id} className="hover:bg-hover">
                        <td className="py-2 border-b border-line">{r.employee_name}</td>
                        <td className="py-2 border-b border-line text-right tabular-nums">
                          {r.count}
                        </td>
                        <td className="py-2 border-b border-line text-right tabular-nums">
                          {fmt(r.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {isAdmin && (
            <div className={card}>
              <div className={cardTitle}>Expenses This Period</div>
              {expenses.length === 0 ? (
                <div className={empty}>No expenses logged for this period.</div>
              ) : (
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="text-[12px] font-semibold text-muted">
                      <th className="text-left py-2 border-b border-line">Date</th>
                      <th className="text-left py-2 border-b border-line">Category</th>
                      <th className="text-left py-2 border-b border-line">Notes</th>
                      <th className="text-right py-2 border-b border-line">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-hover">
                        <td className="py-2 border-b border-line whitespace-nowrap">
                          {formatDate(e.date)}
                        </td>
                        <td className="py-2 border-b border-line">{e.category}</td>
                        <td className="py-2 border-b border-line text-muted">{e.notes || "-"}</td>
                        <td className="py-2 border-b border-line text-right tabular-nums">
                          {fmt(e.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
