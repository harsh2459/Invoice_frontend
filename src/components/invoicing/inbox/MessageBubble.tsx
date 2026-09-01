import { FileText, Download, ImageOff } from "lucide-react";
import type { WaWireMessage } from "../../../waSocket";
import { API_BASE } from "../../../config";
import { bubbleTime } from "./util";
import Ticks from "./Ticks";

const mediaUrl = (companyId: number, msgKey: string) =>
  `${API_BASE}/whatsapp/${companyId}/media/${encodeURIComponent(msgKey)}?token=${
    localStorage.getItem("token") || ""
  }`;

export default function MessageBubble({
  companyId,
  m,
}: {
  companyId: number;
  m: WaWireMessage;
}) {
  const mine = m.fromMe;
  const isImage = m.type === "image" && (m.hasMedia || m.mediaMime?.startsWith("image/"));
  const isDoc = m.type === "document" || m.type === "audio" || m.type === "video";

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} px-3`}>
      <div
        className={`max-w-[75%] rounded-lg px-2.5 py-1.5 text-[13px] leading-relaxed shadow-sm ${
          mine ? "bg-primary-soft text-ink" : "bg-white text-ink border border-line"
        }`}
      >
        {isImage && (
          <a href={mediaUrl(companyId, m.msgKey)} target="_blank" rel="noreferrer" className="block mb-1">
            <img
              src={mediaUrl(companyId, m.msgKey)}
              alt={m.text || "photo"}
              className="rounded-md max-h-64 object-cover"
              onError={(e) => {
                (e.currentTarget.style.display = "none");
              }}
            />
          </a>
        )}

        {isDoc && (
          <a
            href={mediaUrl(companyId, m.msgKey)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 mb-1 rounded-md bg-black/5 px-2 py-1.5 hover:bg-black/10"
          >
            <FileText size={18} className="text-primary shrink-0" />
            <span className="truncate flex-1 text-[12.5px]">{m.filename || "Document"}</span>
            <Download size={14} className="text-muted shrink-0" />
          </a>
        )}

        {m.type === "location" && <div className="text-muted italic mb-1">📍 Location</div>}
        {m.type === "contact" && (
          <div className="text-muted italic mb-1">👤 {m.text || "Contact"}</div>
        )}
        {m.type === "sticker" && !m.hasMedia && (
          <div className="text-muted italic mb-1 flex items-center gap-1">
            <ImageOff size={13} /> Sticker
          </div>
        )}

        {m.text && <span className="whitespace-pre-wrap break-words">{m.text}</span>}

        <span className="float-right ml-2 mt-1 inline-flex items-center gap-1 text-[10.5px] text-muted select-none">
          {bubbleTime(m.ts)}
          {mine && <Ticks status={m.status} />}
        </span>
      </div>
    </div>
  );
}
