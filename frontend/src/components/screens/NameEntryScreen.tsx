import { useEffect, useRef, useState } from "react";
import type { GameMode } from "../../game/types";
import { saveRanking } from "../../game/ranking";
import { isConfirmPressed, isBackPressed } from "../../game/gamepadButtons";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function NameEntryScreen({
  mode,
  score,
  winner,
  onSaved,
  onBack,
}: {
  mode: GameMode;
  score: number;
  winner: number | null;
  onSaved: () => void;
  onBack: () => void;
}) {
  const [letters, setLetters] = useState([0, 0, 0]);
  const [slot, setSlot] = useState(0);
  const previous = useRef({ x: 0, y: 0, confirm: true, back: true });

  const save = () => {
    saveRanking({
      name: letters.map((index) => LETTERS[index]).join(""),
      score,
      mode: mode === "1p" ? "SOLO" : mode === "coop" ? "COOP" : "1×1",
      date: new Date().toISOString(),
    });
    onSaved();
  };

  const move = (dx: -1 | 0 | 1, dy: -1 | 0 | 1) => {
    if (dy) {
      setLetters((current) => {
        const next = [...current];
        next[slot] = (next[slot] + dy + LETTERS.length) % LETTERS.length;
        return next;
      });
    }
    if (dx) setSlot((current) => (current + dx + 3) % 3);
  };

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") move(0, -1);
      else if (event.key === "ArrowDown") move(0, 1);
      else if (event.key === "ArrowLeft") move(-1, 0);
      else if (event.key === "ArrowRight") move(1, 0);
      else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (slot === 2) save();
        else setSlot((current) => current + 1);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });

  useEffect(() => {
    let frame = 0;
    const poll = () => {
      const pad = Array.from(navigator.getGamepads?.() ?? []).find(
        (item): item is Gamepad => !!item?.connected,
      );
      if (pad) {
        const axisX = pad.axes[0] ?? 0;
        const axisY = pad.axes[1] ?? 0;
        const x = pad.buttons[14]?.pressed
          ? -1
          : pad.buttons[15]?.pressed
            ? 1
            : Math.abs(axisX) > 0.45
              ? axisX < 0
                ? -1
                : 1
              : 0;
        const y = pad.buttons[12]?.pressed
          ? -1
          : pad.buttons[13]?.pressed
            ? 1
            : Math.abs(axisY) > 0.45
              ? axisY < 0
                ? -1
                : 1
              : 0;
        if (x && x !== previous.current.x) move(x, 0);
        if (y && y !== previous.current.y) move(0, y);
        const confirm = isConfirmPressed(pad);
        const back = isBackPressed(pad);
        if (back && !previous.current.back) {
          if (slot > 0) setSlot(current => current - 1);
          else onBack();
        } else if (confirm && !back && !previous.current.confirm) {
          if (slot === 2) save();
          else setSlot((current) => current + 1);
        }
        previous.current = { x, y, confirm, back };
      }
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  });

  return (
    <main className="name-entry-screen" aria-label="Digite seu nome">
      <section className="name-entry-modal">
        <img
          className="name-entry-record-art"
          src="/NR.png"
          alt="Novo recorde"
        />
        {winner !== null && (
          <p className="name-entry-winner">JOGADOR {winner} VENCEU!</p>
        )}
        <p className="name-entry-score">
          PONTUAÇÃO: {score.toLocaleString("pt-BR")}
        </p>
        <div className="name-lock" aria-label="Nome com três letras">
          {letters.map((letter, index) => (
            <button
              key={index}
              className={`name-letter ${slot === index ? "is-active" : ""}`}
              onClick={() => setSlot(index)}
              aria-label={`Letra ${LETTERS[letter]}`}
            >
              <strong>{LETTERS[letter]}</strong>
            </button>
          ))}
        </div>
        <p className="name-entry-hint">
          ▲▼ LETRA · ◀▶ POSIÇÃO · A / X CONFIRMA · B / Y VOLTA
        </p>
      </section>
      <button className="name-entry-save" onClick={save}>
        SALVAR RECORDE
      </button>
    </main>
  );
}

export default NameEntryScreen;
