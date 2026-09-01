/**
 * Collator financial statements — Balance Sheet / P&L A/c / Trial Balance /
 * Day Book / Bank Book / Ratios / Compare / Exceptions / Cost Centres.
 * Tab state synced to ?tab=. Single-entry approximation from classified bank txns.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileBarChart } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { formatINR, formatDate } from "../../format";
import { CompanyFilter, PageHeader } from "./shared";

const TABS = [
  ["balance-sheet", "Balance Sheet"],
  ["pnl", "P&L A/c"],
  ["trial-balance", "Trial Balance"],
  ["day-book", "Day Book"],
  ["bank-book", "Bank Book"],
  ["ratios", "Ratios"],
  ["compare", "Compare"],
  ["exceptions", "Exceptions"],
  ["cost-centre", "Cost Centres"],
] as const;

const inputCls = "px-2.5 py-1.5 border border-line rounded-md text-[12.5px] bg-white";

export default function FinancialStatements() {
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get("tab") as (typeof TABS)[number][0]) || "balance-sheet";
  const [company, setCompany] = useState("");

  return (
    <div className="space-y-4">
      <PageHeader title="Financial Statements" icon={<FileBarChart size={20} className="text-primary" />}>
        <CompanyFilter value={company} onChange={setCompany} />
      </PageHeader>

      <div className="flex flex-wrap gap-1">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setSp({ tab: k }, { replace: true })}
            className={`px-3 py-1.5 rounded-md text-[12.5px] font-medium ${
              tab === k ? "bg-primary-soft text-primary" : "text-muted hover:bg-hover"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-line p-4">
        {tab === "balance-sheet" && <TwoColStatement endpoint="balance-sheet" company={company} keys={["assets", "liabilities"]} labels={["Assets", "Liabilities"]} totalKeys={["total_assets", "total_liabilities"]} />}
        {tab === "pnl" && <TwoColStatement endpoint="pnl" company={company} keys={["expense_groups", "income_groups"]} labels={["Expenses", "Incomes"]} extra={(d) => <PnlFooter d={d} />} />}
        {tab === "trial-balance" && <TrialBalance company={company} />}
        {tab === "day-book" && <DayBook company={company} />}
        {tab === "bank-book" && <BankBook company={company} />}
        {tab === "ratios" && <Ratios company={company} />}
        {tab === "compare" && <Compare company={company} />}
        {tab === "exceptions" && <Exceptions company={company} />}
        {tab === "cost-centre" && <CostCentre company={company} />}
      </div>
    </div>
  );
}

// ---- shared fetch hook ----
function useStmt<T = any>(path: string, deps: any[]): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    setData(null);
    api(path)
      .then(setData)
      .catch((e) => toast(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return data;
}

// ---- Balance Sheet / P&L (two-column group rollup) ----
function TwoColStatement({
  endpoint,
  company,
  keys,
  labels,
  totalKeys,
  extra,
}: {
  endpoint: string;
  company: string;
  keys: [string, string];
  labels: [string, string];
  totalKeys?: [string, string];
  extra?: (d: any) => React.ReactNode;
}) {
  const q = company ? `?company_id=${company}` : "";
  const d = useStmt(`/collator/ledger/${endpoint}${q}`, [endpoint, company]);
  if (!d) return <Loading />;
  const Col = ({ side }: { side: 0 | 1 }) => {
    const rows: any[] = d[keys[side]] || [];
    const total = totalKeys ? d[totalKeys[side]] : rows.reduce((s, r) => s + r.total, 0);
    return (
      <div>
        <div className="text-[13px] font-semibold text-ink mb-2">{labels[side]}</div>
        <table className="w-full text-[13px] border-collapse">
          <tbody>
            {rows.length === 0 && <tr><td className="py-2 text-muted text-[12.5px]">No categorized data.</td></tr>}
            {rows.map((r) => (
              <tr key={r.group_id} className="border-b border-line/50">
                <td className="py-1.5">{r.group_name} <span className="text-muted text-[11px]">({r.ledger_count})</span></td>
                <td className="py-1.5 text-right tabular-nums">{formatINR(r.total)}</td>
              </tr>
            ))}
            <tr className="font-bold text-ink border-t border-line">
              <td className="py-1.5">Total</td>
              <td className="py-1.5 text-right tabular-nums">{formatINR(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };
  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Col side={0} />
        <Col side={1} />
      </div>
      {extra?.(d)}
      {d.difference != null && (
        <div className={`mt-3 text-[12px] ${Math.abs(d.difference) < 0.01 ? "text-positive" : "text-amazon-text"}`}>
          {Math.abs(d.difference) < 0.01 ? "Balanced." : `Difference: ${formatINR(d.difference)}`}
        </div>
      )}
      {d.note && <div className="mt-1 text-[11px] text-muted">{d.note}</div>}
    </div>
  );
}
function PnlFooter({ d }: { d: any }) {
  return (
    <div className="mt-4 space-y-1 text-[13px] max-w-sm">
      <Row label="Gross Profit" value={d.gross_profit} strong />
      <Row label="+ Indirect Income" value={d.indirect_income} />
      <Row label="− Indirect Expense" value={-d.indirect_expense} />
      <Row label="Net Profit" value={d.net_profit} strong />
    </div>
  );
}
const Row = ({ label, value, strong }: { label: string; value: number; strong?: boolean }) => (
  <div className={`flex justify-between ${strong ? "font-bold text-ink border-t border-line pt-1" : "text-muted"}`}>
    <span>{label}</span>
    <span className={`tabular-nums ${value < 0 ? "text-negative" : ""}`}>{formatINR(value)}</span>
  </div>
);

// ---- Trial Balance ----
function TrialBalance({ company }: { company: string }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const q = new URLSearchParams();
  if (company) q.set("company_id", company);
  if (from) q.set("date_from", from);
  if (to) q.set("date_to", to);
  const d = useStmt(`/collator/ledger/trial-balance?${q}`, [company, from, to]);
  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
      </div>
      {!d ? <Loading /> : (
        <>
          <table className="w-full text-[13px] border-collapse">
            <thead><tr className="text-[12px] font-semibold text-muted">
              <th className="py-2 text-left">Ledger</th><th className="py-2 text-left">Group</th>
              <th className="py-2 text-right">Debit</th><th className="py-2 text-right">Credit</th>
            </tr></thead>
            <tbody>
              {d.rows.map((r: any) => (
                <tr key={r.ledger_id} className="border-b border-line/50">
                  <td className="py-1.5">{r.ledger_name}</td>
                  <td className="py-1.5 text-muted">{r.group_name}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.debit ? formatINR(r.debit) : "—"}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.credit ? formatINR(r.credit) : "—"}</td>
                </tr>
              ))}
              <tr className="font-bold text-ink border-t border-line">
                <td className="py-1.5" colSpan={2}>Total</td>
                <td className="py-1.5 text-right tabular-nums">{formatINR(d.total_debit)}</td>
                <td className="py-1.5 text-right tabular-nums">{formatINR(d.total_credit)}</td>
              </tr>
            </tbody>
          </table>
          <div className={`mt-2 text-[12px] ${Math.abs(d.difference) < 0.01 ? "text-positive" : "text-amazon-text"}`}>
            {Math.abs(d.difference) < 0.01 ? "Balanced." : `Difference: ${formatINR(d.difference)}`}
          </div>
        </>
      )}
    </div>
  );
}

// ---- Day Book ----
function DayBook({ company }: { company: string }) {
  const [page, setPage] = useState(0);
  const q = new URLSearchParams({ skip: String(page * 50), limit: "50" });
  if (company) q.set("company_id", company);
  const d = useStmt(`/collator/ledger/day-book?${q}`, [company, page]);
  if (!d) return <Loading />;
  return (
    <div>
      <table className="w-full text-[13px] border-collapse">
        <thead><tr className="text-[12px] font-semibold text-muted">
          <th className="py-2 text-left">Date</th><th className="py-2 text-left">Particulars</th>
          <th className="py-2 text-left">Ledger</th>
          <th className="py-2 text-right">Debit</th><th className="py-2 text-right">Credit</th>
        </tr></thead>
        <tbody>
          {d.rows.map((r: any) => (
            <tr key={r.type + r.id} className="border-b border-line/50">
              <td className="py-1.5 whitespace-nowrap">{formatDate(r.date)}</td>
              <td className="py-1.5 max-w-[300px] truncate" title={r.particulars}>{r.particulars}{r.ref_number ? ` #${r.ref_number}` : ""}</td>
              <td className="py-1.5"><span className="h-2 w-2 rounded-full inline-block mr-1" style={{ background: r.ledger_color }} />{r.ledger_name}</td>
              <td className="py-1.5 text-right tabular-nums">{r.debit ? formatINR(r.debit) : "—"}</td>
              <td className="py-1.5 text-right tabular-nums">{r.credit ? formatINR(r.credit) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={page} setPage={setPage} total={d.total} />
    </div>
  );
}

// ---- Bank Book ----
function BankBook({ company }: { company: string }) {
  const [banks, setBanks] = useState<string[]>([]);
  const [bank, setBank] = useState("");
  const [recon, setRecon] = useState(false);
  useEffect(() => {
    api("/collator/data/bank/banks").then((b) => {
      setBanks(b);
      setBank((cur) => cur || b[0] || "");
    });
  }, []);
  const q = new URLSearchParams();
  if (bank) q.set("bank_name", bank);
  if (company) q.set("company_id", company);
  if (recon) q.set("include_reconciliation", "true");
  const d = useStmt(bank ? `/collator/ledger/bank-book?${q}` : "", [bank, company, recon]);
  return (
    <div>
      <div className="flex gap-2 mb-3 items-center">
        <select value={bank} onChange={(e) => setBank(e.target.value)} className={inputCls}>
          {banks.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <label className="text-[12.5px] flex items-center gap-1.5">
          <input type="checkbox" checked={recon} onChange={(e) => setRecon(e.target.checked)} /> Reconciliation
        </label>
      </div>
      {!bank ? <div className="text-muted text-[13px]">No bank statements imported.</div> : !d ? <Loading /> : (
        <>
          {recon && d.mismatch_count > 0 && (
            <div className="mb-2 text-[12px] text-amazon-text">
              {d.mismatch_count} balance mismatches (first on {formatDate(d.first_mismatch_date)}).
            </div>
          )}
          <table className="w-full text-[13px] border-collapse">
            <thead><tr className="text-[12px] font-semibold text-muted">
              <th className="py-2 text-left">Date</th><th className="py-2 text-left">Particulars</th>
              <th className="py-2 text-right">Debit</th><th className="py-2 text-right">Credit</th>
              <th className="py-2 text-right">Balance</th>
              {recon && <><th className="py-2 text-right">Stmt</th><th className="py-2 text-right">Diff</th></>}
            </tr></thead>
            <tbody>
              {d.rows.slice(0, 400).map((r: any) => (
                <tr key={r.id} className={`border-b border-line/50 ${r.mismatched ? "bg-negative-soft" : ""}`}>
                  <td className="py-1.5 whitespace-nowrap">{formatDate(r.date)}</td>
                  <td className="py-1.5 max-w-[280px] truncate" title={r.particulars}>{r.particulars}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.debit ? formatINR(r.debit) : "—"}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.credit ? formatINR(r.credit) : "—"}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatINR(r.running_balance)}</td>
                  {recon && <><td className="py-1.5 text-right tabular-nums">{r.statement_balance == null ? "—" : formatINR(r.statement_balance)}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.diff == null ? "—" : formatINR(r.diff)}</td></>}
                </tr>
              ))}
              <tr className="font-bold text-ink border-t border-line">
                <td className="py-1.5" colSpan={2}>Closing Balance</td>
                <td className="py-1.5 text-right tabular-nums">{formatINR(d.total_debit)}</td>
                <td className="py-1.5 text-right tabular-nums">{formatINR(d.total_credit)}</td>
                <td className="py-1.5 text-right tabular-nums">{formatINR(d.closing_balance)}</td>
                {recon && <><td /><td /></>}
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// ---- Ratios ----
function Ratios({ company }: { company: string }) {
  const q = company ? `?company_id=${company}` : "";
  const d = useStmt(`/collator/ledger/ratios${q}`, [company]);
  if (!d) return <Loading />;
  const cards: [string, number | null, string][] = [
    ["Gross Profit Margin", d.ratios.gross_profit_margin, "%"],
    ["Net Profit Margin", d.ratios.net_profit_margin, "%"],
    ["Expense to Income", d.ratios.expense_to_income, "%"],
    ["Current Ratio", d.ratios.current_ratio, "×"],
    ["Return on Assets", d.ratios.return_on_assets, "%"],
    ["Working Capital", d.ratios.working_capital, "₹"],
  ];
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map(([label, val, unit]) => (
          <div key={label} className="border border-line rounded-lg p-3">
            <div className="text-[11.5px] text-muted uppercase font-semibold">{label}</div>
            <div className="text-[1.2rem] font-bold text-ink mt-1 tabular-nums">
              {val == null ? "—" : unit === "₹" ? formatINR(val) : `${val}${unit}`}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-muted">{d.note}</div>
    </div>
  );
}

// ---- Compare ----
function Compare({ company }: { company: string }) {
  const now = new Date();
  const [ya, setYa] = useState(String(now.getFullYear()));
  const [ma, setMa] = useState("");
  const [yb, setYb] = useState(String(now.getFullYear()));
  const [mb, setMb] = useState("");
  const q = new URLSearchParams({ year_a: ya, year_b: yb });
  if (ma) q.set("month_a", ma);
  if (mb) q.set("month_b", mb);
  if (company) q.set("company_id", company);
  const d = useStmt(`/collator/ledger/compare?${q}`, [ya, ma, yb, mb, company]);
  const Sel = ({ v, on, mo }: { v: string; on: (x: string) => void; mo?: boolean }) => (
    <select value={v} onChange={(e) => on(e.target.value)} className={inputCls}>
      {mo && <option value="">All months</option>}
      {(mo ? [1,2,3,4,5,6,7,8,9,10,11,12] : [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]).map((n) => (
        <option key={n} value={n}>{n}</option>
      ))}
    </select>
  );
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3 items-center text-[12.5px]">
        <span className="text-muted">A:</span><Sel v={ma} on={setMa} mo /><Sel v={ya} on={setYa} />
        <span className="text-muted ml-2">B:</span><Sel v={mb} on={setMb} mo /><Sel v={yb} on={setYb} />
      </div>
      {!d ? <Loading /> : (
        <table className="w-full text-[13px] border-collapse">
          <thead><tr className="text-[12px] font-semibold text-muted">
            <th className="py-2 text-left">Ledger</th>
            <th className="py-2 text-right">{d.period_a_label}</th>
            <th className="py-2 text-right">{d.period_b_label}</th>
            <th className="py-2 text-right">Change</th><th className="py-2 text-right">%</th>
          </tr></thead>
          <tbody>
            {d.rows.map((r: any) => (
              <tr key={r.ledger_id} className="border-b border-line/50">
                <td className="py-1.5">{r.ledger_name}</td>
                <td className="py-1.5 text-right tabular-nums">{formatINR(r.period_a)}</td>
                <td className="py-1.5 text-right tabular-nums">{formatINR(r.period_b)}</td>
                <td className={`py-1.5 text-right tabular-nums ${r.change < 0 ? "text-negative" : "text-positive"}`}>{formatINR(r.change)}</td>
                <td className="py-1.5 text-right tabular-nums text-muted">{r.change_pct == null ? "—" : `${r.change_pct}%`}</td>
              </tr>
            ))}
            <tr className="font-bold text-ink border-t border-line">
              <td className="py-1.5">Total</td>
              <td className="py-1.5 text-right tabular-nums">{formatINR(d.total_a)}</td>
              <td className="py-1.5 text-right tabular-nums">{formatINR(d.total_b)}</td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---- Exceptions ----
function Exceptions({ company }: { company: string }) {
  const q = company ? `?company_id=${company}` : "";
  const d = useStmt(`/collator/ledger/exceptions${q}`, [company]);
  if (!d) return <Loading />;
  const Section = ({ title, rows, cols }: { title: string; rows: any[]; cols: [string, (r: any) => React.ReactNode][] }) => (
    <div className="mb-5">
      <div className="text-[13px] font-semibold text-ink mb-1.5">{title} ({rows.length})</div>
      {rows.length === 0 ? <div className="text-muted text-[12px]">None.</div> : (
        <table className="w-full text-[12.5px] border-collapse">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-line/50">
                {cols.map(([, render], j) => <td key={j} className="py-1.5">{render(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
  return (
    <div>
      <Section title="Large uncategorized" rows={d.large_uncategorized} cols={[
        ["", (r) => formatDate(r.date)],
        ["", (r) => <span className="truncate block max-w-[320px]">{r.particulars}</span>],
        ["", (r) => <span className="text-right block tabular-nums">{formatINR(r.amount)}</span>],
      ]} />
      <Section title="Dormant ledgers" rows={d.dormant_ledgers} cols={[
        ["", (r) => r.ledger_name],
        ["", (r) => <span className="text-muted">last {formatDate(r.last_activity)} — {r.days_since}d ago</span>],
      ]} />
      <Section title="Outliers" rows={d.outliers} cols={[
        ["", (r) => formatDate(r.date)],
        ["", (r) => `${r.ledger_name}: ${r.particulars}`.slice(0, 60)],
        ["", (r) => <span className="tabular-nums">{formatINR(r.amount)} vs avg {formatINR(r.ledger_average)}</span>],
      ]} />
      <Section title="Possible duplicates" rows={d.possible_duplicates} cols={[
        ["", (r) => formatDate(r.date)],
        ["", (r) => `${r.count}× ${r.kind}`],
        ["", (r) => <span className="tabular-nums">{formatINR(r.amount)}</span>],
      ]} />
    </div>
  );
}

// ---- Cost Centres ----
function CostCentre({ company }: { company: string }) {
  const q = company ? `?company_id=${company}` : "";
  const [d, setD] = useState<any>(null);
  const reload = () => api(`/collator/ledger/platforms/cross-tab${q}`).then(setD).catch((e) => toast(e.message));
  useEffect(() => { setD(null); reload(); /* eslint-disable-next-line */ }, [company]);
  if (!d) return <Loading />;
  return (
    <div>
      <button
        onClick={async () => {
          const r = await api("/collator/ledger/platforms/apply", { method: "POST" });
          toast(`${r.transactions_updated} tagged`);
          reload();
        }}
        className="mb-3 px-2.5 py-1.5 border border-line rounded-md text-[12.5px] text-muted hover:text-ink"
      >
        Re-apply Platform Tags
      </button>
      <table className="w-full text-[13px] border-collapse">
        <thead><tr className="text-[12px] font-semibold text-muted">
          <th className="py-2 text-left">Ledger</th>
          {d.platforms.map((p: string) => <th key={p} className="py-2 text-right">{p}</th>)}
          <th className="py-2 text-right">Total</th>
        </tr></thead>
        <tbody>
          {d.rows.map((r: any) => (
            <tr key={r.ledger_id} className="border-b border-line/50">
              <td className="py-1.5">{r.ledger_name}</td>
              {d.platforms.map((p: string) => <td key={p} className="py-1.5 text-right tabular-nums">{r.by_platform[p] ? formatINR(r.by_platform[p]) : "—"}</td>)}
              <td className="py-1.5 text-right tabular-nums font-semibold">{formatINR(r.total)}</td>
            </tr>
          ))}
          <tr className="font-bold text-ink border-t border-line">
            <td className="py-1.5">Total</td>
            {d.platforms.map((p: string) => <td key={p} className="py-1.5 text-right tabular-nums">{formatINR(d.platform_totals[p])}</td>)}
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const Loading = () => <div className="text-muted text-[13px] py-6 text-center">Loading…</div>;
const Pager = ({ page, setPage, total }: { page: number; setPage: (p: number) => void; total: number }) => {
  const pages = Math.max(1, Math.ceil(total / 50));
  return (
    <div className="flex items-center justify-between mt-3 text-[12px] text-muted">
      <span>{total} records · page {page + 1} of {pages}</span>
      <div className="flex gap-1">
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-2 py-1 border border-line rounded disabled:opacity-40">Prev</button>
        <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="px-2 py-1 border border-line rounded disabled:opacity-40">Next</button>
      </div>
    </div>
  );
};
