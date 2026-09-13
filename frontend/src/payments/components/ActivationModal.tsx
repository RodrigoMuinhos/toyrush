import { useState, type FormEvent } from "react";
import { useTerminalActivation } from "../hooks/useTerminalActivation";
import "../activation.css";

export function ActivationModal({ onActivated }: { onActivated: () => void }) {
  const [key, setKey] = useState("");
  const { activate, busy, error } = useTerminalActivation(onActivated);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!busy && key.trim()) void activate(key.trim());
  };
  return (
    <div className="credit-overlay activation-overlay">
      <form className="activation-dialog" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="activation-title">
        <h2 id="activation-title">Ativar terminal</h2>
        <p>Uso exclusivo do atendimento. Informe a chave de ativação deste terminal.</p>
        <input
          type="password" value={key} onChange={event => setKey(event.target.value)}
          placeholder="Chave de ativação" minLength={32} maxLength={256}
          autoComplete="off" autoFocus disabled={busy} required
        />
        {error && <p className="activation-error" role="alert">{error}</p>}
        <button type="submit" disabled={busy || !key.trim()}>{busy ? "Ativando…" : "Ativar"}</button>
      </form>
    </div>
  );
}
