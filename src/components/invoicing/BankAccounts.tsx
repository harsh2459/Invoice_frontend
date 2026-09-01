import { useEffect, useState } from "react";
import { Landmark, Pencil, Trash2 } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { confirmDialog } from "../../confirm";
import { BankAccountModal, type BankAccountRow } from "./modals";

export default function BankAccounts() {
  const [rows, setRows] = useState<BankAccountRow[]>([]);
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editId: number | null }>({
    open: false,
    editId: null,
  });

  const load = () => {
    setLoading(true);
    Promise.all([api("/bank-accounts"), api("/companies")])
      .then(([ba, co]) => {
        setRows(ba);
        setCompanies(co);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const remove = async (b: BankAccountRow) => {
    const ok = await confirmDialog({
      title: `Delete "${b.name}"?`,
      message: "This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/bank-accounts/${b.id}`, { method: "DELETE" });
      toast(`Deleted "${b.name}"`);
      load();
    } catch (err: any) {
      toast(err.message);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[1.3rem] font-bold text-ink flex items-center gap-2">
          <Landmark size={20} className="text-primary" /> Bank Accounts
        </h1>
        <button
          onClick={() => setModal({ open: true, editId: null })}
          className="bg-primary text-white px-3.5 py-2 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6] transition-colors"
        >
          New Bank Account
        </button>
      </div>
      <p className="text-[13px] text-muted -mt-1">
        Each account belongs to one company. When you record an invoice payment you pick which
        account received the money.
      </p>

      <div className="bg-white rounded-lg border border-line overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted text-[13px]">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted text-[13px]">No bank accounts yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="text-[12px] font-semibold text-muted">
                  <th className="px-4 py-2.5 border-b border-line">Name</th>
                  <th className="px-4 py-2.5 border-b border-line">A/C</th>
                  <th className="px-4 py-2.5 border-b border-line">Company</th>
                  <th className="px-4 py-2.5 border-b border-line w-20"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id} className="hover:bg-hover transition-colors">
                    <td className="px-4 py-3 font-medium text-ink border-b border-line">
                      {b.name}
                    </td>
                    <td className="px-4 py-3 text-muted border-b border-line tabular-nums">
                      {b.last4 ? `••••${b.last4}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink border-b border-line">
                      {b.company_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-right border-b border-line whitespace-nowrap">
                      <button
                        onClick={() => setModal({ open: true, editId: b.id })}
                        className="text-muted hover:text-primary p-1 rounded hover:bg-primary-soft transition-colors"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => remove(b)}
                        className="text-muted hover:text-negative p-1 rounded hover:bg-negative-soft transition-colors ml-1"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.open && (
        <BankAccountModal
          initialId={modal.editId}
          companies={companies}
          onClose={() => setModal({ open: false, editId: null })}
          onSaved={load}
        />
      )}
    </div>
  );
}
