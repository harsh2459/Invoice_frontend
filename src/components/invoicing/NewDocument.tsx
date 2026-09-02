import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, IndianRupee, Undo2 } from "lucide-react";
import InvoiceForm from "./InvoiceForm";
import ReceiveForm from "./ReceiveForm";
import ReturnForm from "./ReturnForm";

const TABS = [
  { key: "sales", label: "Sales Invoice", icon: FileText },
  { key: "receipt", label: "Payment Received", icon: IndianRupee },
  { key: "return", label: "Sales Return", icon: Undo2 },
] as const;

export default function NewDocument() {
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const type = (sp.get("type") as (typeof TABS)[number]["key"]) || "sales";
  const client = sp.get("client");
  const company = sp.get("company");

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate("/invoicing/invoices")}
        className="flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"
      >
        <ArrowLeft size={14} /> Back to invoices
      </button>
      <h1 className="text-[1.3rem] font-bold text-ink">New Document</h1>

      <div className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = type === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                const next = new URLSearchParams(sp);
                next.set("type", t.key);
                setSp(next, { replace: true });
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {type === "sales" && <InvoiceForm embedded />}
      {type === "receipt" && (
        <ReceiveForm
          lockClientId={client ? Number(client) : undefined}
          lockCompanyId={company ? Number(company) : undefined}
        />
      )}
      {type === "return" && (
        <ReturnForm
          lockClientId={client ? Number(client) : undefined}
          lockCompanyId={company ? Number(company) : undefined}
        />
      )}
    </div>
  );
}
