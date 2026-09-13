import { usePixPurchase } from "../hooks/usePixPurchase";
import { CreditPackageSelector } from "./CreditPackageSelector";
import { PixQrCode } from "./PixQrCode";
import { PaymentSuccess } from "./PaymentSuccess";
import { PaymentStatus } from "./PaymentStatus";
import "../pixPayment.css";

export function PixPurchaseModal({ credits, onClose, onPaid, initialError = "" }: {
  credits: number; onClose: () => void; onPaid: () => Promise<void>; initialError?: string;
}) {
  const flow = usePixPurchase(onClose, onPaid, initialError);
  const { session, stage } = flow;
  const title = stage === "APPROVED" ? "Pagamento aprovado!" : stage === "REVIEW" ? "Pagamento em conferência"
    : stage === "CANCELLED" ? "Pix cancelado" : stage === "REJECTED" ? "Pagamento rejeitado" : stage === "EXPIRED" ? "Pix expirado" : "Pague com";
  return <div className="credit-overlay pix-overlay">
    <section className={`pix-dialog ${session ? "pix-dialog--payment" : "pix-dialog--packages"}`} role="dialog" aria-modal="true" aria-labelledby="pix-title">
      <div className="pix-content-panel">
        <h2 id="pix-title" className="pix-title">{title}{(!stage || stage === "PENDING") && <> <span>Pix</span></>}</h2>
        {!session && <div className="pix-package-selection">
          <CreditPackageSelector packages={flow.packages} selected={flow.selected} disabled={flow.busy || !flow.catalog?.ready} onSelect={flow.setSelected} onBuy={flow.buy} />
          {flow.busy && <div className="pix-loading" aria-label="Gerando Pix"><i /><i /><i /></div>}
          {flow.catalog && !flow.catalog.ready && <p className="pix-status-message" role="status">Pagamento ainda não configurado. Procure o atendimento.</p>}
          {!flow.catalog && !flow.error && <p className="pix-status-message" role="status">Carregando pacotes…</p>}
        </div>}
        {session && stage === "APPROVED" && <PaymentSuccess session={session} />}
        {session && stage === "PENDING" && <PixQrCode session={session} remaining={flow.remaining} />}
        {session && stage && stage !== "PENDING" && stage !== "APPROVED" && <PaymentStatus session={session} stage={stage} busy={flow.busy} onRetry={flow.retry} />}
        {flow.error && <p className="pix-error" role="alert">{flow.error}</p>}
        {flow.error === "Terminal não ativado. Procure o atendimento." && <a href="/api/terminal">Ativar terminal (atendimento)</a>}
        <div className="pix-balance">Saldo: {session?.balance ?? flow.balance ?? credits} crédito(s)</div>
        {stage !== "APPROVED" && <button className="pix-back" disabled={flow.busy} onClick={flow.close}><span className="pix-back__button" aria-hidden="true">B</span>{session ? "B / Y CANCELAR" : "B / Y VOLTAR"}</button>}
        {!session && <p className="pix-help">◀ ▶ ESCOLHER PACOTE · A / X COMPRAR</p>}
      </div>
    </section>
  </div>;
}
