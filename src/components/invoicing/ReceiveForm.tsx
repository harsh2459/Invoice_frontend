import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { toast } from "../../toast";
import { formatINR } from "../../format";
import SearchSelect from "../SearchSelect";
import PaymentModeFields, { emptyPayMode, type PaymentModeValue } from "./PaymentModeFields";

const inputCls =
  "w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";
const labelCls = "block text-[12.5px] font-semibold text-ink mb-1.5";
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export default function ReceiveForm({
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
  const [banks, setBanks] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const [companyId, setCompanyId] = useState(lockCompanyId ? String(lockCompanyId) : "");
  const [clientId, setClientId] = useState(lockClientId ? String(lockClientId) : "");
  const [amount, setAmount] = useState("");
  const [pay, setPay] = useState<PaymentModeValue>(emptyPayMode);
  const [notes, setNotes] = useState("");
  const [priorDue, setPriorDue] = useState(0);

  useEffect(() => {
    api("/companies").then(setCompanies).catch(() => {});
  }, []);
  useEffect(() => {
    if (!locked) setClientId("");
    setPay((p) => ({ ...p, bank_account_id: "" }));
    if (companyId) {
      api(`/companies/${companyId}/clients`).then(setClients).catch(() => setClients([]));
      api(`/bank-accounts?company_id=${companyId}`).then(setBanks).catch(() => setBanks([]));
    } else {
      setClients([]);
      setBanks([]);
    }
  }, [companyId]);
  useEffect(() => {
    if (clientId)
      api(`/invoices/client-balance?client_id=${clientId}`)
        .then((r) => setPriorDue(Number(r?.prior_due || 0)))
        .catch(() => setPriorDue(0));
    else setPriorDue(0);
  }, [clientId]);

  const amt = Number(amount || 0);
  const balanceAfter = round2(priorDue - amt);

  const clientOpts = useMemo(() => clients.map((c) => ({ value: String(c.id), label: c.name })), [clients]);
  const companyOpts = useMemo(
    () => companies.map((c) => ({ value: String(c.id), label: c.name })),
    [companies]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !clientId) return toast("Pick a company and a client");
    if (!(amt > 0)) return toast("Enter an amount");
    setBusy(true);
    try {
      const r = await api(`/clients/${clientId}/receipts`, {
        method: "POST",
        body: JSON.stringify({
          amount: amt,
          notes: notes.trim() || undefined,
          mode: pay.mode,
          reference: pay.reference.trim() || undefined,
          bank_account_id: pay.bank_account_id || undefined,
          company_id: Number(companyId),
        }),
      });
      toast(
        r.unapplied > 0.009
          ? `Receipt ${r.number} — ${formatINR(r.unapplied)} kept as advance`
          : `Receipt ${r.number} recorded`
      );
      if (onDone) {
        setAmount("");
        setNotes("");
        setPay(emptyPayMode);
        onDone({ number: r.number, client_balance: r.client_balance, id: r.id });
      } else {
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
          <div className="grid sm:grid-cols-2 gap-3">
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
              <label className={labelCls}>Note (optional)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="anything to remember about this payment"
                className={inputCls}
              />
            </div>
          </div>
          <div className="border-t border-line pt-3">
            <PaymentModeFields value={pay} onChange={setPay} banks={banks} />
          </div>
          {clientId && priorDue > 0 && (
            <div className="text-[12.5px] flex justify-between bg-hover rounded-md px-2.5 py-1.5">
              <span className="text-muted">This client currently owes</span>
              <span className="tabular-nums font-semibold text-negative">{formatINR(priorDue)}</span>
            </div>
          )}
          <p className="text-[11.5px] text-muted">
            Applied to the client's oldest unpaid invoices first (FIFO). Any surplus is kept as an
            advance. Receipt date is always today.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-80 lg:shrink-0 lg:sticky lg:top-4 space-y-4">
        <div className="bg-white rounded-lg border border-line p-4 space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <label className={labelCls + " mb-0"}>Amount received</label>
              {priorDue > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(priorDue))}
                  className="text-[11.5px] text-primary hover:underline"
                >
                  Full outstanding
                </button>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`${inputCls} no-spinner mt-1.5`}
            />
          </div>
          {amt > 0 && (
            <div
              className={`text-[12px] font-semibold rounded-md px-2.5 py-1.5 ${
                balanceAfter <= 0.009
                  ? "bg-positive-soft text-positive"
                  : "bg-amazon text-amazon-text"
              }`}
            >
              {balanceAfter <= 0.009
                ? `Client settled${balanceAfter < -0.009 ? ` · ${formatINR(-balanceAfter)} advance` : ""}`
                : `Balance after: ${formatINR(balanceAfter)}`}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-positive text-white px-4.5 py-2.5 rounded-md font-semibold text-[13px] hover:opacity-90 disabled:opacity-50"
          >
            Record Payment
          </button>
        </div>
      </div>
    </form>
  );
}
