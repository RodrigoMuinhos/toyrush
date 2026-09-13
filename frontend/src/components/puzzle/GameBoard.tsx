import type { CSSProperties } from "react";
import "./risingRows.css";
import type { PS } from "../../game/types";
import { COLS, PCONF, ROWS } from "../../game/constants";
import { Piece3D } from "./Piece3D";
import { AttackOverlay } from "./VersusAttackVisuals";
import { lockedAttackColumn } from "../../game/versusAttacks";
export function GameBoard({
  st,
  pNum,
  sz,
  showAutoTimer = true,
}: {
  st: PS;
  pNum: 1 | 2;
  sz: number;
  showAutoTimer?: boolean;
}) {
  const G = 2,
    accent = pNum === 1 ? "#DC2626" : "#1D4ED8";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: G,
        userSelect: "none",
        position: "relative",
      }}
    >
      <span className="power-gear-rule">
        <img src="/footergear.png" alt="5 ou mais peças da mesma cor → 1 Power Gear" draggable={false} />
      </span>
      {st.gearNotice && <div className="power-gear-notice" role="status">{st.gearNotice}</div>}
      <div style={{ display: "flex", gap: G, height: sz + 8, marginBottom: 2 }}>
        {Array.from({ length: COLS }, (_, c) => (
          <div
            key={c}
            style={{
              width: sz,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              flexDirection: "column",
            }}
          >
            {c === st.cursor && !st.lockedCols[c] && st.phase === "idle" && (
              <div
                style={{
                  fontSize: sz * 0.3,
                  color: PCONF[st.piece].hi,
                  filter: `drop-shadow(0 0 8px ${PCONF[st.piece].glow})`,
                }}
              >
                ▼
              </div>
            )}
          </div>
        ))}
      </div>
      {showAutoTimer && (
        <div style={{ display: "flex", gap: G, height: 5 }}>
          {Array.from({ length: COLS }, (_, c) => (
            <div
              key={c}
              style={{ flex: 1, height: 5, background: "#ffffff12" }}
            >
              {c === st.cursor && st.phase === "idle" && !st.lockedCols[c] && (
                <div
                  style={{
                    height: "100%",
                    width: `${st.autoTimer * 100}%`,
                    background: st.autoTimer > 0.75 ? "#EF4444" : accent,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
      <div
        className={`rising-board-window${st.versusAttack?.kind === "shuffle" && st.versusAttack.stage === "warning" ? " shuffling-board" : ""}`}
        style={{ height: ROWS * (sz + G) - G }}
      >
        <div
          key={st.rises}
          className="rising-board-track is-rising"
          style={{ "--row-pitch": `${sz + G}px` } as CSSProperties}
        >
          {st.grid.map((row, r) => (
            <div key={r} style={{ display: "flex", gap: G }}>
              {row.map((cell, c) => {
                const falling =
                    st.phase === "idle" &&
                    r === st.fallRow &&
                    c === st.cursor &&
                    !cell,
                  locked = st.lockedCols[c],
                  exploding = st.explodingCells.has(`${r},${c}`),
                  effect = st.cellEffects[`${r},${c}`],
                  frozen = st.frozen[`${r},${c}`] > Date.now(),
                  shuffle = st.versusAttack?.kind === "shuffle" && st.versusAttack.stage === "warning" ? st.versusAttack.moves?.[`${r},${c}`] : undefined;
                return (
                  <div
                    key={c}
                    style={{
                      width: sz,
                      height: sz,
                      borderRadius: sz * 0.4,
                      background: cell
                        ? `linear-gradient(135deg,${PCONF[cell].hi}28,${PCONF[cell].dark}50)`
                        : falling
                          ? `linear-gradient(135deg,${PCONF[st.piece].hi}55,${PCONF[st.piece].dark}90)`
                          : locked
                            ? "#dc262612"
                            : "#1a396e8c",
                      border: `1.5px solid ${cell ? PCONF[cell].main + "60" : falling ? PCONF[st.piece].main : locked ? "#dc262638" : "#ffffff22"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {cell ? (
                      <div className={shuffle ? "shuffle-piece" : undefined} style={shuffle ? { "--shuffle-x": `${(shuffle.col-c)*(sz+G)}px`, "--shuffle-y": `${(shuffle.row-r)*(sz+G)}px` } as CSSProperties : undefined}>
                      <Piece3D
                        type={cell}
                        size={sz - 3}
                        exploding={exploding}
                        explosionDelay={effect?.delay ?? 0}
                      />
                      </div>
                    ) : falling ? (
                      <Piece3D type={st.piece} size={sz - 3} />
                    ) : null}
                    {frozen && <span className="cell-frozen">❄</span>}
                    {!frozen && st.versusAttack?.kind === "freezeBlock" && st.versusAttack.stage === "recovery" && st.versusAttack.cells.includes(`${r},${c}`) && <span className="cell-frozen stage-recovery">✦</span>}
                    {lockedAttackColumn(st) === c && <span className="cell-locked" />}
                    {effect && <span className={`gear-cell-effect gear-effect-${effect.kind}`} style={{
                      "--effect-start": `${effect.start}ms`,
                      "--effect-duration": `${Math.max(200, effect.delay - effect.start + 300)}ms`,
                    } as CSSProperties}>{effect.kind === "freeze" ? "❄" : effect.kind === "fire" ? "🔥" : effect.kind === "hunter" ? "◎" : "✦"}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <AttackOverlay attack={st.versusAttack} />
      </div>
      <div
        style={{
          position: "absolute",
          top: sz + 18,
          left: 0,
          right: 0,
          height: ROWS * (sz + G) - G,
          display: "flex",
          gap: G,
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        {st.lockedCols.map((locked, c) => (
          <div
            key={c}
            style={{
              flex: 1,
              background: locked ? "#00000073" : "transparent",
            }}
          />
        ))}
      </div>
    </div>
  );
}
export default GameBoard;
