/**
 * Collator fee-invoices browser (imported Amazon fee/ad bills).
 * DataTable + search / type / company filters + a totals bar, and a
 * "Payables Aging" panel toggle. Rows can be marked paid.
 */
import { useEffect, useMemo, useState } from "react";
import { FileText, Clock } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { formatINR, formatDate } from "../../format";
import { confirmDialog } from "../../confirm";
import {
  DataTable,
  CompanyFilter,
  YearMonthPicker,
  PageHeader,
  KpiCard,
  type Column,
} from "./shared";

type FeeRow = {
  id: number;
  invoice_number: string;
  invoice_date: string | null;
  vendor: string | null;
  description: string | null;
  category_code: string | null;
  invoice_type: string | null;
  taxable_amount: number | string;
  igst_rate: number | string;
  igst_amount: number | string;
  total_amount: number | string;
  is_paid: number | boolean;
};

type Aging = {
  buckets: Record<string, { id: number; invoice_number: string; invoice_date: string; vendor: string; total_amount: number; days_outstanding: number }[]>;
  bucket_totals: Record<string, number>;
  total_outstanding: number;
  vendor_summary: { vendor: string; total_outstanding: number }[];
  invoice_count: number;
};

const BUCKETS = ["0-30", "31-60", "61-90", "90+"] as const;

