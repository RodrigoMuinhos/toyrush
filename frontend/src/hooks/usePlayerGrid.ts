import { calculateResolutionScore } from "../game/scoring";
import { useCallback, useEffect, useRef, useState } from "react";

import { COLS, ROWS, TYPES } from "../game/constants";

import {
  getLockedCols,
  initPS,
  removeCells,
  rndPT,
} from "../game/grid";

import { attackGravity, boardPaused, lockedAttackColumn, protectedCell, reversed, startAttack, tickAttack } from "../game/versusAttacks";
import type { Attack, PS, VersusAttack } from "../game/types";

import { riseBoard, getRowRiseInterval } from "../game/risingRows";

import { resolvePowerGears } from "../game/powerGears";

import { SFX, vibrate } from "../audio/sound";

export function usePlayerGrid(
  pNum: 1 | 2,

  active: boolean,

  speed: number,

  onCombo: (p: 1 | 2) => void,

  resetKey: number,
  elapsedSeconds: number,
  onActivity?: () => void,
) {
  const [st, setSt] = useState<PS>(initPS);
  const [queueRevision, setQueueRevision] = useState(0);
  const currentState = useRef(st);
  currentState.current = st;

  const attacks = useRef<Attack[]>([]);
  const versusQueue = useRef<VersusAttack[]>([]);

  const dropRef = useRef<(() => void) | undefined>(undefined);
  const turboRef = useRef<(() => void) | undefined>(undefined);
  const comboRef = useRef(onCombo);
  const activityRef = useRef(onActivity);

  comboRef.current = onCombo;
  activityRef.current = onActivity;

  useEffect(() => {
    attacks.current = [];
    versusQueue.current = [];

    setSt(initPS());
  }, [resetKey]);

  // Queue each timed rise until a falling piece or combo has finished resolving.
  useEffect(() => {
    if (!active || st.phase !== "idle" || st.toppedOut || boardPaused(st) || lockedAttackColumn(st) !== undefined || Object.values(st.frozen).some(until => until > Date.now())) return;
    const interval = getRowRiseInterval(elapsedSeconds);
    if (st.rises - st.attackRises >= Math.floor(elapsedSeconds / interval)) return;
    SFX.risingWall();
    setSt((current) =>
      current.phase === "idle" && !boardPaused(current) && lockedAttackColumn(current) === undefined && !Object.values(current.frozen).some(until => until > Date.now()) ? riseBoard(current) : current,
    );
  }, [active, elapsedSeconds, st.phase, st.rises, st.attackRises, st.toppedOut, st.versusAttack, st.frozen]);

  const cascade = useCallback(
    () =>
      setSt((s) => {
        const blocked = s.grid.map((row, r) =>
          row.map((cell, c) =>
            protectedCell(s, r, c) ? null : cell,
          ),
        );

        const resolution = resolvePowerGears(blocked, s.lastPlaced);
        const matches = resolution.matches;

        if (!matches.size) {
          const lc = getLockedCols(s.grid);

          return {
            ...s,

            phase: "idle",
            lastPlaced: null,
            gearNotice: "",
            gearCreated: false,

            piece: s.nextPiece,

            nextPiece: rndPT(),

            fallRow: 0,

            lockedCols: lc,

            allLocked: lc.every(Boolean),

            comboStreak: 0,

            consecutive: s.comboStreak === 0 ? 0 : s.consecutive,
          };
        }

        const streak = s.comboStreak + 1,
          pieces = matches.size;

        const pts = calculateResolutionScore(resolution.matchSizes, resolution.powerPieces, streak);

        return {
          ...s,
          grid: s.grid.map((row, r) => row.map((cell, c) => resolution.grid[r][c] ?? cell)),
          lastPlaced: null,
          cellEffects: resolution.effects,
          powerSounds: resolution.powerSounds,
          effectDuration: resolution.duration,
          gearNotice: resolution.notice,
          gearCreated: resolution.createdCount > 0,
          comboSizes: resolution.comboSizes,

          explodingCells: matches,

          phase: "exploding",

          collected: s.collected + pieces,

          score: s.score + pts,

          combos: s.combos + 1,

          consecutive: s.consecutive + 1,

          comboStreak: streak,

          nextPiece: streak > 1 ? "fire" : s.nextPiece,

          scorePopup: { pts, streak, pieces, key: Date.now(), gears: resolution.createdGears },
        };
      }),

    [],
  );

  useEffect(() => {
    if (!active) return;

    if (st.phase === "exploding") {
      comboRef.current(pNum);

      if (!st.gearCreated && !st.powerSounds.length) SFX.combo();
      const stopPowerSounds = SFX.powerExplosions(st.powerSounds);

      vibrate([25, 20, 25]);

      const t = setTimeout(
        () =>
          setSt((s) => {
            const remaining = removeCells(s.grid, s.explodingCells),
              ng = attackGravity(remaining, s);

            return {
              ...s,

              grid: ng,

              frozen: s.frozen,

              explodingCells: new Set(),
              cellEffects: {},
              powerSounds: [],

              phase: "falling",

              lockedCols: getLockedCols(ng),
            };
          }),

        st.effectDuration,
      );

      return () => { clearTimeout(t); stopPowerSounds(); };
    }

    if (st.phase === "falling") {
      const t = setTimeout(cascade, 280);

      return () => clearTimeout(t);
    }
  }, [active, st.phase, st.effectDuration, st.gearCreated, st.powerSounds, cascade, pNum]);

  const turbo = useCallback(() => {
    SFX.init();

    setSt((s) => {
      if (
        s.phase !== "idle" || boardPaused(s) || lockedAttackColumn(s) === s.cursor ||
        s.allLocked ||
        s.lockedCols[s.cursor] ||
        s.grid[s.fallRow]?.[s.cursor] !== null
      )
        return s;

      let r = s.fallRow;

      while (r + 1 < ROWS && s.grid[r + 1][s.cursor] === null) r++;

      const ng = s.grid.map((row) => [...row]);

      if (ng[r][s.cursor] !== null) return s;
      ng[r][s.cursor] = s.piece;

      const lc = getLockedCols(ng);

      SFX.drop();

      return {
        ...s,

        grid: ng,
        lastPlaced: `${r},${s.cursor}`,

        phase: "falling",

        lockedCols: lc,

        allLocked: lc.every(Boolean),

        fallRow: 0,

        autoTimer: 0,

        comboStreak: 0,
      };
    });
  }, []);

  turboRef.current = turbo;

  const fillForTest = useCallback((combos: number, score = combos * 500) => {
    setSt((state) => ({
      ...state,
      combos: Math.max(state.combos, combos),
      score: Math.max(state.score, score),
    }));
  }, []);

  const movePiece = useCallback(() => {
    SFX.init();

    setSt((s) => {
      if (s.phase !== "idle" || boardPaused(s) || s.allLocked) return s;

      if (lockedAttackColumn(s) === s.cursor || s.lockedCols[s.cursor] || s.grid[s.fallRow]?.[s.cursor] !== null) {
        SFX.wrong();

        return s;
      }

      const r = s.fallRow + 1;

      if (r < ROWS && s.grid[r][s.cursor] === null) {
        SFX.drop();

        return { ...s, fallRow: r, autoTimer: 0 };
      }

      const ng = s.grid.map((row) => [...row]);

      if (ng[s.fallRow][s.cursor] !== null) return s;
      ng[s.fallRow][s.cursor] = s.piece;

      const lc = getLockedCols(ng);

      SFX.drop();

      return {
        ...s,

        grid: ng,
        lastPlaced: `${s.fallRow},${s.cursor}`,

        phase: "falling",

        lockedCols: lc,

        allLocked: lc.every(Boolean),

        autoTimer: 0,

        comboStreak: 0,
      };
    });
  }, []);

  dropRef.current = movePiece;
  const verticalMove = useCallback((direction: -1 | 1) => {
    if (!active) return;
    const invert = reversed(currentState.current);
    if ((invert ? -direction : direction) === 1) movePiece();
    else if (invert) setSt(s => {
      if (s.phase !== "idle" || boardPaused(s) || lockedAttackColumn(s) === s.cursor || s.fallRow === 0 || s.grid[s.fallRow-1][s.cursor] !== null) return s;
      return { ...s, fallRow: s.fallRow-1, autoTimer: 0 };
    });
  }, [active, movePiece]);

  const move = useCallback(
    (d: -1 | 1) => {
      if (!active) return;

      setSt((s) => {
        if (s.phase !== "idle" || boardPaused(s) || s.allLocked) return s;
        const cursor = Math.max(0, Math.min(COLS - 1, s.cursor + (reversed(s) ? -d : d)));
        if (lockedAttackColumn(s) === cursor || s.lockedCols[cursor] || s.grid[s.fallRow]?.[cursor] !== null) {
          SFX.wrong();
          return s;
        }
        return { ...s, cursor };
      });
    },

    [active],
  );

  useEffect(() => {
    if (!active) return;

    const keys =
      pNum === 1
        ? { l: "ArrowLeft", r: "ArrowRight", d: "ArrowDown", u: "ArrowUp" }
        : { l: "a", r: "d", d: "s", u: "w" };

    const fn = (e: KeyboardEvent) => {
      if (e.key !== keys.l && e.key !== keys.r && e.key !== keys.d && e.key !== keys.u) return;
      activityRef.current?.();
      if (e.key === keys.l || e.key === keys.r) move(e.key === keys.l ? -1 : 1);
      else if (reversed(currentState.current)) verticalMove(e.key === keys.d ? 1 : -1);
      else if (e.key === keys.d) turboRef.current?.();
    };

    window.addEventListener("keydown", fn);

    return () => window.removeEventListener("keydown", fn);
  }, [active, pNum, move, verticalMove]);

  useEffect(() => {
    if (!active) return;

    const id = setInterval(
      () =>
        setSt((s) => {
          if (s.phase !== "idle" || boardPaused(s) || s.allLocked) return s;

          const nt =
            s.autoTimer + speed * (1 + Math.floor(s.score / 5000) * 0.1);

          if (nt >= 1) {
            setTimeout(() => dropRef.current?.(), 0);

            return { ...s, autoTimer: 0 };
          }

          return { ...s, autoTimer: nt };
        }),

      40,
    );

    return () => clearInterval(id);
  }, [active, speed]);

  useEffect(() => {
    if (!active) return;

    const id = setInterval(() => {
      const pending = st.phase === "idle" ? attacks.current.shift() : undefined;

      if (!pending) return;

      setSt((s) => {
        const grid = s.grid.map((row) => [...row]);

        if (pending === "clear")
          grid.forEach((row, r) =>
            row.forEach((cell, c) => {
              if (cell && c !== s.cursor && Math.random() < 0.2)
                grid[r][c] = null;
            }),
          );

        if (pending === "extra")
          for (let r = ROWS - 1; r >= 0; r--) {
            const c = grid[r].findIndex((x) => !x);

            if (c >= 0) {
              grid[r][c] = TYPES[Math.floor(Math.random() * TYPES.length)];

              break;
            }
          }

        const lockedCols = getLockedCols(grid);

        return {
          ...s,

          grid,

          lockedCols,

          allLocked: lockedCols.every(Boolean),

          attackSerial: s.attackSerial + 1,

          attackNotice:
            pending === "clear"
              ? "RAIO! O caminho foi limpo"
              : pending === "extra"
                ? "SURPRESA! Uma peça extra"
                : pending === "charge"
                  ? "TURBO! Congelamentos removidos"
                  : "GELO! Uma peça congelada por 5s",
        };
      });
    }, 100);

    return () => clearInterval(id);
  }, [active, st.phase, st.frozen]);

  useEffect(() => {
    if (!st.attackNotice) return;

    const id = setTimeout(
      () => setSt((s) => ({ ...s, attackNotice: "" })),

      3000,
    );

    return () => clearTimeout(id);
  }, [st.attackNotice, st.attackSerial]);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setSt(current => {
        if (current.versusAttack) return tickAttack(current, Date.now());
        return current;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (!active || st.versusAttack || st.phase !== "idle" || st.toppedOut) return;
    const next = versusQueue.current.shift();
    if (next) setSt(current => ({ ...current, versusAttack: startAttack(next, Date.now()) }));
  }, [active, st.versusAttack, st.phase, st.toppedOut, st.autoTimer, queueRevision]);

  useEffect(() => {
    const attack = st.versusAttack;
    if (!active || !attack) return;
    if (attack.stage === "flight") SFX.shoot();
    else if (attack.stage === "warning") SFX.lowTimer();
    else if (attack.stage === "effect") {
      if (attack.kind === "risingRow") SFX.risingWall();
      else SFX.hit();
      vibrate([40, 20, 50]);
    } else if (attack.stage === "recovery") SFX.positive();
  }, [active, st.versusAttack?.id, st.versusAttack?.stage]);

  return {
    ...st,

    move,

    receiveAttack: (a: Attack) => attacks.current.push(a),
    receiveVersusAttack: (attack: VersusAttack) => { versusQueue.current.push(attack); setQueueRevision(value => value + 1); },
    verticalMove,

    drop: () => active && turbo(),
    softDrop: () => active && movePiece(),
    fillForTest,
  };
}

export default usePlayerGrid;
