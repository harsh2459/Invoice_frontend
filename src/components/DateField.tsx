import { useRef, useState, useEffect } from "react";
import { CalendarDays } from "lucide-react";

// ISO (yyyy-mm-dd) <-> display (dd/mm/yyyy)
const isoToDisplay = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
};

const displayToIso = (s: string): string | null => {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const dd = d.padStart(2, "0");
  const mm = mo.padStart(2, "0");
  const dt = new Date(`${y}-${mm}-${dd}T00:00:00`);
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getUTCDate() !== Number(dd) ||
    dt.getUTCMonth() + 1 !== Number(mm)
  ) {
    return null;
  }
  return `${y}-${mm}-${dd}`;
};

/**
 * Date input that always shows dd/mm/yyyy. `value` / `onChange` use ISO yyyy-mm-dd.
 * A hidden native date picker (opened via the calendar button) provides the calendar UI.
 */
export default function DateField({
  value,
  onChange,
  required,
  className = "",
}: {
  value: string;
  onChange: (iso: string) => void;
  required?: boolean;
  className?: string;
}) {
  const [text, setText] = useState(isoToDisplay(value));
  const [invalid, setInvalid] = useState(false);
  const nativeRef = useRef<HTMLInputElement>(null);

  // Keep the text in sync when the ISO value changes from outside (e.g. calendar pick, reset).
  useEffect(() => {
    setText(isoToDisplay(value));
    setInvalid(false);
  }, [value]);

  const base =
    "w-full px-2.5 py-2 border rounded-md text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-primary-soft";
  const border = invalid ? "border-negative focus:border-negative" : "border-line focus:border-primary";

  const commit = (raw: string) => {
    const iso = displayToIso(raw);
    if (iso) {
      setInvalid(false);
      onChange(iso);
    } else {
      setInvalid(raw.trim().length > 0);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        required={required}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (displayToIso(e.target.value)) commit(e.target.value);
          else setInvalid(false);
        }}
        onBlur={(e) => commit(e.target.value)}
        className={`${base} ${border} pr-9 ${className}`}
      />
      <button
        type="button"
        onClick={() => nativeRef.current?.showPicker?.()}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted hover:text-primary"
        title="Open calendar"
        tabIndex={-1}
      >
        <CalendarDays size={16} />
      </button>
      <input
        ref={nativeRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only absolute right-0 bottom-0"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
