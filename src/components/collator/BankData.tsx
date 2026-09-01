/**
 * Collator bank-transaction browser. Per-row inline ledger assignment + bulk
 * assign; filters (search / kind / group / ledger / bank / dates / uncategorized).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Landmark } from "lucide-react";
import { api } from "../../api";
import { toast } from "../../toast";
import { formatINR, formatDate } from "../../format";
import { DataTable, CompanyFilter, PageHeader, type Column } from "./shared";

type Txn = {
  id: number;
  transaction_date: string;
  description: string | null;
  ref_number: string | null;
  debit: number | string;
  credit: number | string;
  balance: number | string | null;
  bank_name: string | null;
  ledger_head_id: number | null;
  ledger_head_name: string | null;
  ledger_group_name: string | null;
};
type Ledger = { id: number; name: string; group_name: string | null };
type Group = { id: number; name: string };

export default function BankData() {
  const [rows, setRows] = useState<Txn[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState({ debit: 0, credit: 0 });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [banks, setBanks] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [groupId, setGroupId] = useState("");
  const [ledgerId, setLedgerId] = useState(""); // "" all, "unc" uncategorized, or id
  const [bank, setBank] = useState("");
  const [company, setCompany] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkLedger, setBulkLedger] = useState("");

  useEffect(() => {
    api("/collator/ledger/ledgers").then(setLedgers).catch(() => {});
    api("/collator/ledger/groups").then(setGroups).catch(() => {});
    api("/collator/data/bank/banks").then(setBanks).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    p.set("skip", String(page * 50));
    p.set("limit", "50");
    if (search) p.set("search", search);
    if (kind) p.set("txn_kind", kind);
    if (groupId) p.set("group_id", groupId);
    if (ledgerId === "unc") p.set("uncategorized", "true");
    else if (ledgerId) p.set("ledger_head_id", ledgerId);
    if (bank) p.set("bank_name", bank);
    if (company) p.set("company_id", company);
    if (from) p.set("date_from", from);
    if (to) p.set("date_to", to);
    api(`/collator/data/bank?${p}`)
      .then((d) => {
        setRows(d.rows);
        setTotal(d.total);
        setTotals(d.totals);
      })
      .catch((e) => toast(e.message))
      .finally(() => setLoading(false));
  }, [page, search, kind, groupId, ledgerId, bank, company, from, to]);
  useEffect(load, [load]);
  useEffect(() => {
    setPage(0);
    setSelected(new Set());
  }, [search, kind, groupId, ledgerId, bank, company, from, to]);

  const ledgersInGroup = useMemo(
    () => (groupId ? ledgers.filter((l) => groups.find((g) => String(g.id) === groupId)?.name === l.group_name) : ledgers),
    [ledgers, groups, groupId]
  );

  const assignOne = async (t: Txn, lid: string) => {
    try {
      await api(`/collator/ledger/transactions/${t.id}/assign`, {
        method: "PUT",
        body: JSON.stringify({ ledger_id: lid ? Number(lid) : null }),
      });
      setRows((rs) =>
        rs.map((r) =>
          r.id === t.id
            ? {
                ...r,
                ledger_head_id: lid ? Number(lid) : null,
                ledger_head_name: lid ? ledgers.find((l) => String(l.id) === lid)?.name ?? null : null,
              }
            : r
        )
      );
    } catch (e: any) {
      toast(e.message);
    }
  };

  const bulkAssign = async (toLedger: string | null) => {
    try {
      const body: any = toLedger ? { ledger_id: Number(toLedger) } : { ledger_id: null };
      if (selected.size) body.transaction_ids = [...selected];
      else {
        if (search) body.search = search;
        if (kind) body.txn_kind = kind;
        if (bank) body.bank_name = bank;
        if (company) body.company_id = Number(company);
        if (from) body.date_from = from;
        if (to) body.date_to = to;
        if (ledgerId === "unc") body.uncategorized_filter = true;
        else if (ledgerId) body.ledger_filter = Number(ledgerId);
        else if (groupId) body.group_filter = Number(groupId);
      }
      const r = await api("/collator/ledger/transactions/bulk-assign", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast(`${r.transactions_updated} transactions updated`);
      setSelected(new Set());
      setBulkLedger("");
      load();
    } catch (e: any) {
      toast(e.message);
    }
  };

  const columns: Column<Txn>[] = useMemo(
    () => [
      {
        key: "sel",
        label: (
          <input
            type="checkbox"
            checked={rows.length > 0 && selected.size === rows.length}
            onChange={(e) =>
              setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())
            }
          />
        ) as any,
        render: (r) => (
          <input
            type="checkbox"
            checked={selected.has(r.id)}
            onChange={(e) => {
              const n = new Set(selected);
              e.target.checked ? n.add(r.id) : n.delete(r.id);
              setSelected(n);
            }}
          />
        ),
      },
      { key: "transaction_date", label: "Date", render: (r) => formatDate(r.transaction_date) },
      {
        key: "description",
        label: "Description",
        render: (r) => (
          <span className="block max-w-[360px] truncate" title={r.description || ""}>
            {r.description || "—"}
          </span>
        ),
      },
      {
        key: "ledger",
        label: "Ledger",
        render: (r) => (
          <select
            value={r.ledger_head_id ?? ""}
            onChange={(e) => assignOne(r, e.target.value)}
            className={`px-1.5 py-1 border rounded text-[12px] bg-white max-w-[150px] ${
              r.ledger_head_id ? "border-line" : "border-negative text-negative"
            }`}
          >
            <option value="">— Uncategorized —</option>
            {ledgers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        ),
      },
      { key: "ledger_group_name", label: "Group", render: (r) => r.ledger_group_name || "—" },
      { key: "ref_number", label: "Ref #", render: (r) => r.ref_number || "—" },
      { key: "debit", label: "Debit", align: "right", render: (r) => (Number(r.debit) ? <span className="text-negative">{formatINR(r.debit)}</span> : "—") },
      { key: "credit", label: "Credit", align: "right", render: (r) => (Number(r.credit) ? <span className="text-positive">{formatINR(r.credit)}</span> : "—") },
      { key: "balance", label: "Balance", align: "right", render: (r) => (r.balance == null ? "—" : formatINR(r.balance)) },
      { key: "bank_name", label: "Bank" },
    ],
    [rows, selected, ledgers]
  );

  const selCls =
    "px-2.5 py-1.5 border border-line rounded-md text-[12.5px] bg-white focus:outline-none focus:border-primary";

  return (
    <div className="space-y-4">
      <PageHeader title="Bank Transactions" icon={<Landmark size={20} className="text-primary" />}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Description, ref #…" className={`${selCls} w-48`} />
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={selCls}>
          <option value="">Debit + Credit</option>
          <option value="debit">Debit only</option>
          <option value="credit">Credit only</option>
        </select>
        <select value={groupId} onChange={(e) => { setGroupId(e.target.value); setLedgerId(""); }} className={selCls}>
          <option value="">All groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <select value={ledgerId} onChange={(e) => setLedgerId(e.target.value)} className={selCls}>
          <option value="">All ledgers</option>
          <option value="unc">Uncategorized</option>
          {ledgersInGroup.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <select value={bank} onChange={(e) => setBank(e.target.value)} className={selCls}>
          <option value="">All banks</option>
          {banks.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selCls} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selCls} />
        <CompanyFilter value={company} onChange={setCompany} />
      </PageHeader>

      {(selected.size > 0 || ledgerId === "unc" || groupId) && (
        <div className="bg-primary-soft border border-primary/20 rounded-lg px-3 py-2 flex items-center gap-2 text-[12.5px]">
          <span className="font-medium">
            {selected.size > 0
              ? `${selected.size} selected`
              : `all ${total} matching`}
          </span>
          <span className="text-muted">assign to</span>
          <select value={bulkLedger} onChange={(e) => setBulkLedger(e.target.value)} className={selCls}>
            <option value="">— pick ledger —</option>
            {ledgers.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <button
            onClick={() => bulkLedger && bulkAssign(bulkLedger)}
            disabled={!bulkLedger}
            className="px-2.5 py-1 rounded bg-primary text-white font-semibold disabled:opacity-40"
          >
            Assign
          </button>
          <button
            onClick={() => bulkAssign(null)}
            className="px-2.5 py-1 rounded border border-line text-muted hover:text-ink"
          >
            Set Uncategorized
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        setPage={setPage}
        loading={loading}
        empty="No bank transactions. Upload a bank statement PDF/XML on the Import page."
        totals={[
          { label: "Total Debit", value: formatINR(totals.debit) },
          { label: "Total Credit", value: formatINR(totals.credit) },
          { label: "Net", value: formatINR(totals.credit - totals.debit) },
        ]}
      />
    </div>
  );
}
