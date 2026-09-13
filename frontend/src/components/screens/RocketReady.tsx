import { useEffect } from "react";
import { SFX, vibrate } from "../../audio/sound";
export function RocketReady({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    vibrate([80, 40, 80]);
    SFX.cascade();
    const t = setTimeout(onComplete, 5000);
    return () => clearTimeout(t);
  }, [onComplete]);
  return (
    <div className="rocket-ready" role="status" aria-live="assertive">
      <div className="ready-stars" />
      <div className="ready-art-frame">
        <img src="/ato4.png" alt="Ato 4: vamos chegar em casa" />
      </div>
      <div className="ready-loader">
        <span />
      </div>
      <small>PREPARANDO O JOGO DA CORRIDA...</small>
    </div>
  );
}
export default RocketReady;
