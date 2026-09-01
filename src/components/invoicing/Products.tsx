import { useEffect, useMemo, useState } from "react";
import { Package, Pencil, Trash2, Boxes, AlertTriangle } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { confirmDialog } from "../../confirm";
import { formatINR } from "../../format";
import { ProductModal } from "./modals";
import StockModal from "./StockModal";

interface Product {
  id: number;
  name: string;
  unit?: string | null;
  default_rate: number | string;
  company_count?: number;
  track_stock?: number | boolean;
  stock_qty?: number | string;
  reorder_level?: number | string;
}

export default function Products() {
  const [rows, setRows] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editId: number | null }>({
    open: false,
    editId: null,
  });
  const [stockFor, setStockFor] = useState<Product | null>(null);
  const [onlyLow, setOnlyLow] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api("/products"), api("/companies")])
      .then(([pr, co]) => {
        setRows(pr);
        setCompanies(co);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const isLow = (p: Product) =>
    !!p.track_stock && Number(p.stock_qty) <= Number(p.reorder_level);
  const lowCount = useMemo(() => rows.filter(isLow).length, [rows]);
  const shown = onlyLow ? rows.filter(isLow) : rows;

  const remove = async (p: Product) => {
    const ok = await confirmDialog({
      title: `Delete "${p.name}"?`,
      message: "This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/products/${p.id}`, { method: "DELETE" });
      toast(`Deleted "${p.name}"`);
      load();
    } catch (err: any) {
      toast(err.message);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[1.3rem] font-bold text-ink flex items-center gap-2">
          <Package size={20} className="text-primary" /> Products
          {lowCount > 0 && (
            <button
              onClick={() => setOnlyLow((v) => !v)}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                onlyLow
                  ? "bg-negative text-white"
                  : "bg-negative-soft text-negative hover:opacity-90"
              }`}
              title="Show only low-stock items"
            >
              <AlertTriangle size={12} /> {lowCount} low on stock
            </button>
          )}
        </h1>
        <button
          onClick={() => setModal({ open: true, editId: null })}
          className="bg-primary text-white px-3.5 py-2 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6] transition-colors"
        >
          New Product
        </button>
      </div>
      <p className="text-[13px] text-muted -mt-1">
        Catalog for invoice line items. Enable <span className="font-semibold">Track stock</span> on
        a product and it goes up with purchases, down with sales.
      </p>

      <div className="bg-white rounded-lg border border-line overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted text-[13px]">Loading...</div>
        ) : shown.length === 0 ? (
          <div className="p-8 text-center text-muted text-[13px]">
            {rows.length === 0 ? "No products yet." : "No products match."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="text-[12px] font-semibold text-muted">
                  <th className="px-4 py-2.5 border-b border-line">Name</th>
                  <th className="px-4 py-2.5 border-b border-line">Unit</th>
                  <th className="px-4 py-2.5 border-b border-line text-right">Default Rate</th>
                  <th className="px-4 py-2.5 border-b border-line text-right">In Stock</th>
                  <th className="px-4 py-2.5 border-b border-line text-right">Reorder</th>
                  <th className="px-4 py-2.5 border-b border-line text-right">Companies</th>
                  <th className="px-4 py-2.5 border-b border-line w-28"></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => {
                  const tracked = !!p.track_stock;
                  const low = isLow(p);
                  const qty = Number(p.stock_qty);
                  return (
                    <tr key={p.id} className="hover:bg-hover transition-colors">
                      <td className="px-4 py-3 font-medium text-ink border-b border-line">
                        {p.name}
                      </td>
                      <td className="px-4 py-3 text-muted border-b border-line">{p.unit || "—"}</td>
                      <td className="px-4 py-3 text-right border-b border-line tabular-nums">
                        {formatINR(p.default_rate)}
                      </td>
                      <td className="px-4 py-3 text-right border-b border-line tabular-nums">
                        {tracked ? (
                          <span
                            className={`font-semibold ${
                              qty < 0 ? "text-negative" : low ? "text-amazon-text" : "text-ink"
                            }`}
                          >
                            {qty}
                          </span>
                        ) : (
                          <span className="text-muted/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right border-b border-line tabular-nums text-muted">
                        {tracked ? Number(p.reorder_level) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right border-b border-line tabular-nums">
                        {p.company_count ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right border-b border-line whitespace-nowrap">
                        {tracked && (
                          <button
                            onClick={() => setStockFor(p)}
                            className="text-muted hover:text-primary p-1 rounded hover:bg-primary-soft transition-colors"
                            title="Adjust stock / history"
                          >
                            <Boxes size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => setModal({ open: true, editId: p.id })}
                          className="text-muted hover:text-primary p-1 rounded hover:bg-primary-soft transition-colors ml-1"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => remove(p)}
                          className="text-muted hover:text-negative p-1 rounded hover:bg-negative-soft transition-colors ml-1"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.open && (
        <ProductModal
          initialId={modal.editId}
          companies={companies}
          onClose={() => setModal({ open: false, editId: null })}
          onSaved={load}
        />
      )}
      {stockFor && (
        <StockModal
          product={{
            id: stockFor.id,
            name: stockFor.name,
            unit: stockFor.unit,
            stock_qty: stockFor.stock_qty ?? 0,
          }}
          onClose={() => setStockFor(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
