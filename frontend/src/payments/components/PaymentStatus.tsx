import type { PaymentStage, PixSession } from "../types";
const messages: Partial<Record<PaymentStage, string>> = {
  REVIEW: "Pagamento recebido fora da sessão. Procure o atendimento com esta referência.",
  EXPIRED: "O tempo desta sessão terminou. Se já pagou, procure o atendimento antes de gerar outro Pix.",
  CANCELLED: "Esta cobrança foi cancelada.",
  REJECTED: "O pagamento não foi aprovado. Você pode tentar novamente.",
};
export function PaymentStatus({ session, stage, busy, onRetry }: {
  session: PixSession; stage: PaymentStage; busy: boolean; onRetry: () => void;
}) {
  return <div className="pix-expired" role="status">
    <p>{messages[stage]}</p><small className="pix-reference">Referência: {session.sessionId}</small>
    {stage !== "REVIEW" && <button className="pix-primary" disabled={busy} onClick={onRetry}>ESCOLHER PACOTE NOVAMENTE</button>}
  </div>;
}
