import { useEffect, useRef, useState } from "react";

type Effect = { x: number; y: number; hit: boolean; serial: number };

// Uses the actual animated positions so the shot leaves the ship and hits its target.
export function SceneCombat({ combos }: { combos: number }) {
  const overlay = useRef<HTMLDivElement>(null);
  const shoot = useRef<() => void>(() => {});
  const [effect, setEffect] = useState<Effect | null>(null);

  useEffect(() => {
    let frame = 0;
    let cleanupTimer: ReturnType<typeof setTimeout>;
    let busy = false;
    let serial = 0;
    let target: HTMLElement | undefined;
    shoot.current = () => {
      if (busy) return;
      const scene = overlay.current?.parentElement;
      const ship = scene?.querySelector<HTMLElement>(".scene-patrol-ship");
      const enemies = scene?.querySelectorAll<HTMLElement>(".scene-floating-friend");
      if (!scene || !ship || !enemies?.length) return;
      busy = true;
      target = enemies[serial++ % enemies.length];
      const bounds = scene.getBoundingClientRect();
      const source = ship.getBoundingClientRect();
      const x = source.right - bounds.left - source.width * .06;
      const y = source.top - bounds.top + source.height * .5;
      const start = performance.now();
      const advance = (now: number) => {
        if (!target) return;
        const area = scene.getBoundingClientRect();
        const destination = target.getBoundingClientRect();
        const endX = destination.left - area.left + destination.width / 2;
        const endY = destination.top - area.top + destination.height / 2;
        const progress = Math.min(1, (now - start) / 550);
        setEffect({ x: x + (endX - x) * progress, y: y + (endY - y) * progress, hit: progress === 1, serial });
        if (progress < 1) frame = requestAnimationFrame(advance);
        else {
          target.classList.add("scene-enemy-hit");
          cleanupTimer = setTimeout(() => {
            target?.classList.remove("scene-enemy-hit");
            setEffect(null);
            busy = false;
          }, 850);
        }
      };
      frame = requestAnimationFrame(advance);
    };
    const interval = setInterval(() => shoot.current(), 2400);
    return () => {
      clearInterval(interval);
      clearTimeout(cleanupTimer);
      cancelAnimationFrame(frame);
      target?.classList.remove("scene-enemy-hit");
      shoot.current = () => {};
    };
  }, []);

  useEffect(() => { if (combos > 0) shoot.current(); }, [combos]);

  return <div ref={overlay} className="scene-combat" aria-hidden="true">
    {effect && <div key={`${effect.serial}-${effect.hit}`} className={effect.hit ? "scene-impact" : "scene-projectile"}
      style={{ left: effect.x, top: effect.y }}>
      {effect.hit && <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#8bf3ff" strokeWidth="4" />
        <path d="m50 4 9 25 23-13-9 26 23 8-25 10 13 23-26-10-8 23-10-25-23 13 10-26L4 50l25-9-13-23 26 10Z" fill="#ffd84c" stroke="#ff9336" strokeWidth="3" />
        <circle cx="50" cy="50" r="16" fill="#fffbe1" />
      </svg>}
    </div>}
  </div>;
}
