import { useEffect, useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { api } from "../api";
import { API_BASE } from "../config";
import { toast } from "../toast";
import { formatDate } from "../format";
import DateField from "./DateField";

const fmt = (n: number) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const selectCls =
  "px-2.5 py-1.5 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

interface EmployeeReport {
  employee: { id: number; name: string } | null;
  count: number;
  total: number;
  sales: { id: number; date: string; amount: number; notes: string | null }[];
}

export default function Reports() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [empId, setEmpId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [report, setReport] = useState<EmployeeReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api("/users").then((list) => setEmployees(list.filter((u: any) => u.role === "employee")));
  }, []);

  const qs = useMemo(() => (from && to ? `?start=${from}&end=${to}` : ""), [from, to]);

  useEffect(() => {
    if (!empId) {
      setReport(null);
      return;
    }
    setLoading(true);
    api(`/reports/employee/${empId}${qs}`)
      .then(setReport)
      .catch((e) => toast(e.message))
      .finally(() => setLoading(false));
  }, [empId, qs]);

  const exportPdf = () => {
    if (!empId) return;
    const token = localStorage.getItem("token");
    const range = from && to ? `&start=${from}&end=${to}` : "";
    window.open(`${API_BASE}/export/employee-pdf?id=${empId}${range}&token=${token}`, "_blank");
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-[1.3rem] font-bold text-ink">Reports</h1>
      <p className="text-[13px] text-muted -mt-1">Sales report for a single employee.</p>

      <div className="flex flex-wrap items-end gap-3 bg-white border border-line rounded-lg p-3">
        <div>
          <div className="text-[11.5px] font-semibold text-muted mb-1">Employee</div>
          <select value={empId} onChange={(e) => setEmpId(e.target.value)} className={selectCls}>
            <option value="">Select employee...</option>
            {employees.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
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
        <button
          onClick={exportPdf}
          disabled={!empId}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-soft text-primary rounded-md hover:opacity-90 font-medium text-[12.5px] transition-opacity disabled:opacity-40"
        >
          <FileDown size={16} />
          Export PDF
        </button>
      </div>

      {!empId ? (
        <div className="bg-white border border-line rounded-lg p-8 text-center text-muted text-[13px]">
          Pick an employee to see their report.
        </div>
      ) : loading ? (
        <div className="bg-white border border-line rounded-lg p-8 text-center text-muted text-[13px]">
          Loading…
        </div>
      ) : report ? (
        <>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="bg-white border border-line rounded-lg p-4">
              <div className="text-[12px] text-muted font-medium">Entries</div>
              <div className="text-[1.35rem] font-bold mt-1.5">{report.count}</div>
            </div>
            <div className="bg-white border border-line rounded-lg p-4">
              <div className="text-[12px] text-muted font-medium">Total Sales</div>
              <div className="text-[1.35rem] font-bold mt-1.5 text-positive">
                {fmt(report.total)}
              </div>
            </div>
          </div>

          <div className="bg-white border border-line rounded-lg overflow-hidden">
            <div className="px-4 py-3.5 border-b border-line text-[13.5px] font-semibold text-ink">
              {report.employee?.name || "Employee"} — sales
              {from && to ? ` (${formatDate(from)} to ${formatDate(to)})` : " (all time)"}
            </div>
            {report.sales.length === 0 ? (
              <div className="p-6 text-center text-muted text-[13px]">
                No sales in this period.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="text-[12px] font-semibold text-muted">
                    <th className="px-4 py-2 border-b border-line">Date</th>
                    <th className="px-4 py-2 border-b border-line">Notes</th>
                    <th className="px-4 py-2 border-b border-line text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.sales.map((s) => (
                    <tr key={s.id} className="hover:bg-hover">
                      <td className="px-4 py-2.5 border-b border-line whitespace-nowrap">
                        {formatDate(s.date)}
                      </td>
                      <td className="px-4 py-2.5 border-b border-line text-muted">
                        {s.notes || "-"}
                      </td>
                      <td className="px-4 py-2.5 border-b border-line text-right tabular-nums">
                        {s.amount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
