import { useEffect, useState } from "react";
import { Building2, Pencil, Trash2 } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { confirmDialog } from "../../confirm";
import { CompanyModal, type CompanyRow } from "./modals";

export default function Companies() {
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; edit: CompanyRow | null }>({
    open: false,
    edit: null,
  });

  const load = () => {
    setLoading(true);
    api("/companies")
      .then(setRows)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const remove = async (c: CompanyRow) => {
    const ok = await confirmDialog({
      title: `Delete "${c.name}"?`,
      message: "This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/companies/${c.id}`, { method: "DELETE" });
      toast(`Deleted "${c.name}"`);
      load();
    } catch (err: any) {
      toast(err.message);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[1.3rem] font-bold text-ink flex items-center gap-2">
          <Building2 size={20} className="text-primary" /> Companies
        </h1>
        <button
          onClick={() => setModal({ open: true, edit: null })}
          className="bg-primary text-white px-3.5 py-2 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6] transition-colors"
        >
          New Company
        </button>
      </div>
      <p className="text-[13px] text-muted -mt-1">
        The entities that issue your invoices. A company on an invoice can&apos;t be deleted.
      </p>

      <div className="bg-white rounded-lg border border-line overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted text-[13px]">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted text-[13px]">No companies yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="text-[12px] font-semibold text-muted">
                  <th className="px-4 py-2.5 border-b border-line">Name</th>
                  <th className="px-4 py-2.5 border-b border-line">Contact</th>
                  <th className="px-4 py-2.5 border-b border-line">GSTIN</th>
                  <th className="px-4 py-2.5 border-b border-line w-20"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-hover transition-colors">
                    <td className="px-4 py-3 font-medium text-ink border-b border-line">
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-muted border-b border-line">
                      {c.phone || c.email ? (
                        <>
                          {c.phone && <div>{c.phone}</div>}
                          {c.email && <div className="text-[11.5px]">{c.email}</div>}
                        </>
                      ) : (
                        <span className="text-[11.5px] italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted border-b border-line">{c.gstin || "—"}</td>
                    <td className="px-4 py-3 text-right border-b border-line whitespace-nowrap">
                      <button
                        onClick={() => setModal({ open: true, edit: c })}
                        className="text-muted hover:text-primary p-1 rounded hover:bg-primary-soft transition-colors"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => remove(c)}
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
        <CompanyModal
          initial={modal.edit}
          onClose={() => setModal({ open: false, edit: null })}
          onSaved={load}
        />
      )}
    </div>
  );
}
