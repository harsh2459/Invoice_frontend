import { useState, useEffect } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { toast } from "../toast";
import SelectWithAdd from "./SelectWithAdd";
import DateField from "./DateField";

const TITLES: Record<string, string> = {
  payment: "Marketplace Payment",
  sale: "Employee Sale",
  expense: "Expense",
};

const inputCls =
  "w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";
const labelCls = "block text-[12.5px] font-semibold text-ink mb-1.5";

export default function EntryForm() {
  const { user } = useOutletContext<{ user: any }>();
  const [searchParams] = useSearchParams();
  const isAdmin = user.role === "admin";

  const requested = searchParams.get("tab");
  let activeTab =
    requested && ["payment", "sale", "expense"].includes(requested)
      ? requested
      : isAdmin
      ? "payment"
      : "sale";
  if (!isAdmin) activeTab = "sale";

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    notes: "",
    platform_id: "",
    category_id: "",
    employee_id: "",
  });

  const [platforms, setPlatforms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === "payment") api("/platforms").then(setPlatforms);
    if (activeTab === "expense") api("/categories").then(setCategories);
    if (activeTab === "sale" && isAdmin) api("/users").then(setEmployees);
  }, [activeTab, isAdmin]);

  const nameById = (list: any[], id: string) => list.find((x) => String(x.id) === id)?.name || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === "payment") {
        const platform = nameById(platforms, form.platform_id);
        if (!platform) return toast("Pick a platform");
        await api("/payments", {
          method: "POST",
          body: JSON.stringify({
            date: form.date,
            platform,
            amount: form.amount,
            notes: form.notes,
          }),
        });
        toast("Payment saved");
      } else if (activeTab === "sale") {
        await api("/sales", {
          method: "POST",
          body: JSON.stringify({
            date: form.date,
            amount: form.amount,
            notes: form.notes,
            employee_id: isAdmin ? form.employee_id : undefined,
          }),
        });
        toast("Sale saved");
      } else if (activeTab === "expense") {
        const category = nameById(categories, form.category_id);
        if (!category) return toast("Pick a category");
        await api("/expenses", {
          method: "POST",
          body: JSON.stringify({
            date: form.date,
            category,
            amount: form.amount,
            notes: form.notes,
          }),
        });
        toast("Expense saved");
      }
      // Stay on the form for rapid entry — clear amount/notes, keep date and
      // (for sales) the chosen employee.
      setForm((prev) => ({
        ...prev,
        amount: "",
        notes: "",
        platform_id: "",
        category_id: "",
      }));
    } catch (err: any) {
      toast(err.message);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-[1.3rem] font-bold text-ink mb-4">{TITLES[activeTab]}</h1>

      <div className="bg-white p-4.5 rounded-lg border border-line">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelCls}>Date</label>
              <DateField
                required
                value={form.date}
                onChange={(iso) => setForm({ ...form, date: iso })}
              />
            </div>

            {activeTab === "payment" && (
              <div className="flex-1">
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

            {activeTab === "expense" && (
              <div className="flex-1">
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
          </div>

          {activeTab === "sale" && isAdmin && (
            <div>
              <label className={labelCls}>Employee</label>
              <SelectWithAdd
                value={form.employee_id}
                onChange={(v) => setForm({ ...form, employee_id: v })}
                options={employees
                  .filter((u) => u.role === "employee")
                  .map((u) => ({ value: String(u.id), label: u.name }))}
                onAdded={(o) => setEmployees((prev) => [...prev, { ...o, role: "employee" }])}
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
              placeholder="e.g. 1500"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Notes (Optional)</label>
            <textarea
              rows={3}
              placeholder="Additional details..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={`${inputCls} resize-y min-h-11`}
            />
          </div>

          <button
            type="submit"
            className="mt-2 bg-primary text-white border-none px-4.5 py-2.5 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6] transition-colors"
          >
            Save Entry
          </button>
        </form>
      </div>
    </div>
  );
}
