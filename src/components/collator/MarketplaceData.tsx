/**
 * Generic marketplace data browser (Amazon / Flipkart / Meesho). Column set +
 * totals differ per platform; the fetch/filter/paginate shell is shared.
 */
import { useEffect, useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { formatINR, formatDate } from "../../format";
import {
  DataTable,
  CompanyFilter,
  YearMonthPicker,
  PageHeader,
  type Column,
} from "./shared";

type Platform = "amazon" | "flipkart" | "meesho";
const PAGE = 50;

const inputCls =
  "px-2.5 py-1.5 border border-line rounded-md text-[12.5px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

interface Cfg {
  title: string;
  columns: Column<any>[];
  totalKeys: { key: string; label: string; money?: boolean }[];
  typeFilter?: { label: string; options: string[]; param: string };
  b2bFilter?: boolean;
  searchPlaceholder: string;
}

const CONFIGS: Record<Platform, Cfg> = {
  amazon: {
    title: "Amazon — Sales (MTR)",
    searchPlaceholder: "Order ID, SKU, ASIN, invoice…",
    typeFilter: {
      label: "Type",
      param: "transaction_type",
      options: ["Shipment", "Refund", "FreeReplacement", "Cancel"],
    },
    b2bFilter: true,
    columns: [
      { key: "order_date", label: "Order Date", render: (r) => formatDate(r.order_date) },
      { key: "invoice_number", label: "Invoice #" },
      { key: "order_id", label: "Order ID" },
      { key: "transaction_type", label: "Type" },
      { key: "order_type", label: "B2B/B2C" },
      { key: "sku", label: "SKU" },
      { key: "asin", label: "ASIN" },
      { key: "quantity", label: "Qty", align: "right" },
      { key: "invoice_amount", label: "Invoice Amt", align: "right", render: (r) => formatINR(r.invoice_amount) },
      { key: "total_tax_amount", label: "Tax", align: "right", render: (r) => formatINR(r.total_tax_amount) },
      { key: "ship_to_state", label: "State" },
    ],
    totalKeys: [
      { key: "quantity", label: "Qty", money: false },
      { key: "invoice_amount", label: "Invoice Amt" },
      { key: "total_tax_amount", label: "Tax" },
    ],
  },
  flipkart: {
    title: "Flipkart",
    searchPlaceholder: "Order ID, SKU, FSN…",
    columns: [
      { key: "order_date", label: "Order Date", render: (r) => formatDate(r.order_date) },
      { key: "invoice_number", label: "Invoice #" },
      { key: "order_id", label: "Order ID" },
      { key: "event_type", label: "Event" },
      { key: "sku", label: "SKU" },
      { key: "fsn", label: "FSN" },
      { key: "quantity", label: "Qty", align: "right" },
      { key: "invoice_amount", label: "Invoice Amt", align: "right", render: (r) => formatINR(r.invoice_amount) },
      { key: "taxable_value", label: "Taxable", align: "right", render: (r) => formatINR(r.taxable_value) },
      { key: "igst_amount", label: "IGST", align: "right", render: (r) => formatINR(r.igst_amount) },
      { key: "tcs_amount", label: "TCS", align: "right", render: (r) => formatINR(r.tcs_amount) },
      { key: "ship_to_state", label: "State" },
    ],
    totalKeys: [
      { key: "quantity", label: "Qty", money: false },
      { key: "invoice_amount", label: "Invoice Amt" },
      { key: "taxable_value", label: "Taxable" },
      { key: "igst_amount", label: "IGST" },
      { key: "tcs_amount", label: "TCS" },
    ],
  },
  meesho: {
    title: "Meesho",
    searchPlaceholder: "Sub-order #, identifier, SKU…",
    columns: [
      { key: "order_date", label: "Order Date", render: (r) => formatDate(r.order_date) },
      { key: "sub_order_num", label: "Sub Order #" },
      { key: "sku", label: "SKU" },
      { key: "identifier", label: "ID" },
      { key: "quantity", label: "Qty", align: "right" },
      { key: "total_invoice_value", label: "Invoice Value", align: "right", render: (r) => formatINR(r.total_invoice_value) },
      { key: "total_taxable_sale_value", label: "Taxable", align: "right", render: (r) => formatINR(r.total_taxable_sale_value) },
      { key: "tax_amount", label: "Tax", align: "right", render: (r) => formatINR(r.tax_amount) },
      { key: "gst_rate", label: "GST %", align: "right", render: (r) => (r.gst_rate != null ? `${Number(r.gst_rate)}%` : "—") },
      { key: "end_customer_state", label: "State" },
      { key: "hsn_code", label: "HSN" },
    ],
    totalKeys: [
      { key: "quantity", label: "Qty", money: false },
      { key: "total_invoice_value", label: "Invoice Value" },
      { key: "total_taxable_sale_value", label: "Taxable" },
      { key: "tax_amount", label: "Tax" },
    ],
  },
};

export default function MarketplaceData({ platform }: { platform: Platform }) {
  const cfg = CONFIGS[platform];
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("");
  const [typeVal, setTypeVal] = useState("");
  const [b2b, setB2b] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState("");

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("skip", String(page * PAGE));
    p.set("limit", String(PAGE));
    if (search.trim()) p.set("search", search.trim());
    if (company) p.set("company_id", company);
    if (typeVal && cfg.typeFilter) p.set(cfg.typeFilter.param, typeVal);
    if (b2b) p.set("order_type", b2b);
    if (year) p.set("year", year);
    if (month) p.set("month", month);
    return p.toString();
  }, [page, search, company, typeVal, b2b, year, month, cfg]);

  useEffect(() => {
    setLoading(true);
    api(`/collator/data/${platform}?${qs}`)
      .then((d) => {
        setRows(d.rows);
        setTotal(d.total);
        setTotals(d.totals || {});
      })
      .catch((e) => toast(e.message))
      .finally(() => setLoading(false));
  }, [platform, qs]);

  // reset to page 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [search, company, typeVal, b2b, year, month]);

  const totalsBar = cfg.totalKeys.map((t) => ({
    label: t.label,
    value:
      t.money === false
        ? Number(totals[t.key] || 0).toLocaleString("en-IN")
        : formatINR(totals[t.key] || 0),
  }));

  return (
    <div className="space-y-4">
      <PageHeader title={cfg.title} icon={<ShoppingBag size={20} className="text-primary" />}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={cfg.searchPlaceholder}
          className={`${inputCls} w-56`}
        />
        {cfg.typeFilter && (
          <select value={typeVal} onChange={(e) => setTypeVal(e.target.value)} className={inputCls}>
            <option value="">All types</option>
            {cfg.typeFilter.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )}
        {cfg.b2bFilter && (
          <select value={b2b} onChange={(e) => setB2b(e.target.value)} className={inputCls}>
            <option value="">B2B & B2C</option>
            <option value="B2B">B2B</option>
            <option value="B2C">B2C</option>
          </select>
        )}
        <YearMonthPicker year={year} month={month} onYear={setYear} onMonth={setMonth} />
        <CompanyFilter value={company} onChange={setCompany} />
      </PageHeader>

      <DataTable
        columns={cfg.columns}
        rows={rows}
        total={total}
        page={page}
        setPage={setPage}
        pageSize={PAGE}
        loading={loading}
        totals={totalsBar}
        empty="No records. Import a file from the Import page."
      />
    </div>
  );
}
