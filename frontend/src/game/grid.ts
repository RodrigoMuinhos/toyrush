import { COLS, MATCH_LEN, ROWS, TETRO_SHAPES, TYPES } from "./constants";
import type { Grid, PT, PS } from "./types";
export const emptyGrid = (): Grid =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(null));
export const rndPT = (): PT => {
  const roll = Math.random();
  if (roll < 0.01) return "bomb";
  if (roll < 0.02) return "fire";
  return TYPES[~~(Math.random() * TYPES.length)];
};
export function dropPiece(g: Grid, col: number, p: PT): Grid | null {
  for (let r = ROWS - 1; r >= 0; r--)
    if (g[r][col] === null) {
      const ng = g.map((row) => [...row]);
      ng[r][col] = p;
      return ng;
    }
  return null;
}
export function findMatches(g: Grid): Set<string> {
  const m = new Set<string>(),
    R = g.length,
    C = g[0]?.length ?? COLS;
  if (!R || !C) return m;
  for (let r = 0; r < R; r++)
    for (let c = 0; c <= C - MATCH_LEN; c++) {
      const t = g[r][c];
      if (
        t &&
        t !== "bomb" &&
        t !== "fire" &&
        t !== "gearColumn" &&
        t !== "gearRow" &&
        g[r][c + 1] === t &&
        g[r][c + 2] === t &&
        g[r][c + 3] === t
      )
        for (let k = 0; k < 4; k++) m.add(`${r},${c + k}`);
    }
  for (let c = 0; c < C; c++)
    for (let r = 0; r <= R - MATCH_LEN; r++) {
      const t = g[r][c];
      if (
        t &&
        t !== "bomb" &&
        t !== "fire" &&
        t !== "gearColumn" &&
        t !== "gearRow" &&
        g[r + 1][c] === t &&
        g[r + 2][c] === t &&
        g[r + 3][c] === t
      )
        for (let k = 0; k < 4; k++) m.add(`${r + k},${c}`);
    }
  for (const shape of TETRO_SHAPES) {
    const mr = Math.max(...shape.map(([dr]) => dr)),
      mc = Math.max(...shape.map(([, dc]) => dc));
    for (let r = 0; r + mr < R; r++)
      for (let c = 0; c + mc < C; c++) {
        const t = g[r + shape[0][0]][c + shape[0][1]];
        if (
          t &&
          t !== "bomb" &&
          t !== "fire" &&
          t !== "gearColumn" &&
          t !== "gearRow" &&
          shape.every(([dr, dc]) => g[r + dr][c + dc] === t)
        )
          shape.forEach(([dr, dc]) => m.add(`${r + dr},${c + dc}`));
      }
  }
  return m;
}
export function applyGravity(g: Grid): Grid {
  const R = g.length,
    C = g[0]?.length ?? COLS,
    ng: Grid = Array.from({ length: R }, () => Array(C).fill(null));
  for (let c = 0; c < C; c++) {
    const col: PT[] = [];
    for (let r = 0; r < R; r++) if (g[r][c]) col.push(g[r][c] as PT);
    for (let k = 0; k < col.length; k++) ng[R - col.length + k][c] = col[k];
  }
  return ng;
}
export function removeCells(g: Grid, cells: Set<string>): Grid {
  return g.map((row, r) =>
    row.map((cell, c) => (cells.has(`${r},${c}`) ? null : cell)),
  );
}
export function getLockedCols(g: Grid): boolean[] {
  const C = g[0]?.length ?? COLS;
  return Array.from(
    { length: C },
    (_, c) => g[0]?.[c] !== null && g[0]?.[c] !== undefined,
  );
}
export function initPS(): PS {
  return {
    versusAttack: null,
    attackRises: 0,
    comboSizes: [],
    lastPlaced: null,
    cellEffects: {},
    powerSounds: [],
    effectDuration: 500,
    gearNotice: "",
    gearCreated: false,
    rises: 0,
    toppedOut: false,
    frozen: {},
    attackNotice: "",
    attackSerial: 0,
    consecutive: 0,
    collected: 0,
    grid: emptyGrid(),
    piece: rndPT(),
    nextPiece: rndPT(),
    cursor: 2,
    score: 0,
    combos: 0,
    comboStreak: 0,
    lockedCols: Array(COLS).fill(false),
    allLocked: false,
    phase: "idle",
    explodingCells: new Set(),
    fallRow: 0,
    autoTimer: 0,
    scorePopup: null,
  };
}
