import { useCallback, useEffect, useRef } from "react";
export function TouchAction({
  label,
  direction,
  action,
  repeat = false,
}: {
  label: string;
  direction: "left" | "right" | "down";
  action: () => void;
  repeat?: boolean;
}) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null),
    latest = useRef(action);
  latest.current = action;
  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => {
    window.addEventListener("blur", stop);
    return () => {
      stop();
      window.removeEventListener("blur", stop);
    };
  }, [stop]);
  return (
    <button
      className={`touch-action ${repeat ? "" : "touch-drop"}`}
      aria-label={label}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        stop();
        latest.current();
        if (repeat) timer.current = setInterval(() => latest.current(), 55);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      <span className="touch-arrow">
        {direction === "left" ? "←" : direction === "right" ? "→" : "↓"}
      </span>
    </button>
  );
}
export default TouchAction;
