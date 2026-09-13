import { getLockedCols } from "./grid";
import { riseBoard } from "./risingRows";
import type { AttackState, Grid, PS, VersusAttack, VersusAttackKind } from "./types";

export const ATTACKS: Record<VersusAttackKind, { label: string; icon: string; color: string; duration: number }> = {
  freezeBlock: { label: "PEÇAS CONGELADAS", icon: "❄", color: "#71eaff", duration: 3000 },
  risingRow: { label: "NOVA LINHA!", icon: "↑", color: "#ffad42", duration: 700 },
  shuffle: { label: "EMBARALHANDO!", icon: "⤨", color: "#d6a0ff", duration: 200 },
  boardFreeze: { label: "TABULEIRO CONGELADO", icon: "❄", color: "#a1f3ff", duration: 2000 },
  reverse: { label: "CONTROLES INVERTIDOS", icon: "↔", color: "#fb91dc", duration: 3000 },
  lockedColumn: { label: "COLUNA BLOQUEADA", icon: "🔒", color: "#ffd64d", duration: 3000 },
  fog: { label: "FUMAÇA!", icon: "☁", color: "#d3dce9", duration: 2500 },
};
export const attackLevel = (size: number) => size >= 7 ? 3 : size === 6 ? 2 : 1;
export function chooseAttack(size: number, from: 1 | 2, id: string, random = Math.random): VersusAttack {
  const kinds = Object.keys(ATTACKS) as VersusAttackKind[];
  return { kind: kinds[Math.min(kinds.length - 1, Math.floor(random() * kinds.length))], size, from, id };
}
export function boardPaused(state: PS) {
  const a = state.versusAttack;
  return !!a && ((a.kind === "boardFreeze" && a.stage === "effect") || (a.kind === "shuffle" && a.stage === "warning"));
}
export function lockedAttackColumn(state: PS) {
  const a = state.versusAttack;
  return a?.kind === "lockedColumn" && a.stage === "effect" ? a.column : undefined;
}
export function reversed(state: PS) { return state.versusAttack?.kind === "reverse" && state.versusAttack.stage === "effect"; }
export function protectedCell(state: PS, row: number, col: number, now = Date.now()) {
  return state.frozen[`${row},${col}`] > now || lockedAttackColumn(state) === col;
}

// Frozen cells are anchors. Gravity only compacts the free segments between them.
export function attackGravity(grid: Grid, state: PS, now = Date.now()): Grid {
  const next = grid.map(row => [...row]);
  for (let col = 0; col < grid[0].length; col++) {
    if (lockedAttackColumn(state) === col) continue;
    let end = grid.length - 1;
    while (end >= 0) {
      if (protectedCell(state, end, col, now)) { end--; continue; }
      let begin = end;
      while (begin > 0 && !protectedCell(state, begin - 1, col, now)) begin--;
      const pieces: Grid[number] = [];
      for (let r = begin; r <= end; r++) if (grid[r][col]) pieces.push(grid[r][col]);
      for (let r = begin; r <= end; r++) next[r][col] = null;
      pieces.forEach((piece, i) => { next[end - pieces.length + 1 + i][col] = piece; });
      end = begin - 1;
    }
  }
  return next;
}
export function startAttack(attack: VersusAttack, now: number): AttackState {
  return { ...attack, stage: "flight", until: now + 700, remaining: 700, cells: [] };
}
function shufflePlan(state: PS, random: () => number) {
  const cells: { row: number; col: number }[] = [];
  state.grid.forEach((row, r) => row.forEach((cell, c) => { if (cell && !protectedCell(state,r,c)) cells.push({row:r,col:c}); }));
  const targets = [...cells];
  for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [targets[i], targets[j]] = [targets[j], targets[i]];
  }
  const shuffled = state.grid.map(row => [...row]);
  const moves: NonNullable<AttackState["moves"]> = {};
  cells.forEach((source, i) => {
    const target = targets[i];
    shuffled[target.row][target.col] = state.grid[source.row][source.col];
    moves[`${source.row},${source.col}`] = target;
  });
  return { shuffled, moves };
}
export function tickAttack(state: PS, now: number, random = Math.random): PS {
  const a = state.versusAttack;
  if (!a) return state;
  if (now < a.until) return { ...state, versusAttack: { ...a, remaining: a.until-now } };
  if (a.stage === "flight") {
    // Let a local combo finish before a disruptive effect begins.
    if (state.phase !== "idle") return { ...state, versusAttack: { ...a, remaining: 0 } };
    const warning = a.kind === "shuffle" ? 900 : 500;
    return { ...state, versusAttack: { ...a, stage: "warning", until: now+warning, remaining: warning, ...(a.kind === "shuffle" ? shufflePlan(state,random) : {}) } };
  }
  if (a.stage === "warning") {
    if (state.phase !== "idle") return state;
    const level = attackLevel(a.size);
    const duration = ATTACKS[a.kind].duration * (["boardFreeze", "reverse", "lockedColumn", "fog"].includes(a.kind) ? 1 + (level - 1) * 0.2 : 1);
    const attack: AttackState = { ...a, stage: "effect", until: now+duration, remaining: duration };
    let next = { ...state, versusAttack: attack };
    if (a.kind === "freezeBlock") {
      const cells: string[] = [];
      state.grid.forEach((row,r) => row.forEach((cell,c) => { if(cell) cells.push(`${r},${c}`); }));
      const center = cells[Math.floor(random()*cells.length)];
      let chosen: string[] = [];
      if (center) {
        const [r,c] = center.split(",").map(Number);
        chosen = level === 3 ? cells.filter(key => { const [rr,cc] = key.split(",").map(Number); return Math.abs(rr-r)<=1 && Math.abs(cc-c)<=1; }) : [center];
        if (level === 2 && cells.length>1) chosen.push(cells.filter(key=>key!==center)[Math.floor(random()*(cells.length-1))]);
      }
      attack.cells = chosen;
      next.frozen = { ...state.frozen };
      chosen.forEach(key => { next.frozen[key] = now+duration; });
    } else if (a.kind === "risingRow") {
      next = { ...riseBoard(next,random), versusAttack: attack, attackRises: state.attackRises+1 };
    } else if (a.kind === "shuffle" && a.shuffled) {
      const lockedCols = getLockedCols(a.shuffled);
      next = { ...next, grid: a.shuffled, lockedCols, allLocked: lockedCols.every(Boolean), lastPlaced: null };
    } else if (a.kind === "lockedColumn") {
      // Keep the currently falling piece out of the lock, leaving an escape route.
      const options = state.grid[0].map((_,c)=>c).filter(c=>c!==state.cursor);
      attack.column = options[Math.floor(random()*options.length)];
    }
    return next;
  }
  if (a.stage === "effect") {
    const frozen = { ...state.frozen };
    a.cells.forEach(key => { delete frozen[key]; });
    return { ...state, frozen, versusAttack: { ...a, stage: "recovery", until: now+400, remaining: 400 } };
  }
  return { ...state, versusAttack: null };
}
