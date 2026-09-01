import { Check, CheckCheck, Clock } from "lucide-react";

/**
 * Baileys message status: 0 pending, 1 sent(server ack), 2 delivered ack,
 * 3 delivery receipt, 4 read. We render clock / single / double / blue-double.
 */
export default function Ticks({ status }: { status: number }) {
  if (status <= 0) return <Clock size={13} className="text-muted/70" />;
  if (status === 1) return <Check size={14} className="text-muted/70" />;
  if (status === 2 || status === 3)
    return <CheckCheck size={14} className="text-muted/70" />;
  return <CheckCheck size={14} className="text-primary" />;
}
