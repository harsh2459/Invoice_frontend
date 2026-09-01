import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { toast } from "../toast";
import { formatINR } from "../format";
import DateField from "./DateField";

// Combined roll-up across modules. TODO (spec pending): real combined reporting
// — by client, by company, aging, tax, trend charts.

type ModuleFilter = "all" | "cashflow" | "invoicing";

const card = "bg-white border border-line rounded-lg p-4";

interface BankRow {
  bank_account_id: number | null;
  bank_name: string;
  bank_last4: string | null;
  company_name: string | null;
  payment_count: number;
  collected: number;
}

export default function ReportsOverview() {
  const [module, setModule] = useState<ModuleFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);

  const [cash, setCash] = useState({ sales: 0, payments: 0, expenses: 0, net: 0 });
  const [inv, setInv] = useState({
    invoiceCount: 0,
    invoicedTotal: 0,
    taxTotal: 0,
    collected: 0,
    outstanding: 0,
  });
  const [bankRows, setBankRows] = useState<BankRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/companies").then(setCompanies).catch(() => {});
  }, []);

  // Cash-Flow summary respects only the date range; invoicing endpoints also
  // take the company (firm) filter.
  const dateQs = useMemo(() => (from && to ? `?start=${from}&end=${to}` : ""), [from, to]);
  const invQs = useMemo(() => {
    const p = new URLSearchParams();
    if (from && to) {
      p.set("start", from);
      p.set("end", to);
    }
    if (companyId) p.set("company_id", companyId);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [from, to, companyId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api(`/reports/summary${dateQs}`),
      api(`/reports/invoice-summary${invQs}`),
      api(`/reports/collected-by-bank${invQs}`),
    ])
      .then(([s, i, b]) => {
        setCash(s);
        setInv(i);
        setBankRows(b);
      })
      .catch((e) => toast(e.message))
      .finally(() => setLoading(false));
  }, [dateQs, invQs]);

  const showCash = module === "all" || module === "cashflow";
  const showInv = module === "all" || module === "invoicing";

  return (
    <div className="space-y-4">
      <h1 className="text-[1.3rem] font-bold text-ink">Overview</h1>
      <p className="text-[13px] text-muted -mt-1">
        Combined roll-up across Cash Flow and Invoicing for a period.
      </p>

      <div className="flex flex-wrap items-end gap-3 bg-white border border-line rounded-lg p-3">
        <div>
          <div className="text-[11.5px] font-semibold text-muted mb-1">Module</div>
          <select
            value={module}
            onChange={(e) => setModule(e.target.value as ModuleFilter)}
            className="px-2.5 py-1.5 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
          >
            <option value="all">All</option>
            <option value="cashflow">Cash Flow</option>
            <option value="invoicing">Invoicing</option>
          </select>
        </div>
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
          <div className="text-[11.5px] font-semibold text-muted mb-1">Company (firm)</div>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="px-2.5 py-1.5 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
          >
            <option value="">All firms</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {(from || to || companyId) && (
          <button
            onClick={() => {
              setFrom("");
              setTo("");
              setCompanyId("");
            }}
            className="text-[12.5px] text-muted hover:text-ink py-1.5"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-muted text-[13px] py-8 text-center">Loading…</div>
      ) : (
        <div className="space-y-4">
          {showCash && (
            <div>
              <div className="text-[13.5px] font-semibold text-ink mb-2">Cash Flow</div>
              <div className="grid gap-3.5 sm:grid-cols-4">
                <div className={card}>
                  <div className="text-[12px] text-muted font-medium">Sales Logged</div>
                  <div className="text-[1.2rem] font-bold mt-1.5">{formatINR(cash.sales)}</div>
                </div>
                <div className={card}>
                  <div className="text-[12px] text-muted font-medium">Payments Received</div>
                  <div className="text-[1.2rem] font-bold mt-1.5 text-positive">
                    {formatINR(cash.payments)}
                  </div>
                </div>
                <div className={card}>
                  <div className="text-[12px] text-muted font-medium">Expenses</div>
                  <div className="text-[1.2rem] font-bold mt-1.5 text-negative">
                    {formatINR(cash.expenses)}
                  </div>
                </div>
                <div className={card}>
                  <div className="text-[12px] text-muted font-medium">Net</div>
                  <div
                    className={`text-[1.2rem] font-bold mt-1.5 ${
                      cash.net < 0 ? "text-negative" : "text-positive"
                    }`}
                  >
                    {cash.net < 0 ? "-" : ""}
                    {formatINR(Math.abs(cash.net))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {showInv && (
            <div>
              <div className="text-[13.5px] font-semibold text-ink mb-2">Invoicing</div>
              <div className="grid gap-3.5 sm:grid-cols-3">
                <div className={card}>
                  <div className="text-[12px] text-muted font-medium">Invoices</div>
                  <div className="text-[1.2rem] font-bold mt-1.5">{inv.invoiceCount}</div>
                </div>
                <div className={card}>
                  <div className="text-[12px] text-muted font-medium">Invoiced Total</div>
                  <div className="text-[1.2rem] font-bold mt-1.5">
                    {formatINR(inv.invoicedTotal)}
                  </div>
                </div>
                <div className={card}>
                  <div className="text-[12px] text-muted font-medium">GST Collected</div>
                  <div className="text-[1.2rem] font-bold mt-1.5">{formatINR(inv.taxTotal)}</div>
                </div>
                <div className={card}>
                  <div className="text-[12px] text-muted font-medium">Payments Received</div>
                  <div className="text-[1.2rem] font-bold mt-1.5 text-positive">
                    {formatINR(inv.collected)}
                  </div>
                </div>
                <div className={card}>
                  <div className="text-[12px] text-muted font-medium">Outstanding</div>
                  <div className="text-[1.2rem] font-bold mt-1.5 text-negative">
                    {formatINR(inv.outstanding)}
                  </div>
                </div>
              </div>

              <div className="mt-3 bg-white border border-line rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 border-b border-line text-[12.5px] font-semibold text-ink">
                  Collected by bank
                </div>
                {bankRows.length === 0 ? (
                  <div className="p-4 text-center text-muted text-[12.5px]">
                    No payments in this period.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-[13px]">
                    <thead>
                      <tr className="text-[12px] font-semibold text-muted">
                        <th className="px-4 py-2 border-b border-line">Bank</th>
                        <th className="px-4 py-2 border-b border-line">Company</th>
                        <th className="px-4 py-2 border-b border-line text-right">Payments</th>
                        <th className="px-4 py-2 border-b border-line text-right">Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankRows.map((b, i) => (
                        <tr key={b.bank_account_id ?? `unassigned-${i}`} className="hover:bg-hover">
                          <td className="px-4 py-2.5 border-b border-line text-ink">
                            {b.bank_name}
                            {b.bank_last4 ? ` ••••${b.bank_last4}` : ""}
                          </td>
                          <td className="px-4 py-2.5 border-b border-line text-muted">
                            {b.company_name || "—"}
                          </td>
                          <td className="px-4 py-2.5 border-b border-line text-right tabular-nums">
                            {b.payment_count}
                          </td>
                          <td className="px-4 py-2.5 border-b border-line text-right tabular-nums">
                            {formatINR(b.collected)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
