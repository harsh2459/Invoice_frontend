import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Check, X, ChevronDown } from "lucide-react";
import { api } from "../api";
import { toast } from "../toast";

interface Option {
  value: string;
  label: string;
}

/**
 * A searchable combobox plus an inline "+ Add" affordance. Type to filter the
 * options; pick one from the dropdown. When the user adds a value it is POSTed to
 * `endpoint`, appended to the list via `onAdded`, and selected.
 */
export default function SelectWithAdd({
  value,
  onChange,
  options,
  onAdded,
  endpoint,
  placeholder = "Select...",
  addLabel = "Add new",
  buildBody = (name) => ({ name }),
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  onAdded: (opt: { id: number; name: string }) => void;
  endpoint: string;
  placeholder?: string;
  addLabel?: string;
  buildBody?: (name: string) => Record<string, unknown>;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const inputCls =
    "w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  // Close the dropdown on any outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [search, open]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setSearch("");
  };

  const submit = async () => {
    const name = draft.trim();
    if (!name) return;
    setBusy(true);
    try {
      const created = await api(endpoint, {
        method: "POST",
        body: JSON.stringify(buildBody(name)),
      });
      onAdded(created);
      onChange(String(created.id));
      setDraft("");
      setAdding(false);
      toast(`Added "${created.name}"`);
    } catch (err: any) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (adding) {
    return (
      <div className="flex gap-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") setAdding(false);
          }}
          placeholder={addLabel}
          className={inputCls}
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="px-2.5 rounded-md bg-primary text-white disabled:opacity-50"
          title="Save"
        >
          <Check size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            setAdding(false);
            setDraft("");
          }}
          className="px-2.5 rounded-md border border-line text-muted"
          title="Cancel"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <div ref={wrapRef} className="relative flex-1">
        <input
          type="text"
          value={open ? search : selectedLabel}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHighlight((h) => Math.min(h + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (open && filtered[highlight]) pick(filtered[highlight].value);
            } else if (e.key === "Escape") {
              setOpen(false);
              setSearch("");
            }
          }}
          className={`${inputCls} pr-8`}
        />
        <ChevronDown
          size={16}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        />
        {open && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-line bg-white py-1 shadow-lg">
            {filtered.length === 0 && (
              <li className="px-2.5 py-2 text-[13px] text-muted">No matches</li>
            )}
            {filtered.map((o, i) => (
              <li
                key={o.value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(o.value);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`cursor-pointer px-2.5 py-2 text-[13px] ${
                  i === highlight ? "bg-primary-soft text-primary" : "text-ink"
                } ${o.value === value ? "font-semibold" : ""}`}
              >
                {o.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="px-2.5 rounded-md border border-line text-primary hover:bg-primary-soft flex-shrink-0"
        title={addLabel}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
