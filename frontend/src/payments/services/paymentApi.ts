import { request } from "../../shared/http";
import type { Balance, Catalog, PixSession } from "../types";
export const paymentApi = {
  catalog: async () => {
    const catalog = await request<Catalog>("/payments/packages");
    if (typeof catalog.ready !== "boolean" || !Array.isArray(catalog.packages)) throw new Error("Catálogo de pagamentos inválido. Verifique a API.");
    return catalog;
  },
  balance: () => request<Balance>("/machine/balance"),
  create: (requestId: string, packageId: string) => request<PixSession>("/payments/pix", { requestId, packageId }),
  status: (id: string) => request<PixSession>(`/payments/${id}/status`),
  close: (id: string) => request<PixSession>(`/payments/${id}/close`, {}),
};
