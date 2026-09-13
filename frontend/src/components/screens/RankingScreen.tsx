import { useEffect, useState } from "react";
import { readRanking, type RankingEntry } from "../../game/ranking";
import "./leaderboard.css";

function Crown() {
  return <svg viewBox="0 0 40 30" fill="currentColor" aria-hidden="true"><path d="m3 7 9 7 8-12 8 12 9-7-5 18H8ZM8 27h24v3H8Z" /></svg>;
}

function ModeIcon({ mode }: { mode: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    {mode === "SOLO" ? <><circle cx="12" cy="7" r="3" /><path d="M5 21v-3a7 7 0 0 1 14 0v3" /></> : mode === "COOP" ? <><circle cx="8" cy="7" r="3" /><circle cx="18" cy="8" r="2" /><path d="M2 21v-3a6 6 0 0 1 12 0v3m2-8a5 5 0 0 1 6 5v3" /></> : <><path d="m4 3 4 1 12 14-2 2L4 7Zm16 0-4 1L4 18l2 2L20 7ZM2 17l5 5m10 0 5-5" /></>}
  </svg>;
}

export function RankingScreen({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useState<RankingEntry[]>([]);

  useEffect(() => setEntries(readRanking().slice(0, 7)), []);

  return (
    <main className="ranking-screen arcade-ranking" aria-label="Ranking">
      <section className="ranking-panel">
        <header className="leaderboard-header">
          <img className="leaderboard-logo" src="/ranakig.png" alt="Ranking — melhores jogadores" />
        </header>
        <ol className="ranking-list" aria-label="Melhores pontuações">
          {entries.length ? (
            entries.map((entry, index) => (
              <li className={`ranking-row rank-place-${index + 1}`} key={`${entry.date}-${index}`}>
                <b className="rank-position" aria-label={`${index + 1}º lugar`}>{index === 0 && <Crown />}<span>#{index + 1}</span></b>
                <strong className="rank-player">{entry.name}</strong>
                <span className="rank-score">{entry.score.toLocaleString("pt-BR")} <small>pts</small></span>
                <span className={`rank-mode rank-mode-${entry.mode === "COOP" ? "coop" : entry.mode === "SOLO" ? "solo" : "versus"}`}><ModeIcon mode={entry.mode} />{entry.mode}</span>
              </li>
            ))
          ) : (
            <li className="ranking-empty">Nenhuma pontuação registrada ainda.<br />Jogue e conquiste o primeiro lugar!</li>
          )}
        </ol>
        <p className="ranking-hint"><span><kbd>A</kbd><kbd>X</kbd> CONFIRMA</span><span aria-hidden="true">·</span><span><kbd>B</kbd><kbd>Y</kbd> VOLTA</span></p>
      </section>
      <button className="ranking-back" onClick={onBack}>
        VOLTAR AO MENU
      </button>
    </main>
  );
}

export default RankingScreen;
