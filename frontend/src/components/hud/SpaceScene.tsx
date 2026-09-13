import { SceneCombat } from "./SceneCombat";
import "./spaceScene.css";
import { SCORE_LEVEL_STEP } from "../../game/constants";
export function SpaceScene({
  combos,
  totalScore,
  elapsedSeconds,
}: {
  combos: number;
  totalScore: number;
  elapsedSeconds: number;
}) {
  const stage = Math.min(3, Math.floor(totalScore / SCORE_LEVEL_STEP));
  return (
    <div
      className="animated-space-scene"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        backgroundColor: "#081a3d",
      }}
    >
      {Array.from({ length: 7 }, (_, i) => (
        <img
          key={i}
          src={`/c${i + 1}.png`}
          alt=""
          aria-hidden="true"
          className="space-scenery-layer"
          style={{ opacity: Math.floor(elapsedSeconds / 25) % 7 === i ? 1 : 0 }}
        />
      ))}
      {Array.from({ length: 28 }, (_, i) => (
        <i
          key={i}
          className="scene-star"
          style={{
            animationDelay: `${-i * 0.37}s`,
            position: "absolute",
            left: `${(i * 41 + 9) % 100}%`,
            top: `${(i * 27 + 5) % 100}%`,
            width: i % 6 === 0 ? 2 : 1,
            height: i % 6 === 0 ? 2 : 1,
            borderRadius: "50%",
            background: "white",
            opacity: 0.18 + (i % 6) * 0.08,
          }}
        />
      ))}
      <img
        src={`/nave${stage ? stage + 1 : ""}.png`}
        alt="Nave do jogador"
        className="scene-patrol-ship"
        style={{
          position: "absolute",
          left: "5%",
          top: "35%",
          width: "clamp(110px,14vmin,205px)",
          objectFit: "contain",
        }}
      />
      {[1, 2, 3, 4].map((monster, i) => (
        <img
          key={monster}
          src={`/mosnter ${monster}.png`}
          alt=""
          aria-hidden="true"
          className="scene-floating-friend"
          style={{
            left: `${53 + (i % 2) * 28}%`,
            top: `${8 + i * 20}%`,
            animationDelay: `${-i * 1.7}s`,
          }}
        />
      ))}
      <SceneCombat combos={combos} />
    </div>
  );
}
export default SpaceScene;
