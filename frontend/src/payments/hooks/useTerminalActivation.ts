import { useCallback, useState } from "react";

// Submits the same form the /api/terminal page accepts, but via fetch from
// inside the app — the browser still stores the Set-Cookie response header
// like any other same-origin request, so no full-page navigation is needed.
export function useTerminalActivation(onActivated: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const activate = useCallback(async (key: string) => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ key }),
      });
      if (!response.ok) {
        let message = "Chave de ativação inválida.";
        try { message = (await response.json()).message || message; } catch { /* non-JSON error body */ }
        throw new Error(message);
      }
      onActivated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível ativar o terminal. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }, [onActivated]);
  return { activate, busy, error };
}
