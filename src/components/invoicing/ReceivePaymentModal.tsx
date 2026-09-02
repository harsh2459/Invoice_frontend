import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { formatINR } from "../../format";
import PaymentModeFields, { emptyPayMode, type PaymentModeValue } from "./PaymentModeFields";

/**
 * Record an on-account payment from a client. FIFO-applies to their oldest
 * unpaid invoices; any leftover is held as an advance. Produces a receipt.
 */
export default function ReceivePaymentModal({
  clientId,
  clientName,
  companyId,
  priorDue,
  onClose,
  onSaved,
}: {
  clientId: number;
  clientName?: string | null;
  companyId?: number | null;
  priorDue?: number;
  onClose: () => void;
  onSaved: (r: { number: string; amount: number; client_balance: number; unapplied: number }) => void;
}) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [pay, setPay] = useState<PaymentModeValue>(emptyPayMode);
  const [banks, setBanks] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (companyId) {
      api(`/bank-accounts?company_id=${companyId}`).then(setBanks).catch(() => setBanks([]));
    }
  }, [companyId]);

  const amt = Number(amount || 0);
  const due = Number(priorDue || 0);
  const balanceAfter = Math.round((due - amt) * 100) / 100;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
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
          company_id: companyId || undefined,
        }),
      });
      toast(
        r.unapplied > 0.009
          ? `Receipt ${r.number} — ${formatINR(r.unapplied)} kept as advance`
          : `Receipt ${r.number} recorded`
      );
      onSaved(r);
      onClose();
    } catch (err: any) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-line w-full max-w-sm p-4.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1.05rem] font-bold text-ink">Receive Payment</h2>
          <button onClick={onClose} className="text-muted hover:text-ink p-1">
            <X size={18} />
          </button>
        </div>

        {clientName && (
          <div className="text-[12.5px] text-muted mb-3">
            From <span className="text-ink font-medium">{clientName}</span>
          </div>
        )}
        {due > 0 && (
          <div className="text-[12.5px] mb-3 flex justify-between bg-hover rounded-md px-2.5 py-1.5">
            <span className="text-muted">Currently owes</span>
            <span className="tabular-nums font-semibold text-negative">{formatINR(due)}</span>
          </div>
        )}

        <form onSubmit={save} className="space-y-3">
          <div>
            <div className="text-[12.5px] font-semibold text-ink mb-1.5">Amount received</div>
            <input
              autoFocus
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`${inputCls} no-spinner`}
            />
            {due > 0 && (
              <button
                type="button"
                onClick={() => setAmount(String(due))}
                className="text-[11.5px] text-primary hover:underline mt-1"
              >
                Pay full outstanding ({formatINR(due)})
              </button>
            )}
          </div>

          <PaymentModeFields value={pay} onChange={setPay} banks={banks} compact />

          <div>
            <div className="text-[12.5px] font-semibold text-ink mb-1.5">Note (optional)</div>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="anything to remember"
              className={inputCls}
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
                ? `Client fully settled${balanceAfter < -0.009 ? ` · ${formatINR(-balanceAfter)} advance` : ""}`
                : `Balance after: ${formatINR(balanceAfter)}`}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="bg-primary text-white px-4 py-2 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6] disabled:opacity-50"
            >
              Record Payment
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
