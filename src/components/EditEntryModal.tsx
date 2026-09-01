import { useEffect, useState } from "react";
import { api } from "../api";
import { toast } from "../toast";
import SelectWithAdd from "./SelectWithAdd";
import DateField from "./DateField";
import { X } from "lucide-react";

const inputCls =
  "w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";
const labelCls = "block text-[12.5px] font-semibold text-ink mb-1.5";

const TITLES: Record<string, string> = {
  payments: "Edit Payment",
  sales: "Edit Sale",
  expenses: "Edit Expense",
};

/**
 * Inline edit dialog for a History row. `type` is the resource path
 * ("payments" | "sales" | "expenses"); `row` is the existing record.
 * Calls PUT /api/<type>/<id> and invokes onSaved() on success.
 */
export default function EditEntryModal({
  type,
  row,
  onClose,
  onSaved,
}: {
  type: "payments" | "sales" | "expenses";
  row: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    date: String(row.date).slice(0, 10),
    amount: String(row.amount ?? ""),
    notes: row.notes ?? "",
    platform_id: "",
    category_id: "",
    employee_id: row.employee_id ? String(row.employee_id) : "",
  });
  const [busy, setBusy] = useState(false);

  const [platforms, setPlatforms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (type === "payments") {
      api("/platforms").then((list) => {
        setPlatforms(list);
        const m = list.find((p: any) => p.name === row.platform);
        if (m) setForm((f) => ({ ...f, platform_id: String(m.id) }));
      });
    }
    if (type === "expenses") {
      api("/categories").then((list) => {
        setCategories(list);
        const m = list.find((c: any) => c.name === row.category);
        if (m) setForm((f) => ({ ...f, category_id: String(m.id) }));
      });
    }
    if (type === "sales") api("/users").then(setEmployees);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const nameById = (list: any[], id: string) =>
    list.find((x) => String(x.id) === id)?.name || "";

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    let body: Record<string, unknown>;
    if (type === "payments") {
      const platform = nameById(platforms, form.platform_id);
      if (!platform) return toast("Pick a platform");
      body = { date: form.date, platform, amount: form.amount, notes: form.notes };
    } else if (type === "expenses") {
      const category = nameById(categories, form.category_id);
      if (!category) return toast("Pick a category");
      body = { date: form.date, category, amount: form.amount, notes: form.notes };
    } else {
      if (!form.employee_id) return toast("Pick an employee");
      body = {
        date: form.date,
        employee_id: form.employee_id,
        amount: form.amount,
        notes: form.notes,
      };
    }
    setBusy(true);
    try {
      await api(`/${type}/${row.id}`, { method: "PUT", body: JSON.stringify(body) });
      toast("Entry updated");
      onSaved();
      onClose();
    } catch (err: any) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-line w-full max-w-md p-4.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1.05rem] font-bold text-ink">{TITLES[type]}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={save} className="space-y-3">
          <div>
            <label className={labelCls}>Date</label>
            <DateField
              required
              value={form.date}
              onChange={(iso) => setForm({ ...form, date: iso })}
            />
          </div>

          {type === "payments" && (
            <div>
              <label className={labelCls}>Platform</label>
              <SelectWithAdd
                value={form.platform_id}
                onChange={(v) => setForm({ ...form, platform_id: v })}
                options={platforms.map((p) => ({ value: String(p.id), label: p.name }))}
                onAdded={(o) => setPlatforms((prev) => [...prev, o])}
                endpoint="/platforms"
                placeholder="Select platform..."
                addLabel="New platform"
              />
            </div>
          )}

          {type === "expenses" && (
            <div>
              <label className={labelCls}>Category</label>
              <SelectWithAdd
                value={form.category_id}
                onChange={(v) => setForm({ ...form, category_id: v })}
                options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                onAdded={(o) => setCategories((prev) => [...prev, o])}
                endpoint="/categories"
                placeholder="Select category..."
                addLabel="New category"
              />
            </div>
          )}

          {type === "sales" && (
            <div>
              <label className={labelCls}>Employee</label>
              <SelectWithAdd
                value={form.employee_id}
                onChange={(v) => setForm({ ...form, employee_id: v })}
                options={employees
                  .filter((u) => u.role === "employee")
                  .map((u) => ({ value: String(u.id), label: u.name }))}
                onAdded={(o) =>
                  setEmployees((prev) => [...prev, { ...o, role: "employee" }])
                }
                endpoint="/users"
                buildBody={(name) => ({ name, role: "employee" })}
                placeholder="Select employee..."
                addLabel="New employee"
              />
            </div>
          )}

          <div>
            <label className={labelCls}>Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Notes (Optional)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={`${inputCls} resize-y`}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="bg-primary text-white border-none px-4 py-2 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6] transition-colors disabled:opacity-50"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-line text-muted font-medium text-[13px] hover:bg-hover"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
