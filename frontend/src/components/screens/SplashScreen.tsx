import { useEffect } from "react";
import type { GameMode } from "../../game/types";
import { Piece3D } from "../puzzle/Piece3D";
import type { MenuSelection } from "../../hooks/useGameSession";
export function SplashScreen({
  mode,
  onModeChange,
  onStart,
  onRanking,
  onBuyCredits,
  enabled = true,
  credits,
  selection,
}: {
  mode: GameMode;
  onModeChange: (m: GameMode) => void;
  onStart: (m: GameMode) => void;
  onRanking: () => void;
  onBuyCredits: () => void;
  enabled?: boolean;
  credits: number;
  selection: MenuSelection;
}) {
  useEffect(() => {
    if (!enabled) return;
    const f = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLButtonElement) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (selection === "credits") onBuyCredits();
        else if (selection === "ranking") onRanking();
        else onStart(mode);
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [mode, onStart, onRanking, onBuyCredits, selection, enabled]);
  const opts = [
    { id: "1p" as const, label: "1 JOGADOR", sub: "Só você" },
    { id: "coop" as const, label: "COOPERATIVO", sub: "Juntos na aventura" },
    { id: "1v1" as const, label: "1 × 1", sub: "Desafio de amigos" },
  ];
  return (
    <main className="welcome-screen">
      <div className="welcome-info-bar" aria-label="Informações da partida">
        <span>
          CRÉDITOS <b>{credits}</b>
        </span>
        <span>
          MODO{" "}
          <b>
            {mode === "coop"
              ? "COOPERATIVO"
              : mode === "1v1"
                ? "1 × 1"
                : "1 JOGADOR"}
          </b>
        </span>
        <span>
          ENTER / ESPAÇO <b>PARA JOGAR</b>
        </span>
      </div>
      <div className="welcome-stars">
        {Array.from({ length: 36 }, (_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 37 + 11) % 100}%`,
              top: `${(i * 23 + 7) % 100}%`,
            }}
          />
        ))}
      </div>
      <div className="welcome-brand">
        <h1>
          <img
            className="welcome-logo"
            src="/logobricks.png"
            alt="Toy Factory Rush"
          />
        </h1>
      </div>
      <div className="welcome-actions">
        <button
          className={`welcome-play ${selection === "play" ? "is-controller-selected" : ""}`}
          onClick={() => onStart(mode)}
        >
          ▶ JOGAR
        </button>
        <div className="welcome-secondary-actions">
        <button
          className={`welcome-ranking ${selection === "ranking" ? "is-controller-selected" : ""}`}
          onClick={onRanking}
        >
          🏆 RANKING
        </button>
        <button className={`welcome-ranking welcome-buy-credits ${selection === "credits" ? "is-controller-selected" : ""}`} onClick={onBuyCredits}>
          ✦ COMPRAR CRÉDITOS
        </button>
        </div>
      </div>
      <section className="welcome-modes">
        <p>COMO VAMOS BRINCAR?</p>
        <div className="welcome-mode-options">
          {opts.map((o) => (
            <button
              key={o.id}
              className={`welcome-mode ${mode === o.id ? "is-selected" : ""} ${selection === o.id ? "is-controller-selected" : ""}`}
              aria-pressed={mode === o.id}
              onClick={() => onModeChange(o.id)}
            >
              <span className="mode-friends">
                <Piece3D type="cone" size={44} />
                {o.id !== "1p" && (
                  <Piece3D type={o.id === "coop" ? "str" : "win"} size={44} />
                )}
              </span>
              <strong>{o.label}</strong>
              <small>{o.sub}</small>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
export default SplashScreen;
