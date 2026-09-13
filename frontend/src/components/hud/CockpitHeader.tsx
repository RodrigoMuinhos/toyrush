import { VERSUS_SCORE_TO_WIN } from "../../game/scoring";
import { WelcomeHeader } from "../screens/WelcomeHeader";
import type { Flight } from "../../game/types";

import {
  SOLO_COMBOS_TO_WIN,
  COOP_COMBOS_TO_WIN,
  VERSUS_COMBOS_TO_WIN,
} from "../../game/constants";

export function CockpitHeader({ flight }: { flight: Flight }) {
  if (flight.phase === "splash") return <WelcomeHeader flight={flight} />;
  return (
    <header className="screen-toolbar">
      <div className="hero-panel-grid">
        <section className="hero-panel-card hero-points-card">
          <small>{flight.mode === "coop" ? "SCORE DA EQUIPE" : flight.mode === "1v1" ? "SCORE DO LÍDER" : "SCORE"}</small>
          <strong>{flight.score.toLocaleString("pt-BR")}</strong>
          <progress value={flight.score} max={Math.max(VERSUS_SCORE_TO_WIN, flight.score)} />
        </section>
        <section className="hero-panel-card hero-team-card">
          <small>VIDAS / EQUIPE</small>
          <strong>
            {flight.mode === "coop" ? (
              <>
                J1: {flight.p1Actions}/2
                <br />
                J2: {flight.p2Actions}/2
              </>
            ) : flight.mode === "1v1" ? (
              "J1 × J2"
            ) : (
              "SOLO"
            )}
          </strong>
        </section>
        <section className="hero-panel-card hero-energy-card">
          <small>ENERGIA DO FOGUETE</small>
          <strong>{flight.combos} COMBINAÇÕES</strong>
          <progress
            value={flight.combos}
            max={Math.max(
              flight.mode === "1v1"
                ? VERSUS_COMBOS_TO_WIN
                : flight.mode === "coop"
                  ? COOP_COMBOS_TO_WIN
                  : SOLO_COMBOS_TO_WIN,
              flight.combos,
            )}
          />
        </section>
      </div>
    </header>
  );
}
