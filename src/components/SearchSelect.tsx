import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, ChevronDown } from "lucide-react";

export interface SearchOption {
  value: string;
  label: string;
}

/**
 * A searchable combobox. The "+" button calls `onAddNew()` so the parent can
 * open a full details modal (unlike SelectWithAdd, which does an inline
 * name-only POST). Pass `onAddNew` undefined to hide the "+" button.
 */
export default function SearchSelect({
  value,
  onChange,
  options,
  onAddNew,
  placeholder = "Select...",
  addTitle = "Add new",
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SearchOption[];
  onAddNew?: () => void;
  placeholder?: string;
  addTitle?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const inputCls =
    "w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:bg-hover disabled:text-muted";

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

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

  return (
    <div className={`flex gap-1.5 ${open ? "relative z-40" : ""}`}>
      <div ref={wrapRef} className="relative flex-1">
        <input
          type="text"
          disabled={disabled}
          value={open ? search : selectedLabel}
          placeholder={placeholder}
          onFocus={() => !disabled && setOpen(true)}
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
          <ul className="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-md border border-line bg-white py-1 shadow-lg">
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
      {onAddNew && (
        <button
          type="button"
          onClick={onAddNew}
          disabled={disabled}
          className="px-2.5 rounded-md border border-line text-primary hover:bg-primary-soft flex-shrink-0 disabled:opacity-40 disabled:hover:bg-transparent"
          title={addTitle}
        >
          <Plus size={16} />
        </button>
      )}
    </div>
  );
}
