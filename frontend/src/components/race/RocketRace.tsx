import { useRaceControllers } from "../../hooks/useRaceControllers";
import { useCallback, useEffect, useRef, useState } from "react";
import { moveRacePilot, type RacePilot } from "../../racePlayers";
import { raceDifficulty, crossesPlayer } from "../../raceDifficulty";
import type { GameMode } from "../../game/types";
import { SFX, vibrate } from "../../audio/sound";
export function RocketRace({
  mode,
  onComplete,
}: {
  mode: GameMode;
  onComplete: (won: boolean, winner?: number) => void;
}) {
  const make = () =>
    Array.from({ length: mode === "1p" ? 1 : 2 }, (_, i) => ({
      lane: mode === "1p" ? 2 : i ? 3 : 1,
      row: 3,
      lives: mode === "1v1" ? 1 : mode === "coop" ? 2 : 3,
      immuneUntil: 0,
    }));
  const [pilots, setPilots] = useState<RacePilot[]>(make),
    ref = useRef(pilots),
    [score, setScore] = useState(0),
    [obstacles, setObstacles] = useState<
      {
        id: number;
        lane: number;
        y: number;
        src: string;
        previousY: number;
        indestructible: boolean;
      }[]
    >([]),
    finished = useRef(false),
    id = useRef(0);
  const boostedAt = useRef<number | null>(null);
  const bulletId = useRef(0);
  const [bullets, setBullets] = useState<
    { id: number; player: number; lane: number; y: number }[]
  >([]);
  const completionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [impacts, setImpacts] = useState<
    { lane: number; row: number; key: number }[]
  >([]);
  const [explosions, setExplosions] = useState<
    { lane: number; y: number; key: number }[]
  >([]);
  useEffect(
    () => () => {
      if (completionTimer.current) clearTimeout(completionTimer.current);
    },
    [],
  );
  const move = useCallback(
    (i: number, dx: number, dy: number) => {
      if (finished.current) return;
      ref.current = moveRacePilot(ref.current, i, dx, dy, mode === "1v1");
      setPilots(ref.current);
    },
    [mode],
  );
  const shoot = useCallback((player: number) => {
    if (finished.current) return;
    const pilot = ref.current[player];
    if (!pilot?.lives) return;
    setBullets((current) => [
      ...current,
      {
        id: bulletId.current++,
        player,
        lane: pilot.lane,
        y: 8 + pilot.row * 20,
      },
    ]);
    SFX.shoot();
  }, []);
  useRaceControllers(move, shoot);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const d: { [key: string]: [number, number, number] } = {
        ArrowLeft: [0, -1, 0],
        ArrowRight: [0, 1, 0],
        ArrowUp: [0, 0, -1],
        ArrowDown: [0, 0, 1],
        a: [1, -1, 0],
        d: [1, 1, 0],
        w: [1, 0, -1],
        s: [1, 0, 1],
      };
      if ([" ", "Enter", "x", "X", "z", "Z"].includes(e.key)) {
        e.preventDefault();
        shoot(0);
        return;
      }
      if (d[e.key]) {
        e.preventDefault();
        move(...d[e.key]);
      }
    };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, [move, shoot]);
  useEffect(() => {
    const t = setInterval(() => {
      if (finished.current) return;
      setScore((v) => v + 1);
      if (score > 1000 && boostedAt.current === null)
        boostedAt.current = score / 10;
      const difficulty = raceDifficulty(score, score / 10, boostedAt.current);
      const level = Math.max(1, Math.floor(score / 1000) + 1);
      const enemyTarget = Math.min(32, 2 ** level);
      const speed = difficulty.speed * 0.38,
        now = Date.now(),
        moved = obstacles.map((o) => ({
          ...o,
          previousY: o.y,
          y: o.y + speed,
        })),
        hit = new Set<number>(),
        movedBullets = bullets.map((bullet) => ({
          ...bullet,
          y: bullet.y - 9,
        })),
        destroyed = new Set<number>(),
        destroyedBullets = new Set<number>(),
        newExplosions: { lane: number; y: number; key: number }[] = [];
      movedBullets.forEach((bullet) => {
        const target = moved.find(
          (obstacle) =>
            obstacle.lane === bullet.lane &&
            Math.abs(obstacle.y - bullet.y) < 11,
        );
        if (target) {
          destroyedBullets.add(bullet.id);
          if (!target.indestructible) {
            destroyed.add(target.id);
            newExplosions.push({
              lane: target.lane,
              y: target.y,
              key: now + target.id,
            });
            setScore((value) => value + 10);
            SFX.hit();
          } else {
            SFX.collision();
          }
        }
      });
      const newImpacts: { lane: number; row: number; key: number }[] = [];
      ref.current = ref.current.map((p) => {
        if (p.lives <= 0) return p;
        const o = moved.find(
          (x) =>
            x.lane === p.lane &&
            p.immuneUntil <= now &&
            crossesPlayer(x.previousY, x.y, 8 + p.row * 20),
        );
        if (!o) return p;
        hit.add(o.id);
        newImpacts.push({
          lane: p.lane,
          row: p.row,
          key: now + newImpacts.length,
        });
        vibrate([70, 30, 70]);
        SFX.collision();
        return { ...p, lives: p.lives - 1, immuneUntil: now + 1000 };
      });
      setImpacts((previous) => [
        ...previous.filter((i) => now - i.key < 600),
        ...newImpacts,
      ]);
      setExplosions((previous) => [
        ...previous.filter((explosion) => now - explosion.key < 500),
        ...newExplosions,
      ]);
      setPilots(ref.current);
      const alive = ref.current.filter((p) => p.lives > 0).length;
      if (alive === 0 || (mode === "1v1" && alive < 2)) {
        finished.current = true;
        completionTimer.current = setTimeout(
          () =>
            onComplete(
              mode === "1v1" ? alive === 1 : score >= 1000,
              mode === "1v1"
                ? ref.current.findIndex((p) => p.lives > 0) + 1
                : undefined,
            ),
          650,
        );
      }
      const next = moved.filter(
        (o) => o.y < 110 && !hit.has(o.id) && !destroyed.has(o.id),
      );
      setBullets(
        movedBullets.filter(
          (bullet) => bullet.y > -12 && !destroyedBullets.has(bullet.id),
        ),
      );
      const missingEnemies = enemyTarget - next.length;
      const spawnCount =
        Math.random() < difficulty.spawnChance
          ? Math.max(1, Math.min(missingEnemies, level))
          : 0;
      for (let i = 0; i < spawnCount; i++) {
        const obstacleId = id.current++;
        next.push({
          id: obstacleId,
          lane: Math.floor(Math.random() * 5),
          y: -12 - i * 8,
          previousY: -13 - i * 8,
          indestructible: Math.random() < Math.min(0.3, 0.1 + level * 0.03),
          src: `/mosnter ${(obstacleId % 4) + 1}.png`,
        });
      }
      setObstacles(next);
    }, 100);
    return () => clearInterval(t);
  }, [bullets, mode, onComplete, obstacles, score]);
  return (
    <div className="rocket-race" role="status" aria-live="assertive">
      <div className="race-skyline" />
      <div className="race-hero">
        <img src="/herocorriida.png" alt="Foguete montado! Vai!" />
      </div>
      <div className="race-track">
        {bullets.map((bullet) => (
          <span
            key={bullet.id}
            className="race-projectile"
            style={{ left: `${10 + bullet.lane * 20}%`, top: `${bullet.y}%` }}
          />
        ))}
        {obstacles.map((o) => (
          <img
            key={o.id}
            className={`race-obstacle ${o.indestructible ? "is-indestructible" : ""}`}
            src={o.src}
            alt="Monstrinho inimigo"
            style={{ left: `${10 + o.lane * 20}%`, top: `${o.y}%` }}
          />
        ))}
        {explosions.map((explosion) => (
          <span
            key={explosion.key}
            className="race-explosion"
            style={{
              left: `${10 + explosion.lane * 20}%`,
              top: `${explosion.y}%`,
            }}
          >
            ✦
          </span>
        ))}
        {impacts.map((impact) => (
          <div
            key={impact.key}
            className="race-impact"
            style={{
              left: `${10 + impact.lane * 20}%`,
              top: `${8 + impact.row * 20}%`,
            }}
          >
            <svg viewBox="0 0 100 100">
              <path
                d="m50 3 12 25 27-10-10 27 18 10-26 10 8 26-26-12-15 18-8-27-26-8 24-14-9-26 27 9Z"
                fill="#ffe26a"
                stroke="#ff8138"
                strokeWidth="4"
              />
              <circle cx="50" cy="50" r="17" fill="#fff9df" />
            </svg>
          </div>
        ))}
        {pilots.map(
          (p, i) =>
            p.lives > 0 && (
              <img
                key={i}
                className="race-rocket"
                src={i ? "/navepista2.png" : "/navepista.png"}
                alt={`Nave do jogador ${i + 1}`}
                style={{
                  left: `${10 + p.lane * 20}%`,
                  top: `${8 + p.row * 20}%`,
                }}
              />
            ),
        )}
      </div>
      <div className="race-instrument-panel">
        <div className="race-stats">
          <span>
            TEMPO<strong>{(score / 10).toFixed(1)} s</strong>
          </span>
          <span>
            PONTOS<strong>{score.toLocaleString("pt-BR")}</strong>
          </span>
          <span>
            NÍVEL<strong>{Math.max(1, Math.floor(score / 1000) + 1)}</strong>
          </span>
          <span>
            TIROS<strong>∞</strong>
          </span>
          <span>
            VIDAS
            <strong>
              {pilots.map((p, i) => `J${i + 1}: ${p.lives}`).join(" · ")}
            </strong>
          </span>
        </div>
        <div className="race-progress">
          <div style={{ width: `${Math.min(score / 1000, 1) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
export default RocketRace;
