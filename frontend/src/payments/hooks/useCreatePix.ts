import { useCallback, useRef, type RefObject } from "react";
import { paymentApi } from "../services/paymentApi";
import type { PixSession } from "../types";

export function useCreatePix({ locked, setBusy, setError, replaceSession }: {
  locked: RefObject<boolean>; setBusy: (busy: boolean) => void; setError: (error: string) => void;
  replaceSession: (session: PixSession | null) => void;
}) {
  const intent = useRef<{ id: string; packageId: string } | null>(null);
  const reset = useCallback(() => { intent.current = null; }, []);
  const create = useCallback(async (packageId: string) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError("");
    try {
      // A retry after a timeout preserves both the original UUID and package.
      intent.current ??= { id: crypto.randomUUID(), packageId };
      if (intent.current.packageId !== packageId) throw new Error("Retome o pacote anterior para confirmar se a cobrança foi criada.");
      replaceSession(await paymentApi.create(intent.current.id, intent.current.packageId));
    } catch (e) {
      setError((e as Error).message);
      try {
        const wallet = await paymentApi.balance();
        if (wallet.activePayment) replaceSession(wallet.activePayment);
      } catch { /* The original intent remains retryable. */ }
    } finally { locked.current = false; setBusy(false); }
  }, [locked, replaceSession, setBusy, setError]);
  return { create, reset };
}
