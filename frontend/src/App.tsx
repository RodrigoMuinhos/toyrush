import { useEffect, useRef, useState } from "react";
import type { Flight } from "./game/types";
import { GameApp } from "./game/GameApp";
import { useCredits } from "./payments/hooks/useCredits";
import { useSecretAdminAccess } from "./hooks/useSecretAdminAccess";
import { CockpitHeader } from "./components/hud/CockpitHeader";
import { PixPurchaseModal } from "./payments/components/PixPurchaseModal";
import { ActivationModal } from "./payments/components/ActivationModal";
import { AdminGear } from "./components/admin/AdminGear";
import { AdminPanel } from "./components/admin/AdminPanel";
export default function App() {
  const { credits, creditPopup, closeCreditPopup, openCreditPopup, spendCredit, finishPayment, paymentError, completeGame, needsActivation, activationComplete } = useCredits();
  const adminGearRevealed = useSecretAdminAccess();
  const [adminPanelOpen, setAdminPanelOpen] = useState(
    () => window.location.pathname === "/adm",
  );

  const [flight, setFlight] = useState<Flight>({
    score: 0,
    combos: 0,
    mode: "coop",
    phase: "splash",
    attacks: "",
    p1Actions: 0,
    p2Actions: 0,
    comboSequence: 0,
    elapsedSeconds: 0,
  });
  const previousPhase = useRef(flight.phase);
  useEffect(() => {
    const ended = flight.phase === "result" || (flight.phase === "splash" && previousPhase.current !== "splash");
    previousPhase.current = flight.phase;
    if (!ended) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const complete = async () => {
      try { await completeGame(); }
      catch { if (!cancelled) timer = setTimeout(complete, 3000); }
    };
    void complete();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [flight.phase, completeGame]);
  return (
    <div className={`app-shell app-shell-${flight.phase}`}>
      {flight.phase !== "splash" && <CockpitHeader flight={flight} />}
      <GameApp
        onFlightChange={setFlight}
        spendCredit={spendCredit}
        onBuyCredits={openCreditPopup}
        credits={credits}
        controllerEnabled={!creditPopup}
      />
      {creditPopup && (
        <PixPurchaseModal credits={credits} onClose={closeCreditPopup} onPaid={finishPayment} initialError={paymentError} />
      )}
      {needsActivation && <ActivationModal onActivated={activationComplete} />}
      {adminGearRevealed && !adminPanelOpen && (
        <AdminGear onClick={() => setAdminPanelOpen(true)} />
      )}
      {adminPanelOpen && <AdminPanel onClose={() => setAdminPanelOpen(false)} />}
    </div>
  );
}