export default function PurchaseData() {
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState({ taxable_amount: 0, igst_amount: 0, total_amount: 0 });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [invType, setInvType] = useState("");
  const [company, setCompany] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(""); // "" = all months

  const [showAging, setShowAging] = useState(false);
  const [aging, setAging] = useState<Aging | null>(null);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams();
    p.set("skip", String(page * 50));
    p.set("limit", "50");
    if (search) p.set("search", search);
    if (invType) p.set("invoice_type", invType);
    if (company) p.set("company_id", company);
    if (year) p.set("year", year);
    if (month) p.set("month", month);
    api(`/collator/purchases/?${p}`)
      .then((d) => {
        setRows(d.rows);
        setTotal(d.total);
        setTotals(d.totals);
      })
      .catch((e) => toast(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [page, search, invType, company, year, month]);
  useEffect(() => setPage(0), [search, invType, company, year, month]);

  useEffect(() => {
    if (!showAging) return;
    const p = new URLSearchParams();
    if (company) p.set("company_id", company);
    api(`/collator/purchases/aging?${p}`).then(setAging).catch((e) => toast(e.message));
  }, [showAging, company]);

  const markPaid = async (r: FeeRow) => {
    const paying = !r.is_paid;
    try {
      await api(`/collator/purchases/${r.id}/paid`, {
        method: "PUT",
        body: JSON.stringify({ is_paid: paying }),
      });
      toast(paying ? "Marked paid" : "Marked unpaid");
      load();
      if (showAging) setShowAging((v) => v); // trigger reload via effect dep? simplest: refetch
      if (showAging) {
        const p = new URLSearchParams();
        if (company) p.set("company_id", company);
        api(`/collator/purchases/aging?${p}`).then(setAging);
      }
    } catch (e: any) {
      toast(e.message);
    }
  };

  const remove = async (r: FeeRow) => {
    if (!(await confirmDialog({ title: `Delete ${r.invoice_number}?`, danger: true, confirmLabel: "Delete" })))
      return;
    try {
      await api(`/collator/purchases/${r.id}`, { method: "DELETE" });
      toast("Deleted");
      load();
    } catch (e: any) {
      toast(e.message);
    }
  };

  const columns: Column<FeeRow>[] = useMemo(
    () => [
      { key: "invoice_date", label: "Date", render: (r) => formatDate(r.invoice_date) },
      { key: "invoice_number", label: "Invoice #", render: (r) => <span className="font-mono text-[12px]">{r.invoice_number}</span> },
      {
        key: "invoice_type",
        label: "Type",
        render: (r) => (
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-hover border border-line">
            {r.invoice_type}
          </span>
        ),
      },
      { key: "description", label: "Description" },
      { key: "category_code", label: "HSN/SAC", render: (r) => r.category_code || "—" },
      { key: "taxable_amount", label: "Taxable", align: "right", render: (r) => formatINR(r.taxable_amount) },
      { key: "igst_amount", label: "IGST", align: "right", render: (r) => formatINR(r.igst_amount) },
      { key: "total_amount", label: "Total", align: "right", render: (r) => formatINR(r.total_amount) },
      {
        key: "is_paid",
        label: "",
        align: "right",
        render: (r) => (
          <div className="flex gap-1.5 justify-end">
            <button
              onClick={() => markPaid(r)}
              className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                r.is_paid
                  ? "bg-positive-soft text-positive"
                  : "bg-hover text-muted hover:text-ink"
              }`}
            >
              {r.is_paid ? "Paid" : "Mark paid"}
            </button>
            <button
              onClick={() => remove(r)}
              className="text-[11px] px-2 py-0.5 rounded text-muted hover:text-negative hover:bg-negative-soft"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [showAging, company]
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Fee Invoices" icon={<FileText size={20} className="text-primary" />}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Invoice #, description…"
          className="px-2.5 py-1.5 border border-line rounded-md text-[12.5px] bg-white w-52"
        />
        <select
          value={invType}
          onChange={(e) => setInvType(e.target.value)}
          className="px-2.5 py-1.5 border border-line rounded-md text-[12.5px] bg-white"
        >
          <option value="">All types</option>
          <option value="Advertising">Advertising</option>
          <option value="Services">Services</option>
          <option value="Credit Note">Credit Notes</option>
        </select>
        <YearMonthPicker year={year} month={month} onYear={setYear} onMonth={setMonth} />
        <CompanyFilter value={company} onChange={setCompany} />
        <button
          onClick={() => setShowAging((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12.5px] font-medium ${
            showAging ? "bg-primary text-white" : "border border-line text-muted hover:text-ink"
          }`}
        >
          <Clock size={14} /> Payables Aging
        </button>
      </PageHeader>

      {showAging && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {BUCKETS.map((b) => (
              <KpiCard
                key={b}
                label={`${b} days`}
                value={aging?.bucket_totals[b] ?? 0}
                sub={`${aging?.buckets[b]?.length ?? 0} invoices`}
                tone={b === "90+" ? "negative" : "muted"}
              />
            ))}
          </div>
          {aging && aging.invoice_count === 0 ? (
            <div className="bg-white rounded-lg border border-line p-6 text-center text-muted text-[13px]">
              Nothing outstanding — all fee invoices are marked paid.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 bg-white rounded-lg border border-line overflow-hidden">
                <div className="px-4 py-2.5 border-b border-line text-[13px] font-semibold text-ink">
                  Outstanding invoices ({aging?.invoice_count ?? 0})
                </div>
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="text-[12px] font-semibold text-muted">
                      <th className="px-4 py-2 border-b border-line">Bucket</th>
                      <th className="px-4 py-2 border-b border-line">Invoice #</th>
                      <th className="px-4 py-2 border-b border-line">Date</th>
                      <th className="px-4 py-2 border-b border-line text-right">Days</th>
                      <th className="px-4 py-2 border-b border-line text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BUCKETS.flatMap((b) =>
                      (aging?.buckets[b] ?? []).map((inv) => (
                        <tr key={inv.id} className="hover:bg-hover">
                          <td className="px-4 py-2 border-b border-line text-[11px] text-muted">{b}</td>
                          <td className="px-4 py-2 border-b border-line font-mono text-[12px]">
                            {inv.invoice_number}
                          </td>
                          <td className="px-4 py-2 border-b border-line">{formatDate(inv.invoice_date)}</td>
                          <td className="px-4 py-2 border-b border-line text-right tabular-nums">
                            {inv.days_outstanding}
                          </td>
                          <td className="px-4 py-2 border-b border-line text-right tabular-nums">
                            {formatINR(inv.total_amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="bg-white rounded-lg border border-line overflow-hidden">
                <div className="px-4 py-2.5 border-b border-line text-[13px] font-semibold text-ink">
                  By Vendor
                </div>
                <table className="w-full text-left border-collapse text-[13px]">
                  <tbody>
                    {(aging?.vendor_summary ?? []).map((v) => (
                      <tr key={v.vendor} className="border-b border-line/60">
                        <td className="px-4 py-2 text-muted">{v.vendor}</td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatINR(v.total_outstanding)}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold text-ink bg-hover">
                      <td className="px-4 py-2">Total</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatINR(aging?.total_outstanding ?? 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        setPage={setPage}
        loading={loading}
        empty="No fee invoices imported yet. Upload an ADS-… or KA-… PDF on the Import page."
        totals={[
          { label: "Taxable", value: formatINR(totals.taxable_amount) },
          { label: "IGST", value: formatINR(totals.igst_amount) },
          { label: "Total", value: formatINR(totals.total_amount) },
        ]}
      />
    </div>
  );
}
