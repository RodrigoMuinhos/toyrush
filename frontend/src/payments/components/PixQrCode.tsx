import type { PixSession } from "../types";
export function PixQrCode({ session, remaining }: { session: PixSession; remaining: number }) {
  return <div className="pix-payment-stage">
    <div className="pix-purchase-summary">{session.credits} CRÉDITOS · {session.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
    <div className="pix-qr-shell">
      {session.qrCodeBase64 ? <img className="pix-qr" src={`data:image/png;base64,${session.qrCodeBase64}`} alt="QR Code Pix para pagar este pacote" />
        : <div className="pix-qr-wait" role="status">Preparando seu QR Code…</div>}
    </div>
    <strong className="pix-scan">ESCANEIE COM SEU CELULAR</strong>
    <p className="pix-waiting" role="status">AGUARDANDO PAGAMENTO</p>
    <div className="pix-loading" aria-hidden="true"><i /><i /><i /></div>
    <div className="pix-time">{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}<small> RESTANTE</small></div>
    <p className="pix-help">Escaneie com o aplicativo do seu banco.</p>
  </div>;
}
