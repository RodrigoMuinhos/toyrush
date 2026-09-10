import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";

/* ─── Constants ─── */
const ROWS = 13;
const COLS = 5;
const MATCH_LEN = 4;
const GAME_TIME = 180;
const ROCKET_TARGET = 10;
// One square every three seconds. Difficulty increases every 30 seconds.
const BASE_SPEED = 1 / 37.5;
const DIFFICULTY_STEP_SECONDS = 20;
const SCORE_LEVEL_STEP = 400;

/* ─── Types ─── */
type PT = "cone" | "win" | "str" | "wL" | "wR" | "bomb" | "fire";
type Grid = (PT | null)[][];
type Phase = "idle" | "exploding" | "falling";

const TYPES: PT[] = ["cone", "win", "str", "wL", "wR"];

const PCONF: Record<
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
    main: "#0891B2",
    hi: "#67E8F9",
    dark: "#164E63",
    glow: "#06B6D455",
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
    label: "ESTRELA COLUNA",
  },
};

/* ─── Sound ─── */
let _ctx: AudioContext | null = null;
function aCtx() {
  if (!_ctx)
    try {
      _ctx = new AudioContext();
    } catch {
      return null;
    }
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}
function tone(f: number, d: number, t: OscillatorType = "sine", v = 0.16) {
  const c = aCtx();
  if (!c) return;
  try {
    const o = c.createOscillator(),
      g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    o.type = t;
    o.frequency.value = f;
    g.gain.setValueAtTime(v, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
    o.start();
    o.stop(c.currentTime + d + 0.01);
  } catch {}
}
const SFX = {
  init: () => tone(1, 0.001, "sine", 0.001),
  drop: () => tone(440, 0.05, "triangle", 0.12),
  wrong: () => {
    tone(140, 0.22, "sawtooth", 0.13);
    tone(110, 0.22, "square", 0.07);
  },
  combo: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => tone(f, 0.18, "sine", 0.22), i * 65),
    );
  },
  cascade: () => {
    [523, 587, 659, 784, 1047, 1319].forEach((f, i) =>
      setTimeout(() => tone(f, 0.15, "sine", 0.2), i * 55),
    );
  },
  win: () => {
    [523, 659, 784, 880, 1047, 1319, 1568].forEach((f, i) =>
      setTimeout(() => tone(f, 0.3, "sine", 0.22), i * 95),
    );
  },
  lowTimer: () => tone(300, 0.12, "triangle", 0.1),
  lock: () => tone(160, 0.35, "sawtooth", 0.18),
};

/* ─── Grid utilities ─── */
const emptyGrid = (): Grid =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(null));
// Easter eggs: each special piece has only a 1% chance of appearing.
const rndPT = (): PT => {
  const roll = Math.random();
  if (roll < 0.01) return "bomb";
  if (roll < 0.02) return "fire";
  return TYPES[~~(Math.random() * TYPES.length)];
};

function dropPiece(g: Grid, col: number, p: PT): Grid | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (g[r][col] === null) {
      const ng = g.map((row) => [...row]);
      ng[r][col] = p;
      return ng;
    }
  }
  return null;
}

// Each shape is a list of [dr,dc] offsets forming a 4-cell tetromino
const TETRO_SHAPES: [number, number][][] = [
  // Straight (already caught by line scan, but included for completeness)
  // L tetromino — 4 rotations
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
  // J tetromino (L mirrored) — 4 rotations
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
  // T tetromino — 4 rotations
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
  // 2×2 square
  [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
];

function findMatches(g: Grid): Set<string> {
  const m = new Set<string>();
  const R = g.length;
  const C = g[0]?.length ?? COLS;
  if (R === 0 || C === 0) return m;
  // Straight lines
  for (let r = 0; r < R; r++)
    for (let c = 0; c <= C - MATCH_LEN; c++) {
      const t = g[r][c];
      if (
        t !== "bomb" &&
        t !== "fire" &&
        t &&
        g[r][c + 1] === t &&
        g[r][c + 2] === t &&
        g[r][c + 3] === t
      )
        for (let k = 0; k < MATCH_LEN; k++) m.add(`${r},${c + k}`);
    }
  for (let c = 0; c < C; c++)
    for (let r = 0; r <= R - MATCH_LEN; r++) {
      const t = g[r][c];
      if (
        t !== "bomb" &&
        t !== "fire" &&
        t &&
        g[r + 1][c] === t &&
        g[r + 2][c] === t &&
        g[r + 3][c] === t
      )
        for (let k = 0; k < MATCH_LEN; k++) m.add(`${r + k},${c}`);
    }
  // L / J / T / Square tetrominoes
  for (const shape of TETRO_SHAPES) {
    const maxR = Math.max(...shape.map(([dr]) => dr));
    const maxC = Math.max(...shape.map(([, dc]) => dc));
    for (let r = 0; r + maxR < R; r++)
      for (let c = 0; c + maxC < C; c++) {
        const t = g[r + shape[0][0]][c + shape[0][1]];
        if (
          t !== "bomb" &&
          t !== "fire" &&
          t &&
          shape.every(([dr, dc]) => g[r + dr][c + dc] === t)
        )
          shape.forEach(([dr, dc]) => m.add(`${r + dr},${c + dc}`));
      }
  }
  return m;
}

function applyGravity(g: Grid): Grid {
  const R = g.length,
    C = g[0]?.length ?? COLS;
  const ng: Grid = Array.from({ length: R }, () => Array(C).fill(null));
  for (let c = 0; c < C; c++) {
    const col: PT[] = [];
    for (let r = 0; r < R; r++) if (g[r][c]) col.push(g[r][c] as PT);
    for (let k = 0; k < col.length; k++) ng[R - col.length + k][c] = col[k];
  }
  return ng;
}

function removeCells(g: Grid, cells: Set<string>): Grid {
  return g.map((row, r) =>
    row.map((cell, c) => (cells.has(`${r},${c}`) ? null : cell)),
  );
}

function getLockedCols(g: Grid): boolean[] {
  const C = g[0]?.length ?? COLS;
  return Array.from(
    { length: C },
    (_, c) => g[0]?.[c] !== null && g[0]?.[c] !== undefined,
  );
}

/* ─── Game state ─── */
interface PS {
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
  scorePopup: {
    pts: number;
    streak: number;
    pieces: number;
    key: number;
  } | null;
}

function initPS(): PS {
  return {
    frozen: {}, attackNotice: "", attackSerial: 0, consecutive: 0,
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

/* ─── Player hook ─── */
function usePlayerGrid(
  pNum: 1 | 2,
  active: boolean,
  speed: number,
  onCombo: () => void,
  resetKey: number,
) {
  const [st, setSt] = useState<PS>(initPS);
  const attacks = useRef<Array<"freeze" | "extra" | "shuffle">>([]);
  const dropRef = useRef<(() => void) | undefined>(undefined);
  const turboRef = useRef<(() => void) | undefined>(undefined);
  const onComboRef = useRef(onCombo);
  onComboRef.current = onCombo;

  useEffect(() => {
    attacks.current = [];
    setSt(initPS());
  }, [resetKey]);

  const cascade = useCallback(() => {
    setSt((s) => {
      const blocked = s.grid.map((row, r) => row.map((cell, c) => s.frozen[`${r},${c}`] > Date.now() ? null : cell));
      const matches = findMatches(blocked);
      // A coringa bomba sempre explode uma área 2×2 ao ser encaixada.
      s.grid.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (s.frozen[`${r},${c}`] > Date.now()) return;
          if (cell === "bomb") {
            for (let dr = 0; dr < 2; dr++) {
              for (let dc = 0; dc < 2; dc++) {
                if (r + dr < ROWS && c + dc < COLS) {
                  matches.add(`${r + dr},${c + dc}`);
                }
              }
            }
          } else if (cell === "fire") {
            for (let rowIndex = 0; rowIndex < ROWS; rowIndex++) {
              matches.add(`${rowIndex},${c}`);
            }
          }
        }),
      );
      for (const key of matches) {
        const [r, c] = key.split(",").map(Number);
        if (!s.grid[r][c] || s.frozen[key] > Date.now()) matches.delete(key);
      }
      if (matches.size === 0) {
        const lc = getLockedCols(s.grid);
        return {
          ...s,
          phase: "idle",
          piece: s.nextPiece,
          nextPiece: rndPT(),
          fallRow: 0,
          lockedCols: lc,
          allLocked: lc.every(Boolean),
          comboStreak: 0,
          consecutive: s.comboStreak === 0 ? 0 : s.consecutive,
        };
      }
      const streak = s.comboStreak + 1;
      const pieces = matches.size;
      // Every 400 points advances the score level. The base reward grows by level.
      const scoreLevel = Math.floor(s.score / SCORE_LEVEL_STEP) + 1;
      const pts = Math.round(pieces * 12 * scoreLevel * Math.pow(streak, 1.25));
      return {
        ...s,
        explodingCells: matches,
        phase: "exploding",
        collected: s.collected + pieces,
        score: s.score + pts,
        combos: s.combos + 1,
        consecutive: s.consecutive + 1,
        comboStreak: streak,
        scorePopup: { pts, streak, pieces, key: Date.now() },
      };
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    if (st.phase === "exploding") {
      onComboRef.current();
      SFX.combo();
      const t = setTimeout(() => {
        setSt((s) => {
          const remaining = removeCells(s.grid, s.explodingCells);
          const ng = applyGravity(remaining);
          const frozen: Record<string, number> = {};
          for (let c = 0; c < COLS; c++) {
            let target = ROWS - 1;
            for (let r = ROWS - 1; r >= 0; r--) if (remaining[r][c]) {
              if (s.frozen[`${r},${c}`] > Date.now()) frozen[`${target},${c}`] = s.frozen[`${r},${c}`];
              target--;
            }
          }
          return {
            ...s,
            grid: ng,
            frozen,
            explodingCells: new Set(),
            phase: "falling",
            lockedCols: getLockedCols(ng),
          };
        });
      }, 500);
      return () => clearTimeout(t);
    }
    if (st.phase === "falling") {
      const t = setTimeout(cascade, 280);
      return () => clearTimeout(t);
    }
  }, [st.phase, active, cascade]);

  const movePiece = useCallback(() => {
    SFX.init();
    setSt((s) => {
      if (s.phase !== "idle" || s.allLocked) return s;
      if (s.lockedCols[s.cursor]) {
        SFX.wrong();
        return s;
      }
      const nextRow = s.fallRow + 1;
      if (nextRow < ROWS && s.grid[nextRow][s.cursor] === null) {
        SFX.drop();
        return { ...s, fallRow: nextRow, autoTimer: 0 };
      }

      const ng = s.grid.map((row) => [...row]);
      ng[s.fallRow][s.cursor] = s.piece;
      SFX.drop();
      const lc = getLockedCols(ng);
      return {
        ...s,
        grid: ng,
        phase: "falling",
        lockedCols: lc,
        allLocked: lc.every(Boolean),
        autoTimer: 0,
        comboStreak: 0,
      };
    });
  }, []);
  dropRef.current = () => movePiece();

  const turboDrop = useCallback(() => {
    SFX.init();
    setSt((s) => {
      if (s.phase !== "idle" || s.allLocked || s.lockedCols[s.cursor]) {
        return s;
      }

      let landingRow = s.fallRow;
      while (
        landingRow + 1 < ROWS &&
        s.grid[landingRow + 1][s.cursor] === null
      ) {
        landingRow += 1;
      }

      const ng = s.grid.map((row) => [...row]);
      ng[landingRow][s.cursor] = s.piece;
      const lc = getLockedCols(ng);
      SFX.drop();
      return {
        ...s,
        grid: ng,
        phase: "falling",
        lockedCols: lc,
        allLocked: lc.every(Boolean),
        autoTimer: 0,
        comboStreak: 0,
      };
    });
  }, []);
  turboRef.current = turboDrop;

  const keys =
    pNum === 1
      ? { l: "ArrowLeft", r: "ArrowRight", d: "ArrowDown" }
      : { l: "a", r: "d", d: "s" };
  useEffect(() => {
    if (!active) return;
    const dn = (e: KeyboardEvent) => {
      if (
        ["ArrowLeft", "ArrowRight", "ArrowDown", "a", "d", "s"].includes(e.key)
      )
        e.preventDefault();
      SFX.init();
      if (e.key === keys.l)
        setSt((s) => ({ ...s, cursor: Math.max(0, s.cursor - 1) }));
      else if (e.key === keys.r)
        setSt((s) => ({ ...s, cursor: Math.min(COLS - 1, s.cursor + 1) }));
      else if (e.key === keys.d) turboRef.current?.();
    };
    window.addEventListener("keydown", dn);
    return () => window.removeEventListener("keydown", dn);
  }, [active, keys.l, keys.r, keys.d]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setSt((s) => {
        if (s.phase !== "idle" || s.allLocked) return s;
        const scoreBoost = 1 + Math.floor(s.score / 1000) * 0.1;
        const nt = s.autoTimer + speed * scoreBoost;
        if (nt >= 1) {
          setTimeout(() => dropRef.current?.(), 0);
          return { ...s, autoTimer: 0 };
        }
        return { ...s, autoTimer: nt };
      });
    }, 80);
    return () => clearInterval(id);
  }, [active, speed]);

  useEffect(() => {
    if (!st.scorePopup) return;
    const t = setTimeout(() => setSt((s) => ({ ...s, scorePopup: null })), 950);
    return () => clearTimeout(t);
  }, [st.scorePopup?.key]);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      if (!attacks.current.length && !Object.keys(st.frozen).length) return;
      const pending = st.phase === "idle" ? attacks.current.shift() : undefined;
      const random = Math.random();
      setSt((s) => {
        const frozen = Object.fromEntries(Object.entries(s.frozen).filter(([, end]) => end > Date.now()));
        if (!pending) return { ...s, frozen };
        const grid = s.grid.map(row => [...row]);
        const occupied: [number, number][] = [];
        grid.forEach((row, r) => row.forEach((cell, c) => { if (cell) occupied.push([r, c]); }));
        if (pending === "freeze") {
          const choices = occupied.filter(([r, c]) => !frozen[`${r},${c}`]);
          if (!choices.length) return { ...s, frozen };
          const [r, c] = choices[Math.floor(random * choices.length)];
          frozen[`${r},${c}`] = Date.now() + 5000;
        } else if (pending === "extra") {
          for (let r = ROWS - 1; r >= 0; r--) {
            const empty = grid[r].map((cell, c) => cell === null && !(r === s.fallRow && c === s.cursor) ? c : -1).filter(c => c >= 0);
            if (empty.length) { grid[r][empty[Math.floor(random * empty.length)]] = TYPES[Math.floor(random * TYPES.length)]; break; }
          }
        } else {
          const cells = occupied.map(([r, c]) => ({ piece: grid[r][c], end: frozen[`${r},${c}`] }));
          for (let i = cells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cells[i], cells[j]] = [cells[j], cells[i]];
          }
          Object.keys(frozen).forEach(key => delete frozen[key]);
          occupied.forEach(([r, c], i) => { grid[r][c] = cells[i].piece; if (cells[i].end) frozen[`${r},${c}`] = cells[i].end; });
        }
        const lockedCols = getLockedCols(grid);
        return { ...s, grid, frozen, lockedCols, allLocked: lockedCols.every(Boolean), attackSerial: s.attackSerial + 1, attackNotice: pending === "freeze" ? "GELO! Uma peça congelada por 5s" : pending === "extra" ? "SURPRESA! Uma peça extra" : "CONFUSÃO! Peças embaralhadas" };
      });
    }, 100);
    return () => clearInterval(timer);
  }, [active, st.phase, st.frozen]);
  useEffect(() => {
    if (!st.attackNotice) return;
    const timer = setTimeout(() => setSt(s => ({ ...s, attackNotice: "" })), 3000);
    return () => clearTimeout(timer);
  }, [st.attackNotice, st.attackSerial]);
  const move = (direction: -1 | 1) => {
    if (!active) return;
    SFX.init();
    setSt((s) => s.phase !== "idle" || s.allLocked ? s : {
      ...s, cursor: Math.max(0, Math.min(COLS - 1, s.cursor + direction)),
    });
  };
  return { ...st, move, receiveAttack: (attack: "freeze" | "extra" | "shuffle") => attacks.current.push(attack), drop: () => { if (active) turboDrop(); } };
}

