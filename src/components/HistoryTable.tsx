import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { API_BASE } from "../config";
import { toast } from "../toast";
import { confirmDialog } from "../confirm";
import { formatDate } from "../format";
import DateField from "./DateField";
import EditEntryModal from "./EditEntryModal";
import { Trash2, Pencil, FileDown, X } from "lucide-react";

const badgeClass = (platform: string) => {
  const p = platform?.toLowerCase() || "";
  if (p === "amazon") return "bg-amazon text-amazon-text";
  if (p === "flipkart") return "bg-flipkart text-flipkart-text";
  if (p === "meesho") return "bg-meesho text-meesho-text";
  return "bg-other text-other-text";
};

const selectCls =
  "px-2.5 py-1.5 border border-line rounded-md text-[12.5px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

export default function HistoryTable() {
  const { user } = useOutletContext<{ user: any }>();
  const isAdmin = user.role === "admin";
  const [searchParams] = useSearchParams();

  const requested = searchParams.get("tab");
  const allowed = isAdmin ? ["payments", "sales", "expenses"] : ["sales"];
  const activeTab = requested && allowed.includes(requested) ? requested : allowed[0];

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  // filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [who, setWho] = useState(""); // employee_name | platform | category

  const loadData = () => {
    setLoading(true);
    api(`/${activeTab}`)
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    setWho("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const whoField =
    activeTab === "sales" ? "employee_name" : activeTab === "payments" ? "platform" : "category";
  const whoLabel =
    activeTab === "sales" ? "All employees" : activeTab === "payments" ? "All platforms" : "All categories";

  const whoOptions = useMemo(
    () => [...new Set(data.map((r) => r[whoField]).filter(Boolean))].sort(),
    [data, whoField]
  );

  const filtered = useMemo(
    () =>
      data.filter((r) => {
        const d = String(r.date).slice(0, 10);
        if (from && d < from) return false;
        if (to && d > to) return false;
        if (who && r[whoField] !== who) return false;
        return true;
      }),
    [data, from, to, who, whoField]
  );

  const total = useMemo(
    () => filtered.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [filtered]
  );

  const filtersActive = from || to || who;
  const clearFilters = () => {
    setFrom("");
    setTo("");
    setWho("");
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({
      title: "Delete this entry?",
      message: "This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/${activeTab}/${id}`, { method: "DELETE" });
      toast("Entry deleted");
      loadData();
    } catch (err: any) {
      toast("Error deleting entry: " + err.message);
    }
  };

  const token = localStorage.getItem("token");
  const openExport = (path: string) => window.open(`${API_BASE}${path}token=${token}`, "_blank");

  const TITLES: Record<string, string> = {
    payments: "Payments",
    sales: "Sales",
    expenses: "Expenses",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-[1.3rem] font-bold text-ink">{TITLES[activeTab]}</h1>
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => openExport("/export/excel?")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-positive-soft text-positive rounded-md hover:opacity-90 font-medium text-[12.5px] transition-opacity"
            >
              <FileDown size={16} />
              Excel
            </button>
            <button
              onClick={() => openExport("/export/report-pdf?")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-soft text-primary rounded-md hover:opacity-90 font-medium text-[12.5px] transition-opacity"
            >
              <FileDown size={16} />
              Report PDF
            </button>
          </div>
        )}
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-end gap-3 bg-white border border-line rounded-lg p-3">
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
          <div className="text-[11.5px] font-semibold text-muted mb-1 capitalize">
            {activeTab === "sales" ? "Employee" : activeTab === "payments" ? "Platform" : "Category"}
          </div>
          <select value={who} onChange={(e) => setWho(e.target.value)} className={selectCls}>
            <option value="">{whoLabel}</option>
            {whoOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        {filtersActive && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-[12.5px] text-muted hover:text-ink py-1.5"
          >
            <X size={14} /> Clear
          </button>
        )}
        <div className="ml-auto text-right">
          <div className="text-[11.5px] text-muted">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          </div>
          <div className="text-[14px] font-bold text-ink tabular-nums">
            ₹{total.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-line overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted text-[13px]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted text-[13px]">
            {data.length === 0 ? `No entries found for ${activeTab}.` : "No entries match the filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="text-[12px] font-semibold text-muted">
                  <th className="px-2.5 py-2 border-b border-line">Date</th>
                  {activeTab === "sales" && (
                    <th className="px-2.5 py-2 border-b border-line">Employee</th>
                  )}
                  {activeTab === "payments" && (
                    <th className="px-2.5 py-2 border-b border-line">Platform</th>
                  )}
                  {activeTab === "expenses" && (
                    <th className="px-2.5 py-2 border-b border-line">Category</th>
                  )}
                  <th className="px-2.5 py-2 border-b border-line">Notes</th>
                  <th className="px-2.5 py-2 border-b border-line text-right">Amount (₹)</th>
                  {isAdmin && <th className="px-2.5 py-2 border-b border-line w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-hover transition-colors">
                    <td className="px-2.5 py-2.5 border-b border-line whitespace-nowrap text-ink">
                      {formatDate(row.date)}
                    </td>
                    {activeTab === "sales" && (
                      <td className="px-2.5 py-2.5 border-b border-line text-ink">
                        {row.employee_name}
                      </td>
                    )}
                    {activeTab === "payments" && (
                      <td className="px-2.5 py-2.5 border-b border-line">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-xl text-[11.5px] font-semibold ${badgeClass(
                            row.platform
                          )}`}
                        >
                          {row.platform}
                        </span>
                      </td>
                    )}
                    {activeTab === "expenses" && (
                      <td className="px-2.5 py-2.5 border-b border-line text-ink">{row.category}</td>
                    )}
                    <td className="px-2.5 py-2.5 border-b border-line text-muted max-w-xs truncate">
                      {row.notes || "-"}
                    </td>
                    <td className="px-2.5 py-2.5 border-b border-line text-right font-medium text-ink tabular-nums">
                      {Number(row.amount).toLocaleString("en-IN")}
                    </td>
                    {isAdmin && (
                      <td className="px-2.5 py-2.5 border-b border-line text-right whitespace-nowrap">
                        <button
                          onClick={() => setEditing(row)}
                          className="text-muted hover:text-primary transition-colors p-1 rounded hover:bg-primary-soft"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="text-muted hover:text-negative transition-colors p-1 rounded hover:bg-negative-soft ml-1"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <EditEntryModal
          type={activeTab as "payments" | "sales" | "expenses"}
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
