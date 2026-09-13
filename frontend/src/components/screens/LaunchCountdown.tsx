import { useEffect, useState } from "react";
import { ProgramRocket } from "../controls/ProgramRocket";
export function LaunchCountdown({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const ts = [1, 2, 3].map((v) => setTimeout(() => setStep(v), v * 1000)),
      f = setTimeout(onComplete, 4000);
    return () => {
      ts.forEach(clearTimeout);
      clearTimeout(f);
    };
  }, [onComplete]);
  return (
    <div className="launch-screen" role="status" aria-live="assertive">
      <p>PREPARE-SE PARA DECOLAR!</p>
      <div className="launch-number">{["3", "2", "1", "GO!"][step]}</div>
      <span className="launch-rocket">
        <ProgramRocket />
      </span>
    </div>
  );
}
export default LaunchCountdown;
