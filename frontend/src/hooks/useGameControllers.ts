import { useEffect, useRef, useState } from "react";
import type { ControllerPhase } from "../game/types";
import { isConfirmPressed, isBackPressed, isFastDropPressed } from "../game/gamepadButtons";
export function useGameControllers(
  players: { move: (d: -1 | 1) => void; drop: () => void; softDrop: () => void; verticalMove: (d: -1 | 1) => void }[],
  secondPlayer: boolean,
  phase: ControllerPhase,
  onMenuMove: (d: -1 | 1) => void,
  onConfirm: () => void,
  onPlayerActivity?: (player: number) => void,
  enabled = true,
  onBack?: () => void,
) {
  const latest = useRef({
    players,
    secondPlayer,
    phase,
    onMenuMove,
    onConfirm,
    onBack,
    onPlayerActivity,
  });
  latest.current = {
    players,
    secondPlayer,
    phase,
    onMenuMove,
    onConfirm,
    onBack,
    onPlayerActivity,
  };
  const [connected, setConnected] = useState(["", ""]);
  useEffect(() => {
    if (!enabled || !navigator.getGamepads) return;
    let frame = 0;
    const slots: (number | null)[] = [null, null];
    const previousDirection = [0, 0];
    const previousMenuDirection = [0, 0];
    const previousConfirm = [false, false];
    const previousBack = [false, false];
    const nextMenuMove = [0, 0];
    const nextGameMove = [0, 0];
    const nextFastDrop = [0, 0];
    const nextVerticalMove = [0, 0];
    const deadzone = 0.45;
    const repeatDelay = 180;

    const readDirection = (pad: Gamepad, vertical = false): -1 | 0 | 1 => {
      const axis = pad.axes[vertical ? 1 : 0] ?? 0;
      const left = !!pad.buttons[vertical ? 12 : 14]?.pressed;
      const right = !!pad.buttons[vertical ? 13 : 15]?.pressed;
      if (left && !right) return -1;
      if (right && !left) return 1;
      if (Math.abs(axis) < deadzone) return 0;
      return axis < 0 ? -1 : 1;
    };

    const poll = (now: number) => {
      const pads = Array.from(navigator.getGamepads()).filter(
        (p): p is Gamepad => !!p?.connected,
      );
      slots.forEach((id, i) => {
        if (id !== null && !pads.some((pad) => pad.index === id)) {
          slots[i] = null;
          previousDirection[i] = 0;
          previousMenuDirection[i] = 0;
          previousConfirm[i] = false;
          previousBack[i] = false;
          nextMenuMove[i] = 0;
          nextGameMove[i] = 0;
          nextFastDrop[i] = 0;
          nextVerticalMove[i] = 0;
        }
      });
      pads.forEach((p) => {
        if (!slots.includes(p.index)) {
          const i = slots.indexOf(null);
          if (i >= 0) slots[i] = p.index;
        }
      });
      setConnected((s) => {
        const n = slots.map((id) => pads.find((p) => p.index === id)?.id || "");
        return n.join() === s.join() ? s : n;
      });
      slots.forEach((id, i) => {
        const p = pads.find((x) => x.index === id);
        if (!p) return;
        const dir = readDirection(p);
        const verticalDirection = readDirection(p, true);
        const menuDirection = verticalDirection || dir;
        if (!verticalDirection) nextVerticalMove[i] = 0;
        const verticalMovement =
          !!p.buttons[12]?.pressed ||
          !!p.buttons[13]?.pressed ||
          Math.abs(p.axes[1] ?? 0) > deadzone;
        const confirming = isConfirmPressed(p);
        const backing = isBackPressed(p);
        const fastDrop = isFastDropPressed(p);
        if (!fastDrop || latest.current.phase !== "game") nextFastDrop[i] = 0;
        if (
          (dir || verticalMovement || confirming || fastDrop) &&
          latest.current.phase === "game"
        )
          latest.current.onPlayerActivity?.(i);
        const menuPhase = [
          "splash",
          "ranking",
          "modeSelect",
          "mission",
          "soloComplete",
          "result",
        ].includes(latest.current.phase);

        if (
          menuDirection &&
          i === 0 &&
          [
            "splash",
            "modeSelect",
            "ranking",
            "soloComplete",
            "result",
          ].includes(latest.current.phase)
        ) {
          const changed = menuDirection !== previousMenuDirection[i];
          if (changed || now >= nextMenuMove[i]) {
            latest.current.onMenuMove(menuDirection);
            nextMenuMove[i] = now + (changed ? 350 : repeatDelay);
          }
        } else if (!menuDirection) {
          nextMenuMove[i] = 0;
        }

        if (backing && !previousBack[i] && menuPhase)
          latest.current.onBack?.();
        else if (confirming && !backing && !previousConfirm[i] && menuPhase)
          latest.current.onConfirm();
        if (
          latest.current.phase === "game" &&
          (i === 0 || latest.current.secondPlayer)
        ) {
          if (dir && (dir !== previousDirection[i] || now >= nextGameMove[i])) {
            latest.current.players[i].move(dir);
            nextGameMove[i] = now + repeatDelay;
          }
          if (verticalDirection && now >= nextVerticalMove[i]) {
            latest.current.players[i].verticalMove(verticalDirection);
            nextVerticalMove[i] = now + 100;
          }
          if (confirming && !previousConfirm[i])
            latest.current.players[i].drop();
          else if (fastDrop && now >= nextFastDrop[i]) {
            latest.current.players[i].softDrop();
            nextFastDrop[i] = now + 80;
          }
        }
        previousDirection[i] = dir;
        previousMenuDirection[i] = menuDirection;
        previousConfirm[i] = confirming;
        previousBack[i] = backing;
      });
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, [enabled]);
  return connected;
}
export default useGameControllers;
