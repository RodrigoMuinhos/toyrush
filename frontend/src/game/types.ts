export type Gear = `gear${"Freeze" | "Fire"}${"Row" | "Column"}` | "gearBlast" | "gearCross" | "gearHunter";
export type CellEffect = { kind: "freeze" | "fire" | "blast" | "cross" | "hunter"; start: number; delay: number };
export type PowerSound = { kind: CellEffect["kind"]; start: number; steps: number };
export type PT = Gear
  | "cone"
  | "win"
  | "str"
  | "wL"
  | "wR"
  | "bomb"
  | "fire"
  | "gearColumn"
  | "gearRow";
export type Grid = (PT | null)[][];
export type Phase = "idle" | "exploding" | "falling" | "rising";
export type Attack = "freeze" | "extra" | "shuffle" | "clear" | "charge";
export type VersusAttackKind = "freezeBlock" | "risingRow" | "shuffle" | "boardFreeze" | "reverse" | "lockedColumn" | "fog";
export type VersusAttack = { kind: VersusAttackKind; size: number; from: 1 | 2; id: string };
export type AttackState = VersusAttack & {
  stage: "flight" | "warning" | "effect" | "recovery";
  until: number;
  remaining: number;
  column?: number;
  cells: string[];
  shuffled?: Grid;
  moves?: Record<string, { row: number; col: number }>;
};
export type GameMode = "1p" | "coop" | "1v1";
export type GameType = "story" | "wave";
export interface ScorePopup {
  gears?: Gear[];
  pts: number;
  streak: number;
  pieces: number;
  key: number;
}
export interface PS {
  versusAttack: AttackState | null;
  attackRises: number;
  comboSizes: number[];
  lastPlaced: string | null;
  cellEffects: Record<string, CellEffect>;
  powerSounds: PowerSound[];
  effectDuration: number;
  gearNotice: string;
  gearCreated: boolean;
  rises: number;
  toppedOut: boolean;
  frozen: Record<string, number>;
  attackNotice: string;
  attackSerial: number;
  consecutive: number;
  collected: number;
  grid: Grid;
  piece: PT;
  nextPiece: PT;
  cursor: number;
  score: number;
  combos: number;
  comboStreak: number;
  lockedCols: boolean[];
  allLocked: boolean;
  phase: Phase;
  explodingCells: Set<string>;
  fallRow: number;
  autoTimer: number;
  scorePopup: ScorePopup | null;
}
export interface Flight {
  score: number;
  combos: number;
  mode: string;
  phase: string;
  attacks: string;
  p1Actions: number;
  p2Actions: number;
  comboSequence: number;
  elapsedSeconds: number;
}
export type ControllerPhase =
  | "splash"
  | "ranking"
  | "modeSelect"
  | "mission"
  | "countdown"
  | "game"
  | "gameOver"
  | "ready"
  | "soloComplete"
  | "race"
  | "result"
  | "nameEntry";
