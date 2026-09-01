import { useEffect, useState } from "react";
import { History, Trash2, RefreshCw } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { formatDate } from "../../format";
import { CompanyFilter, YearMonthPicker, PageHeader } from "./shared";

type Log = {
  id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  platform: string;
  rows_imported: number;
  status: string;
  error_message: string | null;
  imported_at: string;
  data_month: number | null;
  data_year: number | null;
  company_name: string | null;
};

const PLAT_STYLE: Record<string, string> = {
  amazon: "bg-amazon text-amazon-text",
  flipkart: "bg-flipkart text-flipkart-text",
  meesho: "bg-meesho text-meesho-text",
  bank: "bg-other text-other-text",
  purchase: "bg-primary-soft text-primary",
};
const STATUS_STYLE: Record<string, string> = {
  success: "bg-positive-soft text-positive",
  skipped: "bg-amazon text-amazon-text",
  failed: "bg-negative-soft text-negative",
  in_progress: "bg-other text-other-text",
};
const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const selCls =
  "px-2.5 py-1.5 border border-line rounded-md text-[12.5px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

export default function ImportLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState("");
  const [platform, setPlatform] = useState("");
  const [status, setStatus] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState("");
  const [delFor, setDelFor] = useState<Log | null>(null);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams({ limit: "200" });
    if (company) p.set("company_id", company);
    if (platform) p.set("platform", platform);
    if (status) p.set("status", status);
    if (year) p.set("year", year);
    if (month) p.set("month", month);
    api(`/collator/imports/logs?${p}`)
      .then((d) => setLogs(d.logs))
      .catch((e) => toast(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [company, platform, status, year, month]);

  const doDelete = async (withData: boolean) => {
    if (!delFor) return;
    try {
      const r = await api(`/collator/imports/logs/${delFor.id}?delete_data=${withData}`, {
        method: "DELETE",
      });
      toast(withData ? `Deleted log + ${r.rows_deleted} rows` : "Deleted log");
      setDelFor(null);
      load();
    } catch (e: any) {
      toast(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Import Logs" icon={<History size={20} className="text-primary" />}>
        <YearMonthPicker year={year} month={month} onYear={setYear} onMonth={setMonth} />
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={selCls}>
          <option value="">All platforms</option>
          {["amazon", "flipkart", "meesho", "bank", "purchase"].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selCls}>
          <option value="">All statuses</option>
          {["success", "skipped", "failed"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <CompanyFilter value={company} onChange={setCompany} />
        <button onClick={load} className="p-1.5 rounded-md hover:bg-hover text-muted" title="Refresh">
          <RefreshCw size={15} />
        </button>
      </PageHeader>

      <div className="bg-white rounded-lg border border-line overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted text-[13px]">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-muted text-[13px]">No imports yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="text-[12px] font-semibold text-muted">
                  <th className="px-3 py-2.5 border-b border-line">File</th>
                  <th className="px-3 py-2.5 border-b border-line">Platform</th>
                  <th className="px-3 py-2.5 border-b border-line">Company</th>
                  <th className="px-3 py-2.5 border-b border-line">Period</th>
                  <th className="px-3 py-2.5 border-b border-line text-right">Rows</th>
                  <th className="px-3 py-2.5 border-b border-line">Status</th>
                  <th className="px-3 py-2.5 border-b border-line">Imported</th>
                  <th className="px-3 py-2.5 border-b border-line w-10"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-hover transition-colors align-top">
                    <td className="px-3 py-2.5 border-b border-line text-ink" title={l.file_path}>
                      {l.file_name}
                    </td>
                    <td className="px-3 py-2.5 border-b border-line">
                      <span
                        className={`px-2 py-0.5 rounded-xl text-[11px] font-semibold ${
                          PLAT_STYLE[l.platform] || "bg-other text-other-text"
                        }`}
                      >
                        {l.platform}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 border-b border-line text-muted">
                      {l.company_name || "—"}
                    </td>
                    <td className="px-3 py-2.5 border-b border-line text-muted">
                      {l.data_month ? `${MONTHS[l.data_month]} ${l.data_year}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 border-b border-line text-right tabular-nums">
                      {l.rows_imported}
                    </td>
                    <td className="px-3 py-2.5 border-b border-line">
                      <span
                        className={`px-2 py-0.5 rounded-xl text-[11px] font-semibold ${
                          STATUS_STYLE[l.status] || ""
                        }`}
                      >
                        {l.status}
                      </span>
                      {l.error_message && (
                        <div className="text-[11px] text-negative mt-0.5 max-w-[220px] truncate" title={l.error_message}>
                          {l.error_message}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 border-b border-line text-muted whitespace-nowrap">
                      {formatDate(l.imported_at)}
                    </td>
                    <td className="px-3 py-2.5 border-b border-line text-right">
                      <button
                        onClick={() => setDelFor(l)}
                        className="text-muted hover:text-negative p-1 rounded hover:bg-negative-soft"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {delFor && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
          onClick={() => setDelFor(null)}
        >
          <div
            className="bg-white rounded-lg border border-line w-full max-w-sm p-4.5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[1.05rem] font-bold text-ink mb-2">Delete "{delFor.file_name}"?</h2>
            <p className="text-[12.5px] text-muted mb-4">
              Delete just this log entry, or also every data row that came from this file.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => doDelete(true)}
                className="bg-negative text-white px-4 py-2 rounded-md font-semibold text-[13px] hover:brightness-95"
              >
                Delete Log + Data ({delFor.rows_imported} rows)
              </button>
              <button
                onClick={() => doDelete(false)}
                className="border border-line px-4 py-2 rounded-md font-medium text-[13px] text-ink hover:bg-hover"
              >
                Delete Log Only
              </button>
              <button
                onClick={() => setDelFor(null)}
                className="text-muted text-[12.5px] hover:text-ink mt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
