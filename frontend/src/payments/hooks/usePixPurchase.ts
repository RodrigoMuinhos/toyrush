import { useCallback, useEffect, useRef, useState } from "react";
import { SFX } from "../../audio/sound";
import { paymentApi } from "../services/paymentApi";
import { paymentStage } from "../types";
import { usePaymentStatus } from "./usePaymentStatus";
import { useCreatePix } from "./useCreatePix";
import { usePaymentControls } from "./usePaymentControls";

export function usePixPurchase(onClose: () => void, onPaid: () => Promise<void>, initialError: string) {
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const locked = useRef(false);
  const paidHandled = useRef(false);
  const status = usePaymentStatus(locked, setError);
  const { session, sessionRef, replaceSession, catalog, remaining } = status;
  const { create, reset } = useCreatePix({ locked, setBusy, setError, replaceSession });
  const packages = catalog?.packages ?? [];
  const stage = session ? paymentStage(session, remaining) : null;
  const finish = useCallback(async () => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setCountdown(null);
    try {
      if (sessionRef.current) await paymentApi.close(sessionRef.current.sessionId);
      await onPaid();
    } catch (e) { setError((e as Error).message); setCountdown(2); }
    finally { locked.current = false; setBusy(false); }
  }, [onPaid, sessionRef]);
  const close = useCallback(async () => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setCountdown(null);
    try {
      if (sessionRef.current) await paymentApi.close(sessionRef.current.sessionId);
      onClose();
    } catch (e) { setError((e as Error).message); }
    finally { locked.current = false; setBusy(false); }
  }, [onClose, sessionRef]);
  const retry = useCallback(async () => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try {
      if (sessionRef.current) {
        const closed = await paymentApi.close(sessionRef.current.sessionId);
        if (closed.creditsReleased || closed.status === "PAID_LATE") { replaceSession(closed); return; }
      }
      replaceSession(null); reset(); paidHandled.current = false; setError("");
    } catch (e) { setError((e as Error).message); }
    finally { locked.current = false; setBusy(false); }
  }, [replaceSession, reset, sessionRef]);
  const buy = useCallback((index = selected) => {
    if (!catalog?.ready || !packages[index] || sessionRef.current) return;
    setSelected(index); void create(packages[index].id);
  }, [catalog, packages, create, selected, sessionRef]);
  const confirm = useCallback(() => {
    if (locked.current || stage === "APPROVED" || stage === "REVIEW") return;
    if (stage && stage !== "PENDING") void retry();
    else if (!sessionRef.current) buy();
  }, [stage, retry, buy, sessionRef]);
  const choose = useCallback((direction: number) => {
    if (sessionRef.current || locked.current || !packages.length) return;
    setSelected(value => (value + direction + packages.length) % packages.length);
    SFX.positive();
  }, [packages.length, sessionRef]);
  usePaymentControls(choose, confirm, close);
  useEffect(() => { if (selected >= packages.length) setSelected(0); }, [selected, packages.length]);
  useEffect(() => {
    if (!session?.creditsReleased || paidHandled.current) return;
    paidHandled.current = true; setError(""); SFX.gearMagic(); setCountdown(2);
  }, [session]);
  useEffect(() => {
    if (countdown === null) return;
    const timer = setTimeout(() => { if (countdown <= 1) void finish(); else setCountdown(countdown - 1); }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, finish]);
  return { ...status, packages, selected, setSelected, busy, error, stage, buy, close, retry };
}
