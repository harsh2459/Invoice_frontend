import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { formatINR } from "../../format";
import DateField from "../DateField";
import SearchSelect from "../SearchSelect";
import { CompanyModal, SupplierModal, ProductModal } from "./modals";

const inputCls =
  "w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";
const labelCls = "block text-[12.5px] font-semibold text-ink mb-1.5";
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

interface LineItem {
  key: number;
  product_id: string;
  description: string;
  hsn: string;
  qty: string;
  rate: string;
  gst_rate: string;
}
let keySeq = 1;
const newItem = (): LineItem => ({
  key: keySeq++,
  product_id: "",
  description: "",
  hsn: "",
  qty: "1",
  rate: "",
  gst_rate: "",
});

type ModalState =
  | { kind: "none" }
  | { kind: "company" }
  | { kind: "supplier" }
  | { kind: "product"; lineKey: number };

export default function PurchaseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [companies, setCompanies] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });

  const [form, setForm] = useState({
    company_id: "",
    supplier_id: "",
    bill_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    number: "",
    notes: "",
    discount: "",
    discount_is_pct: true,
  });
  const [items, setItems] = useState<LineItem[]>([newItem()]);

  useEffect(() => {
    api("/companies").then(setCompanies);
    api("/suppliers").then(setSuppliers);
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api(`/purchases/${id}`)
      .then((b: any) => {
        setForm({
          company_id: String(b.company_id ?? ""),
          supplier_id: String(b.supplier_id ?? ""),
          bill_date: String(b.bill_date).slice(0, 10),
          due_date: b.due_date ? String(b.due_date).slice(0, 10) : "",
          number: b.number ?? "",
          notes: b.notes ?? "",
          discount: b.discount ? String(b.discount) : "",
          discount_is_pct: !!b.discount_is_pct,
        });
        setItems(
          (b.items ?? []).map((it: any) => ({
            key: keySeq++,
            product_id: it.product_id ? String(it.product_id) : "",
            description: it.description ?? "",
            hsn: it.hsn ?? "",
            qty: String(it.qty ?? ""),
            rate: String(it.rate ?? ""),
            gst_rate: String(it.gst_rate ?? ""),
          }))
        );
      })
      .catch((e) => toast(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // products scoped to the chosen company
  useEffect(() => {
    if (form.company_id) api(`/companies/${form.company_id}/products`).then(setProducts);
    else setProducts([]);
  }, [form.company_id]);

  const setItem = (key: number, patch: Partial<LineItem>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  const onPickProduct = (key: number, productId: string) => {
    const p = products.find((x) => String(x.id) === productId);
    setItem(key, {
      product_id: productId,
      description: p ? p.name : "",
      hsn: p && p.hsn != null ? String(p.hsn) : "",
      rate: p && p.default_rate != null ? String(p.default_rate) : "",
      gst_rate: p && p.gst_rate != null ? String(p.gst_rate) : "",
    });
  };

  const companyOpts = useMemo(
    () => companies.map((c) => ({ value: String(c.id), label: c.name })),
    [companies]
  );
  const supplierOpts = useMemo(
    () => suppliers.map((s) => ({ value: String(s.id), label: s.name })),
    [suppliers]
  );
  const productOpts = useMemo(
    () => products.map((p) => ({ value: String(p.id), label: p.name })),
    [products]
  );

  const totals = useMemo(() => {
    const lines = items.map((it) => ({
      amount: round2(Number(it.qty || 0) * Number(it.rate || 0)),
      gst: Number(it.gst_rate || 0),
    }));
    const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
    const disc = Number(form.discount || 0);
    let discountValue = form.discount_is_pct ? (subtotal * disc) / 100 : disc;
    discountValue = round2(Math.min(Math.max(discountValue, 0), subtotal));
    const taxable = round2(subtotal - discountValue);
    let tax = 0;
    for (const l of lines) {
      const share = subtotal > 0 ? l.amount / subtotal : 0;
      tax += round2((taxable * share * l.gst) / 100);
    }
    tax = round2(tax);
    return { subtotal, discountValue, taxable, tax, total: round2(taxable + tax) };
  }, [items, form.discount, form.discount_is_pct]);

  const companyPicked = !!form.company_id;
  const companyId = form.company_id ? Number(form.company_id) : null;
  const anyTax = items.some((it) => Number(it.gst_rate || 0) > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_id || !form.supplier_id) return toast("Pick a company and a supplier");
    if (!form.number.trim()) return toast("Enter the supplier's bill number");
    const clean = items
      .map((it) => ({
        product_id: it.product_id || null,
        description: it.description.trim(),
        hsn: it.hsn.trim() || null,
        qty: Number(it.qty || 0),
        rate: Number(it.rate || 0),
        gst_rate: Number(it.gst_rate || 0),
      }))
      .filter((it) => it.description || it.qty || it.rate);
    if (clean.length === 0) return toast("Add at least one line item");
    if (clean.some((it) => !it.description)) return toast("Every line needs a description");

    const payload = {
      company_id: form.company_id,
      supplier_id: form.supplier_id,
      bill_date: form.bill_date,
      due_date: form.due_date || null,
      number: form.number,
      notes: form.notes,
      discount: Number(form.discount || 0),
      discount_is_pct: form.discount_is_pct,
      items: clean,
    };

    setBusy(true);
    try {
      if (isEdit) {
        await api(`/purchases/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast("Bill updated");
        navigate(`/invoicing/purchases/${id}`);
      } else {
        const created = await api("/purchases", { method: "POST", body: JSON.stringify(payload) });
        toast("Bill recorded");
        navigate(`/invoicing/purchases/${created.id}`);
      }
    } catch (err: any) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="text-muted text-[13px] py-8 text-center">Loading…</div>;
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <button
        onClick={() => navigate(isEdit ? `/invoicing/purchases/${id}` : "/invoicing/purchases")}
        className="flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"
      >
        <ArrowLeft size={14} /> {isEdit ? "Back to bill" : "Back to purchases"}
      </button>
      <h1 className="text-[1.3rem] font-bold text-ink">
        {isEdit ? "Edit Purchase Bill" : "New Purchase Bill"}
      </h1>

      <form onSubmit={submit} className="space-y-4">
        <div className="bg-white p-4.5 rounded-lg border border-line space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Company (buyer)</label>
              <SearchSelect
                value={form.company_id}
                onChange={(v) => setForm({ ...form, company_id: v })}
                options={companyOpts}
                onAddNew={() => setModal({ kind: "company" })}
                placeholder="Select company..."
                addTitle="New company"
                disabled={isEdit}
              />
            </div>
            <div>
              <label className={labelCls}>Supplier</label>
              <SearchSelect
                value={form.supplier_id}
                onChange={(v) => setForm({ ...form, supplier_id: v })}
                options={supplierOpts}
                onAddNew={() => setModal({ kind: "supplier" })}
                placeholder="Select supplier..."
                addTitle="New supplier"
              />
            </div>
            <div>
              <label className={labelCls}>Bill Date</label>
              <DateField
                required
                value={form.bill_date}
                onChange={(iso) => setForm({ ...form, bill_date: iso })}
              />
            </div>
            <div>
              <label className={labelCls}>Payment Due Date (optional)</label>
              <DateField value={form.due_date} onChange={(iso) => setForm({ ...form, due_date: iso })} />
            </div>
            <div>
              <label className={labelCls}>Supplier's Bill No.</label>
              <input
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                placeholder="e.g. ACM/2026/554"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes (optional)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={`${inputCls} resize-y`}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-line">
          <div className="px-4 py-3 border-b border-line text-[13.5px] font-semibold text-ink">
            Line Items
          </div>
          <div>
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="text-[12px] font-semibold text-muted">
                  <th className="px-2 py-2 border-b border-line text-left w-44">Product</th>
                  <th className="px-2 py-2 border-b border-line text-left">Description</th>
                  <th className="px-2 py-2 border-b border-line text-right w-16">Qty</th>
                  <th className="px-2 py-2 border-b border-line text-right w-24">Rate</th>
                  <th className="px-2 py-2 border-b border-line text-right w-16">GST%</th>
                  <th className="px-2 py-2 border-b border-line text-right w-24">Amount</th>
                  <th className="px-2 py-2 border-b border-line w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const amount = Number(it.qty || 0) * Number(it.rate || 0);
                  return (
                    <tr key={it.key}>
                      <td className="px-2 py-2 border-b border-line align-top">
                        <SearchSelect
                          value={it.product_id}
                          onChange={(v) => onPickProduct(it.key, v)}
                          options={productOpts}
                          onAddNew={() => setModal({ kind: "product", lineKey: it.key })}
                          placeholder={companyPicked ? "Pick or add..." : "Pick a company"}
                          addTitle="New product"
                          disabled={!companyPicked}
                        />
                      </td>
                      <td className="px-2 py-2 border-b border-line align-top">
                        <input
                          value={it.description}
                          onChange={(e) => setItem(it.key, { description: e.target.value })}
                          placeholder="Item description"
                          className={`${inputCls} py-1.5`}
                        />
                      </td>
                      <td className="px-2 py-2 border-b border-line align-top">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={it.qty}
                          onChange={(e) => setItem(it.key, { qty: e.target.value })}
                          className={`${inputCls} py-1.5 text-right`}
                        />
                      </td>
                      <td className="px-2 py-2 border-b border-line align-top">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.rate}
                          onChange={(e) => setItem(it.key, { rate: e.target.value })}
                          className={`${inputCls} py-1.5 text-right`}
                        />
                      </td>
                      <td className="px-2 py-2 border-b border-line align-top">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.gst_rate}
                          onChange={(e) => setItem(it.key, { gst_rate: e.target.value })}
                          className={`${inputCls} py-1.5 text-right`}
                        />
                      </td>
                      <td className="px-2 py-2 border-b border-line text-right tabular-nums align-top pt-3.5">
                        {formatINR(amount)}
                      </td>
                      <td className="px-2 py-2 border-b border-line text-right align-top pt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setItems((prev) =>
                              prev.length === 1 ? prev : prev.filter((x) => x.key !== it.key)
                            )
                          }
                          className="text-muted hover:text-negative p-1 rounded hover:bg-negative-soft transition-colors disabled:opacity-30"
                          disabled={items.length === 1}
                          title="Remove line"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2.5 border-t border-line">
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, newItem()])}
              className="flex items-center gap-1.5 text-[12.5px] font-medium text-primary hover:bg-primary-soft px-2 py-1 rounded"
            >
              <Plus size={15} /> Add line
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-line p-4 flex flex-col sm:flex-row sm:justify-between gap-4">
          <div className="sm:max-w-[220px]">
            <label className={labelCls}>Discount (bill-level)</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                placeholder="0"
                className={`${inputCls} py-1.5`}
              />
              <select
                value={form.discount_is_pct ? "pct" : "flat"}
                onChange={(e) => setForm({ ...form, discount_is_pct: e.target.value === "pct" })}
                className="px-2 py-1.5 border border-line rounded-md text-[13px] bg-white"
              >
                <option value="pct">%</option>
                <option value="flat">₹</option>
              </select>
            </div>
          </div>
          <div className="text-[13px] w-full sm:w-64 space-y-1">
            <div className="flex justify-between">
              <span className="text-muted">Sub Total</span>
              <span className="tabular-nums">{formatINR(totals.subtotal)}</span>
            </div>
            {totals.discountValue > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted">
                    Discount{form.discount_is_pct ? ` (${form.discount || 0}%)` : ""}
                  </span>
                  <span className="tabular-nums">− {formatINR(totals.discountValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Taxable</span>
                  <span className="tabular-nums">{formatINR(totals.taxable)}</span>
                </div>
              </>
            )}
            {anyTax && (
              <div className="flex justify-between">
                <span className="text-muted">Total GST (input tax)</span>
                <span className="tabular-nums">{formatINR(totals.tax)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-1 font-bold text-ink">
              <span>Grand Total</span>
              <span className="tabular-nums">{formatINR(totals.total)}</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="bg-primary text-white border-none px-4.5 py-2.5 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6] transition-colors disabled:opacity-50"
        >
          {isEdit ? "Save Changes" : "Record Bill"}
        </button>
      </form>

      {modal.kind === "company" && (
        <CompanyModal
          initial={null}
          onClose={() => setModal({ kind: "none" })}
          onSaved={(row) => {
            setCompanies((prev) => [...prev, row]);
            setForm((f) => ({ ...f, company_id: String(row.id) }));
          }}
        />
      )}
      {modal.kind === "supplier" && (
        <SupplierModal
          initialId={null}
          companies={companies}
          lockCompanyId={companyId}
          onClose={() => setModal({ kind: "none" })}
          onSaved={(row) => {
            api("/suppliers").then(setSuppliers);
            setForm((f) => ({ ...f, supplier_id: String(row.id) }));
          }}
        />
      )}
      {modal.kind === "product" && companyId && (
        <ProductModal
          initialId={null}
          companies={companies}
          lockCompanyId={companyId}
          onClose={() => setModal({ kind: "none" })}
          onSaved={(row) => {
            const lineKey = modal.lineKey;
            api(`/companies/${companyId}/products`).then((list) => {
              setProducts(list);
              const p = list.find((x: any) => x.id === row.id);
              setItems((prev) =>
                prev.map((it) =>
                  it.key === lineKey
                    ? {
                        ...it,
                        product_id: String(row.id),
                        description: p ? p.name : row.name,
                        hsn: p && p.hsn != null ? String(p.hsn) : it.hsn,
                        rate: p && p.default_rate != null ? String(p.default_rate) : it.rate,
                        gst_rate: p && p.gst_rate != null ? String(p.gst_rate) : it.gst_rate,
                      }
                    : it
                )
              );
            });
          }}
        />
      )}
    </div>
  );
}
