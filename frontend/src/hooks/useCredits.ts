import { useCallback, useEffect, useRef, useState } from "react";
import type { GameMode } from "../game/types";
import { paymentApi, PaymentError, type Balance } from "../payments/api";

export function useCredits() {
  const [credits, setCredits] = useState(0);
  const [creditPopup, setCreditPopup] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const currentGame = useRef<string | null>(null);
  const busy = useRef(false);
  const refresh = useCallback(async () => {
    const balance = await paymentApi<Balance>("/machine/balance");
    setCredits(balance.credits);
    return balance;
  }, []);
  useEffect(() => {
    let mounted = true;
    void refresh().then(balance => {
      if (mounted && balance.activePayment) setCreditPopup(true);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [refresh]);
  const drainCompletions = useCallback(async () => {
    let ids: string[] = [];
    try { ids = JSON.parse(localStorage.getItem("toy-game-completions") || "[]"); } catch {}
    for (const id of ids) await paymentApi(`/game-sessions/${id}/complete`, {});
    try { localStorage.removeItem("toy-game-completions"); } catch {}
  }, []);
  const authorize = useCallback(async (mode: GameMode, id: string) => {
    await drainCompletions();
    const game = await paymentApi<{ gameSessionId: string; credits: number; status: string }>("/game-sessions", { mode, requestId: id });
    if (game.status !== "GAME_STARTED") throw new Error("Esta partida já foi encerrada. Volte e tente novamente.");
    currentGame.current = game.gameSessionId;
    setCredits(game.credits);
  }, [drainCompletions]);
  const spendCredit = useCallback(async (mode: GameMode): Promise<boolean> => {
    if (busy.current) return false;
    busy.current = true;
    const id = crypto.randomUUID();
    try { await authorize(mode, id); return true; }
    catch (error) {
      setPaymentError(error instanceof PaymentError && error.status === 402 ? "" : (error as Error).message);
      setCreditPopup(true);
      return false;
    } finally { busy.current = false; }
  }, [authorize]);
  const finishPayment = useCallback(async () => {
    await refresh();
    setCreditPopup(false);
  }, [refresh]);
  const openCreditPopup = useCallback(() => { setPaymentError(""); setCreditPopup(true); }, []);
  const closeCreditPopup = useCallback(() => {
    setCreditPopup(false);
    void refresh().catch(() => {});
  }, [refresh]);
  const completeGame = useCallback(async () => {
    const id = currentGame.current;
    if (!id) return;
    // Only operation IDs are cached; balances and authorizations always come from the server.
    try {
      const ids: string[] = JSON.parse(localStorage.getItem("toy-game-completions") || "[]");
      localStorage.setItem("toy-game-completions", JSON.stringify([...new Set([...ids, id])]));
    } catch {}
    await paymentApi(`/game-sessions/${id}/complete`, {});
    await drainCompletions();
    if (currentGame.current === id) currentGame.current = null;
  }, [drainCompletions]);
  return { credits, creditPopup, openCreditPopup, paymentError, closeCreditPopup, spendCredit, finishPayment, completeGame };
}
