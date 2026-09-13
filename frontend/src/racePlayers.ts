export type RacePilot = { lane: number; row: number; lives: number; immuneUntil: number };
export function moveRacePilot(pilots: RacePilot[], index: number, dx: number, dy: number, versus: boolean): RacePilot[] {
  const pilot = pilots[index];
  if (!pilot?.lives) return pilots;
  const lane = Math.max(0, Math.min(4, pilot.lane + Math.sign(dx)));
  const row = Math.max(0, Math.min(4, pilot.row + Math.sign(dy)));
  if (lane === pilot.lane && row === pilot.row) return pilots;
  const next = pilots.map(p => ({ ...p }));
  const other = pilots.findIndex((p, i) => i !== index && p.lives > 0 && p.lane === lane && p.row === row);
  if (versus && other >= 0) {
    const push = dx ? Math.sign(dx) : (lane < 4 ? 1 : -1);
    const destination = lane + push;
    if (destination < 0 || destination > 4) return pilots;
    next[other].lane = destination;
  }
  next[index] = { ...next[index], lane, row };
  return next;
}
