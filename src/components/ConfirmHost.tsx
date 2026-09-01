import { useEffect, useState } from "react";
import { subscribeConfirm, type ConfirmOptions } from "../confirm";

type Active = ConfirmOptions & { resolve: (ok: boolean) => void };

export default function ConfirmHost() {
  const [active, setActive] = useState<Active | null>(null);

  useEffect(() => subscribeConfirm((req) => setActive(req)), []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const close = (ok: boolean) => {
    active?.resolve(ok);
    setActive(null);
  };

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onMouseDown={() => close(false)}
    >
      <div
        className="w-full max-w-sm rounded-lg bg-white border border-line shadow-xl p-5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="text-[15px] font-semibold text-ink">{active.title}</div>
        {active.message && (
          <div className="mt-2 text-[13px] text-muted leading-relaxed">{active.message}</div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => close(false)}
            className="px-3.5 py-2 rounded-md border border-line text-[13px] font-medium text-ink hover:bg-hover transition-colors"
          >
            {active.cancelLabel || "Cancel"}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => close(true)}
            className={`px-3.5 py-2 rounded-md text-[13px] font-semibold text-white transition-colors ${
              active.danger
                ? "bg-negative hover:brightness-95"
                : "bg-primary hover:bg-[#1B7FD6]"
            }`}
          >
            {active.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
