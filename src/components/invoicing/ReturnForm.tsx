import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { formatINR } from "../../format";
import SearchSelect from "../SearchSelect";

const inputCls =
  "w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";
const labelCls = "block text-[12.5px] font-semibold text-ink mb-1.5";
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

interface Line {
  key: number;
  product_id: string;
  description: string;
  hsn: string;
  qty: string;
  rate: string;
  gst_rate: string;
}
let seq = 1;
const newLine = (): Line => ({
  key: seq++,
  product_id: "",
  description: "",
  hsn: "",
  qty: "1",
  rate: "",
  gst_rate: "",
});

const REASONS = [
  ["damaged", "Damaged (not restocked)"],
  ["wrong_item", "Wrong item"],
  ["excess", "Excess supply"],
  ["not_needed", "Not needed"],
  ["other", "Other"],
] as const;

export default function ReturnForm({
  lockCompanyId,
  lockClientId,
  onDone,
}: {
  lockCompanyId?: number;
  lockClientId?: number;
  onDone?: (r: { number: string; client_balance: number; id: number }) => void;
} = {}) {
  const navigate = useNavigate();
  const locked = lockClientId != null;
  const [companies, setCompanies] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const [companyId, setCompanyId] = useState(lockCompanyId ? String(lockCompanyId) : "");
  const [clientId, setClientId] = useState(lockClientId ? String(lockClientId) : "");
  const [invoiceId, setInvoiceId] = useState("");
  const [reason, setReason] = useState<(typeof REASONS)[number][0]>("damaged");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]);

  useEffect(() => {
    api("/companies").then(setCompanies).catch(() => {});
  }, []);
  useEffect(() => {
    if (!locked) {
      setClientId("");
      setInvoiceId("");
      setInvoices([]);
    }
    if (companyId) api(`/companies/${companyId}/clients`).then(setClients).catch(() => setClients([]));
    else setClients([]);
  }, [companyId]);
  useEffect(() => {
    setInvoiceId("");
    if (clientId)
      api(`/invoices?client_id=${clientId}&company_id=${companyId}`)
        .then((rows) => setInvoices(Array.isArray(rows) ? rows : []))
        .catch(() => setInvoices([]));
    else setInvoices([]);
  }, [clientId, companyId]);

  // when an invoice is picked, prefill lines from it
  useEffect(() => {
    if (!invoiceId) return;
    api(`/invoices/${invoiceId}`)
      .then((inv: any) => {
        setLines(
          (inv.items ?? []).map((it: any) => ({
            key: seq++,
            product_id: it.product_id ? String(it.product_id) : "",
            description: it.description ?? "",
            hsn: it.hsn ?? "",
            qty: "0",
            rate: String(it.rate ?? ""),
            gst_rate: String(it.gst_rate ?? ""),
          }))
        );
      })
      .catch((e) => toast(e.message));
  }, [invoiceId]);

  const setLine = (key: number, patch: Partial<Line>) =>
    setLines((p) => p.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const totals = useMemo(() => {
    const rows = lines.map((l) => ({
      amount: round2(Number(l.qty || 0) * Number(l.rate || 0)),
      gst: Number(l.gst_rate || 0),
    }));
    const subtotal = round2(rows.reduce((s, r) => s + r.amount, 0));
    let tax = 0;
    for (const r of rows) tax += round2((r.amount * r.gst) / 100);
    return { subtotal, tax: round2(tax), total: round2(subtotal + tax) };
  }, [lines]);

  const clientOpts = clients.map((c) => ({ value: String(c.id), label: c.name }));
  const companyOpts = companies.map((c) => ({ value: String(c.id), label: c.name }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !clientId) return toast("Pick a company and a client");
    const items = lines
      .map((l) => ({
        product_id: l.product_id || null,
        description: l.description.trim(),
        hsn: l.hsn.trim() || null,
        qty: Number(l.qty || 0),
        rate: Number(l.rate || 0),
        gst_rate: Number(l.gst_rate || 0),
      }))
      .filter((l) => l.description && l.qty > 0);
    if (items.length === 0) return toast("Enter at least one returned item with qty > 0");

    setBusy(true);
    try {
      const r = await api("/returns", {
        method: "POST",
        body: JSON.stringify({
          company_id: Number(companyId),
          client_id: Number(clientId),
          invoice_id: invoiceId ? Number(invoiceId) : null,
          reason,
          notes: notes.trim() || undefined,
          items,
        }),
      });
      if (onDone) {
        toast(`Return ${r.number} · balance ${formatINR(r.client_balance)}`);
        setLines([newLine()]);
        setInvoiceId("");
        setNotes("");
        onDone({ number: r.number, client_balance: r.client_balance, id: r.id });
      } else {
        toast(`Return ${r.number} — client balance ${formatINR(r.client_balance)}`);
        navigate(`/invoicing/clients/${clientId}`);
      }
    } catch (err: any) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col lg:flex-row gap-4 items-start">
      <div className="flex-1 min-w-0 w-full space-y-4">
        <div className="bg-white p-4.5 rounded-lg border border-line space-y-3">
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {!locked && (
              <>
                <div>
                  <label className={labelCls}>Company</label>
                  <SearchSelect
                    value={companyId}
                    onChange={setCompanyId}
                    options={companyOpts}
                    placeholder="Select company…"
                  />
                </div>
                <div>
                  <label className={labelCls}>Client</label>
                  <SearchSelect
                    value={clientId}
                    onChange={setClientId}
                    options={clientOpts}
                    placeholder={companyId ? "Select client…" : "Pick a company first"}
                    disabled={!companyId}
                  />
                </div>
              </>
            )}
            <div>
              <label className={labelCls}>Against Invoice (optional)</label>
              <select
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                className={inputCls}
                disabled={!clientId}
              >
                <option value="">— not linked —</option>
                {invoices.map((iv) => (
                  <option key={iv.id} value={iv.id}>
                    {iv.number || `#${iv.id}`} · {formatINR(iv.total)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                className={inputCls}
              >
                {REASONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Note (optional)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputCls}
                placeholder="e.g. courier damage, customer changed mind…"
              />
            </div>
          </div>
          <p className="text-[11.5px] text-muted">
            Return date is always today. A credit note reduces the client's balance. Non-damaged
            reasons restock inventory automatically.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-line">
          <div className="px-4 py-3 border-b border-line text-[13.5px] font-semibold text-ink">
            Returned Items {invoiceId && "(set the qty being returned for each line)"}
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
                {lines.map((l) => {
                  const amount = Number(l.qty || 0) * Number(l.rate || 0);
                  return (
                    <tr key={l.key}>
                      <td className="px-2 py-2 border-b border-line align-top">
                        <input
                          value={l.description}
                          onChange={(e) => setLine(l.key, { description: e.target.value })}
                          placeholder="Item name"
                          className={`${inputCls} py-1.5`}
                        />
                      </td>
                      <td className="px-2 py-2 border-b border-line align-top">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={l.qty}
                          onChange={(e) => setLine(l.key, { qty: e.target.value })}
                          className={`${inputCls} no-spinner px-1.5 py-1.5 text-right`}
                        />
                      </td>
                      <td className="px-2 py-2 border-b border-line align-top">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={l.rate}
                          onChange={(e) => setLine(l.key, { rate: e.target.value })}
                          className={`${inputCls} no-spinner px-1.5 py-1.5 text-right`}
                        />
                      </td>
                      <td className="px-2 py-2 border-b border-line align-top">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={l.gst_rate}
                          onChange={(e) => setLine(l.key, { gst_rate: e.target.value })}
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
                            setLines((p) => (p.length === 1 ? p : p.filter((x) => x.key !== l.key)))
                          }
                          disabled={lines.length === 1}
                          className="text-muted hover:text-negative p-1 rounded hover:bg-negative-soft disabled:opacity-30"
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
              onClick={() => setLines((p) => [...p, newLine()])}
              className="text-[12.5px] font-medium text-primary hover:bg-primary-soft px-2 py-1 rounded"
            >
              + Add line
            </button>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-80 lg:shrink-0 lg:sticky lg:top-4 space-y-4">
        <div className="bg-white rounded-lg border border-line p-4 space-y-3">
          <div className="text-[13px] space-y-1">
            <div className="flex justify-between">
              <span className="text-muted">Sub Total</span>
              <span className="tabular-nums">{formatINR(totals.subtotal)}</span>
            </div>
            {totals.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">Total GST</span>
                <span className="tabular-nums">{formatINR(totals.tax)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-1.5 mt-1 font-bold text-negative text-[15px]">
              <span>Credit Total</span>
              <span className="tabular-nums">{formatINR(totals.total)}</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-negative text-white px-4.5 py-2.5 rounded-md font-semibold text-[13px] hover:opacity-90 disabled:opacity-50"
          >
            Create Return
          </button>
        </div>
      </div>
    </form>
  );
}
