export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type Request = ConfirmOptions & { resolve: (ok: boolean) => void };
type Listener = (req: Request | null) => void;

const listeners = new Set<Listener>();

/** Promise-based replacement for window.confirm. Resolves true on confirm. */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const req: Request = { ...opts, resolve };
    listeners.forEach((l) => l(req));
  });
}

export function subscribeConfirm(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
