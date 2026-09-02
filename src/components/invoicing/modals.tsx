import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";

const inputCls =
  "w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";
const labelCls = "block text-[12.5px] font-semibold text-ink mb-1.5";

function Shell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
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
          <h2 className="text-[1.05rem] font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink p-1">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Actions({ busy, saveLabel, onClose }: { busy: boolean; saveLabel: string; onClose: () => void }) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        type="submit"
        disabled={busy}
        className="bg-primary text-white border-none px-4 py-2 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6] transition-colors disabled:opacity-50"
      >
        {saveLabel}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 rounded-md border border-line text-muted font-medium text-[13px] hover:bg-hover"
      >
        Cancel
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

export interface CompanyRow {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  logo?: string | null;
  invoice_prefix?: string | null;
}

// Downscale an uploaded image to a small PNG data URL for the invoice header.
function fileToLogoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Not a valid image"));
      img.onload = () => {
        const max = 240;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function CompanyModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: CompanyRow | null;
  onClose: () => void;
  onSaved: (row: CompanyRow) => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    address: initial?.address ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    gstin: initial?.gstin ?? "",
    invoice_prefix: initial?.invoice_prefix ?? "",
    logo: initial?.logo ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [loadingLogo, setLoadingLogo] = useState(!!initial && initial.logo === undefined);

  // The company list omits `logo`; fetch it when editing so we don't wipe it on save.
  useEffect(() => {
    if (initial && initial.logo === undefined) {
      api(`/companies/${initial.id}`)
        .then((c: any) => setForm((f) => ({ ...f, logo: c.logo ?? "" })))
        .finally(() => setLoadingLogo(false));
    }
  }, [initial]);

  const onLogo = async (file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      setForm((f) => ({ ...f, logo: dataUrl }));
    } catch (err: any) {
      toast(err.message);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast("Name is required");
    setBusy(true);
    try {
      const row = initial
        ? await api(`/companies/${initial.id}`, { method: "PUT", body: JSON.stringify(form) })
        : await api("/companies", { method: "POST", body: JSON.stringify(form) });
      toast(initial ? "Company updated" : "Company added");
      onSaved(row);
      onClose();
    } catch (err: any) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title={initial ? "Edit Company" : "New Company"} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className={labelCls}>Name</label>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Address</label>
          <textarea
            rows={2}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className={`${inputCls} resize-y`}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>GSTIN (optional)</label>
            <input
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Invoice Prefix</label>
            <input
              placeholder="e.g. ACC-SINV"
              value={form.invoice_prefix}
              onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
        <p className="text-[11.5px] text-muted -mt-1">
          Invoice numbers are auto-generated as <span className="font-mono">PREFIX-YEAR-00001</span>.
        </p>
        <div>
          <label className={labelCls}>Logo (optional, shown on invoices)</label>
          {loadingLogo ? (
            <p className="text-[12px] text-muted">Loading…</p>
          ) : (
            <div className="flex items-center gap-3">
              {form.logo ? (
                <img
                  src={form.logo}
                  alt="logo"
                  className="w-14 h-14 object-contain border border-line rounded-md bg-white"
                />
              ) : (
                <div className="w-14 h-14 border border-dashed border-line rounded-md flex items-center justify-center text-[10px] text-muted">
                  none
                </div>
              )}
              <div className="flex flex-col gap-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onLogo(e.target.files?.[0])}
                  className="text-[12px] file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-line file:bg-white file:text-[12px] file:cursor-pointer"
                />
                {form.logo && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, logo: "" })}
                    className="text-[11.5px] text-muted hover:text-negative self-start"
                  >
                    Remove logo
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <Actions busy={busy} saveLabel={initial ? "Save Changes" : "Add Company"} onClose={onClose} />
      </form>
    </Shell>
  );
}

// ---------------------------------------------------------------------------

export interface ClientRow {
  id: number;
  name: string;
}

/**
 * Client modal. Loads its own detail when `initialId` is set. `lockCompanyId`,
 * when given, is force-checked & disabled (used from the invoice form so a new
 * client always joins the invoice's company).
 */
