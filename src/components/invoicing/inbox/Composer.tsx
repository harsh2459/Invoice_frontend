import { useRef, useState } from "react";
import { Send, Paperclip, Loader2, X } from "lucide-react";
import { api } from "../../../api";
import { toast } from "../../../toast";

const MAX_MB = 16;

export default function Composer({
  companyId,
  jid,
  disabled,
  onSent,
}: {
  companyId: number;
  jid: string;
  disabled?: boolean;
  onSent?: () => void;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | null) => {
    if (!f) return setFile(null);
    if (f.size > MAX_MB * 1024 * 1024) {
      toast(`File too large (max ${MAX_MB} MB)`);
      return;
    }
    setFile(f);
  };

  const send = async () => {
    if (busy || disabled) return;
    if (!file && !text.trim()) return;
    setBusy(true);
    try {
      if (file) {
        const b64 = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result).split(",")[1] || "");
          r.onerror = () => reject(r.error);
          r.readAsDataURL(file);
        });
        await api(`/whatsapp/${companyId}/chats/${encodeURIComponent(jid)}/send`, {
          method: "POST",
          body: JSON.stringify({
            fileBase64: b64,
            mime: file.type || "application/octet-stream",
            filename: file.name,
            caption: text.trim() || undefined,
          }),
        });
      } else {
        await api(`/whatsapp/${companyId}/chats/${encodeURIComponent(jid)}/send`, {
          method: "POST",
          body: JSON.stringify({ text }),
        });
      }
      setText("");
      setFile(null);
      onSent?.();
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shrink-0 border-t border-line bg-white px-3 py-2.5">
      {file && (
        <div className="mb-2 flex items-center gap-2 text-[12px] bg-hover rounded-md px-2.5 py-1.5">
          <Paperclip size={13} className="text-primary" />
          <span className="truncate flex-1">{file.name}</span>
          <button onClick={() => setFile(null)} className="text-muted hover:text-negative">
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || busy}
          className="p-2 text-muted hover:text-primary rounded-md hover:bg-hover disabled:opacity-40"
          title="Attach a file"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileRef}
          type="file"
          hidden
          accept="image/*,application/pdf"
          onChange={(e) => pickFile(e.target.files?.[0] || null)}
        />
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={disabled ? "WhatsApp not connected" : "Type a message"}
          disabled={disabled || busy}
          className="flex-1 resize-none max-h-32 px-3 py-2 rounded-lg border border-line text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-soft disabled:bg-hover"
        />
        <button
          type="button"
          onClick={send}
          disabled={disabled || busy || (!file && !text.trim())}
          className="p-2.5 rounded-full bg-positive text-white disabled:opacity-40 hover:opacity-90"
          title="Send"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
