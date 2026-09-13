import type { PT } from "./types";
export const ROWS = 13;
export const COLS = 5;
export const MATCH_LEN = 4;
export const SOLO_COMBOS_TO_WIN = 20;
export const COOP_COMBOS_TO_WIN = 50;
export const VERSUS_COMBOS_TO_WIN = 30;
export const BASE_SPEED = 1 / 37.5;
export const DIFFICULTY_STEP_SECONDS = 30;
export const SCORE_LEVEL_STEP = 2000;
export const COMBO_MESSAGES = [
  "BOA!",
  "ÓTIMO!",
  "EXCELENTE!",
  "FANTÁSTICO!",
  "INCRÍVEL!",
  "SURREAL!",
  "MAGNÍFICO!",
  "ABSURDO!",
  "LENDÁRIO!",
  "IMPARÁVEL!",
  "FORA DESTE MUNDO!",
  "COMBO GALÁCTICO!",
] as const;

export function getComboFeedback(comboNumber: number) {
  const safeNumber = Math.max(1, comboNumber);
  const messageIndex = Math.min(
    Math.floor((safeNumber - 1) / 3),
    COMBO_MESSAGES.length - 1,
  );
  return {
    message: COMBO_MESSAGES[messageIndex],
  };
}
export const TYPES: PT[] = ["cone", "win", "str", "wL", "wR"];
export const PCONF: Record<
  PT,
  {
    main: string;
    hi: string;
    dark: string;
    glow: string;
    icon: string;
    label: string;
  }
> = {
  cone: {
    main: "#DC2626",
    hi: "#FF8585",
    dark: "#7F1D1D",
    glow: "#FF000055",
    icon: "",
    label: "RAPOSA",
  },
  win: {
    main: "#1D4ED8",
    hi: "#60A5FA",
    dark: "#1E3A8A",
    glow: "#3B82F655",
    icon: "",
    label: "URSINHO",
  },
  str: {
    main: "#15803D",
    hi: "#4ADE80",
    dark: "#14532D",
    glow: "#22C55E55",
    icon: "",
    label: "SAPINHO",
  },
  wL: {
    main: "#F97316",
    hi: "#FDBA74",
    dark: "#9A3412",
    glow: "#FB923C55",
    icon: "",
    label: "FLOR",
  },
  wR: {
    main: "#7E22CE",
    hi: "#C084FC",
    dark: "#4C1D95",
    glow: "#A855F755",
    icon: "",
    label: "BORBOLETA",
  },
  bomb: {
    main: "#F97316",
    hi: "#FDE68A",
    dark: "#9A3412",
    glow: "#FB923C88",
    icon: "",
    label: "ESTRELA 2×2",
  },
  fire: {
    main: "#EF4444",
    hi: "#FDE047",
    dark: "#9A3412",
    glow: "#F97316AA",
    icon: "",
    label: "RAIO",
  },
  gearFreezeRow: { main: "#1677FF", hi: "#8EC5FF", dark: "#123D9A", glow: "#1677FF99", icon: "", label: "Freeze Gear · horizontal" },
  gearFreezeColumn: { main: "#1677FF", hi: "#8EC5FF", dark: "#123D9A", glow: "#1677FF99", icon: "", label: "Freeze Gear · vertical" },
  gearFireRow: { main: "#EF3340", hi: "#FF9A9A", dark: "#8B1020", glow: "#EF334099", icon: "", label: "Fire Gear · horizontal" },
  gearFireColumn: { main: "#EF3340", hi: "#FF9A9A", dark: "#8B1020", glow: "#EF334099", icon: "", label: "Fire Gear · vertical" },
  gearBlast: { main: "#F97316", hi: "#FDBA74", dark: "#9A3412", glow: "#F9731699", icon: "", label: "Blast Gear" },
  gearCross: { main: "#22C55E", hi: "#86EFAC", dark: "#14532D", glow: "#22C55E99", icon: "", label: "Cross Gear" },
  gearHunter: { main: "#A855F7", hi: "#D8B4FE", dark: "#581C87", glow: "#A855F799", icon: "", label: "Hunter Gear" },
  gearColumn: {
    main: "#EF3340",
    hi: "#FF9A9A",
    dark: "#8B1020",
    glow: "#FF334099",
    icon: "",
    label: "ENGRENAGEM VERMELHA",
  },
  gearRow: {
    main: "#1677FF",
    hi: "#8EC5FF",
    dark: "#123D9A",
    glow: "#1687FF99",
    icon: "",
    label: "ENGRENAGEM AZUL",
  },
};
export const PCONF_LABELS = PCONF;
export const TETRO_SHAPES: [number, number][][] = [
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  [
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
  ],
  [
    [0, 1],
    [1, 1],
    [2, 0],
    [2, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [1, 2],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 0],
    [2, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 0],
  ],
  [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, 2],
  ],
  [
    [0, 1],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  // Z tetromino and mirrored Z tetromino.
  [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 2],
  ],
  [
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
  ],
];
