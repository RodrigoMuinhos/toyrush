import { officialScore, VERSUS_SCORE_TO_WIN } from "../game/scoring";
import { chooseAttack } from "../game/versusAttacks";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  SFX,
  startPuzzleMusic,
  startRaceMusic,
  stopRaceMusic,
  vibrate,
} from "../audio/sound";
import {
  COOP_COMBOS_TO_WIN,
  BASE_SPEED,
  DIFFICULTY_STEP_SECONDS,
  SOLO_COMBOS_TO_WIN,
  VERSUS_COMBOS_TO_WIN,
} from "../game/constants";
import type { Flight, GameMode, ControllerPhase } from "../game/types";
import { usePlayerGrid } from "../hooks/usePlayerGrid";
import { useGameControllers } from "../hooks/useGameControllers";
import { dropPiece, findMatches } from "../game/grid";

type GamePhase = Exclude<ControllerPhase, "idle" | "exploding" | "falling">;
export type MenuSelection = "play" | "ranking" | "credits" | "1p" | "coop" | "1v1";
export function useGameSession({
  onFlightChange,
  spendCredit,
  onBuyCredits,
  controllerEnabled = true,
}: {
  onFlightChange: (flight: Flight) => void;
  spendCredit: (mode: GameMode) => Promise<boolean>;
  controllerEnabled?: boolean;
  onBuyCredits: () => void;
}) {
  const startingRef = useRef(false);
  const [phase, setPhase] = useState<GamePhase>("splash");
  const [mode, setMode] = useState<GameMode>("coop");
  const [menuSelection, setMenuSelection] = useState<MenuSelection>("play");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalCombos, setTotalCombos] = useState(0);
  const [coopActions, setCoopActions] = useState<[number, number]>([0, 0]);
  const [coopCombos, setCoopCombos] = useState(0);
  const [comboSequence, setComboSequence] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const [launched, setLaunched] = useState(false);
  const [raceWon, setRaceWon] = useState<boolean | null>(null);
  const [raceWinner, setRaceWinner] = useState<number | null>(null);
  const [coopPowers, setCoopPowers] = useState(0);
  const powersAwarded = useRef(0);
  const timedAttack = useRef(0);
  const launchedRef = useRef(false);
  const soloCompleteShown = useRef(false);
  const playerActivity = useRef([0, 0]);
  const aiRef = useRef([false, false]);
  const humanRef = useRef([false, false]);
  const aiStartAt = useRef(0);
  const [aiPlayers, setAiPlayers] = useState([false, false]);
  const [roundStarted, setRoundStarted] = useState(false);
  const [roundReady, setRoundReady] = useState(false);
  const onCombo = useCallback(
    (player: 1 | 2) => {
      setComboSequence((value) => value + 1);
      if (mode !== "coop") {
        setTotalCombos((value) => value + 1);
        return;
      }
      setCoopActions((current) => {
        const next: [number, number] = [...current] as [number, number];
        next[player - 1] = Math.min(2, next[player - 1] + 1);
        if (next[0] >= 2 && next[1] >= 2) {
          setCoopCombos((value) => value + 1);
          setTotalCombos((value) => value + 1);
          return [0, 0];
        }
        return next;
      });
    },
    [mode],
  );
  const difficultyLevel = Math.floor(elapsedSeconds / DIFFICULTY_STEP_SECONDS);
  const soloDifficultyLevel = mode === "1p" ? Math.floor(totalCombos / 10) : 0;
  const speed =
    BASE_SPEED *
    (mode === "1p" ? 0.85 : mode === "1v1" ? 1.15 : 1) *
    (1 + difficultyLevel * 0.28) *
    (mode === "1p" ? 1 + soloDifficultyLevel * 0.35 : 1);
  const p1 = usePlayerGrid(
    1,
    phase === "game" && roundStarted,
    speed,
    onCombo,
    gameKey,
    elapsedSeconds,
  );
  const p2 = usePlayerGrid(
    2,
    phase === "game" && roundStarted && mode !== "1p",
    speed,
    onCombo,
    gameKey,
    elapsedSeconds,
  );
  const playersRef = useRef([p1, p2]);
  playersRef.current = [p1, p2];
  const markPlayerActivity = useCallback(
    (player: number) => {
      if (player < 2) {
        if (!roundReady) return;
        setRoundStarted(true);
        playerActivity.current[player] = Date.now();
        humanRef.current[player] = true;
        if (aiRef.current[player]) {
          aiRef.current[player] = false;
          setAiPlayers([...aiRef.current]);
        }
      }
    },
    [roundReady],
  );
  const beginRound = useCallback(() => {
    setRoundReady(true);
    setRoundStarted(true);
  }, []);
  useEffect(() => {
    if (phase !== "game" || mode === "1p") {
      aiStartAt.current = 0;
      return;
    }
    if (!aiStartAt.current) {
      aiStartAt.current = Date.now();
      playerActivity.current = [aiStartAt.current, aiStartAt.current];
      aiRef.current = [false, false];
      humanRef.current = [false, false];
      setAiPlayers([false, false]);
    }
    const ai = window.setInterval(() => {
      const now = Date.now();
      playersRef.current.forEach((player, index) => {
        if (
          humanRef.current[index] ||
          now - aiStartAt.current < 10000 ||
          player.toppedOut
        )
          return;
        if (!aiRef.current[index]) {
          aiRef.current[index] = true;
          setRoundStarted(true);
          setAiPlayers([...aiRef.current]);
        }
        const heights = player.grid[0].map((_, column) => {
          const top = player.grid.findIndex((row) => row[column] !== null);
          return top < 0 ? 0 : player.grid.length - top;
        });
        const candidates = heights.map((height, column) => {
          if (player.lockedCols[column]) return { column, value: -Infinity };
          const preview = dropPiece(player.grid, column, player.piece);
          const matches = preview ? findMatches(preview).size : 0;
          let potential = 0;
          if (preview) {
            for (let row = 0; row < preview.length; row++) {
              for (let start = 0; start <= preview[row].length - 4; start++) {
                const window = preview[row].slice(start, start + 4);
                if (
                  window.includes(player.piece) &&
                  window.every((cell) => !cell || cell === player.piece)
                ) {
                  const same = window.filter(
                    (cell) => cell === player.piece,
                  ).length;
                  if (same >= 3) potential += same * same;
                }
              }
            }
            for (let col = 0; col < preview[0].length; col++) {
              for (let start = 0; start <= preview.length - 4; start++) {
                const window = preview
                  .slice(start, start + 4)
                  .map((row) => row[col]);
                if (
                  window.includes(player.piece) &&
                  window.every((cell) => !cell || cell === player.piece)
                ) {
                  const same = window.filter(
                    (cell) => cell === player.piece,
                  ).length;
                  if (same >= 3) potential += same * same;
                }
              }
            }
          }
          const centerBonus = 2 - Math.abs(2 - column);
          const topPenalty = height > 9 ? (height - 9) * 16 : 0;
          return {
            column,
            value:
              matches * 1000 +
              potential * 70 -
              height * 4 -
              topPenalty +
              centerBonus,
          };
        });
        const target =
          candidates.sort((a, b) => b.value - a.value)[0]?.column ??
          player.cursor;
        if (player.cursor !== target)
          player.move(player.cursor < target ? 1 : -1);
        else player.drop();
      });
    }, 700);
    return () => window.clearInterval(ai);
  }, [mode, phase, roundStarted]);
  useEffect(() => {
    if (phase === "race") startRaceMusic(Math.min(1, elapsedSeconds / 120));
    else if (
      ["splash", "mission", "countdown", "game", "ready"].includes(phase)
    )
      startPuzzleMusic();
    else stopRaceMusic();
    return () => {
      if (phase === "splash" || phase === "result") stopRaceMusic();
    };
  }, [phase, elapsedSeconds]);
  useEffect(() => {
    if (phase !== "game" || !roundStarted) return;
    const timer = window.setInterval(
      () => setElapsedSeconds((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [phase, roundStarted]);

  useEffect(() => {
    const fillCombosForTest = (event: KeyboardEvent) => {
      if (event.key !== "F5" || event.repeat || phase !== "game") return;
      event.preventDefault();
      if (mode === "1p") {
        p1.fillForTest(SOLO_COMBOS_TO_WIN);
        setTotalCombos(SOLO_COMBOS_TO_WIN);
      } else if (mode === "coop") {
        p1.fillForTest(COOP_COMBOS_TO_WIN / 2);
        p2.fillForTest(COOP_COMBOS_TO_WIN / 2);
        setCoopCombos(COOP_COMBOS_TO_WIN);
        setTotalCombos(COOP_COMBOS_TO_WIN);
      } else {
        p1.fillForTest(VERSUS_COMBOS_TO_WIN, VERSUS_SCORE_TO_WIN);
        setTotalCombos(VERSUS_COMBOS_TO_WIN);
      }
      setComboSequence((value) => Math.max(value, COOP_COMBOS_TO_WIN));
    };
    window.addEventListener("keydown", fillCombosForTest);
    return () => window.removeEventListener("keydown", fillCombosForTest);
  }, [mode, p1, p2, phase, gameKey]);
  const beginRace = useCallback(() => setPhase("race"), []);
  const beginGame = useCallback(() => {
    setRoundReady(false);
    setRoundStarted(false);
    setPhase("game");
  }, []);
  const beginCountdown = useCallback(() => setPhase("countdown"), []);
  const restart = useCallback(() => {
    startingRef.current = false;
    launchedRef.current = false;
    soloCompleteShown.current = false;
    powersAwarded.current = 0;
    timedAttack.current = 0;
    setGameKey((value) => value + 1);
    setElapsedSeconds(0);
    setTotalCombos(0);
    setCoopActions([0, 0]);
    setCoopCombos(0);
    setComboSequence(0);
    setLaunched(false);
    setRaceWon(null);
    setRaceWinner(null);
    setCoopPowers(0);
    setRoundStarted(false);
    setPhase("splash");
  }, []);
  const startGame = useCallback(
    async (selectedMode: GameMode) => {
      if (startingRef.current) return;
      startingRef.current = true;
      if (!(await spendCredit(selectedMode))) {
        startingRef.current = false;
        return;
      }
      setMode(selectedMode);
      setElapsedSeconds(0);
      SFX.init();
      setPhase("mission");
    },
    [spendCredit],
  );
  const showRanking = useCallback(() => {
    setMenuSelection("ranking");
    setPhase("ranking");
  }, []);
  const selectMenuMode = useCallback(
    (direction: -1 | 1) => {
      if (phase === "splash") {
        const options: MenuSelection[] = [
          "play",
          "ranking",
          "credits",
          "1p",
          "coop",
          "1v1",
        ];
        setMenuSelection((current) => {
          const index = Math.max(0, options.indexOf(current));
          const next =
            options[(index + direction + options.length) % options.length];
          if (next === "1p" || next === "coop" || next === "1v1") setMode(next);
          return next;
        });
        return;
      }
      if (phase === "ranking") setPhase("splash");
    },
    [phase],
  );
  const confirm = useCallback(() => {
    SFX.positive();
    if (phase === "splash") {
      if (menuSelection === "ranking") showRanking();
      else if (menuSelection === "credits") onBuyCredits();
      else startGame(mode);
    } else if (phase === "mission") beginGame();
    else if (phase === "ranking") restart();
    else if (phase === "result") restart();
  }, [beginGame, showRanking, onBuyCredits, mode, phase, menuSelection, restart, startGame]);
  const back = useCallback(() => {
    if (phase === "splash") setMenuSelection("play");
    else if (phase === "soloComplete") setPhase("game");
    else if (["ranking", "result", "modeSelect", "mission"].includes(phase)) restart();
  }, [phase, restart]);
  const controllers = useGameControllers(
    [p1, p2],
    mode !== "1p",
    phase,
    selectMenuMode,
    confirm,
    markPlayerActivity,
    controllerEnabled,
    back,
  );
  const sentCombos = useRef([0, 0]);
  useEffect(() => {
    sentCombos.current = [0, 0];
  }, [gameKey]);
  useEffect(() => {
    if (phase !== "game" || mode !== "1v1") return;
    [p1, p2].forEach((player, index) => {
      if (player.combos <= sentCombos.current[index]) return;
      sentCombos.current[index] = player.combos;
      player.comboSizes.forEach((size, comboIndex) => {
        (index ? p1 : p2).receiveVersusAttack(chooseAttack(size, index === 0 ? 1 : 2, `${gameKey}-${index}-${player.combos}-${comboIndex}`));
      });
    });
  }, [mode, p1, p2, phase, gameKey]);
  useEffect(() => {
    if (phase !== "game" || mode !== "coop") return;
    const completed = Math.floor(coopCombos / 2);
    if (completed <= powersAwarded.current) return;
    const count = completed - powersAwarded.current;
    powersAwarded.current = completed;
    setCoopPowers((value) => value + count);
    for (let i = 0; i < count; i++) {
      p1.receiveAttack("clear");
      p2.receiveAttack("clear");
      if ((completed - count + i + 1) % 2 === 0) {
        p1.receiveAttack("charge");
        p2.receiveAttack("charge");
      }
    }
    vibrate([45, 25, 45, 25, 80]);
  }, [coopCombos, mode, p1, p2, phase]);
  useEffect(() => {
    if (
      phase !== "game" ||
      mode !== "coop" ||
      elapsedSeconds < 30 ||
      elapsedSeconds % 30 ||
      timedAttack.current === elapsedSeconds
    )
      return;
    timedAttack.current = elapsedSeconds;
    p1.receiveAttack("freeze");
    p2.receiveAttack("freeze");
    vibrate([90, 40, 90]);
  }, [elapsedSeconds, mode, p1, p2, phase]);
  useEffect(() => {
    const attacks =
      phase === "game" && mode !== "1p"
        ? [
            p1.attackNotice && `J1: ${p1.attackNotice}`,
            p2.attackNotice && `J2: ${p2.attackNotice}`,
          ]
            .filter(Boolean)
            .join(" · ")
        : "";
    onFlightChange({
      score: officialScore(mode, p1.score, p2.score),
      combos:
        mode === "coop"
          ? p1.combos + p2.combos
          : mode === "1v1"
            ? Math.max(p1.combos, p2.combos)
            : totalCombos,
      mode,
      phase,
      attacks,
      p1Actions: coopActions[0],
      p2Actions: coopActions[1],
      comboSequence,
      elapsedSeconds,
    });
  }, [
    comboSequence,
    coopActions,
    coopCombos,
    mode,
    onFlightChange,
    elapsedSeconds,
    p1.score,
    p1.combos,
    p1.attackNotice,
    p2.score,
    p2.combos,
    p2.attackNotice,
    phase,
    totalCombos,
  ]);
  useEffect(() => {
    if (phase !== "game") return;
    if (mode === "1v1" && Math.max(p1.score, p2.score) >= VERSUS_SCORE_TO_WIN) {
      if (p1.phase === "exploding" || p2.phase === "exploding") return;
      setPhase("nameEntry");
      return;
    }
    if (p1.toppedOut || (mode !== "1p" && p2.toppedOut)) {
      setPhase("gameOver");
      return;
    }
  }, [
    elapsedSeconds,
    mode,
    p1.phase,
    p1.toppedOut,
    p1.score,
    p2.score,
    p2.phase,
    p2.toppedOut,
    phase,
  ]);
  return {
    phase,
    mode,
    menuSelection,
    setMode,
    setPhase,
    p1,
    p2,
    launched,
    raceWon,
    raceWinner,
    totalCombos,
    controllers,
    startGame,
    showRanking,
    restart,
    beginGame,
    beginRound,
    completeNameEntry: () => setPhase("result"),
    elapsedSeconds,
    coopActions,
    comboSequence,
    coopCombos,
    difficultyLevel,
    coopPowers,
    aiPlayers,
  };
}
