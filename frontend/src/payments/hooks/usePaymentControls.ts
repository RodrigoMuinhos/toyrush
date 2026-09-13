import { useEffect } from "react";
import { useGamepadConfirm } from "../../hooks/useGamepadConfirm";
export function usePaymentControls(choose: (direction: number) => void, confirm: () => void, close: () => void) {
  useGamepadConfirm(confirm, true, close);
  useEffect(() => {
    let frame = 0; let held = false;
    const poll = () => {
      let direction = 0;
      for (const pad of Array.from(navigator.getGamepads?.() || [])) {
        if (!pad?.connected) continue;
        if (pad.buttons[14]?.pressed || pad.axes[0] < -.6) direction = -1;
        else if (pad.buttons[15]?.pressed || pad.axes[0] > .6) direction = 1;
      }
      if (direction && !held) choose(direction);
      held = direction !== 0; frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, [choose]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (["ArrowLeft", "ArrowRight", "Enter", " ", "Escape"].includes(event.key)) event.preventDefault();
      if (event.key === "ArrowLeft") choose(-1);
      else if (event.key === "ArrowRight") choose(1);
      else if (event.key === "Enter" || event.key === " ") confirm();
      else if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [choose, confirm, close]);
}
