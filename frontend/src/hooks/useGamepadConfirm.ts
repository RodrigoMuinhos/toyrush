import { useEffect } from "react";
import { isConfirmPressed, isBackPressed } from "../game/gamepadButtons";

export function useGamepadConfirm(onConfirm: () => void, enabled = true, onBack?: () => void) {
  useEffect(() => {
    if (!enabled || !navigator.getGamepads) return;
    let frame = 0;
    let previousPressed = true;
    let previousBack = true;
    const poll = () => {
      const pressed = Array.from(navigator.getGamepads()).some(
        (pad) =>
          !!pad?.connected && isConfirmPressed(pad),
      );
      const backing = Array.from(navigator.getGamepads()).some(pad => !!pad?.connected && isBackPressed(pad));
      if (backing && !previousBack) onBack?.();
      else if (pressed && !backing && !previousPressed) onConfirm();
      previousPressed = pressed;
      previousBack = backing;
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, [enabled, onConfirm, onBack]);
}
