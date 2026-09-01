import { useEffect, useState, useRef } from "react";
import { subscribeToast } from "../toast";

export default function Toaster() {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return subscribeToast((m) => {
      setMsg(m);
      setShow(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setShow(false), 1800);
    });
  }, []);

  return (
    <div
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 rounded-md bg-ink px-4 py-2 text-white text-[13px] shadow-lg transition-opacity duration-200 ${
        show ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {msg}
    </div>
  );
}
