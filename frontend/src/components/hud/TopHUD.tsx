import { useEffect, useRef, useState } from "react";
import { SFX } from "../../audio/sound";
import { getRowRiseInterval } from "../../game/risingRows";
import type { GameMode, Gear, PS } from "../../game/types";
import { getComboFeedback, PCONF } from "../../game/constants";
import { SpaceScene } from "./SpaceScene";
const GEAR_ART: Record<Gear, string> = {
  gearFreezeRow: "/blue.png",
  gearFreezeColumn: "/blue.png",
  gearFireRow: "/red.png",
  gearFireColumn: "/red.png",
  gearBlast: "/orange.png",
  gearCross: "/green.png",
  gearHunter: "/purple.png",
};
export function TopHUD({
  comboEffects,
  attackEffects,
  powerCharges,
  elapsedSeconds,
  p1Combos,
  p2Combos,
  p1Actions,
  p2Actions,
  comboSequence,
  coopStatus,
  coopComboProgress,
  p1Score,
  p2Score,
  totalCombos,
  difficultyLevel,
  mode,
}: {
  attackEffects: { notice: string; serial: number }[];
  comboEffects: PS["scorePopup"][];
  powerCharges: number;
  elapsedSeconds: number;
  p1Combos: number;
  p2Combos: number;
  p1Actions: number;
  p2Actions: number;
  comboSequence: number;
  coopStatus: number;
  coopComboProgress: number;
  p1Score: number;
  p2Score: number;
  totalCombos: number;
  difficultyLevel: number;
  mode: GameMode;
}) {
  const riseInterval = getRowRiseInterval(elapsedSeconds);
  const nextRow = riseInterval - (elapsedSeconds % riseInterval);
  const comboFeedback = getComboFeedback(comboSequence);
  const latestCombo = comboEffects.reduce<PS["scorePopup"]>((latest, effect) => effect && (!latest || effect.key > latest.key) ? effect : latest, null);
  const comboLabel = (streak: number) => `${streak >= 7 ? "MEGA COMBO" : streak >= 6 ? "SUPER COMBO" : "COMBO"} x${streak}`;
  const seenCombos = useRef<number[]>([]);
  const [gearCelebrations, setGearCelebrations] = useState<{ id: string; gears: Gear[]; pts: number; streak: number }[]>([]);
  const celebration = gearCelebrations[0];
  useEffect(() => {
    const incoming: { id: string; gears: Gear[]; pts: number; streak: number }[] = [];
    comboEffects.forEach((effect, player) => {
      if (!effect || seenCombos.current[player] === effect.key) return;
      seenCombos.current[player] = effect.key;
      if (effect.gears?.length) incoming.push({ id: `${player}-${effect.key}`, gears: effect.gears, pts: effect.pts, streak: effect.streak });
    });
    if (incoming.length) setGearCelebrations(queue => [...queue, ...incoming]);
  }, [comboEffects]);
  useEffect(() => {
    if (!celebration) return;
    SFX.gearMagic();
    const timeout = setTimeout(() => setGearCelebrations(queue => queue.slice(1)), 3200);
    return () => clearTimeout(timeout);
  }, [celebration]);
  return (
    <div
      style={{
        flex: "0 0 26%",
        background: "linear-gradient(180deg,#102b63,#174b86)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        className="top-hud-bar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: 8,
          background: "#07194385",
          zIndex: 5,
        }}
      >
        <strong style={{ color: "#FFC928", fontFamily: "Fredoka,sans-serif" }}>
          TOY FACTORY
          <br />
          <span style={{ color: "#FF8A2A" }}>RUSH</span>
        </strong>
        <div style={{ flex: 1 }} />
        <div
          className="top-hud-time"
          style={{
            color: "#fff",
            textAlign: "center",
            fontFamily: "Fredoka,sans-serif",
          }}
        >
          <strong style={{ fontSize: "clamp(20px,3vmin,36px)" }}>
            {Math.floor(elapsedSeconds / 60)}:
            {String(elapsedSeconds % 60).padStart(2, "0")}
          </strong>
          {nextRow <= 3 && (
            <small className="rising-row-easter-egg">
              NOVA LINHA EM {nextRow}s
            </small>
          )}
        </div>
        {mode === "coop" && (
          <span className="coop-powers">
            RAIO ×{powerCharges} · TURBO ×{powerCharges}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <SpaceScene
          combos={comboSequence}
          totalScore={p1Score + p2Score}
          elapsedSeconds={elapsedSeconds}
        />
        <div className="attack-bursts" aria-live="polite">
          {celebration ? (
            <div key={`power-gear-${celebration.id}`} className="attack-burst shared-power-gear">
              {celebration.gears.map((gear, index) => (
                <img key={`${gear}-${index}`} src={GEAR_ART[gear]} alt={`${PCONF[gear].label} criada!`} draggable={false} />
              ))}
              <span className="gear-score-award">{comboLabel(celebration.streak)} · +{celebration.pts.toLocaleString("pt-BR")} PTS</span>
            </div>
          ) : attackEffects.some((a) => a.notice) ? (
            <div className="attack-burst shared-attack">
              <strong>RANDOMM</strong>
            </div>
          ) : (
            comboEffects.some(Boolean) && (
              <div
                key={`combo-message-${comboSequence}`}
                className="attack-burst shared-combo"
              >
                <strong>{latestCombo && latestCombo.streak > 1 ? comboLabel(latestCombo.streak) : comboFeedback.message}</strong>
                <span>+{(latestCombo?.pts ?? 0).toLocaleString("pt-BR")} PONTOS</span>
              </div>
            )
          )}
        </div>
        <div
          style={{
            position: "absolute",
            top: 4,
            left: "50%",
            color: "#ffffff47",
            letterSpacing: 2,
          }}
        >
          MONTE O FOGUETE
        </div>
      </div>
    </div>
  );
}
export default TopHUD;
