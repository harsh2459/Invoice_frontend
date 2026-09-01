/**
 * Collator ledger manager — Groups / Ledgers / keyword Rules CRUD, plus a
 * Tally-style two-column ledger sheet with per-ledger balances.
 */
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Plus, Trash2, Pencil, RefreshCw } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { confirmDialog } from "../../confirm";
import { formatINR } from "../../format";
import { PageHeader } from "./shared";

type Group = { id: number; name: string; nature: string; is_default: number };
type Ledger = { id: number; name: string; group_id: number; group_name: string | null; nature: string | null; color: string };
type Rule = { id: number; ledger_id: number; ledger_name: string; keyword: string };
type Sum = { ledger_id: number | null; ledger_name: string; nature: string | null; credit: number; debit: number; count: number };

const NATURES = ["income", "expense", "asset", "liability"];
const inputCls = "w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white";

export default function LedgerManager() {
  const [tab, setTab] = useState<"sheet" | "groups">("sheet");
  const [groups, setGroups] = useState<Group[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [summary, setSummary] = useState<Sum[]>([]);
  const [modal, setModal] = useState<null | { kind: "group" | "ledger" | "rule"; id?: number }>(null);

  const load = () => {
    Promise.all([
      api("/collator/ledger/groups"),
      api("/collator/ledger/ledgers"),
      api("/collator/ledger/rules"),
      api("/collator/ledger/summary"),
    ])
      .then(([g, l, r, s]) => {
        setGroups(g);
        setLedgers(l);
        setRules(r);
        setSummary(s.ledgers);
      })
      .catch((e) => toast(e.message));
  };
  useEffect(load, []);

  const balByLedger = useMemo(() => {
    const m = new Map<number | null, Sum>();
    for (const s of summary) m.set(s.ledger_id, s);
    return m;
  }, [summary]);

  const applyRules = async () => {
    try {
      const r = await api("/collator/ledger/apply-rules", { method: "POST" });
      toast(`${r.transactions_updated} transactions re-assigned`);
      load();
    } catch (e: any) {
      toast(e.message);
    }
  };

  const del = async (kind: "groups" | "ledgers" | "rules", id: number, name: string) => {
    if (!(await confirmDialog({ title: `Delete "${name}"?`, danger: true, confirmLabel: "Delete" }))) return;
    try {
      await api(`/collator/ledger/${kind}/${id}`, { method: "DELETE" });
      toast("Deleted");
      load();
    } catch (e: any) {
      toast(e.message);
    }
  };

  // Tally sheet: left = expense/asset, right = income/liability
  const left = ledgers.filter((l) => l.nature === "expense" || l.nature === "asset");
  const right = ledgers.filter((l) => l.nature === "income" || l.nature === "liability");
  const signed = (l: Ledger) => {
    const b = balByLedger.get(l.id);
    if (!b) return 0;
    return l.nature === "asset" || l.nature === "expense" ? b.debit - b.credit : b.credit - b.debit;
  };
  const unc = balByLedger.get(null);

  const LedgerCol = ({ title, list }: { title: string; list: Ledger[] }) => (
    <div className="bg-white rounded-lg border border-line overflow-hidden">
      <div className="px-4 py-2.5 border-b border-line text-[13px] font-semibold text-ink">{title}</div>
      <table className="w-full text-left border-collapse text-[13px]">
        <tbody>
          {list.length === 0 && (
            <tr><td className="px-4 py-3 text-muted text-[12.5px]">No ledgers.</td></tr>
          )}
          {list.map((l) => {
            const b = balByLedger.get(l.id);
            const myRules = rules.filter((r) => r.ledger_id === l.id);
            return (
              <tr key={l.id} className="border-b border-line/60 align-top">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                    <span className="font-medium text-ink">{l.name}</span>
                    <span className="text-[11px] text-muted">({b?.count ?? 0})</span>
                    <button onClick={() => setModal({ kind: "ledger", id: l.id })} className="text-muted hover:text-primary ml-1"><Pencil size={13} /></button>
                    <button onClick={() => del("ledgers", l.id, l.name)} className="text-muted hover:text-negative"><Trash2 size={13} /></button>
                  </div>
                  {myRules.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {myRules.map((r) => (
                        <span key={r.id} className="text-[10.5px] px-1.5 py-0.5 bg-hover rounded border border-line flex items-center gap-1">
                          {r.keyword}
                          <button onClick={() => del("rules", r.id, r.keyword)} className="text-muted hover:text-negative">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap">
                  {formatINR(signed(l))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Ledger Manager" icon={<BookOpen size={20} className="text-primary" />}>
        <button onClick={applyRules} className="flex items-center gap-1.5 px-2.5 py-1.5 border border-line rounded-md text-[12.5px] text-muted hover:text-ink">
          <RefreshCw size={13} /> Re-apply Rules
        </button>
        <button onClick={() => setModal({ kind: "group" })} className="flex items-center gap-1.5 px-2.5 py-1.5 border border-line rounded-md text-[12.5px]">
          <Plus size={13} /> Group
        </button>
        <button onClick={() => setModal({ kind: "ledger" })} disabled={!groups.length} className="flex items-center gap-1.5 px-2.5 py-1.5 border border-line rounded-md text-[12.5px] disabled:opacity-40">
          <Plus size={13} /> Ledger
        </button>
        <button onClick={() => setModal({ kind: "rule" })} disabled={!ledgers.length} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary text-white rounded-md text-[12.5px] disabled:opacity-40">
          <Plus size={13} /> Rule
        </button>
      </PageHeader>

      <div className="flex gap-1">
        {(["sheet", "groups"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-[12.5px] font-medium ${
              tab === t ? "bg-primary-soft text-primary" : "text-muted hover:bg-hover"
            }`}
          >
            {t === "sheet" ? "Ledgers" : `All Groups (${groups.length})`}
          </button>
        ))}
      </div>

      {tab === "sheet" ? (
        <div className="space-y-3">
          {unc && (
            <div className="bg-amazon border border-amazon-text/20 rounded-lg px-3 py-2 text-[12.5px] text-amazon-text">
              {unc.count} uncategorized transactions ({formatINR(unc.credit + unc.debit)}) — assign
              them from Bank Transactions.
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <LedgerCol title="Expense / Asset" list={left} />
            <LedgerCol title="Income / Liability" list={right} />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-hidden">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="text-[12px] font-semibold text-muted">
                <th className="px-4 py-2.5 border-b border-line">Group</th>
                <th className="px-4 py-2.5 border-b border-line">Nature</th>
                <th className="px-4 py-2.5 border-b border-line text-right">Ledgers</th>
                <th className="px-4 py-2.5 border-b border-line">Source</th>
                <th className="px-4 py-2.5 border-b border-line w-20"></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} className="hover:bg-hover">
                  <td className="px-4 py-2.5 border-b border-line font-medium text-ink">{g.name}</td>
                  <td className="px-4 py-2.5 border-b border-line">
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-hover border border-line capitalize">
                      {g.nature}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 border-b border-line text-right tabular-nums">
                    {ledgers.filter((l) => l.group_id === g.id).length}
                  </td>
                  <td className="px-4 py-2.5 border-b border-line text-muted text-[12px]">
                    {g.is_default ? "Standard (Tally)" : "Custom"}
                  </td>
                  <td className="px-4 py-2.5 border-b border-line text-right whitespace-nowrap">
                    <button onClick={() => setModal({ kind: "group", id: g.id })} className="text-muted hover:text-primary p-1"><Pencil size={14} /></button>
                    {!g.is_default && (
                      <button onClick={() => del("groups", g.id, g.name)} className="text-muted hover:text-negative p-1"><Trash2 size={14} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <LedgerModal
          modal={modal}
          groups={groups}
          ledgers={ledgers}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function LedgerModal({
  modal,
  groups,
  ledgers,
  onClose,
  onSaved,
}: {
  modal: { kind: "group" | "ledger" | "rule"; id?: number };
  groups: Group[];
  ledgers: Ledger[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const editG = modal.kind === "group" ? groups.find((g) => g.id === modal.id) : undefined;
  const editL = modal.kind === "ledger" ? ledgers.find((l) => l.id === modal.id) : undefined;
  const [form, setForm] = useState<any>(
    modal.kind === "group"
      ? { name: editG?.name || "", nature: editG?.nature || "expense" }
      : modal.kind === "ledger"
      ? { name: editL?.name || "", group_id: editL?.group_id || groups[0]?.id || "", color: editL?.color || "#1a6fd4" }
      : { ledger_id: ledgers[0]?.id || "", keywords: "" }
  );
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (modal.kind === "group") {
        if (!form.name.trim()) throw new Error("Name required");
        if (modal.id) await api(`/collator/ledger/groups/${modal.id}`, { method: "PUT", body: JSON.stringify(form) });
        else await api("/collator/ledger/groups", { method: "POST", body: JSON.stringify(form) });
      } else if (modal.kind === "ledger") {
        if (!form.name.trim()) throw new Error("Name required");
        if (modal.id) await api(`/collator/ledger/ledgers/${modal.id}`, { method: "PUT", body: JSON.stringify(form) });
        else await api("/collator/ledger/ledgers", { method: "POST", body: JSON.stringify(form) });
      } else {
        if (!form.keywords.trim()) throw new Error("At least one keyword");
        const r = await api("/collator/ledger/rules", { method: "POST", body: JSON.stringify(form) });
        toast(`Rule added — ${r.auto_assigned} transactions matched`);
      }
      onSaved();
    } catch (err: any) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  const title =
    modal.kind === "group"
      ? modal.id
        ? "Edit Group"
        : "New Group"
      : modal.kind === "ledger"
      ? modal.id
        ? "Edit Ledger"
        : "New Ledger"
      : "New Rule";

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg border border-line w-full max-w-sm p-4.5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-[1.05rem] font-bold text-ink mb-3">{title}</h2>
        <form onSubmit={save} className="space-y-3">
          {modal.kind === "group" && (
            <>
              <div>
                <label className="block text-[12.5px] font-semibold text-ink mb-1">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} autoFocus />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-ink mb-1">Nature</label>
                <select value={form.nature} onChange={(e) => setForm({ ...form, nature: e.target.value })} className={inputCls}>
                  {NATURES.map((n) => (
                    <option key={n} value={n} className="capitalize">{n}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          {modal.kind === "ledger" && (
            <>
              <div>
                <label className="block text-[12.5px] font-semibold text-ink mb-1">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} autoFocus />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-ink mb-1">Group</label>
                <select value={form.group_id} onChange={(e) => setForm({ ...form, group_id: Number(e.target.value) })} className={inputCls}>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({g.nature})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-ink mb-1">Colour</label>
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 w-16 border border-line rounded" />
              </div>
            </>
          )}
          {modal.kind === "rule" && (
            <>
              <div>
                <label className="block text-[12.5px] font-semibold text-ink mb-1">Ledger</label>
                <select value={form.ledger_id} onChange={(e) => setForm({ ...form, ledger_id: Number(e.target.value) })} className={inputCls}>
                  {ledgers.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-ink mb-1">Keywords (comma-separated)</label>
                <input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="GOOGLEINDIADIGITAL, GOOGLE ADS" className={inputCls} autoFocus />
                <p className="text-[11px] text-muted mt-1">Any bank transaction whose description contains a keyword gets this ledger.</p>
              </div>
            </>
          )}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={busy} className="bg-primary text-white px-4 py-2 rounded-md font-semibold text-[13px] disabled:opacity-50">
              Save
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-line text-muted text-[13px]">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
