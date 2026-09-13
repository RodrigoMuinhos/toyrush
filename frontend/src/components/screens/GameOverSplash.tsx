import { useEffect } from "react";
import { SFX } from "../../audio/sound";

export function GameOverSplash({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    SFX.gameOver();
    const timer = window.setTimeout(onComplete, 1800);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <main className="game-over-splash" aria-live="assertive">
      <img src="/gameover.png" alt="Game over" />
    </main>
  );
}

export default GameOverSplash;
