/**
 * Collator Companies — card grid CRUD over the SHARED companies table, editing
 * the marketplace fields (short_code / active / color) alongside name/gstin/etc.
 * Invoicing uses the same records.
 */
import { useEffect, useState } from "react";
import { Building2, Pencil, Trash2, X } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { confirmDialog } from "../../confirm";
import { PageHeader, type Company } from "./shared";

const PALETTE = [
  "#1a6fd4", "#e07800", "#7b1fa2", "#1B9E5A", "#E24C4B",
  "#0891b2", "#c026d3", "#65a30d", "#d97706", "#475569",
];
const inputCls =
  "w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";
const labelCls = "block text-[12.5px] font-semibold text-ink mb-1.5";

function CompanyModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Company | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    short_code: initial?.short_code ?? "",
    gstin: (initial as any)?.gstin ?? "",
    email: (initial as any)?.email ?? "",
    phone: (initial as any)?.phone ?? "",
    address: (initial as any)?.address ?? "",
    color: initial?.color ?? "#1a6fd4",
    active: initial?.active === undefined ? true : !!initial.active,
  });
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast("Name is required");
    if (!form.short_code.trim()) return toast("Short code is required");
    setBusy(true);
    try {
      const body = JSON.stringify(form);
      if (initial) await api(`/companies/${initial.id}`, { method: "PUT", body });
      else await api("/companies", { method: "POST", body });
      toast(initial ? "Company updated" : "Company added");
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
        className="bg-white rounded-lg border border-line w-full max-w-md p-4.5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1.05rem] font-bold text-ink">
            {initial ? "Edit Company" : "New Company"}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink p-1">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Name</label>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Short Code</label>
              <input
                value={form.short_code}
                onChange={(e) => setForm({ ...form, short_code: e.target.value.toUpperCase() })}
                placeholder="BMA"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>GSTIN</label>
              <input
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Address</label>
              <textarea
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={`${inputCls} resize-y`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Badge Colour</label>
            <div className="flex flex-wrap gap-1.5">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-md border-2 ${
                    form.color === c ? "border-ink" : "border-transparent"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-[13px] text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Active
          </label>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="bg-primary text-white px-4 py-2 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6] disabled:opacity-50"
            >
              {initial ? "Save Changes" : "Add Company"}
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

export default function CollatorCompanies() {
  const [rows, setRows] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; edit: Company | null }>({
    open: false,
    edit: null,
  });

  const load = () => {
    setLoading(true);
    api("/companies")
      .then(setRows)
      .catch((e) => toast(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const remove = async (c: Company) => {
    const ok = await confirmDialog({
      title: `Delete "${c.name}"?`,
      message: "Import history for this company loses its link. This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/companies/${c.id}`, { method: "DELETE" });
      toast("Deleted");
      load();
    } catch (e: any) {
      toast(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Companies" icon={<Building2 size={20} className="text-primary" />}>
        <button
          onClick={() => setModal({ open: true, edit: null })}
          className="bg-primary text-white px-3.5 py-2 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6]"
        >
          New Company
        </button>
      </PageHeader>
      <p className="text-[13px] text-muted -mt-1">
        Shared with the Invoicing module. <span className="font-semibold">Short code</span> and{" "}
        <span className="font-semibold">colour</span> are used for filters and badges across Collator.
      </p>

      {loading ? (
        <div className="p-8 text-center text-muted text-[13px]">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-muted text-[13px] bg-white border border-line rounded-lg">
          No companies yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((c) => (
            <div key={c.id} className="bg-white rounded-lg border border-line overflow-hidden">
              <div className="h-1.5" style={{ background: c.color || "#1a6fd4" }} />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[11px] font-bold px-1.5 py-0.5 rounded uppercase"
                    style={{ background: `${c.color || "#1a6fd4"}22`, color: c.color || "#1a6fd4" }}
                  >
                    {c.short_code || "—"}
                  </span>
                  {!c.active && (
                    <span className="text-[10px] font-semibold text-negative">INACTIVE</span>
                  )}
                </div>
                <div className="font-semibold text-ink text-[14px] mt-2">{c.name}</div>
                <div className="text-[11.5px] text-muted mt-1 space-y-0.5">
                  {(c as any).gstin && <div>{(c as any).gstin}</div>}
                  {(c as any).email && <div>{(c as any).email}</div>}
                  {(c as any).phone && <div>{(c as any).phone}</div>}
                </div>
                <div className="flex gap-1 mt-3">
                  <button
                    onClick={() => setModal({ open: true, edit: c })}
                    className="text-muted hover:text-primary p-1 rounded hover:bg-primary-soft"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => remove(c)}
                    className="text-muted hover:text-negative p-1 rounded hover:bg-negative-soft"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <CompanyModal
          initial={modal.edit}
          onClose={() => setModal({ open: false, edit: null })}
          onSaved={load}
        />
      )}
    </div>
  );
}
