import { officialScore } from "../../game/scoring";
import { useEffect, useState } from "react";
import type { GameMode } from "../../game/types";
import { SFX } from "../../audio/sound";
import "./resultScore.css";

function ScoreTitle({ children }: { children: string }) {
  return <div className="score-title"><i aria-hidden="true" /><span>{children}</span><i aria-hidden="true" /></div>;
}

function ScoreValue({ children, progress, value }: { children?: string; progress: number; value?: number }) {
  const finalText = value === undefined ? children! : value.toLocaleString("pt-BR");
  const text = value === undefined ? finalText : (progress === 1 ? Math.round(value) : Math.floor(value * (1 - (1 - progress) ** 3))).toLocaleString("pt-BR");
  return <div className={`score-value-frame${progress === 1 && value !== undefined ? " score-count-complete" : ""}`} aria-label={finalText}><strong aria-hidden="true" style={{ fontSize: finalText.length > 5 ? `${Math.max(1.6, 26 / finalText.length)}cqw` : undefined }}>{text}</strong></div>;
}
export function ResultScreen({
  mode,
  launched,
  raceWon,
  raceWinner,
  p1Score,
  p2Score,
  totalCombos,
  collected,
  onRestart,
}: {
  mode: GameMode;
  launched: boolean;
  raceWon: boolean | null;
  raceWinner: number | null;
  p1Score: number;
  p2Score: number;
  totalCombos: number;
  collected: number;
  onRestart: () => void;
}) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    setProgress(0);
    const duration = 2600;
    const start = performance.now();
    const stopSound = SFX.scoreCount(duration);
    let frame = 0;
    const update = (now: number) => {
      const next = Math.min(1, (now - start) / duration);
      setProgress(next);
      if (next < 1) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => { cancelAnimationFrame(frame); stopSound(); };
  }, [p1Score, p2Score, totalCombos, collected]);
  const score2 = mode === "1p" ? 0 : p2Score;
  const scoreWinner =
    mode === "1v1" && p1Score !== score2 ? (p1Score > score2 ? 1 : 2) : null;
  const winner = mode === "1v1" ? (scoreWinner ?? raceWinner) : null;
  const complete =
    mode === "1v1"
      ? winner !== null
      : raceWon === true || (launched && raceWon === null);
  return (
    <div className="result-art-screen">
      <div className="result-art-frame">
        <img
          src={complete ? "/conseguimos.png" : "/nao conseguimos.png"}
          alt={
            complete
              ? "Conseguimos chegar em casa"
              : "Ficamos presos no planeta"
          }
        />
        <section className="result-art-scores" aria-label="Placar da partida">
          {[
            ["J1", p1Score],
            [mode === "1p" ? "SOLO" : "J2", score2],
            ["COMBOS", totalCombos],
            [mode === "coop" ? "EQUIPE" : "SCORE", officialScore(mode, p1Score, score2)],
          ].map(([label, value]) => (
            <article key={label as string} className="result-stat">
              <ScoreTitle>{String(label)}</ScoreTitle>
              <ScoreValue progress={progress} value={Number(value)} />
            </article>
          ))}
        </section>
        <article className={`result-art-pieces${mode === "1v1" ? " result-versus-winner" : ""}`}>
          <ScoreTitle>
            {mode === "1v1" ? "RESULTADO DO DESAFIO" : "PEÇAS COLETADAS"}
          </ScoreTitle>
          <ScoreValue progress={progress} value={mode === "1v1" ? undefined : collected}>
            {mode === "1v1"
              ? winner
                ? `JOGADOR ${winner} VENCEU!`
                : "EMPATE!"
              : collected.toLocaleString("pt-BR")}
          </ScoreValue>
        </article>
        <button
          className="result-art-menu"
          onClick={onRestart}
          aria-label="Menu principal"
        />
      </div>
    </div>
  );
}
export default ResultScreen;