export function ClientModal({
  initialId,
  companies,
  lockCompanyId,
  onClose,
  onSaved,
}: {
  initialId: number | null;
  companies: { id: number; name: string }[];
  lockCompanyId?: number | null;
  onClose: () => void;
  onSaved: (row: ClientRow) => void;
}) {
  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "", gstin: "" });
  const [linked, setLinked] = useState<Set<number>>(
    new Set(lockCompanyId ? [lockCompanyId] : [])
  );
  const [originalLinked, setOriginalLinked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!initialId);

  useEffect(() => {
    if (!initialId) return;
    api(`/clients/${initialId}`)
      .then((c: any) => {
        setForm({
          name: c.name ?? "",
          address: c.address ?? "",
          phone: c.phone ?? "",
          email: c.email ?? "",
          gstin: c.gstin ?? "",
        });
        const ids = new Set<number>((c.companies ?? []).map((x: any) => x.id));
        if (lockCompanyId) ids.add(lockCompanyId);
        setLinked(ids);
        setOriginalLinked(new Set((c.companies ?? []).map((x: any) => x.id)));
      })
      .finally(() => setLoading(false));
  }, [initialId, lockCompanyId]);

  const toggle = (id: number) => {
    if (id === lockCompanyId) return;
    setLinked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast("Name is required");
    setBusy(true);
    try {
      let row: ClientRow;
      if (initialId) {
        row = await api(`/clients/${initialId}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        row = await api("/clients", { method: "POST", body: JSON.stringify(form) });
      }
      const toAdd = [...linked].filter((id) => !originalLinked.has(id));
      const toRemove = [...originalLinked].filter((id) => !linked.has(id));
      for (const id of toAdd) {
        await api(`/clients/${row.id}/companies`, {
          method: "POST",
          body: JSON.stringify({ company_id: id }),
        });
      }
      for (const id of toRemove) {
        await api(`/clients/${row.id}/companies/${id}`, { method: "DELETE" });
      }
      toast(initialId ? "Client updated" : "Client added");
      onSaved(row);
      onClose();
    } catch (err: any) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title={initialId ? "Edit Client" : "New Client"} onClose={onClose}>
      {loading ? (
        <div className="py-8 text-center text-muted text-[13px]">Loading...</div>
      ) : (
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className={labelCls}>Name</label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Address</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className={`${inputCls} resize-y`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>GSTIN (optional)</label>
            <input
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Belongs to companies</label>
            {companies.length === 0 ? (
              <p className="text-[12px] text-muted">Add a company first, then link it here.</p>
            ) : (
              <div className="border border-line rounded-md divide-y divide-line max-h-40 overflow-y-auto">
                {companies.map((co) => (
                  <label
                    key={co.id}
                    className={`flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-hover ${
                      co.id === lockCompanyId ? "cursor-default opacity-70" : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={linked.has(co.id)}
                      disabled={co.id === lockCompanyId}
                      onChange={() => toggle(co.id)}
                    />
                    {co.name}
                    {co.id === lockCompanyId && (
                      <span className="text-[11px] text-muted ml-auto">this invoice</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
          <Actions busy={busy} saveLabel={initialId ? "Save Changes" : "Add Client"} onClose={onClose} />
        </form>
      )}
    </Shell>
  );
}

// ---------------------------------------------------------------------------

export interface ProductRow {
  id: number;
  name: string;
  unit?: string | null;
  default_rate: number | string;
  gst_rate?: number | string;
  hsn?: string | null;
}

export function ProductModal({
  initialId,
  companies,
  lockCompanyId,
  onClose,
  onSaved,
}: {
  initialId: number | null;
  companies: { id: number; name: string }[];
  lockCompanyId?: number | null;
  onClose: () => void;
  onSaved: (row: ProductRow) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    unit: "",
    default_rate: "",
    cost_price: "",
    gst_rate: "",
    hsn: "",
    track_stock: false,
    reorder_level: "",
    opening_stock: "",
  });
  const [linked, setLinked] = useState<Set<number>>(
    new Set(lockCompanyId ? [lockCompanyId] : [])
  );
  const [originalLinked, setOriginalLinked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!initialId);

  // New product: default to "available to every company" so it isn't invisible
  // in the invoice form (which only lists a company's linked products).
  useEffect(() => {
    if (!initialId && !lockCompanyId && companies.length) {
      setLinked(new Set(companies.map((c) => c.id)));
    }
  }, [initialId, lockCompanyId, companies]);

  useEffect(() => {
    if (!initialId) return;
    api(`/products/${initialId}`)
      .then((p: any) => {
        setForm({
          name: p.name ?? "",
          unit: p.unit ?? "",
          default_rate: p.default_rate != null ? String(p.default_rate) : "",
          cost_price: p.cost_price != null ? String(p.cost_price) : "",
          gst_rate: p.gst_rate != null ? String(p.gst_rate) : "",
          hsn: p.hsn ?? "",
          track_stock: !!p.track_stock,
          reorder_level: p.reorder_level != null ? String(p.reorder_level) : "",
          opening_stock: p.opening_stock != null ? String(p.opening_stock) : "",
        });
        const ids = new Set<number>((p.companies ?? []).map((x: any) => x.id));
        if (lockCompanyId) ids.add(lockCompanyId);
        setLinked(ids);
        setOriginalLinked(new Set((p.companies ?? []).map((x: any) => x.id)));
      })
      .finally(() => setLoading(false));
  }, [initialId, lockCompanyId]);

  const toggle = (id: number) => {
    if (id === lockCompanyId) return;
    setLinked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast("Name is required");
    setBusy(true);
    try {
      const body = JSON.stringify({
        name: form.name,
        unit: form.unit,
        default_rate: form.default_rate || 0,
        cost_price: form.cost_price || 0,
        gst_rate: form.gst_rate || 0,
        hsn: form.hsn,
        track_stock: form.track_stock,
        reorder_level: form.reorder_level || 0,
        opening_stock: form.opening_stock || 0,
      });
      let row: ProductRow;
      if (initialId) {
        row = await api(`/products/${initialId}`, { method: "PUT", body });
      } else {
        row = await api("/products", { method: "POST", body });
      }
      const toAdd = [...linked].filter((id) => !originalLinked.has(id));
      const toRemove = [...originalLinked].filter((id) => !linked.has(id));
      for (const id of toAdd) {
        await api(`/products/${row.id}/companies`, {
          method: "POST",
          body: JSON.stringify({ company_id: id }),
        });
      }
      for (const id of toRemove) {
        await api(`/products/${row.id}/companies/${id}`, { method: "DELETE" });
      }
      toast(initialId ? "Product updated" : "Product added");
      onSaved(row);
      onClose();
    } catch (err: any) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title={initialId ? "Edit Product" : "New Product"} onClose={onClose}>
      {loading ? (
        <div className="py-8 text-center text-muted text-[13px]">Loading...</div>
      ) : (
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className={labelCls}>Name</label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Unit (optional)</label>
              <input
                placeholder="pcs, kg, hr"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Selling Rate (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.default_rate}
                onChange={(e) => setForm({ ...form, default_rate: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Cost Price (₹) — for profit calc</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>GST % (auto-applied on invoices)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0, 5, 12, 18, 28"
                value={form.gst_rate}
                onChange={(e) => setForm({ ...form, gst_rate: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>HSN / SAC (optional)</label>
              <input
                value={form.hsn}
                onChange={(e) => setForm({ ...form, hsn: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="border border-line rounded-md p-3 space-y-2.5">
            <label className="flex items-center gap-2 text-[13px] font-semibold text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={form.track_stock}
                onChange={(e) => setForm({ ...form, track_stock: e.target.checked })}
              />
              Track stock for this item
            </label>
            {form.track_stock && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Opening stock</label>
                  <input
                    type="number"
                    step="0.001"
                    value={form.opening_stock}
                    onChange={(e) => setForm({ ...form, opening_stock: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Reorder level (low-stock alert)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={form.reorder_level}
                    onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelCls + " mb-0"}>Available to companies</label>
              {companies.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setLinked((prev) =>
                      prev.size === companies.length
                        ? new Set(lockCompanyId ? [lockCompanyId] : [])
                        : new Set(companies.map((c) => c.id))
                    )
                  }
                  className="text-[11.5px] text-primary hover:underline"
                >
                  {linked.size === companies.length ? "Clear all" : "Select all"}
                </button>
              )}
            </div>
            {companies.length === 0 ? (
              <p className="text-[12px] text-muted">Add a company first, then link it here.</p>
            ) : (
              <div className="border border-line rounded-md divide-y divide-line max-h-40 overflow-y-auto">
                {companies.map((co) => (
                  <label
                    key={co.id}
                    className={`flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-hover ${
                      co.id === lockCompanyId ? "cursor-default opacity-70" : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={linked.has(co.id)}
                      disabled={co.id === lockCompanyId}
                      onChange={() => toggle(co.id)}
                    />
                    {co.name}
                    {co.id === lockCompanyId && (
                      <span className="text-[11px] text-muted ml-auto">this invoice</span>
                    )}
                  </label>
                ))}
              </div>
            )}
            {companies.length > 0 && linked.size === 0 && (
              <p className="text-[11.5px] text-amazon-text mt-1.5">
                Not linked to any company — this product won't appear when creating invoices.
              </p>
            )}
          </div>
          <Actions busy={busy} saveLabel={initialId ? "Save Changes" : "Add Product"} onClose={onClose} />
        </form>
      )}
    </Shell>
  );
}

// ---------------------------------------------------------------------------

export interface BankAccountRow {
  id: number;
  company_id: number;
  name: string;
  last4?: string | null;
  company_name?: string | null;
  payment_count?: number;
}

/**
 * Bank account modal. A bank belongs to ONE company. `lockCompanyId`, when
 * given, forces & disables the company select (used from the invoice payment
 * flow, though currently banks are only created from the Banks page).
 */
export function BankAccountModal({
  initialId,
  companies,
  lockCompanyId,
  onClose,
  onSaved,
}: {
  initialId: number | null;
  companies: { id: number; name: string }[];
  lockCompanyId?: number | null;
  onClose: () => void;
  onSaved: (row: BankAccountRow) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    last4: "",
    company_id: lockCompanyId ? String(lockCompanyId) : "",
  });
  const [companyLocked, setCompanyLocked] = useState(!!lockCompanyId);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!initialId);

  useEffect(() => {
    if (!initialId) return;
    api(`/bank-accounts/${initialId}`)
      .then((b: any) => {
        setForm({
          name: b.name ?? "",
          last4: b.last4 ?? "",
          company_id: String(b.company_id ?? ""),
        });
        // Once a bank has payments the backend rejects a company change.
        if (Number(b.payment_count ?? 0) > 0) setCompanyLocked(true);
      })
      .finally(() => setLoading(false));
  }, [initialId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_id) return toast("Pick a company");
    if (!form.name.trim()) return toast("Name is required");
    setBusy(true);
    try {
      const body = JSON.stringify({
        company_id: Number(form.company_id),
        name: form.name,
        last4: form.last4,
      });
      const row = initialId
        ? await api(`/bank-accounts/${initialId}`, { method: "PUT", body })
        : await api("/bank-accounts", { method: "POST", body });
      toast(initialId ? "Bank account updated" : "Bank account added");
      onSaved(row);
      onClose();
    } catch (err: any) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title={initialId ? "Edit Bank Account" : "New Bank Account"} onClose={onClose}>
      {loading ? (
        <div className="py-8 text-center text-muted text-[13px]">Loading...</div>
      ) : (
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className={labelCls}>Company</label>
            <select
              value={form.company_id}
              disabled={companyLocked}
              onChange={(e) => setForm({ ...form, company_id: e.target.value })}
              className={`${inputCls} disabled:bg-hover disabled:text-muted`}
            >
              <option value="">Select company...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {companyLocked && initialId && (
              <p className="text-[11.5px] text-muted mt-1">
                This account already has payments, so its company can&apos;t be changed.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name</label>
              <input
                autoFocus
                placeholder="HDFC Current"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Last 4 digits (optional)</label>
              <input
                inputMode="numeric"
                maxLength={4}
                placeholder="1234"
                value={form.last4}
                onChange={(e) =>
                  setForm({ ...form, last4: e.target.value.replace(/\D/g, "").slice(0, 4) })
                }
                className={inputCls}
              />
            </div>
          </div>
          <Actions
            busy={busy}
            saveLabel={initialId ? "Save Changes" : "Add Bank Account"}
            onClose={onClose}
          />
        </form>
      )}
    </Shell>
  );
}

// ---------------------------------------------------------------------------

export interface SupplierRow {
  id: number;
  name: string;
}

/** Supplier modal — mirror of ClientModal for the purchases side. */
export function SupplierModal({
  initialId,
  companies,
  lockCompanyId,
  onClose,
  onSaved,
}: {
  initialId: number | null;
  companies: { id: number; name: string }[];
  lockCompanyId?: number | null;
  onClose: () => void;
  onSaved: (row: SupplierRow) => void;
}) {
  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "", gstin: "" });
  const [linked, setLinked] = useState<Set<number>>(
    new Set(lockCompanyId ? [lockCompanyId] : [])
  );
  const [originalLinked, setOriginalLinked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!initialId);

  useEffect(() => {
    if (!initialId) return;
    api(`/suppliers/${initialId}`)
      .then((s: any) => {
        setForm({
          name: s.name ?? "",
          address: s.address ?? "",
          phone: s.phone ?? "",
          email: s.email ?? "",
          gstin: s.gstin ?? "",
        });
        const ids = new Set<number>((s.companies ?? []).map((x: any) => x.id));
        if (lockCompanyId) ids.add(lockCompanyId);
        setLinked(ids);
        setOriginalLinked(new Set((s.companies ?? []).map((x: any) => x.id)));
      })
      .finally(() => setLoading(false));
  }, [initialId, lockCompanyId]);

  const toggle = (id: number) => {
    if (id === lockCompanyId) return;
    setLinked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast("Name is required");
    setBusy(true);
    try {
      let row: SupplierRow;
      if (initialId) {
        row = await api(`/suppliers/${initialId}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        row = await api("/suppliers", { method: "POST", body: JSON.stringify(form) });
      }
      const toAdd = [...linked].filter((id) => !originalLinked.has(id));
      const toRemove = [...originalLinked].filter((id) => !linked.has(id));
      for (const id of toAdd) {
        await api(`/suppliers/${row.id}/companies`, {
          method: "POST",
          body: JSON.stringify({ company_id: id }),
        });
      }
      for (const id of toRemove) {
        await api(`/suppliers/${row.id}/companies/${id}`, { method: "DELETE" });
      }
      toast(initialId ? "Supplier updated" : "Supplier added");
      onSaved(row);
      onClose();
    } catch (err: any) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title={initialId ? "Edit Supplier" : "New Supplier"} onClose={onClose}>
      {loading ? (
        <div className="py-8 text-center text-muted text-[13px]">Loading...</div>
      ) : (
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className={labelCls}>Name</label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Address</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className={`${inputCls} resize-y`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>GSTIN (optional)</label>
            <input
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Supplies to companies</label>
            {companies.length === 0 ? (
              <p className="text-[12px] text-muted">Add a company first, then link it here.</p>
            ) : (
              <div className="border border-line rounded-md divide-y divide-line max-h-40 overflow-y-auto">
                {companies.map((co) => (
                  <label
                    key={co.id}
                    className={`flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-hover ${
                      co.id === lockCompanyId ? "cursor-default opacity-70" : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={linked.has(co.id)}
                      disabled={co.id === lockCompanyId}
                      onChange={() => toggle(co.id)}
                    />
                    {co.name}
                    {co.id === lockCompanyId && (
                      <span className="text-[11px] text-muted ml-auto">this bill</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
          <Actions
            busy={busy}
            saveLabel={initialId ? "Save Changes" : "Add Supplier"}
            onClose={onClose}
          />
        </form>
      )}
    </Shell>
  );
}
