import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { formatINR } from "../../format";
import DateField from "../DateField";
import SearchSelect from "../SearchSelect";
import { CompanyModal, ClientModal, ProductModal } from "./modals";

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
  | { kind: "client" }
  | { kind: "product"; lineKey: number };

export default function InvoiceForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // present => edit mode
  const isEdit = !!id;

  const [companies, setCompanies] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });

  const [form, setForm] = useState({
    company_id: "",
    client_id: "",
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    number: "",
    notes: "",
    discount: "",
    discount_is_pct: true,
  });
  const [items, setItems] = useState<LineItem[]>([newItem()]);

  // "Payment received now" — create mode only. Records a payment with the invoice.
  const [payNow, setPayNow] = useState({ amount: "", paid_on: new Date().toISOString().slice(0, 10), bank_account_id: "" });
  const [banks, setBanks] = useState<any[]>([]);
  const [priorDue, setPriorDue] = useState(0); // client's outstanding before this bill

  useEffect(() => {
    api("/companies").then(setCompanies);
  }, []);

  // Load existing invoice in edit mode.
  useEffect(() => {
    if (!isEdit) return;
    api(`/invoices/${id}`)
      .then((inv: any) => {
        setForm({
          company_id: String(inv.company_id ?? ""),
          client_id: String(inv.client_id ?? ""),
          invoice_date: String(inv.invoice_date).slice(0, 10),
          due_date: inv.due_date ? String(inv.due_date).slice(0, 10) : "",
          number: inv.number ?? "",
          notes: inv.notes ?? "",
          discount: inv.discount ? String(inv.discount) : "",
          discount_is_pct: !!inv.discount_is_pct,
        });
        setItems(
          (inv.items ?? []).map((it: any) => ({
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

  // Clients + products scoped to the chosen company.
  useEffect(() => {
    const cid = form.company_id;
    if (!cid) {
      setClients([]);
      setProducts([]);
      return;
    }
    let alive = true;
    api(`/companies/${cid}/clients`)
      .then((rows) => alive && setClients(Array.isArray(rows) ? rows : []))
      .catch((e) => {
        if (alive) {
          setClients([]);
          toast(`Couldn't load clients: ${e.message}`);
        }
      });
    api(`/products?company_id=${cid}`)
      .then((rows) => alive && setProducts(Array.isArray(rows) ? rows : []))
      .catch((e) => {
        if (alive) {
          setProducts([]);
          toast(`Couldn't load products: ${e.message}`);
        }
      });
    if (!isEdit) {
      api(`/bank-accounts?company_id=${cid}`)
        .then((rows) => alive && setBanks(Array.isArray(rows) ? rows : []))
        .catch(() => alive && setBanks([]));
    }
    return () => {
      alive = false;
    };
  }, [form.company_id, isEdit]);

  // Client's outstanding balance before this bill (create mode only).
  useEffect(() => {
    if (isEdit || !form.client_id) {
      setPriorDue(0);
      return;
    }
    let alive = true;
    api(`/invoices/client-balance?client_id=${form.client_id}`)
      .then((r) => alive && setPriorDue(Number(r?.prior_due || 0)))
      .catch(() => alive && setPriorDue(0));
    return () => {
      alive = false;
    };
  }, [form.client_id, isEdit]);

  // Auto-fill the next number when creating and a company is chosen (unless the
  // user already typed one).
  useEffect(() => {
    if (isEdit || !form.company_id || form.number.trim()) return;
    api(`/invoices/next-number/${form.company_id}`)
      .then((r: any) => setForm((f) => (f.number.trim() ? f : { ...f, number: r.number })))
      .catch(() => {});
  }, [form.company_id, isEdit]);

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
  const clientOpts = useMemo(
    () => clients.map((c) => ({ value: String(c.id), label: c.name })),
    [clients]
  );
  const productOpts = useMemo(
    () => products.map((p) => ({ value: String(p.id), label: p.name })),
    [products]
  );

  // Live totals (mirror backend invoiceMath.ts).
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
    if (!form.company_id || !form.client_id) return toast("Pick a company and a client");
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

    const payAmt = Number(payNow.amount || 0);
    // New invoices are always dated today; existing ones keep their original date.
    const invoiceDate = isEdit ? form.invoice_date : new Date().toISOString().slice(0, 10);
    const payload: any = {
      company_id: form.company_id,
      client_id: form.client_id,
      invoice_date: invoiceDate,
      due_date: form.due_date || null,
      number: form.number,
      notes: form.notes,
      discount: Number(form.discount || 0),
      discount_is_pct: form.discount_is_pct,
      items: clean,
    };
    if (!isEdit && payAmt > 0) {
      payload.payment = {
        amount: payAmt,
        paid_on: payNow.paid_on || invoiceDate,
        bank_account_id: payNow.bank_account_id || null,
      };
    }

    setBusy(true);
    try {
      if (isEdit) {
        await api(`/invoices/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast("Invoice updated");
        navigate(`/invoicing/invoices/${id}`);
      } else {
        const created = await api("/invoices", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast(
          created.client_balance != null && Number(created.client_balance) <= 0.009
            ? "Invoice created — client fully settled"
            : created.payment_status === "paid"
            ? `Invoice created — fully paid · client still owes ${formatINR(created.client_balance)}`
            : created.payment_status === "partial"
            ? `Invoice created — ${formatINR(created.balance)} due on this · client owes ${formatINR(created.client_balance)}`
            : `Invoice created — client owes ${formatINR(created.client_balance)}`
        );
        navigate(`/invoicing/invoices/${created.id}`);
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
    <div className="space-y-4">
      <button
        onClick={() => navigate(isEdit ? `/invoicing/invoices/${id}` : "/invoicing/invoices")}
        className="flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"
      >
        <ArrowLeft size={14} /> {isEdit ? "Back to invoice" : "Back to invoices"}
      </button>
      <h1 className="text-[1.3rem] font-bold text-ink">{isEdit ? "Edit Invoice" : "New Invoice"}</h1>

      <form onSubmit={submit} className="flex flex-col lg:flex-row gap-4 items-start">
        {/* main column */}
        <div className="flex-1 min-w-0 w-full space-y-4">
        <div className="bg-white p-4.5 rounded-lg border border-line space-y-3">
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Company</label>
              <SearchSelect
                value={form.company_id}
                onChange={(v) => setForm({ ...form, company_id: v, client_id: "" })}
                options={companyOpts}
                onAddNew={() => setModal({ kind: "company" })}
                placeholder="Select company..."
                addTitle="New company"
                disabled={isEdit}
              />
            </div>
            <div>
              <label className={labelCls}>Client</label>
              <SearchSelect
                value={form.client_id}
                onChange={(v) => setForm({ ...form, client_id: v })}
                options={clientOpts}
                onAddNew={() => setModal({ kind: "client" })}
                placeholder={companyPicked ? "Select client..." : "Pick a company first"}
                addTitle="New client"
                disabled={!companyPicked}
              />
            </div>
            <div>
              <label className={labelCls}>Invoice Number</label>
              <input
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                placeholder="auto"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Invoice Date</label>
              <input
                type="text"
                value={new Date().toLocaleDateString("en-GB")}
                readOnly
                disabled
                className={`${inputCls} bg-hover text-muted cursor-not-allowed`}
              />
              {!isEdit && (
                <p className="text-[11px] text-muted mt-1">Always today — can't be back- or post-dated.</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Payment Due Date (optional)</label>
              <DateField
                value={form.due_date}
                onChange={(iso) => setForm({ ...form, due_date: iso })}
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
          <div className="overflow-x-auto sm:overflow-x-visible">
            <table className="w-full min-w-[560px] text-[13px] border-collapse table-fixed">
              <colgroup>
                <col />
                <col className="w-20" />
                <col className="w-28" />
                <col className="w-20" />
                <col className="w-32" />
                <col className="w-9" />
              </colgroup>
              <thead>
                <tr className="text-[12px] font-semibold text-muted">
                  <th className="px-2 py-2 border-b border-line text-left">Item</th>
                  <th className="px-2 py-2 border-b border-line text-right">Qty</th>
                  <th className="px-2 py-2 border-b border-line text-right">Rate</th>
                  <th className="px-2 py-2 border-b border-line text-right">GST%</th>
                  <th className="px-2 py-2 border-b border-line text-right">Amount</th>
                  <th className="px-2 py-2 border-b border-line"></th>
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
                          placeholder={companyPicked ? "Pick a product…" : "Pick a company first"}
                          addTitle="New product"
                          disabled={!companyPicked}
                        />
                        {companyPicked && productOpts.length === 0 && (
                          <p className="text-[11px] text-muted mt-1 leading-snug">
                            No products linked to this company. Use{" "}
                            <span className="text-primary">＋</span> to add one, or link existing
                            products on the Products page.
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-2 border-b border-line align-top">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.qty}
                          onChange={(e) => setItem(it.key, { qty: e.target.value })}
                          className={`${inputCls} no-spinner px-1.5 py-1.5 text-right`}
                        />
                      </td>
                      <td className="px-2 py-2 border-b border-line align-top">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.rate}
                          onChange={(e) => setItem(it.key, { rate: e.target.value })}
                          className={`${inputCls} no-spinner px-1.5 py-1.5 text-right`}
                        />
                      </td>
                      <td className="px-2 py-2 border-b border-line align-top">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.gst_rate}
                          onChange={(e) => setItem(it.key, { gst_rate: e.target.value })}
                          className={`${inputCls} no-spinner px-1.5 py-1.5 text-right`}
                        />
                      </td>
                      <td className="px-2 py-2 border-b border-line text-right tabular-nums align-top pt-2.5 font-medium text-ink">
                        {formatINR(amount)}
                      </td>
                      <td className="px-2 py-2 border-b border-line text-right align-top pt-2">
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

        </div>
        {/* end main column */}

        {/* right sidebar: discount + totals + actions (sticky on desktop) */}
        <div className="w-full lg:w-80 lg:shrink-0 lg:sticky lg:top-4 space-y-4">
          <div className="bg-white rounded-lg border border-line p-4 space-y-3">
            <div>
              <label className={labelCls}>Discount (invoice-level)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: e.target.value })}
                  placeholder="0"
                  className={`${inputCls} no-spinner py-1.5`}
                />
                <select
                  value={form.discount_is_pct ? "pct" : "flat"}
                  onChange={(e) =>
                    setForm({ ...form, discount_is_pct: e.target.value === "pct" })
                  }
                  className="px-2 py-1.5 border border-line rounded-md text-[13px] bg-white"
                >
                  <option value="pct">%</option>
                  <option value="flat">₹</option>
                </select>
              </div>
            </div>

            <div className="text-[13px] space-y-1 border-t border-line pt-3">
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
                  <span className="text-muted">Total GST</span>
                  <span className="tabular-nums">{formatINR(totals.tax)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-1.5 mt-1 font-bold text-ink text-[15px]">
                <span>Grand Total</span>
                <span className="tabular-nums">{formatINR(totals.total)}</span>
              </div>
              {!isEdit && priorDue > 0 && (
                <>
                  <div className="flex justify-between text-muted">
                    <span>Prior dues (this client)</span>
                    <span className="tabular-nums">{formatINR(priorDue)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-negative">
                    <span>Client owes (incl. this)</span>
                    <span className="tabular-nums">{formatINR(priorDue + totals.total)}</span>
                  </div>
                </>
              )}
            </div>

            {!isEdit && (
              <div className="border-t border-line pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className={labelCls + " mb-0"}>Payment received now</label>
                  {totals.total > 0 && (
                    <span className="flex gap-2 text-[11.5px]">
                      <button
                        type="button"
                        onClick={() =>
                          setPayNow((p) => ({ ...p, amount: String(round2(totals.total)) }))
                        }
                        className="text-primary hover:underline"
                      >
                        This bill
                      </button>
                      {priorDue > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setPayNow((p) => ({
                              ...p,
                              amount: String(round2(totals.total + priorDue)),
                            }))
                          }
                          className="text-primary hover:underline"
                        >
                          Clear all
                        </button>
                      )}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payNow.amount}
                  onChange={(e) => setPayNow((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00 — leave empty if unpaid"
                  className={`${inputCls} no-spinner py-1.5`}
                />
                {Number(payNow.amount || 0) > 0 && (
                  <>
                    <div className="grid grid-cols-1 gap-2">
                      <DateField
                        value={payNow.paid_on}
                        onChange={(iso) => setPayNow((p) => ({ ...p, paid_on: iso }))}
                      />
                      <select
                        value={payNow.bank_account_id}
                        onChange={(e) =>
                          setPayNow((p) => ({ ...p, bank_account_id: e.target.value }))
                        }
                        className={inputCls}
                      >
                        <option value="">Bank account — none</option>
                        {banks.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                            {b.last4 ? ` ••••${b.last4}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    {(() => {
                      const pay = Number(payNow.amount);
                      const thisBillDue = round2(Math.max(0, totals.total - pay));
                      const clientAfter = round2(priorDue + totals.total - pay);
                      const overpay = pay > totals.total + 0.005;
                      const fullThis = pay + 0.005 >= totals.total;
                      return (
                        <div
                          className={`text-[12px] font-semibold rounded-md px-2.5 py-1.5 space-y-0.5 ${
                            clientAfter <= 0.009
                              ? "bg-positive-soft text-positive"
                              : "bg-amazon text-amazon-text"
                          }`}
                        >
                          <div>
                            {fullThis ? "This bill: FULLY PAID" : `This bill: DUE ${formatINR(thisBillDue)}`}
                            {overpay && priorDue > 0 && ` · ${formatINR(round2(pay - totals.total))} to old dues`}
                          </div>
                          <div>
                            Client balance after:{" "}
                            {clientAfter <= 0.009 ? "₹0 — settled" : formatINR(clientAfter)}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-primary text-white border-none px-4.5 py-2.5 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6] transition-colors disabled:opacity-50"
            >
              {isEdit ? "Save Changes" : "Create Invoice"}
            </button>
          </div>
        </div>
      </form>

      {modal.kind === "company" && (
        <CompanyModal
          initial={null}
          onClose={() => setModal({ kind: "none" })}
          onSaved={(row) => {
            setCompanies((prev) => [...prev, row]);
            setForm((f) => ({ ...f, company_id: String(row.id), client_id: "", number: "" }));
          }}
        />
      )}
      {modal.kind === "client" && companyId && (
        <ClientModal
          initialId={null}
          companies={companies}
          lockCompanyId={companyId}
          onClose={() => setModal({ kind: "none" })}
          onSaved={(row) => {
            api(`/companies/${companyId}/clients`).then(setClients);
            setForm((f) => ({ ...f, client_id: String(row.id) }));
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
