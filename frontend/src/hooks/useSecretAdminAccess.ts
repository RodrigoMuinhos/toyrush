import { useEffect, useState } from "react";

// Press F8 three times to reveal admin access.
const WINDOW_MS = 2000;
const PRESSES_NEEDED = 3;

export function useSecretAdminAccess() {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (revealed) return;

    let presses: number[] = [];

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "F8" || event.repeat) return;
      event.preventDefault();

      const now = Date.now();
      presses = [...presses.filter((t) => now - t < WINDOW_MS), now];

      if (presses.length >= PRESSES_NEEDED) setRevealed(true);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [revealed]);

  return revealed;
}
