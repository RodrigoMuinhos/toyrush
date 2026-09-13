import type { GameType } from "../../game/types";

export function GameTypeSelectScreen({
  selection,
  onConfirm,
}: {
  selection: GameType;
  onConfirm: (type?: GameType) => void;
}) {
  const options = [
    {
      id: "story" as const,
      title: "MODO HISTÓRIA",
      description: "Monte os blocos e lance o foguete na aventura.",
      icon: "📚✨",
    },
    {
      id: "wave" as const,
      title: "MODO WAVE",
      description: "Enfrente ondas cada vez mais intensas de inimigos.",
      icon: "🚀⚡",
    },
  ];

  return (
    <main className="game-type-select" aria-label="Escolha o modo de jogo">
      <div className="game-type-panel">
        <p className="game-type-kicker">ESCOLHA SUA MISSÃO</p>
        <h1>COMO VOCÊ QUER JOGAR?</h1>
        <div className="game-type-options">
          {options.map((option) => (
            <button
              key={option.id}
              className={`game-type-option ${selection === option.id ? "is-selected" : ""}`}
              onClick={() => onConfirm(option.id)}
              aria-pressed={selection === option.id}
            >
              <span className="game-type-icon" aria-hidden="true">
                {option.icon}
              </span>
              <strong>{option.title}</strong>
              <small>{option.description}</small>
            </button>
          ))}
        </div>
        <p className="game-type-hint">
          DIRECIONAL PARA ESCOLHER · BOTÃO PARA CONFIRMAR
        </p>
      </div>
    </main>
  );
}

export default GameTypeSelectScreen;
