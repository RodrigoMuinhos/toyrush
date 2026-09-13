import type { PixSession } from "../types";
export function PaymentSuccess({ session }: { session: PixSession }) {
  return <div className="pix-success" role="status">
    <span className="pix-success__check">✓</span><strong>+{session.credits} CRÉDITOS</strong>
    <p>SALDO</p><b className="pix-countdown">{session.balance}</b>
    <p>PREPARE-SE!</p><small>Voltando à seleção do jogo…</small>
  </div>;
}