/* ─── Animated garden friends ─── */
function Piece3D({ type, size = 40, exploding = false, dimmed = false }: {
  type: PT; size?: number; exploding?: boolean; dimmed?: boolean;
}) {
  const p = PCONF[type];
  return <div className={`garden-piece garden-${type}`} role="img" aria-label={p.label}
    style={{ width: size, height: size, flexShrink: 0, opacity: dimmed ? .35 : 1,
      animation: exploding ? "piece-explode 0.5s ease-out both" : undefined }}>
    <svg className="garden-friend" viewBox="0 0 100 100" aria-hidden="true">
      {type === "cone" && <g fill="#ffad63" stroke="#a74a27" strokeWidth="2">
        <path d="M17 43 13 9Q31 8 39 30M61 30Q73 8 87 9L83 43" />
        <path d="m20 18 5 22 10-9m30 0 10 9 5-22" fill="#ffdaaf" stroke="none" />
        <path d="M15 42Q50 18 85 42L91 67Q74 94 50 94T9 67Z" />
        <path d="M14 62Q29 56 50 76Q71 56 86 62Q75 91 50 91T14 62" fill="#fff1dc" stroke="none" />
      </g>}
      {type === "win" && <g fill="#83daff" stroke="#267db7" strokeWidth="2">
        <circle cx="23" cy="25" r="18" /><circle cx="77" cy="25" r="18" />
        <circle cx="23" cy="25" r="10" fill="#f8c3db" /><circle cx="77" cy="25" r="10" fill="#f8c3db" />
        <rect x="12" y="23" width="76" height="69" rx="33" />
        <ellipse cx="50" cy="72" rx="21" ry="17" fill="#e8f9ff" stroke="none" />
      </g>}
      {type === "str" && <g fill="#93e56c" stroke="#37864e" strokeWidth="2">
        <circle cx="27" cy="29" r="20" /><circle cx="73" cy="29" r="20" />
        <ellipse cx="50" cy="61" rx="44" ry="32" />
        <ellipse cx="50" cy="75" rx="26" ry="14" fill="#d7f8aa" stroke="none" />
      </g>}
      {type === "wL" && <g>
        {Array.from({length: 8}, (_, i) => <ellipse key={i} cx="50" cy="23" rx="14" ry="21"
          fill={i % 2 ? "#ff90c2" : "#ffb5d6"} stroke="#df5d97" strokeWidth="1.5" transform={`rotate(${i * 45} 50 50)`} />)}
        <circle cx="50" cy="50" r="27" fill="#ffe478" stroke="#efa83e" strokeWidth="2" />
      </g>}
      {type === "wR" && <g stroke="#7950ad" strokeWidth="2">
        <g className="garden-wings" fill="#c49bff">
          <ellipse cx="25" cy="35" rx="22" ry="28" transform="rotate(-22 25 35)" />
          <ellipse cx="75" cy="35" rx="22" ry="28" transform="rotate(22 75 35)" />
          <ellipse cx="27" cy="72" rx="19" ry="20" fill="#f4b0e9" /><ellipse cx="73" cy="72" rx="19" ry="20" fill="#f4b0e9" />
        </g>
        <path d="M44 31 34 13M56 31 66 13" fill="none" strokeLinecap="round" />
        <rect x="32" y="28" width="36" height="61" rx="18" fill="#ffe2b1" />
      </g>}
      {(type === "bomb" || type === "fire") && <g>
        <path d="m50 5 13 27 30 5-22 23 5 31-26-15-26 15 5-31L7 37l30-5Z"
          fill={type === "bomb" ? "#ffc76c" : "#ff9cba"} stroke="#fff2af" strokeWidth="3" />
      </g>}
      <g className="garden-face" transform={type === "wL" ? "translate(0 -10)" : type === "str" ? "translate(0 -6)" : ""}>
        <g className="garden-eyes" fill="#28324b">
          <ellipse cx="38" cy="53" rx="3.6" ry="5" /><ellipse cx="62" cy="53" rx="3.6" ry="5" />
          <circle cx="39" cy="51" r="1.2" fill="white" /><circle cx="63" cy="51" r="1.2" fill="white" />
        </g>
        <ellipse cx="28" cy="64" rx="6" ry="3.5" fill="#ef8390" opacity=".65" />
        <ellipse cx="72" cy="64" rx="6" ry="3.5" fill="#ef8390" opacity=".65" />
        <path d="M43 66Q50 74 57 66" fill="none" stroke="#593849" strokeWidth="2.8" strokeLinecap="round" />
      </g>
      {type === "bomb" && <text x="50" y="89" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#573316">2×2</text>}
      {type === "fire" && <text x="50" y="89" textAnchor="middle" fontSize="19" fontWeight="bold" fill="#573316">↕</text>}
    </svg>
  </div>;
}
/* ─── Game board ─── */
function GameBoard({ st, pNum, sz }: { st: PS; pNum: 1 | 2; sz: number }) {
  const accent = pNum === 1 ? "#DC2626" : "#1D4ED8";
  const G = 2; // gap between cells

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: G,
        userSelect: "none",
        position: "relative",
      }}
    >
      {/* Floating cursor piece */}
      <div style={{ display: "flex", gap: G, height: sz + 8, marginBottom: 2 }}>
        {Array.from({ length: COLS }).map((_, c) => (
          <div
            key={c}
            style={{
              width: sz,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 3,
            }}
          >
            {c === st.cursor && !st.lockedCols[c] && st.phase === "idle" && (
              <>
                <div
                  style={{
                    fontSize: sz * 0.3,
                    color: PCONF[st.piece].hi,
                    filter: `drop-shadow(0 0 8px ${PCONF[st.piece].glow})`,
                    animation: "cursor-pulse 0.65s ease-in-out infinite",
                    lineHeight: 1,
                  }}
                >
                  ▼
                </div>
              </>
            )}
            {c === st.cursor && st.lockedCols[c] && (
              <div style={{ fontSize: sz * 0.55, lineHeight: 1, opacity: 0.5 }}>
                
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Auto-drop timer bars */}
      <div style={{ display: "flex", gap: G, height: 5, marginBottom: 1 }}>
        {Array.from({ length: COLS }).map((_, c) => (
          <div
            key={c}
            style={{
              flex: 1,
              height: 5,
              borderRadius: 3,
              background: "rgba(255,255,255,0.07)",
              overflow: "hidden",
            }}
          >
            {c === st.cursor && st.phase === "idle" && !st.lockedCols[c] && (
              <div
                style={{
                  height: "100%",
                  width: `${st.autoTimer * 100}%`,
                  background:
                    st.autoTimer > 0.75
                      ? "#EF4444"
                      : st.autoTimer > 0.5
                        ? "#FFC928"
                        : accent,
                  transition: "width 0.08s,background 0.3s",
                  animation:
                    st.autoTimer > 0.85
                      ? "low-timer-warn 0.35s ease-in-out infinite"
                      : "none",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Grid */}
      {st.grid.map((row, r) => (
        <div key={r} style={{ display: "flex", gap: G }}>
          {row.map((cell, c) => {
            const locked = st.lockedCols[c];
            const exploding = st.explodingCells.has(`${r},${c}`);
            const falling =
              st.phase === "idle" &&
              r === st.fallRow &&
              c === st.cursor &&
              !cell;
            return (
              <div
                key={c}
                style={{
                  width: sz,
                  height: sz,
                  borderRadius: sz * 0.4,
                  background: cell
                    ? `linear-gradient(135deg,${PCONF[cell].hi}28,${PCONF[cell].dark}50)`
                    : falling
                      ? `linear-gradient(135deg,${PCONF[st.piece].hi}55,${PCONF[st.piece].dark}90)`
                      : locked
                        ? "rgba(220,38,38,0.07)"
                        : "rgba(26,57,104,0.55)",
                  border: `1.5px solid ${
                    cell
                      ? PCONF[cell].main + "60"
                      : falling
                        ? PCONF[st.piece].main
                        : locked
                          ? "rgba(220,38,38,0.22)"
                          : "rgba(255,255,255,0.13)"
                  }`,
                  boxShadow: cell
                    ? `inset 0 2px 8px rgba(0,0,0,0.5),0 0 10px ${PCONF[cell].glow}`
                    : falling
                      ? `0 0 22px ${PCONF[st.piece].glow},inset 0 2px 8px rgba(255,255,255,0.25)`
                      : "inset 0 2px 6px rgba(0,0,0,0.7),inset 0 0 1px rgba(255,255,255,0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  position: "relative",
                  overflow: "hidden",
                  animation:
                    locked && !cell
                      ? "col-lock-flash 2.5s ease-in-out infinite"
                      : "none",
                  transition: "border-color 0.2s",
                }}
              >
                {/* Empty cell subtle cross-hatch */}
                {!cell && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0.07,
                      backgroundImage: `linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)`,
                      backgroundSize: `${sz / 2}px ${sz / 2}px`,
                      pointerEvents: "none",
                    }}
                  />
                )}
                {cell ? (
                  <div className={st.frozen[`${r},${c}`] ? "frozen-piece" : ""}><Piece3D type={cell} size={sz - 3} exploding={exploding} /></div>
                ) : falling ? (
                  <div style={{ animation: "piece-drop 0.35s ease-out" }}>
                    <Piece3D type={st.piece} size={sz - 3} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}

      {/* Locked column dim overlays */}
      <div
        style={{
          position: "absolute",
          top: sz + 18,
          left: 0,
          right: 0,
          height: ROWS * (sz + G) - G,
          display: "flex",
          gap: G,
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        {st.lockedCols.map((locked, c) => (
          <div
            key={c}
            style={{
              flex: 1,
              background: locked ? "rgba(0,0,0,0.45)" : "transparent",
              borderRadius: 4,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              paddingTop: 6,
              transition: "background 0.4s",
            }}
          >
            {locked && (
              <span
                style={{
                  fontSize: sz * 0.55,
                  filter: "drop-shadow(0 0 4px rgba(220,38,38,0.8))",
                }}
              >
                
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Column labels (text only) */}
      <div style={{ display: "flex", gap: G, marginTop: 4 }}>
        {TYPES.map((t, c) => (
          <div
            key={t}
            style={{
              width: sz,
              textAlign: "center",
              fontFamily: "Fredoka,sans-serif",
              fontSize: "clamp(7px,1.15vmin,11px)",
              fontWeight: 700,
              letterSpacing: 0.4,
              color: st.lockedCols[c]
                ? "rgba(220,38,38,0.45)"
                : c === st.cursor
                  ? PCONF[t].hi
                  : "rgba(255,255,255,0.35)",
              transition: "color 0.15s",
              textShadow:
                c === st.cursor && !st.lockedCols[c]
                  ? `0 0 8px ${PCONF[t].glow}`
                  : "none",
            }}
          >
            {st.lockedCols[c] ? "—" : PCONF[t].label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Player panel ─── */
function PlayerPanel({ st, pNum, versus = false }: { st: ReturnType<typeof usePlayerGrid>; pNum: 1 | 2; versus?: boolean }) {
  const highest = st.grid.findIndex(row => row.some(Boolean));
  const life = highest === -1 ? 100 : Math.round(highest / ROWS * 100);
  const col = pNum === 1 ? "#EF4444" : "#3B82F6";
  const colD = pNum === 1 ? "#7F1D1D" : "#1E3A8A";

  const panelRef = useRef<HTMLDivElement>(null);
  const gridAreaRef = useRef<HTMLDivElement>(null);
  const [sz, setSz] = useState(34);
  useLayoutEffect(() => {
    const el = gridAreaRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth - 8;
      const h = el.clientHeight - 8;
      // width: COLS cells + (COLS-1)*gap
      const byW = Math.floor((w - (COLS - 1) * 2) / COLS);
      // height: cursor row (sz+10) + timer (7) + ROWS cells + (ROWS-1)*gap + labels (22)
      // solve: h = sz*(ROWS+1) + (ROWS+1)*2 + 39  =>  sz = (h - (ROWS+1)*2 - 39) / (ROWS+1)
      const byH = Math.floor((h - (ROWS + 1) * 2 - 42) / (ROWS + 1));
      setSz(Math.max(8, Math.min(68, byW, byH)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={panelRef}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        background: `radial-gradient(ellipse at 50% 110%,${col}38 0%,#315a97 58%,#223b75 100%)`,
        border: `3px solid ${col}`,
        borderRadius: "clamp(10px,1.8vmin,18px)",
        margin: "clamp(3px,.55vmin,5px)",
        overflow: "hidden",
        boxShadow: `0 0 40px ${col}40,inset 0 0 100px rgba(0,0,0,0.2)`,
        position: "relative",
      }}
    >
      {/* ─ Header ─ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "clamp(4px,.8vmin,8px)",
          padding: "clamp(4px,.8vmin,8px) clamp(6px,1.1vmin,11px)",
          background: `linear-gradient(90deg,${colD}60,transparent)`,
          borderBottom: `1px solid ${col}45`,
          flexShrink: 0,
          position: "relative",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: "clamp(24px,4vmin,36px)",
            height: "clamp(24px,4vmin,36px)",
            borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%,${col}55,${colD}CC)`,
            border: `2px solid ${col}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "clamp(12px,2.2vmin,20px)",
            boxShadow: `0 0 12px ${col}70`,
            flexShrink: 0,
          }}
        >
          <Piece3D type={pNum === 1 ? "cone" : "win"} size={30} />
        </div>

        {/* Name + combos */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "Fredoka,sans-serif",
              fontSize: "clamp(9px,1.6vmin,15px)",
              fontWeight: 700,
              color: col,
              letterSpacing: 1,
              lineHeight: 1.1,
            }}
          >
            JOGADOR {pNum}
          </div>
          <div
            style={{
              fontFamily: "Fredoka,sans-serif",
              fontSize: "clamp(7px,1.2vmin,11px)",
              color: "#FFC928",
              lineHeight: 1,
            }}
          >
             {st.combos} combos
          </div>
        </div>

        {/* Score centered in the player's own bar */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            minWidth: "clamp(90px,12vmin,160px)",
            padding: "clamp(3px,.5vmin,6px) clamp(10px,1.5vmin,18px)",
            border: `1.5px solid ${col}88`,
            borderRadius: "clamp(6px,1vmin,10px)",
            background: `${col}18`,
            boxShadow: `0 0 18px ${col}35`,
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontFamily: "Fredoka,sans-serif",
              fontSize: "clamp(18px,3.5vmin,34px)",
              fontWeight: 700,
              color: "#FFC928",
              lineHeight: 1,
            }}
          >
            {st.score.toLocaleString()}
          </div>
          <div
            style={{
              fontFamily: "Fredoka,sans-serif",
              fontSize: "clamp(6px,1vmin,10px)",
              color: "rgba(255,255,255,0.45)",
              letterSpacing: 1,
            }}
          >
            SCORE
          </div>
        </div>

        {/* ATUAL piece */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: "Fredoka,sans-serif",
              fontSize: "clamp(5px,.85vmin,8px)",
              color: "rgba(255,255,255,0.4)",
              letterSpacing: 1,
              lineHeight: 1,
            }}
          >
            ATUAL
          </div>
          <div
            style={{ filter: `drop-shadow(0 0 8px ${PCONF[st.piece].glow})` }}
          >
            <Piece3D type={st.piece} size={Math.max(22, Math.min(sz, 36))} />
          </div>
        </div>

        {/* PRÓXIMA piece */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            flexShrink: 0,
            opacity: 0.8,
          }}
        >
          <div
            style={{
              fontFamily: "Fredoka,sans-serif",
              fontSize: "clamp(5px,.8vmin,7px)",
              color: "rgba(255,255,255,0.3)",
              letterSpacing: 1,
              lineHeight: 1,
            }}
          >
            PRÓX.
          </div>
          <Piece3D
            type={st.nextPiece}
            size={Math.max(16, Math.min(sz * 0.7, 26))}
          />
        </div>
      </div>

      {/* ─ Game grid ─ */}
      {versus && <div className="duel-life"><div><span>VIDA · {life}%</span><span>{st.score} / 1.000 PONTOS</span></div><progress aria-label={`Vida do jogador ${pNum}`} max={100} value={life} /></div>}
      <div
        ref={gridAreaRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
          padding: "clamp(2px,.4vmin,4px)",
        }}
      >
        <div style={{ position: "relative" }}>
          <GameBoard st={st} pNum={pNum} sz={sz} />
        </div>

        {/* Score popup */}
        {st.scorePopup && (
          <div
            key={st.scorePopup.key}
            style={{
              position: "absolute",
              top: "18%",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              animation: "score-float 1.1s ease-out both",
              pointerEvents: "none",
              zIndex: 40,
              whiteSpace: "nowrap",
            }}
          >
            {/* Main score */}
            <div
              style={{
                fontFamily: "Fredoka,sans-serif",
                fontWeight: 700,
                fontSize:
                  st.scorePopup.streak > 1
                    ? "clamp(20px,3.8vmin,38px)"
                    : "clamp(16px,3vmin,30px)",
                color:
                  st.scorePopup.streak > 2
                    ? "#FF8A2A"
                    : st.scorePopup.streak > 1
                      ? "#FFC928"
                      : "#4ADE80",
                textShadow: `0 2px 18px rgba(0,0,0,0.95),0 0 32px ${st.scorePopup.streak > 1 ? "#FFC92899" : "#22C55E80"}`,
                lineHeight: 1,
              }}
            >
              +{st.scorePopup.pts.toLocaleString()}
            </div>
            {/* Breakdown pills */}
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <div
                style={{
                  fontFamily: "Fredoka,sans-serif",
                  fontSize: "clamp(8px,1.5vmin,13px)",
                  fontWeight: 700,
                  background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(4px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 20,
                  padding: "1px 7px",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                {st.scorePopup.pieces} peças
              </div>
              {st.scorePopup.streak > 1 && (
                <div
                  style={{
                    fontFamily: "Fredoka,sans-serif",
                    fontSize: "clamp(8px,1.5vmin,13px)",
                    fontWeight: 700,
                    background:
                      st.scorePopup.streak > 2
                        ? "rgba(255,138,42,0.35)"
                        : "rgba(255,201,40,0.28)",
                    border: `1px solid ${st.scorePopup.streak > 2 ? "#FF8A2A" : "#FFC928"}66`,
                    borderRadius: 20,
                    padding: "1px 7px",
                    color: st.scorePopup.streak > 2 ? "#FF8A2A" : "#FFC928",
                  }}
                >
                   ×{st.scorePopup.streak} streak
                </div>
              )}
            </div>
          </div>
        )}

        {/* All-locked overlay */}
        {st.allLocked && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.84)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              zIndex: 20,
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: "clamp(28px,5.5vmin,52px)" }}></div>
            <div
              style={{
                fontFamily: "Fredoka,sans-serif",
                fontSize: "clamp(12px,2.3vmin,21px)",
                fontWeight: 700,
                color: "#F87171",
                textShadow: "0 0 20px #DC2626",
                textAlign: "center",
              }}
            >
              OPS! ENCHEU!
            </div>
          </div>
        )}

        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `radial-gradient(ellipse at ${st.cursor * 20 + 10}% 100%,${PCONF[st.piece].glow} 0%,transparent 52%)`,
            transition: "all 0.15s",
            opacity: 0.55,
          }}
        />
      </div>

      <div className={`touch-controls touch-player-${pNum}`} aria-label={`Controles do jogador ${pNum}`}>
        <div className="touch-steering" role="group" aria-label="Mover a peça">
          <TouchAction label={`Jogador ${pNum}: esquerda`} direction="left" action={() => st.move(-1)} repeat />
          <TouchAction label={`Jogador ${pNum}: direita`} direction="right" action={() => st.move(1)} repeat />
        </div>
        <TouchAction label={`Jogador ${pNum}: soltar peça`} direction="down" action={st.drop} />
      </div>
      {/* Controls */}
      <div
        style={{
          textAlign: "center",
          fontFamily: "Fredoka,sans-serif",
          fontSize: "clamp(7px,1.2vmin,10px)",
          color: "rgba(255,255,255,0.2)",
          padding: "clamp(2px,.4vmin,4px)",
          letterSpacing: 1,
          flexShrink: 0,
        }}
      >
        {pNum === 1 ? "← → MOVER · ↓ SOLTAR" : "A D MOVER · S SOLTAR"}
      </div>
    </div>
  );
}

/* ─── Rocket SVG — hangman style, 10 parts revealed by combo count ─── */
/* ─── Space scene — lives inside TopHUD ─── */
function SpaceScene({
  combos,
  totalScore,
  elapsedSeconds,
}: {
  combos: number;
  totalScore: number;
  elapsedSeconds: number;
}) {
  const scenery = Math.floor(elapsedSeconds / 25) % 7;
  const scrollDur = Math.max(3.2, 18 - combos * 1.5);
  const level = Math.min(combos, 10);
  // The ship changes every 400 points; later visual stages remain capped by the
  // four available public ship artworks.
  const shipStage = Math.min(3, Math.floor(totalScore / SCORE_LEVEL_STEP));
  const showAsteroids = combos >= 4;
  const showBoss = shipStage >= 3;
  const enemyLayout = [
    { left: 56, top: 18 },
    { left: 70, top: 43 },
    { left: 84, top: 24 },
    { left: 63, top: 70 },
    { left: 78, top: 62 },
    { left: 91, top: 51 },
    { left: 58, top: 86 },
    { left: 86, top: 82 },
  ];

  const planets = [
    { x: "7%", y: "22%", s: 38, c1: "#7C3AED", c2: "#2e0764", fd: 0, mc: 0 },
    { x: "32%", y: "68%", s: 20, c1: "#0EA5E9", c2: "#0C4A6E", fd: 1.5, mc: 0 },
    { x: "58%", y: "32%", s: 14, c1: "#F97316", c2: "#7C2D12", fd: 3, mc: 2 },
    { x: "78%", y: "58%", s: 48, c1: "#15803D", c2: "#14532D", fd: 0.6, mc: 3 },
    { x: "96%", y: "14%", s: 26, c1: "#DC2626", c2: "#7F1D1D", fd: 2.2, mc: 5 },
    // second copy (200% wide, second half)
    {
      x: "112%",
      y: "25%",
      s: 40,
      c1: "#7C3AED",
      c2: "#2e0764",
      fd: 0.8,
      mc: 0,
    },
    {
      x: "138%",
      y: "65%",
      s: 22,
      c1: "#0EA5E9",
      c2: "#0C4A6E",
      fd: 2.5,
      mc: 0,
    },
    {
      x: "158%",
      y: "38%",
      s: 16,
      c1: "#F97316",
      c2: "#7C2D12",
      fd: 1.2,
      mc: 0,
    },
    {
      x: "178%",
      y: "72%",
      s: 44,
      c1: "#15803D",
      c2: "#14532D",
      fd: 0.4,
      mc: 0,
    },
    {
      x: "195%",
      y: "18%",
      s: 28,
      c1: "#DC2626",
      c2: "#7F1D1D",
      fd: 1.8,
      mc: 0,
    },
  ];

  const asteroids = [
    { x: "42%", y: "38%", s: 9 },
    { x: "88%", y: "62%", s: 7 },
    { x: "130%", y: "28%", s: 13 },
    { x: "162%", y: "56%", s: 8 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        backgroundColor: "#081a3d",
        backgroundSize: "cover",
        backgroundPosition: "center 48%",
      }}
    >
      {Array.from({ length: 7 }, (_, index) => <img
        key={index} src={`/c${index + 1}.png`} alt="" aria-hidden="true"
        className="space-scenery-layer" style={{ opacity: scenery === index ? 1 : 0 }}
      />)}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,#04011655,#0401160d)", pointerEvents: "none" }} />
      {/* Fixed starfield */}
      {Array.from({ length: 28 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${(i * 41 + 9) % 100}%`,
            top: `${(i * 27 + 5) % 100}%`,
            width: i % 6 === 0 ? 2 : 1,
            height: i % 6 === 0 ? 2 : 1,
            borderRadius: "50%",
            background: "white",
            opacity: 0.18 + (i % 6) * 0.08,
            animation: `star-twinkle ${1 + (i % 4) * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.09}s`,
          }}
        />
      ))}

      {/* Scrolling space layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "200%",
          animation: `space-scroll ${scrollDur}s linear infinite`,
        }}
      >
        {planets
          .filter((p) => combos >= p.mc)
          .map((p, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: p.x,
                top: p.y,
                width: p.s,
                height: p.s,
                borderRadius: "50%",
                background: `radial-gradient(circle at 35% 35%,${p.c1},${p.c2})`,
                opacity: 0.65,
                boxShadow: `0 0 ${p.s * 0.5}px ${p.c1}55`,
                transform: "translate(-50%,-50%)",
                animation: `planet-float ${5.5 + p.fd}s ${p.fd}s ease-in-out infinite`,
              }}
            />
          ))}
        {showAsteroids &&
          asteroids.map((a, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: a.x,
                top: a.y,
                width: a.s,
                height: a.s,
                borderRadius: "30%",
                background: "linear-gradient(135deg,#94A3B8,#475569)",
                transform: "translate(-50%,-50%) rotate(35deg)",
                animation: `spin-slow ${1.8 + i * 0.6}s linear infinite`,
                opacity: 0.8,
              }}
            />
          ))}
      </div>

      {/* Individual arcade screen: an automatic Space Invaders-style battle. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 4,
          pointerEvents: "none",
        }}
      >
        {Array.from({ length: 4 + Math.min(4, shipStage) }).map((_, i) => (
          <div
            key={`enemy-${i}`}
            style={{
              position: "absolute",
              left: `${enemyLayout[i].left}%`,
              top: `${enemyLayout[i].top}%`,
              width: `clamp(${34 + shipStage * 2}px,${4.5 + shipStage * 0.2}vmin,${58 + shipStage * 4}px)`,
              height: `clamp(${30 + shipStage * 2}px,${4.5 + shipStage * 0.2}vmin,${58 + shipStage * 4}px)`,
              filter: "drop-shadow(0 0 12px #A855F7)",
              animation: `enemy-patrol ${4.8 + i * 0.7 - shipStage * 0.25}s ${i * 0.35}s ease-in-out infinite, enemy-destroy ${3.2 + i * 0.45 - shipStage * 0.15}s ${i * 0.9}s ease-in-out infinite`,
            }}
          >
            <img
              src={`/mosnter ${(i % 4) + 1}.png`}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={`laser-${i}`}
            style={{
              position: "absolute",
              left: "27%",
              top: `${30 + i * 13}%`,
              width: "clamp(34px,7vmin,92px)",
              height: "clamp(3px,.55vmin,7px)",
              borderRadius: 99,
              background:
                "linear-gradient(90deg,#FFF,#28C8F5,#1687F8,transparent)",
              boxShadow: "0 0 12px #28C8F5,0 0 24px #1687F8",
              animation: `laser-shot ${Math.max(0.55, 1.25 + i * 0.18 - shipStage * 0.12)}s ${i * 0.28}s linear infinite`,
            }}
          />
        ))}
      </div>

      {/* Large ship — patrols forward/back and up/down continuously. */}
      <div
        style={{
          position: "absolute",
          left: "5%",
          top: "52%",
          width: "42%",
          height: "62%",
          maxWidth: "42%",
          overflow: "visible",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          animation: "ship-patrol 7s ease-in-out infinite",
          zIndex: 5,
        }}
      >
        {/* Speed lines (combo 3+) */}
        {level >= 3 && (
          <div
            style={{
              position: "absolute",
              right: "100%",
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              flexDirection: "column",
              gap: 2.5,
              paddingRight: 4,
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 1.5,
                  width: 5 + level * 3 + i * 4,
                  background: `linear-gradient(to left,rgba(96,165,250,${0.75 - i * 0.17}),transparent)`,
                  borderRadius: 1,
                }}
              />
            ))}
          </div>
        )}
        {/* Ship artwork from public — evolves geometrically with score. */}
        <img
          src={`/nave${shipStage === 0 ? "" : Math.min(shipStage, 3) + 1}.png`}
          alt="Nave do jogador"
          style={{
            width: `clamp(${110 + shipStage * 8}px,${14 + shipStage * 0.7}vmin,${205 + shipStage * 15}px)`,
            height: `clamp(${58 + shipStage * 4}px,${9 + shipStage * 0.45}vmin,${92 + shipStage * 8}px)`,
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            filter: `drop-shadow(0 0 ${2 + level * 0.5}px rgba(96,165,250,0.45))`,
            transition: "width .5s ease,height .5s ease,filter .5s ease",
          }}
        />
      </div>

      {/* Boss UFO (combo 7+) */}
      {showBoss && (
        <div
          key="boss"
          style={{
            position: "absolute",
            left: "55%",
            top: "35%",
            animation: "boss-appear 0.7s ease-out both",
            zIndex: 3,
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "Fredoka,sans-serif",
              fontSize: 8,
              fontWeight: 700,
              color: "#F87171",
              letterSpacing: 1,
              whiteSpace: "nowrap",
              marginBottom: 2,
              animation: "blink-light 0.6s ease-in-out infinite",
            }}
          >
             CHEFÃO!
          </div>
          <svg
            viewBox="0 0 60 26"
            width="52"
            height="22"
            style={{
              filter: "drop-shadow(0 0 10px #A855F770)",
              animation: "ship-wobble 3.5s .6s ease-in-out infinite",
            }}
          >
            <ellipse cx="30" cy="18" rx="28" ry="7" fill="#7E22CE" />
            <ellipse cx="30" cy="11" rx="13" ry="8" fill="#A855F7" />
            <ellipse
              cx="30"
              cy="9"
              rx="7"
              ry="4"
              fill="#C084FC"
              opacity="0.7"
            />
            <circle
              cx="12"
              cy="18"
              r="2.5"
              fill="#FDE68A"
              style={{ animation: "blink-light 0.4s ease-in-out infinite" }}
            />
            <circle
              cx="30"
              cy="19"
              r="2.5"
              fill="#FDE68A"
              style={{
                animation: "blink-light 0.4s 0.13s ease-in-out infinite",
              }}
            />
            <circle
              cx="48"
              cy="18"
              r="2.5"
              fill="#FDE68A"
              style={{
                animation: "blink-light 0.4s 0.27s ease-in-out infinite",
              }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "100%",
              width: 22,
              height: 22,
              background: "linear-gradient(to bottom,#A855F766,transparent)",
              clipPath: "polygon(25% 0%,75% 0%,100% 100%,0% 100%)",
              transform: "translateX(-50%)",
              animation: "engine-fire 0.4s ease-in-out infinite",
            }}
          />
        </div>
      )}

      {/* Combo flash — replays on every new combo */}
      {combos > 0 && (
        <div
          key={combos}
          style={{
            position: "absolute",
            top: "12%",
            left: "22%",
            transform: "translateX(-50%)",
            fontFamily: "Fredoka,sans-serif",
            fontWeight: 700,
            fontSize: "clamp(10px,1.9vmin,17px)",
            color:
              combos >= 7 ? "#F87171" : combos >= 4 ? "#FF8A2A" : "#FFC928",
            textShadow: `0 0 16px ${combos >= 7 ? "#F87171" : combos >= 4 ? "#FF8A2A" : "#FFC928"}`,
            animation: "combo-flash 0.9s ease-out both",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
          }}
        >
          {combos >= 7
            ? " CHEFÃO APARECEU!"
            : combos >= 4
              ? " ASTEROIDES!"
              : " COMBO!"}
        </div>
      )}
    </div>
  );
}

/* ─── Top HUD ─── */
function TopHUD({
  attackEffects,
  elapsedSeconds,
  remainingSeconds,
  p1Combos,
  p2Combos,
  p1Score,
  p2Score,
  totalCombos,
  difficultyLevel,
  mode,
}: {
  attackEffects: { notice: string; serial: number }[];
  elapsedSeconds: number;
  remainingSeconds: number;
  p1Combos: number;
  p2Combos: number;
  p1Score: number;
  p2Score: number;
  totalCombos: number;
  difficultyLevel: number;
  mode: GameMode;
}) {
  const totalScore = p1Score + p2Score;
  const launched = totalCombos >= ROCKET_TARGET;
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const seconds = String(remainingSeconds % 60).padStart(2, "0");

  return (
    <div
      style={{
        flex: "0 0 26%",
        background: "linear-gradient(180deg,#102b63 0%,#174b86 100%)",
        borderBottom: "2px solid rgba(120,80,240,0.25)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Compact top bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "clamp(5px,1vmin,10px)",
          padding: "clamp(4px,.7vmin,7px) clamp(8px,1.4vmin,14px)",
          background: "rgba(7,25,67,0.52)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
          zIndex: 5,
          position: "relative",
        }}
      >
        {/* Logo compact */}
        <div style={{ lineHeight: 0.82, flexShrink: 0 }}>
          <div
            style={{
              fontFamily: "Fredoka,sans-serif",
              fontWeight: 700,
              fontSize: "clamp(9px,1.7vmin,15px)",
              color: "#FFC928",
              letterSpacing: ".04em",
            }}
          >
            TOY FACTORY
          </div>
          <div
            style={{
              fontFamily: "Fredoka,sans-serif",
              fontWeight: 700,
              fontSize: "clamp(9px,1.7vmin,15px)",
              color: "#FF8A2A",
              letterSpacing: ".04em",
            }}
          >
            RUSH 
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* J1 combos */}
        <div
          style={{
            fontFamily: "Fredoka,sans-serif",
            fontSize: "clamp(9px,1.7vmin,15px)",
            color: "#F87171",
            fontWeight: 700,
          }}
        >
          J1 {p1Combos}
        </div>

        {/* Progress */}
        <div
          style={{
            fontFamily: "Fredoka,sans-serif",
            fontWeight: 700,
            fontSize: "clamp(11px,2.1vmin,19px)",
            color: launched ? "#FFC928" : "rgba(255,255,255,0.45)",
            textShadow: launched ? "0 0 12px #FFC92880" : "none",
            transition: "color 0.4s",
            padding: "0 clamp(3px,.5vmin,6px)",
          }}
        >
          {totalCombos}/{ROCKET_TARGET}
        </div>

        {/* J2 combos */}
        {mode !== "1p" && (
          <div
            style={{
              fontFamily: "Fredoka,sans-serif",
              fontSize: "clamp(9px,1.7vmin,15px)",
              color: mode === "1v1" ? "#C084FC" : "#60A5FA",
              fontWeight: 700,
            }}
          >
            J2 {p2Combos}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div
          style={{
            fontFamily: "Fredoka,sans-serif",
            fontSize: "clamp(14px,2.4vmin,24px)",
            fontWeight: 700,
            color: remainingSeconds <= 20 ? "#F87171" : "white",
            whiteSpace: "nowrap",
          }}
        >
          {mode === "1v1" ? "META: 1.000 PONTOS" : `${minutes}:${seconds}`}
        </div>

        <div
          style={{
            fontFamily: "Fredoka,sans-serif",
            fontSize: "clamp(9px,1.5vmin,14px)",
            color: difficultyLevel ? "#F87171" : "#4ADE80",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
           NÍVEL {Math.floor(totalScore / SCORE_LEVEL_STEP) + 1}
        </div>
      </div>

      {/* ── Space scene ── */}
      <div style={{ flex: 1, position: "relative" }}>
        <SpaceScene combos={totalCombos} totalScore={totalScore} elapsedSeconds={elapsedSeconds} />
        <div className="attack-bursts" aria-live="polite">
          {attackEffects.map((attack, index) => attack.notice && <div
            key={`${index}-${attack.serial}`}
            className={`attack-burst ${attack.notice.startsWith("GELO") ? "attack-ice" : attack.notice.startsWith("SURPRESA") ? "attack-extra" : "attack-random"}`}>
            <strong>{attack.notice.startsWith("GELO") ? "ICE" : attack.notice.startsWith("SURPRESA") ? "+1" : "RANDOMM"}</strong>
            <span>JOGADOR {index + 1}</span>
          </div>)}
        </div>

        {/* MONTE O FOGUETE label */}
        <div
          style={{
            position: "absolute",
            top: 4,
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "Fredoka,sans-serif",
            fontSize: "clamp(7px,1.2vmin,11px)",
            color: "rgba(255,255,255,0.28)",
            letterSpacing: 2,
            whiteSpace: "nowrap",
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          MONTE O FOGUETE
        </div>
      </div>
    </div>
  );
}

/* ─── Game mode ─── */
type GameMode = "1p" | "coop" | "1v1";
function SplashScreen({ onStart }: { onStart: (mode: GameMode) => void }) {
  const [mode, setMode] = useState<GameMode>("coop");
  useEffect(() => {
    const startWithKeyboard = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLButtonElement) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onStart(mode);
      }
    };
    window.addEventListener("keydown", startWithKeyboard);
    return () => window.removeEventListener("keydown", startWithKeyboard);
  }, [mode, onStart]);
  return <main className="welcome-screen">
    <div className="welcome-stars" aria-hidden="true">
      {Array.from({ length: 36 }, (_, i) => <span key={i} style={{
        left: `${(i * 37 + 11) % 100}%`, top: `${(i * 23 + 7) % 100}%`,
        animationDelay: `${i * .13}s`,
      }} />)}
    </div>
    <div className="welcome-brand">
      <h1><img className="welcome-logo" src="/logo.png?v=20260910-145047" alt="Toy Factory Rush — Junte os amigos, lance o foguete" /></h1>
    </div>
    <button className="welcome-play" onClick={() => onStart(mode)}>
      <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 8Q10 6 10 12v24q0 6 4 4l26-14q4-2 0-4Z" fill="currentColor" /></svg>
      JOGAR
    </button>
    <section className="welcome-modes" aria-label="Modo de jogo">
      <p>COMO VAMOS BRINCAR?</p>
      <div className="welcome-mode-options">
        {([
          { id: "1p", icon: "", label: "1 JOGADOR", sub: "Só você" },
          { id: "coop", icon: "", label: "COOPERATIVO", sub: "Juntos na aventura" },
          { id: "1v1", icon: "", label: "1 × 1", sub: "Desafio de amigos" },
        ] as const).map((option) => <button key={option.id}
          className={`welcome-mode ${mode === option.id ? "is-selected" : ""}`}
          aria-pressed={mode === option.id} onClick={() => setMode(option.id)}>
          <span className="mode-friends" aria-hidden="true"><Piece3D type="cone" size={44} />{option.id !== "1p" && <Piece3D type={option.id === "coop" ? "str" : "win"} size={44} />}</span>
          <strong>{option.label}</strong><small>{option.sub}</small>
        </button>)}
      </div>
    </section>
  </main>;
}
function Fireworks() {
  const bursts = Array.from({ length: 6 }).map((_, i) => ({
    x: `${15 + i * 14}%`,
    y: `${15 + ((i * 17) % 55)}%`,
    delay: i * 0.18,
    colors: ["#FFC928", "#FF8A2A", "#4ADE80", "#60A5FA", "#C084FC", "#F87171"],
  }));
  return (
    <>
      {bursts.map((b, bi) => (
        <div
          key={bi}
          style={{
            position: "absolute",
            left: b.x,
            top: b.y,
            width: 0,
            height: 0,
          }}
        >
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, pi) => {
            const rad = angle * (Math.PI / 180);
            const dist = 60 + bi * 15;
            const dx = Math.cos(rad) * dist,
              dy = Math.sin(rad) * dist;
            return (
              <div
                key={pi}
                style={{
                  position: "absolute",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: b.colors[pi % b.colors.length],
                  left: -4,
                  top: -4,
                  animation: `firework-burst 0.9s ${b.delay + 0.1}s ease-out both`,
                  ["--fx" as string]: `${dx}px`,
                  ["--fy" as string]: `${dy}px`,
                  boxShadow: `0 0 6px ${b.colors[pi % b.colors.length]}`,
                }}
              />
            );
          })}
        </div>
      ))}
    </>
  );
}

/* ─── Result / end-game screen ─── */
function ResultScreen({ mode, launched, p1Score, p2Score, totalCombos, collected, onRestart, onReplay, winner }: {
  winner: 0 | 1 | 2;
  mode: GameMode; launched: boolean; p1Score: number; p2Score: number;
  totalCombos: number; collected: number; onRestart: () => void; onReplay: () => void;
}) {
  useEffect(() => { if (launched) SFX.win(); }, [launched]);
  const score2 = mode === "1p" ? 0 : p2Score;
  return <div className="result-art-screen">
    <div className="result-art-frame">
      <img src="/overgame.png" alt="Foguete no espaço com a raposinha e o coelho astronautas" />
      {(mode === "1v1" || !launched) && <div className="result-art-status"><strong>{mode === "1v1" ? winner ? `JOGADOR ${winner} VENCEU!` : "EMPATE!" : "FIM DA AVENTURA!"}</strong><span>{mode === "1v1" ? "Desafio concluído!" : "Vamos tentar de novo?"}</span></div>}
      <div className="result-art-scores">
        {[["J1", p1Score, "PONTOS"], [mode === "1p" ? "SOLO" : "J2", score2, "PONTOS"], ["COMBOS", totalCombos, "COMBINAÇÕES"], ["TOTAL", p1Score + score2, "PONTOS"]].map(([label, value, unit], index) =>
          <div key={label} className={`result-stat result-stat-${index}`}><small>{label}</small><strong>{Number(value).toLocaleString("pt-BR")}</strong><small>{unit}</small></div>)}
      </div>
      <div className="result-art-pieces"><span>PEÇAS COLETADAS</span><strong>{collected.toLocaleString("pt-BR")}</strong><small>Amigos combinados durante a partida</small></div>
      <button className="result-art-replay" onClick={onReplay} aria-label="Jogar de novo" />
      <button className="result-art-menu" onClick={onRestart} aria-label="Menu principal" />
    </div>
  </div>;
}
/* ─── Root ─── */
function TouchAction({ label, direction, action, repeat = false }: {
  label: string; direction: "left" | "right" | "down"; action: () => void; repeat?: boolean;
}) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const latest = useRef(action);
  latest.current = action;
  const stop = useCallback(() => {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => {
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", stop);
    return () => {
      stop();
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", stop);
    };
  }, [stop]);
  return <button className={`touch-action ${repeat ? "" : "touch-drop"}`} aria-label={label}
    onPointerDown={(event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      stop();
      latest.current();
      if (repeat) timer.current = setInterval(() => latest.current(), 180);
    }}
    onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
    onContextMenu={(event) => event.preventDefault()}
    onClick={(event) => { if (event.detail === 0) latest.current(); }}>
    <svg className="touch-arrow" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M8 32 30 10v13h24v18H30v13Z" fill="currentColor"
        stroke="currentColor" strokeWidth="5" strokeLinejoin="round"
        transform={`rotate(${direction === "right" ? 180 : direction === "down" ? -90 : 0} 32 32)`} />
    </svg>
  </button>;
}

function ProgramRocket() {
  return <svg className="program-rocket" viewBox="0 0 100 110" aria-hidden="true">
    <path d="M38 79Q28 96 50 107Q72 96 62 79" fill="#ffbe34" stroke="#162448" strokeWidth="3" />
    <path d="M39 51Q10 56 16 86L40 75M61 51Q90 56 84 86L60 75" fill="#f15f7a" stroke="#162448" strokeWidth="3" />
    <path d="M50 5Q18 30 31 78Q50 89 69 78Q82 30 50 5Z" fill="#fff6df" stroke="#162448" strokeWidth="4" />
    <path d="M50 5Q36 16 31 32L69 32Q64 16 50 5Z" fill="#f15f7a" stroke="#162448" strokeWidth="3" />
    <circle cx="50" cy="50" r="13" fill="#89dcf5" stroke="#23659d" strokeWidth="3" />
    <path d="M43 49q3-5 6 0m4 0q3-5 6 0M43 67q7 9 14 0" fill="none" stroke="#162448" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="35" cy="62" rx="5" ry="3" fill="#ffb0af" /><ellipse cx="65" cy="62" rx="5" ry="3" fill="#ffb0af" />
  </svg>;
}

export default function App() {
  const [credits, setCredits] = useState(() => {
    try { const saved = Number(localStorage.getItem("toy-credit-units")); return Number.isSafeInteger(saved) && saved >= 0 ? saved : 0; } catch { return 0; }
  });
  const creditsRef = useRef(credits);
  const [creditPopup, setCreditPopup] = useState(false);
  const creditCloseRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (creditPopup) creditCloseRef.current?.focus(); }, [creditPopup]);
  const saveCredits = useCallback((units: number) => {
    creditsRef.current = units;
    setCredits(units);
    try { localStorage.setItem("toy-credit-units", String(units)); } catch {}
  }, []);
  useEffect(() => {
    const addCredit = (event: KeyboardEvent) => {
      if (event.key !== "F8") return;
      event.preventDefault();
      if (event.repeat) return;
      saveCredits(creditsRef.current + 2);
    };
    window.addEventListener("keydown", addCredit);
    return () => window.removeEventListener("keydown", addCredit);
  }, [saveCredits]);
  const spendCredit = useCallback((mode: GameMode) => {
    const cost = mode === "1p" ? 1 : 2;
    if (creditsRef.current < cost) { setCreditPopup(true); return false; }
    saveCredits(creditsRef.current - cost);
    return true;
  }, [saveCredits]);
  const [flight, setFlight] = useState({ score: 0, combos: 0, mode: "coop", phase: "splash", attacks: "" });
  const [record, setRecord] = useState(() => {
    try { return Math.max(0, Number(localStorage.getItem("toy-flight-record")) || 0); } catch { return 0; }
  });
  useEffect(() => {
    if (flight.score <= record) return;
    setRecord(flight.score);
    try { localStorage.setItem("toy-flight-record", String(flight.score)); } catch {}
  }, [flight.score, record]);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [message, setMessage] = useState("");
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setMessage("");
    } catch { setMessage("Tela cheia indisponível neste navegador."); }
  };
  return <>
    <header className="screen-toolbar">
      <div className="cockpit-brand"><ProgramRocket /><div><small>CENTRAL DE COMANDO</small><strong>MONTE O FOGUETE</strong></div></div>
      <div className="cockpit-readout"><small>RECORDE DA TRIPULAÇÃO</small><strong>{record.toLocaleString("pt-BR")}</strong></div>
      <div className="cockpit-readout"><small>PONTOS DA MISSÃO</small><strong>{flight.score.toLocaleString("pt-BR")}</strong></div>
      <div className="cockpit-readout cockpit-progress" role={flight.attacks ? "status" : undefined}>
        {flight.attacks ? <><small>ALERTA DA NAVE</small><span className="cockpit-attack">{flight.attacks}</span></> : <><small>ENERGIA DO FOGUETE</small><strong>{Math.min(flight.combos, ROCKET_TARGET)} / {ROCKET_TARGET}</strong><progress value={Math.min(flight.combos, ROCKET_TARGET)} max={ROCKET_TARGET} /></>}
      </div>
      {message && <span role="status">{message}</span>}
      <button onClick={toggleFullscreen}>{fullscreen ? "⤡ SAIR DA TELA CHEIA" : " TELA CHEIA"}</button>
    </header>
    <div className="credit-balance">SALDO: {credits / 2} ficha(s) · {credits} tentativa(s) solo ou {Math.floor(credits / 2)} em dupla</div>
    <GameApp onFlightChange={setFlight} spendCredit={spendCredit} />
    {creditPopup && <div className="credit-overlay" onKeyDown={(event) => {
      if (event.key === "Escape") setCreditPopup(false);
      if (event.key === "Tab") { event.preventDefault(); creditCloseRef.current?.focus(); }
    }}><section className="credit-dialog" role="dialog" aria-modal="true" aria-labelledby="credit-title">
      <ProgramRocket /><h2 id="credit-title">Adicione créditos para continuar</h2>
      <p>Uma ficha dá direito a <strong>2 tentativas individuais</strong> ou <strong>1 partida em dupla</strong>.</p>
      <p role="status">Saldo: {credits / 2} ficha(s)</p>
      <small>Modo de teste: pressione F8 para adicionar uma ficha.</small>
      <button ref={creditCloseRef} onClick={() => setCreditPopup(false)}>VOLTAR</button>
    </section></div>}
  </>;
}

const MISSION_SPEECH = "Olá, explorador! Os bichinhos precisam de você! Junte quatro amigos iguais. Faça dez combinações para lançar nosso foguete. Use as setas e ajude essa turma! Vamos nessa?";

function MissionDialog({ onComplete }: { onComplete: () => void }) {
  const [visibleActs, setVisibleActs] = useState(1);
  const [muted, setMuted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialogRef.current?.focus();
    const timers = [
      setTimeout(() => setVisibleActs(2), 3200),
      setTimeout(() => setVisibleActs(3), 6400),
      setTimeout(onComplete, 11400),
    ];
    return () => {
      timers.forEach(clearTimeout);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [onComplete]);
  const descriptions = [
    "Ato 1: Uma missão para você! Ajude os amigos a decolar.",
    "Ato 2: Junte quatro amigos iguais. Faça dez combinações para lançar o foguete.",
    "Ato 3: Vamos nessa? Pequenas combinações, grandes aventuras!",
  ];
  return <div className="story-stack-stage">
    <div className="story-stack" role="dialog" aria-modal="true" aria-label="História da missão em três atos"
      tabIndex={-1} ref={dialogRef}>
      {descriptions.map((description, index) => <div key={index}
        className={`story-stack-panel ${index < visibleActs ? "is-revealed" : ""}`}
        aria-hidden={index >= visibleActs}>
        <img src={`/ato${index + 1}.png`} alt={description} draggable={false} />
      </div>)}
      {"speechSynthesis" in window && <button className="story-stack-sound" aria-pressed={muted} disabled={muted} onClick={() => {
        window.speechSynthesis.cancel(); setMuted(true);
      }}>{muted ? "Sem narração" : "Desligar narração"}</button>}
    </div>
  </div>;
}
function LaunchCountdown({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const ctx = aCtx();
    let engine: AudioBufferSourceNode | undefined;
    if (ctx) {
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 4), ctx.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      engine = ctx.createBufferSource();
      engine.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(100, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 3);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(.22, ctx.currentTime + 3);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 4);
      engine.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      engine.start();
    }
    tone(440, .15, "triangle", .12);
    const timers = [1, 2, 3].map((value) => setTimeout(() => {
      setStep(value);
      tone(value === 3 ? 880 : 440 + value * 110, .2, "triangle", .12);
    }, value * 1000));
    const finish = setTimeout(onComplete, 4000);
    return () => {
      timers.forEach(clearTimeout); clearTimeout(finish);
      engine?.stop(); engine?.disconnect();
    };
  }, [onComplete]);
  return <div className="launch-screen" role="status" aria-live="assertive">
    <p>PREPARE-SE PARA DECOLAR!</p>
    <div key={step} className="launch-number">{["3", "2", "1", "GO!"][step]}</div>
    <span className="launch-rocket" aria-hidden="true"><ProgramRocket /></span>
  </div>;
}

function useGameControllers(players: { move: (direction: -1 | 1) => void; drop: () => void }[], active: boolean, secondPlayer: boolean) {
  const latest = useRef({ players, active, secondPlayer });
  latest.current = { players, active, secondPlayer };
  const [connected, setConnected] = useState(["", ""]);
  useEffect(() => {
    if (!navigator.getGamepads) return;
    const slots: (number | null)[] = [null, null];
    const previous = [{ direction: 0, nextMove: 0, drop: false }, { direction: 0, nextMove: 0, drop: false }];
    let frame = 0;
    let lastStatus = "";
    const poll = (now: number) => {
      const pads = Array.from(navigator.getGamepads()).filter((pad): pad is Gamepad => !!pad?.connected);
      slots.forEach((id, slot) => {
        if (id !== null && !pads.some(pad => pad.index === id)) {
          slots[slot] = null;
          previous[slot] = { direction: 0, nextMove: 0, drop: false };
        }
      });
      pads.forEach(pad => {
        if (slots.includes(pad.index)) return;
        const slot = slots.indexOf(null);
        if (slot >= 0) slots[slot] = pad.index;
      });
      const status = slots.map(id => pads.find(pad => pad.index === id)?.id || "");
      if (status.join() !== lastStatus) { lastStatus = status.join(); setConnected(status); }
      slots.forEach((id, slot) => {
        const pad = pads.find(item => item.index === id);
        if (!pad) return;
        const state = previous[slot];
        const rawPS4 = pad.mapping !== "standard" && /054c|dualshock|wireless controller|ps4/i.test(pad.id);
        const axis = pad.axes[0] || 0;
        const hat = rawPS4 && pad.axes.length > 9 && Math.abs(pad.axes[9]) <= 1 ? Math.round((pad.axes[9] + 1) * 3.5) : -1;
        const left = (!rawPS4 && pad.buttons[14]?.pressed) || (rawPS4 && [5, 6, 7].includes(hat)) || axis < -.45;
        const right = (!rawPS4 && pad.buttons[15]?.pressed) || (rawPS4 && [1, 2, 3].includes(hat)) || axis > .45;
        const direction = left === right ? 0 : left ? -1 : 1;
        const drop = !!(pad.buttons[rawPS4 ? 1 : 0]?.pressed || (!rawPS4 && pad.buttons[13]?.pressed) || (rawPS4 && [3, 4, 5].includes(hat)) || (pad.axes[1] || 0) > .65);
        if (latest.current.active && (slot === 0 || latest.current.secondPlayer) && document.visibilityState === "visible") {
          if (direction && (direction !== state.direction || now >= state.nextMove)) {
            latest.current.players[slot].move(direction);
            state.nextMove = now + (direction !== state.direction ? 260 : 150);
          }
          if (drop && !state.drop) latest.current.players[slot].drop();
        }
        state.direction = direction;
        state.drop = drop;
      });
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, []);
  return connected;
}

function GameApp({ onFlightChange, spendCredit }: { onFlightChange: (flight: { score: number; combos: number; mode: string; phase: string; attacks: string }) => void; spendCredit: (mode: GameMode) => boolean }) {
  const startingRef = useRef(false);
  const [phase, setPhase] = useState<
    "splash" | "mission" | "countdown" | "game" | "result"
  >("splash");
  const [mode, setMode] = useState<GameMode>("coop");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(GAME_TIME);
  const [totalCombos, setTotalCombos] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const launchedRef = useRef(false);
  const [launched, setLaunched] = useState(false);

  const onCombo = useCallback(() => setTotalCombos((t) => t + 1), []);
  const beginGame = useCallback(() => setPhase("game"), []);
  const beginCountdown = useCallback(() => setPhase("countdown"), []);
  const difficultyLevel = Math.floor(elapsedSeconds / DIFFICULTY_STEP_SECONDS);
  const modeSpeed = mode === "1p" ? 0.85 : mode === "1v1" ? 1.15 : 1;
  const speed = BASE_SPEED * modeSpeed * (1 + difficultyLevel * 0.2);

  const p2Active = phase === "game" && mode !== "1p";
  const p1 = usePlayerGrid(1, phase === "game", speed, onCombo, gameKey);
  const p2 = usePlayerGrid(2, p2Active, speed, onCombo, gameKey);
  const controllers = useGameControllers([p1, p2], phase === "game", mode !== "1p");
  const sentCombos = useRef([0, 0]);
  useEffect(() => { sentCombos.current = [0, 0]; }, [gameKey]);
  useEffect(() => {
    if (phase !== "game" || mode !== "1v1") return;
    [p1, p2].forEach((player, index) => {
      if (player.combos <= sentCombos.current[index]) return;
      sentCombos.current[index] = player.combos;
      const opponent = index === 0 ? p2 : p1;
      opponent.receiveAttack(player.combos % 2 === 1 ? "freeze" : "extra");
      if (player.consecutive > 0 && player.consecutive % 5 === 0) opponent.receiveAttack("shuffle");
    });
  }, [p1.combos, p2.combos, mode, phase]);
  useEffect(() => {
    const attacks = phase === "game" && mode === "1v1" ? [p1.attackNotice && `J1: ${p1.attackNotice}`, p2.attackNotice && `J2: ${p2.attackNotice}`].filter(Boolean).join(" · ") : "";
    onFlightChange({ score: p1.score + (mode === "1p" ? 0 : p2.score), combos: totalCombos, mode, phase, attacks });
  }, [p1.score, p2.score, p1.attackNotice, p2.attackNotice, mode, totalCombos, phase, onFlightChange]);

  useEffect(() => {
    if (
      phase === "game" &&
      totalCombos >= ROCKET_TARGET &&
      !launchedRef.current
    ) {
      launchedRef.current = true;
      setLaunched(true);
      SFX.cascade();
    }
  }, [totalCombos, phase]);

  useEffect(() => {
    if (phase !== "game") return;
    const id = setInterval(() => {
      setElapsedSeconds((t) => t + 1);
      if (mode === "1v1") return;
      setRemainingSeconds((t) => {
        if (t <= 1) {
          setPhase("result");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, mode]);

  useEffect(() => {
    // A single column reaching the ceiling ends the round immediately.
    const p1ReachedTop = p1.lockedCols.some(Boolean);
    const p2ReachedTop = mode !== "1p" && p2.lockedCols.some(Boolean);
    if (phase === "game" && (p1ReachedTop || p2ReachedTop || (mode === "1v1" && (p1.score >= 1000 || p2.score >= 1000)))) {
      setPhase("result");
    }
  }, [p1.lockedCols, p2.lockedCols, p1.score, p2.score, phase, mode]);



  const restart = useCallback(() => {
    startingRef.current = false;
    setGameKey((k) => k + 1);
    setElapsedSeconds(0);
    setRemainingSeconds(GAME_TIME);
    setTotalCombos(0);
    launchedRef.current = false;
    setLaunched(false);
    setPhase("splash");
  }, []);

  // Winner logic varies by mode
  const winner: 0 | 1 | 2 =
    mode === "1p" ? 1 :
    mode === "1v1" && p1.lockedCols.some(Boolean) ? (p2.lockedCols.some(Boolean) ? 0 : 2) :
    mode === "1v1" && p2.lockedCols.some(Boolean) ? 1 :
    p1.score > p2.score ? 1 : p2.score > p1.score ? 2 : 0;

  if (phase === "mission") return <MissionDialog onComplete={beginCountdown} />;
  if (phase === "countdown") return <LaunchCountdown onComplete={beginGame} />;
  if (phase === "splash")
    return (
      <div style={{ width: "100vw", height: "calc(100dvh - var(--cockpit-height))", overflow: "hidden", position: "relative", paddingBottom: 46 }}>
        <SplashScreen
          onStart={(m) => {
            if (startingRef.current || !spendCredit(m)) return;
            startingRef.current = true;
            setMode(m);
            setElapsedSeconds(0);
            setRemainingSeconds(GAME_TIME);
            SFX.init();
            if ("speechSynthesis" in window) {
              window.speechSynthesis.cancel();
              const speech = new SpeechSynthesisUtterance(MISSION_SPEECH);
              speech.lang = "pt-BR";
              speech.rate = 1.15;
              speech.pitch = 1.15;
              window.speechSynthesis.speak(speech);
            }
            setPhase("mission");
          }}
        />
        <div className="controller-discovery" aria-live="polite">
          {controllers.map((name, index) => <span key={index} title={name}>J{index + 1}: {name ? `${/054c|dualshock|wireless controller|ps4/i.test(name) ? "PS4" : "CONTROLE"} conectado` : "Pressione X no controle para conectar"}</span>)}
        </div>
      </div>
    );
  if (phase === "result")
    return (
      <div style={{ width: "100vw", height: "calc(100dvh - var(--cockpit-height))", overflow: "hidden" }}>
        <ResultScreen
          winner={winner}
          mode={mode}
          launched={launched}

          p1Score={p1.score}

          p2Score={p2.score}

          totalCombos={totalCombos}
          collected={p1.collected + (mode === "1p" ? 0 : p2.collected)}
          onReplay={restart}
          onRestart={restart}
        />
      </div>
    );

  return (
    <div
      style={{
        width: "100vw",
        height: "calc(100dvh - var(--cockpit-height))",
        display: "flex",
        flexDirection: "column",
        background: "#284b86",
        overflow: "hidden",
        fontFamily: "Nunito,sans-serif",
      }}
    >
      <TopHUD
        attackEffects={mode === "1v1" ? [{ notice: p1.attackNotice, serial: p1.attackSerial }, { notice: p2.attackNotice, serial: p2.attackSerial }] : []}
        elapsedSeconds={elapsedSeconds}
        remainingSeconds={remainingSeconds}
        p1Combos={p1.combos}
        p2Combos={p2.combos}
        p1Score={p1.score}
        p2Score={p2.score}
        totalCombos={totalCombos}
        difficultyLevel={difficultyLevel}
        mode={mode}
      />
      <div className="controller-status" aria-live="polite">
        <span>J1 · {controllers[0] ? "CONTROLE 1 CONECTADO" : "TECLADO / TOQUE"}</span>
        {mode !== "1p" && <span>J2 · {controllers[1] ? "CONTROLE 2 CONECTADO" : "TECLADO / TOQUE"}</span>}
      </div>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <PlayerPanel st={p1} pNum={1} versus={mode === "1v1"} />
        {mode !== "1p" && <PlayerPanel st={p2} pNum={2} versus={mode === "1v1"} />}
      </div>
    </div>
  );
}
