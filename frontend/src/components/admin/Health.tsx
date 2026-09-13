import { useEffect, useState } from "react";
import { request as paymentApi } from "../../shared/http";

type HealthView = {
  databaseOnline: boolean;
  mercadoPago: "online" | "offline" | "not_configured";
  lastWebhookAt: string | null;
  webhookConfigured: boolean;
};

const MP_LABEL: Record<HealthView["mercadoPago"], string> = {
  online: "● Online",
  offline: "● Offline",
  not_configured: "● Não configurado",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "Nunca recebido";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "agora mesmo";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `há ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 48) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)} dias`;
}

export function Health() {
  const [data, setData] = useState<HealthView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await paymentApi<HealthView>("/admin/health");
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };

    void load();
    const timer = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (error) return <p className="admin-error">{error}</p>;
  if (!data) return <p className="admin-loading">Carregando…</p>;

  const webhookStale =
    data.webhookConfigured &&
    (!data.lastWebhookAt || Date.now() - new Date(data.lastWebhookAt).getTime() > 24 * 3600_000);
  const allOk = data.databaseOnline && data.mercadoPago !== "offline" && !webhookStale;

  return (
    <div className="admin-overview">
      <div className="admin-card health-status">
        <strong className={allOk ? "is-ok" : "is-warn"}>
          {allOk ? "● Tudo OK" : "⚠ Requer atenção"}
        </strong>
      </div>

      <div className="admin-stat-grid">
        <div className="admin-stat">
          <span>BACKEND</span>
          <strong className="is-ok">● Online</strong>
        </div>
        <div className="admin-stat">
          <span>BANCO DE DADOS</span>
          <strong className={data.databaseOnline ? "is-ok" : "is-warn"}>
            {data.databaseOnline ? "● Online" : "● Offline"}
          </strong>
        </div>
        <div className="admin-stat">
          <span>MERCADO PAGO</span>
          <strong className={data.mercadoPago === "online" ? "is-ok" : "is-warn"}>
            {MP_LABEL[data.mercadoPago]}
          </strong>
        </div>
        <div className="admin-stat">
          <span>WEBHOOK</span>
          <strong className={webhookStale ? "is-warn" : "is-ok"}>
            {data.webhookConfigured ? (webhookStale ? "⚠ Atrasado" : "● Recebendo") : "● Não configurado"}
          </strong>
          <small>Último: {timeAgo(data.lastWebhookAt)}</small>
        </div>
      </div>

      {webhookStale && data.webhookConfigured && (
        <div className="admin-card health-alert">
          <strong>⚠ Webhook Mercado Pago</strong>
          <p>Última comunicação: {timeAgo(data.lastWebhookAt)}.</p>
        </div>
      )}
      {data.mercadoPago === "offline" && (
        <div className="admin-card health-alert">
          <strong>⚠ Mercado Pago inalcançável</strong>
          <p>A API do Mercado Pago não respondeu ao teste de conexão.</p>
        </div>
      )}

      <p className="admin-note">
        Não há como verificar CPU, RAM, áudio, display ou controles pelo navegador — isso exigiria
        um agente rodando no sistema operacional do totem, que não existe hoje. Esses checks
        mostram só o que este backend consegue confirmar de verdade.
      </p>
    </div>
  );
}

export default Health;
