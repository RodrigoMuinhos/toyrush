import { officialScore } from "./scoring";
import { PlayerPanel } from "../components/puzzle/PlayerPanel";
import { AttackFlights } from "../components/puzzle/VersusAttackVisuals";
import { TopHUD } from "../components/hud/TopHUD";
import { SplashScreen } from "../components/screens/SplashScreen";
import { MissionDialog } from "../components/screens/MissionDialog";
import { ResultScreen } from "../components/screens/ResultScreen";
import { RankingScreen } from "../components/screens/RankingScreen";
import { NameEntryScreen } from "../components/screens/NameEntryScreen";
import { GameOverSplash } from "../components/screens/GameOverSplash";

import type { Flight, GameMode } from "./types";

import { useGameSession } from "../hooks/useGameSession";
import { useEffect, useRef, useState } from "react";

export function GameApp(props: {
  onFlightChange: (flight: Flight) => void;
  spendCredit: (mode: GameMode) => Promise<boolean>;
  credits: number;
  onBuyCredits: () => void;
  controllerEnabled?: boolean;
}) {
  const {
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
    completeNameEntry,
    elapsedSeconds,
    coopActions,
    comboSequence,
    coopCombos,
    difficultyLevel,
    coopPowers,
    aiPlayers,
  } = useGameSession(props);
  const showGameOver = () => setPhase("nameEntry");
  const [countdownValue, setCountdownValue] = useState<number | undefined>();
  useEffect(() => {
    if (phase !== "game") {
      setCountdownValue(undefined);
      return;
    }
    setCountdownValue(undefined);
    const timers = [
      window.setTimeout(() => setCountdownValue(3), 500),
      window.setTimeout(() => setCountdownValue(2), 1000),
      window.setTimeout(() => setCountdownValue(1), 1500),
      window.setTimeout(() => setCountdownValue(0), 2000),
      window.setTimeout(() => setCountdownValue(undefined), 2500),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [mode, phase]);
  const announcedStart = useRef(false);
  useEffect(() => {
    if (phase !== "game") {
      announcedStart.current = false;
      return;
    }
    if (announcedStart.current || elapsedSeconds !== 0) return;
    announcedStart.current = true;
    const speech = window.speechSynthesis;
    if (!speech) return;
    const words = ["Três", "Dois", "Um", "Vai"];
    let index = 0;
    let started = false;
    const getFemaleVoice = () => {
      const voices = speech.getVoices();
      return (
        voices.find(
          (voice) =>
            /pt-BR|pt-PT/i.test(voice.lang) &&
            /female|woman|zira|luciana|maria/i.test(voice.name),
        ) ??
        voices.find((voice) => /pt-BR|pt-PT/i.test(voice.lang)) ??
        voices.find((voice) =>
          /female|woman|zira|luciana|maria/i.test(voice.name),
        )
      );
    };
    const speakNext = () => {
      if (index >= words.length) return;
      const utterance = new SpeechSynthesisUtterance(words[index++]);
      const female = getFemaleVoice();
      if (female) utterance.voice = female;
      utterance.lang = female?.lang ?? "pt-BR";
      utterance.volume = 1;
      utterance.rate = 6.8;
      utterance.pitch = 1.35;
      utterance.onend = speakNext;
      speech.speak(utterance);
    };
    const startSpeech = () => {
      if (started) return;
      started = true;
      speech.cancel();
      speech.resume();
      speakNext();
    };
    speech.addEventListener("voiceschanged", startSpeech, { once: true });
    const timer = window.setTimeout(startSpeech, 500);
    const fallback = window.setTimeout(startSpeech, 1200);
    const release = window.setTimeout(beginRound, 2500);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(fallback);
      window.clearTimeout(release);
      speech.removeEventListener("voiceschanged", startSpeech);
      speech.cancel();
    };
  }, [beginRound, mode, phase]);

  if (phase === "mission") return <MissionDialog onComplete={beginGame} />;
  if (phase === "ranking") return <RankingScreen onBack={restart} />;
  if (phase === "nameEntry") {
    // Same winner formula ResultScreen uses below, so both screens agree.
    const scoreWinner =
      mode === "1v1" && p1.score !== p2.score ? (p1.score > p2.score ? 1 : 2) : null;
    return (
      <NameEntryScreen
        mode={mode}
        score={officialScore(mode, p1.score, p2.score)}
        winner={mode === "1v1" ? (scoreWinner ?? raceWinner) : null}
        onSaved={completeNameEntry}
        onBack={completeNameEntry}
      />
    );
  }
  if (phase === "gameOver") return <GameOverSplash onComplete={showGameOver} />;
  if (phase === "result")
    return (
      <ResultScreen
        mode={mode}
        launched={launched}
        raceWon={raceWon}
        raceWinner={raceWinner}
        p1Score={p1.score}
        p2Score={p2.score}
        totalCombos={p1.combos + (mode === "1p" ? 0 : p2.combos)}
        collected={p1.collected + (mode === "1p" ? 0 : p2.collected)}
        onRestart={restart}
      />
    );
  if (phase === "splash")
    return (
      <div
        className="app-shell-splash"
        style={{
          width: "100vw",
          height: "calc(100dvh - var(--cockpit-height))",
          overflow: "hidden",
          position: "relative",
          paddingBottom: 46,
        }}
      >
        <SplashScreen
          mode={mode}
          selection={menuSelection}
          onModeChange={setMode}
          onStart={startGame}
          onRanking={showRanking}
          onBuyCredits={props.onBuyCredits}
          enabled={props.controllerEnabled !== false}
          credits={props.credits}
        />
        <div className="controller-discovery" aria-live="polite">
          {controllers.map((name, index) => (
            <span key={index}>
              J{index + 1}:{" "}
              {name
                ? "CONTROLE conectado"
                : "Pressione X no controle para conectar"}
            </span>
          ))}
        </div>
      </div>
    );
  return (
    <div
      className="brick-game-screen"
      style={{
        width: "100vw",
        height: "calc(100dvh - var(--cockpit-height))",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "Nunito,sans-serif",
      }}
    >
      <TopHUD
        comboEffects={
          mode === "1p" ? [p1.scorePopup] : [p1.scorePopup, p2.scorePopup]
        }
        attackEffects={
          mode !== "1p"
            ? [
                { notice: p1.attackNotice, serial: p1.attackSerial },
                { notice: p2.attackNotice, serial: p2.attackSerial },
              ]
            : []
        }
        elapsedSeconds={elapsedSeconds}
        p1Combos={p1.combos}
        p2Combos={p2.combos}
        p1Actions={coopActions[0]}
        p2Actions={coopActions[1]}
        comboSequence={comboSequence}
        coopStatus={Math.floor(coopCombos / 3)}
        coopComboProgress={coopCombos % 3}
        p1Score={p1.score}
        p2Score={p2.score}
        totalCombos={p1.combos + (mode === "1p" ? 0 : p2.combos)}
        difficultyLevel={difficultyLevel}
        powerCharges={coopPowers}
        mode={mode}
      />
      <div className="controller-status">
        <span>
          J1 · {controllers[0] ? "CONTROLE 1 CONECTADO" : "TECLADO / TOQUE"}
        </span>
        {mode !== "1p" && (
          <span>
            J2 · {controllers[1] ? "CONTROLE 2 CONECTADO" : "TECLADO / TOQUE"}
          </span>
        )}
      </div>
      <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative" }}>
        {mode === "1v1" && <AttackFlights attacks={[p1.versusAttack, p2.versusAttack]} />}
        <PlayerPanel
          st={p1}
          pNum={1}
          solo={mode === "1p"}
          versus={mode === "1v1"}
          startCountdown={countdownValue}
          isAI={aiPlayers[0]}
        />
        {mode !== "1p" && (
          <PlayerPanel
            st={p2}
            pNum={2}
            versus={mode === "1v1"}
            startCountdown={countdownValue}
            isAI={aiPlayers[1]}
          />
        )}
      </div>
    </div>
  );
}
