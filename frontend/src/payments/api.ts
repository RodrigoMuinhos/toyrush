export type PixSession = {
  sessionId: string; paymentId: string | null; status: string;
  qrCode: string | null; qrCodeBase64: string | null; expiresAt: string;
  credits: number; amount: number; creditsReleased: boolean; autoStartAllowed: boolean; balance: number;
};
export type Balance = { machineId: string; credits: number; activePayment: PixSession | null };
export type Catalog = { ready: boolean; packages: { id: string; credits: number; amount: number }[] };
export class PaymentError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function paymentApi<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: body === undefined ? "GET" : "POST", cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000),
    });
  } catch { throw new PaymentError("Sem conexão com o pagamento. Aguarde e tente novamente.", 0); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new PaymentError(data.message || "Pagamento indisponível. Tente novamente.", response.status);
  return data as T;
}
