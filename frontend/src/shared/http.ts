export class HttpError extends Error {
  public status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
// Exact message the /api/terminal gateway returns when the activation cookie is
// missing or invalid — the one case where the fix is entering the activation
// code again, not "try later".
const TERMINAL_NOT_ACTIVATED = "Terminal não ativado. Procure o atendimento.";
export function isTerminalNotActivated(error: unknown): boolean {
  return error instanceof HttpError && error.status === 401 && error.message === TERMINAL_NOT_ACTIVATED;
}
export async function request<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: body === undefined ? "GET" : "POST", cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000),
    });
  } catch { throw new HttpError("Sem conexão com o pagamento. Aguarde e tente novamente.", 0); }
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new HttpError("A API de pagamentos não retornou JSON. Verifique o proxy /api da implantação.", response.status);
  }
  const data = await response.json();
  if (!response.ok) throw new HttpError(data.message || "Pagamento indisponível. Tente novamente.", response.status);
  return data as T;
}
