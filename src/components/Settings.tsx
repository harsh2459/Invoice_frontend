import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../api";
import { toast } from "../toast";
import { confirmDialog } from "../confirm";

interface Item {
  id: number;
  name: string;
}

const inputCls =
  "w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

function ListPanel({
  title,
  endpoint,
  addLabel,
}: {
  title: string;
  endpoint: string;
  addLabel: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api(endpoint)
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(load, [endpoint]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    setBusy(true);
    try {
      await api(endpoint, { method: "POST", body: JSON.stringify({ name }) });
      setDraft("");
      toast(`Added "${name}"`);
      load();
    } catch (err: any) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: Item) => {
    const ok = await confirmDialog({
      title: `Delete "${item.name}"?`,
      message: "It will no longer appear in the dropdown.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`${endpoint}/${item.id}`, { method: "DELETE" });
      toast(`Deleted "${item.name}"`);
      load();
    } catch (err: any) {
      toast(err.message);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-line overflow-hidden">
      <div className="px-4 py-3.5 border-b border-line">
        <h2 className="text-[13.5px] font-semibold text-ink">{title}</h2>
      </div>

      <form onSubmit={add} className="flex gap-2 p-4 border-b border-line">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={addLabel}
          className={inputCls}
        />
        <button
          type="submit"
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-white text-[13px] font-semibold hover:bg-[#1B7FD6] disabled:opacity-50 flex-shrink-0"
        >
          <Plus size={16} />
          Add
        </button>
      </form>

      {loading ? (
        <div className="p-6 text-center text-muted text-[13px]">Loading...</div>
      ) : items.length === 0 ? (
        <div className="p-6 text-center text-muted text-[13px]">Nothing yet.</div>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[13px] text-ink">{it.name}</span>
              <button
                onClick={() => remove(it)}
                className="text-muted hover:text-negative p-1.5 rounded hover:bg-negative-soft transition-colors"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Settings() {
  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-[1.3rem] font-bold text-ink">Settings</h1>
      <p className="text-[13px] text-muted -mt-1">
        Manage the options that appear in the New Entry dropdowns. A platform or category that is
        already used on an entry can&apos;t be deleted.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <ListPanel title="Marketplace Platforms" endpoint="/platforms" addLabel="New platform" />
        <ListPanel title="Expense Categories" endpoint="/categories" addLabel="New category" />
      </div>
    </div>
  );
}
