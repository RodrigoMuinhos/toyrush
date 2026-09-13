import { PCONF, TYPES } from "./constants";
import { findMatches } from "./grid";
import type { CellEffect, Gear, Grid, PT, PowerSound } from "./types";

export const isGear = (piece: PT | null): piece is Gear | "gearRow" | "gearColumn" => !!piece?.startsWith("gear");
export function matchColor(piece: PT | null): PT | null {
  if (!piece) return null;
  if (piece.startsWith("gearFreeze") || piece === "gearRow") return "win";
  if (piece.startsWith("gearFire") || piece === "gearColumn") return "cone";
  if (piece === "gearBlast") return "wL";
  if (piece === "gearCross") return "str";
  if (piece === "gearHunter") return "wR";
  return TYPES.includes(piece) ? piece : null;
}

// Connected cells already belonging to a valid line or tetromino form one combination.
export function resolvePowerGears(grid: Grid, lastPlaced: string | null, random = Math.random) {
  const colors = grid.map(row => row.map(matchColor));
  const matched = findMatches(colors);
  const result = grid.map(row => [...row]);
  const remaining = new Set(matched);
  const created = new Set<string>();
  const effects: Record<string, CellEffect> = {};
  const powerSounds: PowerSound[] = [];
  const times = new Map<string, number>();
  const pending: { key: string; time: number }[] = [];
  const activated = new Set<string>();
  const notices: string[] = [];
  const comboSizes: number[] = [];
  const matchSizes: number[] = [];
  const at = (key: string) => { const [r,c] = key.split(",").map(Number); return result[r]?.[c] ?? null; };
  for (const seed of matched) {
    if (!remaining.delete(seed)) continue;
    const group = [seed];
    const color = matchColor(at(seed));
    for (let i = 0; i < group.length; i++) {
      const [r,c] = group[i].split(",").map(Number);
      for (const [rr,cc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]) {
        const key = `${rr},${cc}`;
        if (remaining.has(key) && matchColor(at(key)) === color) {
          remaining.delete(key); group.push(key);
        }
      }
    }
    matchSizes.push(group.length);
    if (group.length >= 5) comboSizes.push(group.length);
    // Activating an existing gear does not manufacture another gear from its blast.
    if (group.length < 5 || group.some(key => isGear(at(key)))) continue;
    const anchor = lastPlaced && group.includes(lastPlaced) ? lastPlaced : group.reduce((a,b) => {
      const [ar,ac] = a.split(",").map(Number), [br,bc] = b.split(",").map(Number);
      return br > ar || (br === ar && bc < ac) ? b : a;
    });
    const [r,c] = anchor.split(",").map(Number);
    const horizontal = group.filter(key => Number(key.split(",")[0]) === r).length;
    const vertical = group.filter(key => Number(key.split(",")[1]) === c).length;
    const direction = vertical > horizontal ? "Column" : "Row";
    const gear: Gear = color === "win" ? `gearFreeze${direction}` : color === "cone" ? `gearFire${direction}` : color === "wL" ? "gearBlast" : color === "str" ? "gearCross" : "gearHunter";
    result[r][c] = gear;
    created.add(anchor);
    notices.push(`${PCONF[gear].label}! ${group.length} peças`);
  }
  function hit(r: number, c: number, time: number, effect?: CellEffect) {
    if (!grid[r] || c < 0 || c >= grid[r].length) return;
    const key = `${r},${c}`;
    if (created.has(key) && !effect) return;
    // The power's timing replaces the ordinary match animation on its own line.
    if (effect && matched.has(key) && !effects[key]) times.delete(key);
    if (effect && (!effects[key] || time < effects[key].delay)) effects[key] = effect;
    if (!grid[r][c] || time >= (times.get(key) ?? Infinity)) return;
    times.set(key, time);
    pending.push({key,time});
  }
  for (const key of matched) { const [r,c] = key.split(",").map(Number); hit(r,c,0); }
  grid.forEach((row,r) => row.forEach((piece,c) => {
    if (piece === "bomb" || piece === "fire") hit(r,c,0);
  }));
  while (pending.length) {
    pending.sort((a,b) => a.time-b.time);
    const {key,time} = pending.shift()!;
    if (time !== times.get(key) || activated.has(key)) continue;
    const piece = at(key);
    if (!isGear(piece) && piece !== "bomb" && piece !== "fire") continue;
    activated.add(key);
    const [r,c] = key.split(",").map(Number);
    const kind: CellEffect["kind"] = piece!.includes("Freeze") || piece === "gearRow" ? "freeze" : piece!.includes("Fire") || piece === "fire" || piece === "gearColumn" ? "fire" : piece === "gearCross" ? "cross" : piece === "gearHunter" ? "hunter" : "blast";
    const strike = (rr: number, cc: number, offset = 0) => hit(rr,cc,time+offset,{kind,start:kind === "freeze" || kind === "hunter" ? time : time+offset,delay:time+offset});
    const sound = { kind, start: time, steps: 1 };
    powerSounds.push(sound);
    if (kind === "freeze" || kind === "fire") {
      const vertical = piece!.endsWith("Column") || piece === "gearColumn" || piece === "fire";
      const count = vertical ? grid.length : grid[0].length;
      sound.steps = count;
      for (let i=0;i<count;i++) strike(vertical ? i : r, vertical ? c : i, kind === "freeze" ? 750 : i*65);
    } else if (kind === "blast") {
      for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) strike(r+dr,c+dc);
    } else if (kind === "cross") {
      strike(r,c);
      for (let distance=1;distance<=4;distance++) for (const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) strike(r+dr*distance,c+dc*distance,distance*65);
    } else {
      const targets = TYPES.filter(type => grid.some((row,rr) => row.some((p,cc) => p === type && !created.has(`${rr},${cc}`) && (times.get(`${rr},${cc}`) ?? Infinity) >= time)));
      if (targets.length) {
        const target = targets[Math.min(targets.length-1,Math.floor(random()*targets.length))];
        notices.push(`ALVO ESCOLHIDO: ${PCONF[target].label}`);
        grid.forEach((row,rr) => row.forEach((p,cc) => { if (p === target) strike(rr,cc,450); }));
      }
    }
  }
  // A cell hit by several powers disappears with the earliest hit.
  for (const [key,time] of times) if (effects[key]) effects[key].delay = time;
  const powerPieces = [...times.keys()].filter(key => !matched.has(key)).length;
  return { grid: result, matches: new Set(times.keys()), effects, powerSounds, comboSizes, matchSizes, powerPieces, duration: Math.max(500,...Object.values(effects).map(effect => effect.delay+500)), notice: notices.join(" · "), createdCount: created.size, createdGears: [...created].map(key => at(key) as Gear) };
}
