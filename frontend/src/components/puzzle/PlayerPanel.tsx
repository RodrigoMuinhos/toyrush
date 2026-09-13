import { VERSUS_SCORE_TO_WIN } from "../../game/scoring";
import { useLayoutEffect, useRef, useState } from "react";
import type { PS } from "../../game/types";
import { COLS, PCONF, ROWS } from "../../game/constants";
import { Piece3D } from "./Piece3D";
import { GameBoard } from "./GameBoard";
export function PlayerPanel({
  st,
  pNum,
  versus = false,
  solo = false,
  startCountdown,
  isAI = false,
}: {
  st: PS;
  pNum: 1 | 2;
  versus?: boolean;
  solo?: boolean;
  startCountdown?: number;
  isAI?: boolean;
}) {
  const highest = st.grid.findIndex((row) => row.some(Boolean)),
    life = highest === -1 ? 100 : Math.round((highest / ROWS) * 100),
    col = pNum === 1 ? "#EF4444" : "#3B82F6",
    area = useRef<HTMLDivElement>(null),
    [sz, setSz] = useState(34);
  useLayoutEffect(() => {
    const update = () => {
      const w = area.current?.clientWidth ?? 200,
        h = area.current?.clientHeight ?? 500;
      const heightPadding = solo ? 10 : 42;
      setSz(
        Math.max(
          8,
          Math.min(
            solo ? 82 : 68,
            Math.floor((w - (COLS - 1) * 2) / COLS),
            Math.floor((h - (ROWS + 1) * 2 - heightPadding) / (ROWS + 1)),
          ),
        ),
      );
    };
    update();
    const ro = new ResizeObserver(update);
    if (area.current) ro.observe(area.current);
    return () => ro.disconnect();
  }, [solo]);
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        background: `linear-gradient(180deg,#1e5a8c0d,#071b4618), radial-gradient(ellipse at 50% 110%,${col}12,transparent 72%)`,
        backdropFilter: "blur(2px) saturate(1.08)",
        WebkitBackdropFilter: "blur(2px) saturate(1.08)",
        border: `2px solid ${col}99`,
        boxShadow: "inset 0 1px 0 #ffffff33, inset 0 0 28px #7bdfff12",
        borderRadius: "clamp(10px,1.8vmin,18px)",
        margin: "clamp(3px,.55vmin,5px)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: 8,
          borderBottom: `1px solid ${col}45`,
        }}
      >
        <Piece3D type={pNum === 1 ? "cone" : "win"} size={solo ? 36 : 30} />
        <div
          style={{
            flex: 1,
            fontFamily: "Fredoka,sans-serif",
            color: col,
            fontWeight: 700,
          }}
        >
          JOGADOR {pNum} {isAI && <span className="player-ai-badge">🤖</span>}
          <div style={{ color: "#FFC928", fontSize: 11 }}>
            {versus
              ? `${st.combos} combos`
              : `${st.combos} ações`}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <strong style={{ fontSize: 24, color: "#FFC928" }}>
            {st.score.toLocaleString("pt-BR")}
          </strong>
          <small style={{ display: "block", fontSize: 9 }}>SCORE</small>
        </div>
        <div>
          <Piece3D
            type={st.piece}
            size={Math.max(22, Math.min(sz, solo ? 42 : 36))}
          />
          <Piece3D type={st.nextPiece} size={18} />
        </div>
      </div>
      {versus && (
        <div className="duel-life">
          <div>
            <span>VIDA · {life}%</span>
            <span>{st.score.toLocaleString("pt-BR")} / {VERSUS_SCORE_TO_WIN.toLocaleString("pt-BR")} PTS</span>
          </div>
          <progress max={100} value={life} />
        </div>
      )}
      <div
        ref={area}
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: 4,
          position: "relative",
        }}
      >
        {startCountdown !== undefined && (
          <div className="player-start-countdown" aria-live="assertive">
            <strong
              className={`countdown-step countdown-${startCountdown > 0 ? startCountdown : "go"}`}
            >
              {startCountdown > 0 ? startCountdown : "GO!"}
            </strong>
            {startCountdown <= 0 && <span>APERTE UM BOTÃO PARA COMEÇAR</span>}
          </div>
        )}
        <div style={{ transform: `translateY(-${sz + 2 + (solo ? 11 : 0)}px)` }}>
          <GameBoard st={st} pNum={pNum} sz={sz} showAutoTimer={!versus} />
        </div>
      </div>
    </div>
  );
}
export default PlayerPanel;
