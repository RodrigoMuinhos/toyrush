import { useCallback, useEffect, useRef, useState } from "react";
export function MissionDialog({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(1),
    done = useRef(false);
  const finish = useCallback(() => {
    if (!done.current) {
      done.current = true;
      onComplete();
    }
  }, [onComplete]);
  useEffect(() => {
    const a = setTimeout(() => setVisible(2), 1500),
      b = setTimeout(() => setVisible(3), 3000),
      c = setTimeout(finish, 5000);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(c);
    };
  }, [finish]);
  return (
    <div className="story-stack-stage">
      <div
        className="story-stack"
        role="dialog"
        aria-modal="true"
        aria-label="História da missão em três atos"
      >
        {[1, 2, 3].map((n, i) => (
          <div
            key={n}
            className={`story-stack-panel ${i < visible ? "is-revealed" : ""}`}
          >
            <img src={`/ato${n}.png`} alt={`Ato ${n}`} draggable={false} />
          </div>
        ))}
        <button className="story-stack-skip is-selected" onClick={finish}>
          PULAR INTRODUÇÃO
        </button>
      </div>
    </div>
  );
}
export default MissionDialog;
