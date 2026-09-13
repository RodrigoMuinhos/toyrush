import "./soloCompleteModal.css";

export function SoloCompleteModal({
  selection,
  onContinue,
  onLaunch,
}: {
  selection: "launch" | "continue";
  onContinue: () => void;
  onLaunch: () => void;
}) {
  return (
    <section
      className="solo-complete-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Missão concluída"
    >
      <div className="solo-complete-frame">
        <img
          className="solo-complete-art"
          src="/continue.png"
          alt="Parabéns! Você concluiu sua missão"
        />
        <div className="solo-complete-actions">
          <button
            className={`solo-launch-button ${selection === "launch" ? "is-selected" : ""}`}
            onClick={onLaunch}
          >
            🚀 LANÇAR FOGUETE
          </button>
          <button
            className={`solo-continue-button ${selection === "continue" ? "is-selected" : ""}`}
            onClick={onContinue}
          >
            🧱 CONTINUAR JOGANDO
          </button>
        </div>
      </div>
    </section>
  );
}

export default SoloCompleteModal;
