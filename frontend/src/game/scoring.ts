import type { GameMode } from "./types";

export const VERSUS_SCORE_TO_WIN = 20000;
const SCORE_BY_MATCH_SIZE: Record<number, number> = { 4: 500, 5: 800, 6: 1200, 7: 1700, 8: 2300, 9: 3000 };
export function getBaseScore(pieceCount: number): number {
  if (pieceCount < 4) return 0;
  if (pieceCount >= 10) return 4000 + (pieceCount - 10) * 500;
  return SCORE_BY_MATCH_SIZE[pieceCount] ?? 0;
}
export function calculateComboScore(pieceCount: number, comboSequence: number) {
  return getBaseScore(pieceCount) * Math.max(1, Math.floor(comboSequence));
}
export function calculatePowerGearScore(destroyedPieces: number, comboSequence: number) {
  return Math.max(0, Math.floor(destroyedPieces)) * 100 * Math.max(1, Math.floor(comboSequence));
}
export function calculateResolutionScore(matchSizes: number[], powerPieces: number, comboSequence: number) {
  return matchSizes.reduce((sum,size) => sum + calculateComboScore(size,comboSequence),0) + calculatePowerGearScore(powerPieces,comboSequence);
}
export function officialScore(mode: GameMode, p1Score: number, p2Score: number) {
  return mode === "1p" ? p1Score : mode === "coop" ? p1Score + p2Score : Math.max(p1Score,p2Score);
}
