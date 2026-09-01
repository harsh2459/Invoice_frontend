import { useEffect, useState } from "react";
import { Contact, Pencil, Trash2 } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { confirmDialog } from "../../confirm";
import { ClientModal } from "./modals";

interface Client {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  company_count?: number;
}

export default function Clients() {
  const [rows, setRows] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editId: number | null }>({
    open: false,
    editId: null,
  });

  const load = () => {
    setLoading(true);
    Promise.all([api("/clients"), api("/companies")])
      .then(([cl, co]) => {
        setRows(cl);
        setCompanies(co);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const remove = async (c: Client) => {
    const ok = await confirmDialog({
      title: `Delete "${c.name}"?`,
      message: "This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/clients/${c.id}`, { method: "DELETE" });
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
          <Contact size={20} className="text-primary" /> Clients
        </h1>
        <button
          onClick={() => setModal({ open: true, editId: null })}
          className="bg-primary text-white px-3.5 py-2 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6] transition-colors"
        >
          New Client
        </button>
      </div>
      <p className="text-[13px] text-muted -mt-1">
        Customers you bill. A client can belong to more than one company.
      </p>

      <div className="bg-white rounded-lg border border-line overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted text-[13px]">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted text-[13px]">No clients yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="text-[12px] font-semibold text-muted">
                  <th className="px-4 py-2.5 border-b border-line">Name</th>
                  <th className="px-4 py-2.5 border-b border-line">Contact</th>
                  <th className="px-4 py-2.5 border-b border-line text-right">Companies</th>
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
                    <td className="px-4 py-3 text-right border-b border-line tabular-nums">
                      {c.company_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right border-b border-line whitespace-nowrap">
                      <button
                        onClick={() => setModal({ open: true, editId: c.id })}
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
        <ClientModal
          initialId={modal.editId}
          companies={companies}
          onClose={() => setModal({ open: false, editId: null })}
          onSaved={load}
        />
      )}
    </div>
  );
}