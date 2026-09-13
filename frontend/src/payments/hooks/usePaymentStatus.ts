import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { paymentApi } from "../services/paymentApi";
import type { Catalog, PixSession } from "../types";

/** Recovers the active session on mount and polls without overlapping requests. */
export function usePaymentStatus(locked: RefObject<boolean>, onError: (message: string) => void) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [session, setSession] = useState<PixSession | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const sessionRef = useRef<PixSession | null>(null);
  const replaceSession = useCallback((next: PixSession | null) => {
    sessionRef.current = next; setSession(next); setNow(Date.now());
    if (next) setBalance(next.balance);
  }, []);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const current = sessionRef.current;
        if (current) {
          const updated = await paymentApi.status(current.sessionId);
          if (!cancelled && !locked.current && sessionRef.current?.sessionId === current.sessionId) replaceSession(updated);
        } else {
          const [options, wallet] = await Promise.all([paymentApi.catalog(), paymentApi.balance()]);
          if (!cancelled && !locked.current && !sessionRef.current) {
            setCatalog(options); setBalance(wallet.credits);
            if (wallet.activePayment) replaceSession(wallet.activePayment);
          }
        }
      } catch (e) { if (!cancelled) onError((e as Error).message); }
      finally { if (!cancelled) timer = setTimeout(poll, 2000); }
    };
    void poll();
    const ticker = setInterval(() => setNow(Date.now()), 250);
    return () => { cancelled = true; clearTimeout(timer); clearInterval(ticker); };
  }, [locked, onError, replaceSession]);
  const remaining = session ? Math.max(0, Math.ceil((Date.parse(session.expiresAt) - now) / 1000)) : 0;
  return { catalog, session, sessionRef, replaceSession, remaining, balance };
}
