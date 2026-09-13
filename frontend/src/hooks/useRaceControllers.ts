import { useEffect } from "react";

export function useRaceControllers(
  move: (player: number, dx: number, dy: number) => void,
  shoot: (player: number) => void,
) {
  useEffect(() => {
    if (!navigator.getGamepads) return;
    let frame = 0;
    const next = [0, 0];
    const firing = [false, false];
    const poll = (now: number) => {
      Array.from(navigator.getGamepads())
        .filter((pad): pad is Gamepad => !!pad?.connected)
        .slice(0, 2)
        .forEach((pad, player) => {
          const dx = pad.buttons[14]?.pressed
            ? -1
            : pad.buttons[15]?.pressed
              ? 1
              : Math.abs(pad.axes[0] ?? 0) > 0.45
                ? Math.sign(pad.axes[0])
                : 0;
          const dy = pad.buttons[12]?.pressed
            ? -1
            : pad.buttons[13]?.pressed
              ? 1
              : Math.abs(pad.axes[1] ?? 0) > 0.45
                ? Math.sign(pad.axes[1])
                : 0;
          const fire = [0, 1, 2, 3].some(
            (button) => !!pad.buttons[button]?.pressed,
          );
          if (fire && !firing[player]) shoot(player);
          firing[player] = fire;
          if (!dx && !dy) {
            next[player] = 0;
            return;
          }
          if (now >= next[player]) {
            move(player, dx, dy);
            next[player] = now + 170;
          }
        });
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, [move, shoot]);
}
