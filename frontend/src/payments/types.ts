export type PixSession = {
  sessionId: string; paymentId: string | null; status: string;
  qrCode: string | null; qrCodeBase64: string | null; expiresAt: string;
  credits: number; amount: number; creditsReleased: boolean; autoStartAllowed: boolean; balance: number;
};
export type Balance = { machineId: string; credits: number; activePayment: PixSession | null };
export type Catalog = { ready: boolean; configurationIssues?: string[]; packages: { id: string; credits: number; amount: number }[] };
export type PackageOption = Catalog["packages"][number];
export type PaymentStage = "PENDING" | "APPROVED" | "EXPIRED" | "CANCELLED" | "REJECTED" | "REVIEW";
export function paymentStage(session: PixSession, remaining: number): PaymentStage {
  if (session.creditsReleased) return "APPROVED";
  if (session.status === "PAID_LATE") return "REVIEW";
  if (session.status === "CANCELLED") return "CANCELLED";
  if (session.status === "REJECTED") return "REJECTED";
  if (session.status === "EXPIRED" || remaining <= 0) return "EXPIRED";
  return "PENDING";
}
