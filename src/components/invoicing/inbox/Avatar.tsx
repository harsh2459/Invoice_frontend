import { useState } from "react";
import { Users } from "lucide-react";
import { initials } from "./util";

export default function Avatar({
  title,
  picUrl,
  isGroup,
  size = 40,
}: {
  title: string;
  picUrl?: string | null;
  isGroup?: boolean;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const px = { width: size, height: size };

  if (picUrl && !broken) {
    return (
      <img
        src={picUrl}
        alt={title}
        onError={() => setBroken(true)}
        className="rounded-full object-cover shrink-0 bg-hover"
        style={px}
      />
    );
  }
  return (
    <div
      className="rounded-full shrink-0 grid place-items-center bg-primary-soft text-primary font-semibold"
      style={{ ...px, fontSize: size * 0.36 }}
    >
      {isGroup ? <Users size={size * 0.5} /> : initials(title)}
    </div>
  );
}
