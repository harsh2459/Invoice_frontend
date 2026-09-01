/**
 * Collator import — upload from computer. Multi-file drag-and-drop / picker with
 * a shared company + month + year, then "Import All". Per-file status chips.
 */
import { useRef, useState } from "react";
import { UploadCloud, FileText, CheckCircle2, XCircle, MinusCircle, Loader2, X } from "lucide-react";
import { api } from "../../api";
import { API_BASE } from "../../config";
import { toast } from "../../toast";
import { useCompanies, PageHeader, YearMonthPicker } from "./shared";

type FileState = {
  file: File;
  status: "pending" | "uploading" | "success" | "skipped" | "failed";
  message?: string;
  rows?: number;
};

const ACCEPT = ".csv,.xlsx,.xls,.pdf,.xml";
const selCls =
  "px-2.5 py-1.5 border border-line rounded-md text-[12.5px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

export default function CollatorImport() {
  const companies = useCompanies();
  const [companyId, setCompanyId] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [files, setFiles] = useState<FileState[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next: FileState[] = [];
    for (const f of Array.from(list)) next.push({ file: f, status: "pending" });
    setFiles((prev) => [...prev, ...next]);
  };

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, x) => x !== i));

  const importAll = async () => {
    if (!companyId) return toast("Pick a company");
    if (files.length === 0) return toast("Add at least one file");
    setBusy(true);
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === "success" || files[i].status === "skipped") continue;
      setFiles((prev) => prev.map((f, x) => (x === i ? { ...f, status: "uploading" } : f)));
      const fd = new FormData();
      fd.append("file", files[i].file);
      fd.append("company_id", companyId);
      fd.append("data_month", month);
      fd.append("data_year", year);
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`${API_BASE}/collator/imports/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        setFiles((prev) =>
          prev.map((f, x) =>
            x === i
              ? {
                  ...f,
                  status:
                    data.status === "success"
                      ? "success"
                      : data.status === "skipped"
                      ? "skipped"
                      : "failed",
                  message: data.message || data.error,
                  rows: data.rows_imported,
                }
              : f
          )
        );
      } catch (e: any) {
        setFiles((prev) =>
          prev.map((f, x) => (x === i ? { ...f, status: "failed", message: e.message } : f))
        );
      }
    }
    setBusy(false);
  };

  const StatusIcon = ({ s }: { s: FileState["status"] }) => {
    if (s === "uploading") return <Loader2 size={15} className="animate-spin text-primary" />;
    if (s === "success") return <CheckCircle2 size={15} className="text-positive" />;
    if (s === "skipped") return <MinusCircle size={15} className="text-amazon-text" />;
    if (s === "failed") return <XCircle size={15} className="text-negative" />;
    return <FileText size={15} className="text-muted" />;
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <PageHeader title="Import Files" icon={<UploadCloud size={20} className="text-primary" />} />
      <p className="text-[13px] text-muted -mt-1">
        Upload marketplace / bank / purchase report files. Detection is by filename
        (e.g. <code className="text-ink">MTR_B2C…csv</code>, <code className="text-ink">FLIPKART SALE.xlsx</code>,{" "}
        <code className="text-ink">tcs_sales.xlsx</code>). Re-uploading the same file is skipped.
      </p>

      <div className="bg-white rounded-lg border border-line p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="text-[11.5px] font-semibold text-muted mb-1">Company</div>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className={selCls}
            >
              <option value="">Select…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.short_code ? `${c.short_code} — ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-[11.5px] font-semibold text-muted mb-1">Period</div>
            <div className="flex gap-2">
              <YearMonthPicker
                year={year}
                month={month}
                onYear={setYear}
                onMonth={setMonth}
                allowAllMonths={false}
              />
            </div>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver ? "border-primary bg-primary-soft" : "border-line hover:bg-hover"
          }`}
        >
          <UploadCloud size={26} className="mx-auto mb-2 text-muted" />
          <div className="text-[13px] text-ink font-medium">
            Drop files here or click to choose
          </div>
          <div className="text-[11.5px] text-muted mt-0.5">{ACCEPT}</div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            hidden
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <div className="space-y-1.5">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 text-[12.5px] bg-hover rounded-md px-3 py-2"
              >
                <StatusIcon s={f.status} />
                <span className="flex-1 truncate">{f.file.name}</span>
                {f.status === "success" && (
                  <span className="text-positive text-[11.5px]">{f.rows} rows</span>
                )}
                {(f.status === "skipped" || f.status === "failed") && f.message && (
                  <span
                    className={`text-[11.5px] truncate max-w-[200px] ${
                      f.status === "failed" ? "text-negative" : "text-amazon-text"
                    }`}
                    title={f.message}
                  >
                    {f.message}
                  </span>
                )}
                {f.status === "pending" && (
                  <button onClick={() => removeFile(i)} className="text-muted hover:text-negative">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={importAll}
          disabled={busy || files.length === 0 || !companyId}
          className="bg-primary text-white px-4 py-2 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6] disabled:opacity-50 flex items-center gap-1.5"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          Import All
        </button>
      </div>
    </div>
  );
}
