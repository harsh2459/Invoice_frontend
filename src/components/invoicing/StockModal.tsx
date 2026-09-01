/**
 * Stock adjust + movement history for one product.
 */
import { useEffect, useState } from "react";
import { X, Plus, Minus, Loader2 } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { formatDate } from "../../format";

type Movement = {
  id: number;
  change_qty: string | number;
  reason: "purchase" | "sale" | "adjustment" | "opening";
  ref_type: string;
  ref_id: number | null;
  note: string | null;
  balance_after: string | number;
  created_at: string;
  by_name: string | null;
};

const REASON: Record<Movement["reason"], string> = {
  purchase: "Purchase",
  sale: "Sale",
  adjustment: "Adjustment",
  opening: "Opening",
};

export default function StockModal({
  product,
  onClose,
  onChanged,
}: {
  product: { id: number; name: string; unit?: string | null; stock_qty: number | string };
  onClose: () => void;
  onChanged: () => void;
}) {
  const [moves, setMoves] = useState<Movement[] | null>(null);
  const [qty, setQty] = useState("");
  const [dir, setDir] = useState<1 | -1>(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [stock, setStock] = useState(Number(product.stock_qty));

  const loadMoves = () => {
    api(`/products/${product.id}/movements`)
      .then(setMoves)
      .catch(() => setMoves([]));
  };

  useEffect(() => {
    loadMoves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(qty);
    if (!(n > 0)) return toast("Enter a quantity greater than zero");
    setBusy(true);
    try {
      const r = await api(`/products/${product.id}/adjust`, {
        method: "POST",
        body: JSON.stringify({ change_qty: dir * n, note: note.trim() || undefined }),
      });
      setStock(Number(r.stock_qty));
      setQty("");
      setNote("");
      toast("Stock updated");
      loadMoves();
      onChanged();
    } catch (err: any) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  const unit = product.unit ? ` ${product.unit}` : "";
  const inputCls =
    "w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-line w-full max-w-lg p-4.5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[1.05rem] font-bold text-ink">{product.name}</h2>
            <div className="text-[12.5px] text-muted">
              On hand:{" "}
              <span className={`font-semibold ${stock < 0 ? "text-negative" : "text-ink"}`}>
                {stock}
                {unit}
              </span>
              {stock < 0 && <span className="text-negative"> (oversold)</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex items-end gap-2 mb-4">
          <div className="flex rounded-md border border-line overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => setDir(1)}
              className={`px-2.5 py-2 ${dir === 1 ? "bg-positive-soft text-positive" : "text-muted"}`}
              title="Add stock"
            >
              <Plus size={15} />
            </button>
            <button
              type="button"
              onClick={() => setDir(-1)}
              className={`px-2.5 py-2 ${dir === -1 ? "bg-negative-soft text-negative" : "text-muted"}`}
              title="Remove stock"
            >
              <Minus size={15} />
            </button>
          </div>
          <input
            type="number"
            step="0.001"
            min="0"
            placeholder="Qty"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className={`${inputCls} w-24`}
          />
          <input
            placeholder="Note (e.g. damaged, recount)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputCls}
          />
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 bg-primary text-white px-3.5 py-2 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6] disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
          </button>
        </form>

        <div className="text-[12px] font-semibold text-muted mb-1.5">Movement history</div>
        {!moves ? (
          <div className="py-4 text-center text-muted text-[12.5px]">
            <Loader2 size={14} className="inline animate-spin" /> loading…
          </div>
        ) : moves.length === 0 ? (
          <div className="py-4 text-center text-muted text-[12.5px]">No movements yet.</div>
        ) : (
          <div className="border border-line rounded-md overflow-hidden">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead>
                <tr className="text-[11px] font-semibold text-muted bg-hover">
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Change</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                  <th className="px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {moves.map((m) => {
                  const chg = Number(m.change_qty);
                  return (
                    <tr key={m.id} className="border-t border-line/60">
                      <td className="px-3 py-2 whitespace-nowrap text-muted">
                        {formatDate(m.created_at)}
                      </td>
                      <td className="px-3 py-2">
                        {REASON[m.reason]}
                        {m.ref_id ? (
                          <span className="text-muted"> #{m.ref_id}</span>
                        ) : null}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums font-semibold ${
                          chg >= 0 ? "text-positive" : "text-negative"
                        }`}
                      >
                        {chg >= 0 ? "+" : ""}
                        {chg}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.balance_after}</td>
                      <td className="px-3 py-2 text-muted truncate max-w-[140px]">
                        {m.note || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
