/**
 * Shared Collator UI — DataTable (paginated + totals bar), CompanyFilter,
 * KpiCard, YearMonthPicker. Tailwind + Tracker theme tokens.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../../api";
import { formatINR } from "../../format";

// ---- data table ----

export interface Column<Row> {
  key: string;
  label: string;
  align?: "left" | "right";
  render?: (row: Row) => React.ReactNode;
}

export function DataTable<Row extends { id?: number | string }>({
  columns,
  rows,
  total,
  page,
  setPage,
  pageSize = 50,
  loading,
  totals,
  empty = "No data.",
}: {
  columns: Column<Row>[];
  rows: Row[];
  total: number;
  page: number;
  setPage: (p: number) => void;
  pageSize?: number;
  loading?: boolean;
  totals?: { label: string; value: React.ReactNode }[];
  empty?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="bg-white rounded-lg border border-line overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead>
            <tr className="text-[12px] font-semibold text-muted">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-3 py-2.5 border-b border-line whitespace-nowrap ${
                    c.align === "right" ? "text-right" : ""
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-muted text-[13px]">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-muted text-[13px]">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={(row.id as any) ?? i} className="hover:bg-hover transition-colors">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-3 py-2.5 border-b border-line ${
                        c.align === "right" ? "text-right tabular-nums" : ""
                      }`}
                    >
                      {c.render ? c.render(row) : ((row as any)[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totals && totals.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 px-3 py-2 border-t border-line bg-hover text-[12px]">
          {totals.map((t) => (
            <span key={t.label} className="text-muted">
              {t.label}: <span className="font-semibold text-ink tabular-nums">{t.value}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-3 py-2 border-t border-line text-[12px] text-muted">
        <span>
          {total.toLocaleString("en-IN")} records · page {page + 1} of {pages}
        </span>
        <div className="flex gap-1">
          <button
            disabled={page <= 0}
            onClick={() => setPage(page - 1)}
            className="p-1 rounded hover:bg-hover disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            disabled={page >= pages - 1}
            onClick={() => setPage(page + 1)}
            className="p-1 rounded hover:bg-hover disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- company filter ----

export type Company = {
  id: number;
  name: string;
  short_code?: string | null;
  color?: string | null;
  active?: number | boolean;
};

export function useCompanies() {
  const [list, setList] = useState<Company[]>([]);
  useEffect(() => {
    api("/companies")
      .then(setList)
      .catch(() => setList([]));
  }, []);
  return list;
}

export function CompanyFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const companies = useCompanies();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2.5 py-1.5 border border-line rounded-md text-[12.5px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
    >
      <option value="">All Companies</option>
      {companies.map((c) => (
        <option key={c.id} value={c.id}>
          {c.short_code ? `${c.short_code} — ${c.name}` : c.name}
        </option>
      ))}
    </select>
  );
}

// ---- year / month ----

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function YearMonthPicker({
  year,
  month,
  onYear,
  onMonth,
  allowAllMonths = true,
}: {
  year: string;
  month: string;
  onYear: (v: string) => void;
  onMonth: (v: string) => void;
  allowAllMonths?: boolean;
}) {
  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    return [cur + 1, cur, cur - 1, cur - 2];
  }, []);
  const selCls =
    "px-2.5 py-1.5 border border-line rounded-md text-[12.5px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";
  return (
    <>
      <select value={year} onChange={(e) => onYear(e.target.value)} className={selCls}>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <select value={month} onChange={(e) => onMonth(e.target.value)} className={selCls}>
        {allowAllMonths && <option value="">All months</option>}
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
    </>
  );
}

// ---- KPI card ----

export function KpiCard({
  label,
  value,
  sub,
  tone = "primary",
  money = true,
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "primary" | "positive" | "negative" | "muted";
  money?: boolean;
}) {
  const border = {
    primary: "border-b-primary",
    positive: "border-b-positive",
    negative: "border-b-negative",
    muted: "border-b-line",
  }[tone];
  return (
    <div className={`bg-white rounded-lg border border-line border-b-2 ${border} p-4`}>
      <div className="text-[11.5px] font-semibold text-muted uppercase tracking-wide">{label}</div>
      <div className="text-[1.35rem] font-bold text-ink tabular-nums mt-1">
        {money && typeof value === "number" ? formatINR(value) : value}
      </div>
      {sub && <div className="text-[11.5px] text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

// ---- page header ----

export function PageHeader({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <h1 className="text-[1.3rem] font-bold text-ink flex items-center gap-2">
        {icon} {title}
      </h1>
      {children && <div className="flex items-end gap-2 flex-wrap">{children}</div>}
    </div>
  );
}
