/**
 * Reusable payment-mode inputs: Mode select + (conditional) Bank account +
 * (conditional) Reference number. Used wherever a payment is entered.
 *
 *   value = { mode, bank_account_id, reference }
 */
export type PayMode = "cash" | "upi" | "bank" | "cheque" | "card" | "other";

export interface PaymentModeValue {
  mode: PayMode;
  bank_account_id: string;
  reference: string;
}

export const emptyPayMode: PaymentModeValue = { mode: "cash", bank_account_id: "", reference: "" };

const MODES: [PayMode, string][] = [
  ["cash", "Cash"],
  ["upi", "UPI"],
  ["bank", "Bank Transfer"],
  ["cheque", "Cheque"],
  ["card", "Card"],
  ["other", "Other"],
];
const NEEDS_BANK: PayMode[] = ["bank", "cheque", "card"];
const NEEDS_REF: PayMode[] = ["upi", "bank", "cheque", "card", "other"];
const REF_LABEL: Record<PayMode, string> = {
  cash: "Reference",
  upi: "UPI transaction ID",
  bank: "Transaction / UTR no.",
  cheque: "Cheque no.",
  card: "Card / approval no.",
  other: "Reference",
};

const inputCls =
  "w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";
const labelCls = "block text-[12.5px] font-semibold text-ink mb-1.5";

export default function PaymentModeFields({
  value,
  onChange,
  banks,
  compact = false,
}: {
  value: PaymentModeValue;
  onChange: (v: PaymentModeValue) => void;
  banks: { id: number; name: string; last4?: string | null }[];
  compact?: boolean;
}) {
  const set = (patch: Partial<PaymentModeValue>) => onChange({ ...value, ...patch });
  const showBank = NEEDS_BANK.includes(value.mode);
  const showRef = NEEDS_REF.includes(value.mode);

  return (
    <div className={compact ? "space-y-2" : "grid sm:grid-cols-2 gap-3"}>
      <div>
        <label className={labelCls}>Payment mode</label>
        <select
          value={value.mode}
          onChange={(e) => {
            const mode = e.target.value as PayMode;
            set({
              mode,
              bank_account_id: NEEDS_BANK.includes(mode) ? value.bank_account_id : "",
              reference: NEEDS_REF.includes(mode) ? value.reference : "",
            });
          }}
          className={inputCls}
        >
          {MODES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {showBank && (
        <div>
          <label className={labelCls}>Bank account</label>
          <select
            value={value.bank_account_id}
            onChange={(e) => set({ bank_account_id: e.target.value })}
            className={inputCls}
          >
            <option value="">— none —</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.last4 ? ` ••••${b.last4}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {showRef && (
        <div className={showBank || compact ? "" : "sm:col-span-2"}>
          <label className={labelCls}>{REF_LABEL[value.mode]} (optional)</label>
          <input
            value={value.reference}
            onChange={(e) => set({ reference: e.target.value })}
            placeholder={REF_LABEL[value.mode]}
            className={inputCls}
          />
        </div>
      )}
    </div>
  );
}
