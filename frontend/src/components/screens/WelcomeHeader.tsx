import type { Flight } from "../../game/types";
import { COOP_COMBOS_TO_WIN, SOLO_COMBOS_TO_WIN, VERSUS_COMBOS_TO_WIN } from "../../game/constants";
import "./welcomeLayout.css";

export function WelcomeHeader({ flight }: { flight: Flight }) {
  const goal = flight.mode === "coop" ? COOP_COMBOS_TO_WIN : flight.mode === "1v1" ? VERSUS_COMBOS_TO_WIN : SOLO_COMBOS_TO_WIN;
  return <header className="welcome-cockpit" aria-label="Painel da missão">
    <img className="welcome-header-art" src="/herogame.png?v=20260911-114705" alt="" aria-hidden="true" />
    <strong className="welcome-art-score" aria-label="Pontos da missão">{flight.score.toLocaleString("pt-BR")}</strong>
    <strong className="welcome-art-player welcome-art-p1" aria-label="Jogador 1">{flight.p1Actions}/2</strong>
    <strong className="welcome-art-player welcome-art-p2" aria-label="Jogador 2">{flight.mode === "1p" ? "-" : `${flight.p2Actions}/2`}</strong>
    <div className="welcome-art-energy" role="progressbar" aria-label="Energia do foguete" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={flight.combos}>
      {Array.from({length: 9}, (_, i) => <i key={i} className={i < Math.ceil(Math.min(1,flight.combos / goal) * 9) ? "charged" : ""} />)}
    </div>
    <strong className="welcome-art-total">{flight.combos}/{goal}</strong>
  </header>;
}
