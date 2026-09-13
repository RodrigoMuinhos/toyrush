import { TYPES } from "./constants";
import { getLockedCols } from "./grid";
import type { PS, PT } from "./types";

export const ROW_RISE_INTERVAL = 22;
export const ROW_RISE_DURATION = 700;
// Mantido apenas para compatibilidade visual do HUD; não encerra mais a partida.
export const BLOCK_PHASE_SECONDS = Number.POSITIVE_INFINITY;

// Acelera gradualmente para uma partida média próxima de 2min30s,
// sem impor um cronômetro artificial ao jogador.
export function getRowRiseInterval(elapsedSeconds: number) {
  return Math.max(6, ROW_RISE_INTERVAL - elapsedSeconds * 0.07);
}

// Insere a nova fileira na base e sobe as anteriores, preservando células vazias.
export function riseBoard(state: PS, random: () => number = Math.random): PS {
  const base: PT[] = state.grid[0].map(
    () => TYPES[Math.floor(random() * TYPES.length)],
  );
  const grid = [...state.grid.slice(1).map((row) => [...row]), base];
  const frozen: PS["frozen"] = {};
  for (const [key, until] of Object.entries(state.frozen)) {
    const [row, col] = key.split(",").map(Number);
    if (row > 0) frozen[`${row - 1},${col}`] = until;
  }
  const lockedCols = getLockedCols(grid);
  return {
    ...state,
    grid,
    frozen,
    lockedCols,
    allLocked: lockedCols.every(Boolean),
    // A subida transborda quando a linha antiga superior já tinha peças.
    toppedOut: state.toppedOut || state.grid[0].some(Boolean),
    fallRow: Math.max(0, state.fallRow - 1),
    autoTimer: 0,
    rises: state.rises + 1,
    // A subida é apenas uma animação visual; o jogador continua podendo jogar.
    phase: "idle",
  };
}
