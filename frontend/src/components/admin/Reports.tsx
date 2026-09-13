import { useEffect, useMemo, useState } from "react";
import { request as paymentApi } from "../../shared/http";

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d: Date) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

type ReportsView = {
  from: string;
  to: string;
  revenue: number;
  previousRevenue: number;
  paymentsByStatus: Record<string, number>;
  paymentsTotal: number;
  sessionsTotal: number;
  sessionsByMode: Record<string, number>;
  creditsSold: number;
  creditsConsumed: number;
  creditsBalance: number;
  ticketMedio: number;
  packages: { credits: number; amount: number; sales: number; revenue: number }[];
  daily: { date: string; revenue: number; sessions: number }[];
};

type Preset = "today" | "week" | "month" | "quarter" | "year" | "custom";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
  { id: "quarter", label: "Trimestre" },
  { id: "year", label: "Ano" },
  { id: "custom", label: "Personalizado" },
];

const MODE_LABEL: Record<string, string> = { "1p": "1 Jogador", coop: "Cooperativo", "1v1": "1 × 1" };

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}
function rangeFor(preset: Preset, customFrom: string, customTo: string): { from: Date; to: Date } | null {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfToday(now) };
    case "week": {
      const day = (now.getDay() + 6) % 7; // Monday = 0
      const from = new Date(now);
      from.setDate(now.getDate() - day);
      return { from: startOfDay(from), to: endOfToday(now) };
    }
    case "month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfToday(now) };
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return { from: new Date(now.getFullYear(), q * 3, 1), to: endOfToday(now) };
    }
    case "year":
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfToday(now) };
    case "custom":
      if (!customFrom || !customTo) return null;
      return { from: new Date(`${customFrom}T00:00:00`), to: new Date(`${customTo}T23:59:59`) };
  }
}

export function Reports() {
  const [preset, setPreset] = useState<Preset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<ReportsView | null>(null);
  const [error, setError] = useState("");

  const range = useMemo(() => rangeFor(preset, customFrom, customTo), [preset, customFrom, customTo]);

  useEffect(() => {
    if (!range) return;
    let cancelled = false;
    setError("");

    (async () => {
      try {
        const q = `from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}`;
        const result = await paymentApi<ReportsView>(`/admin/reports?${q}`);
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [range]);

  const variation =
    data && data.previousRevenue > 0
      ? ((data.revenue - data.previousRevenue) / data.previousRevenue) * 100
      : null;

  const maxDaily = data ? Math.max(1, ...data.daily.map((d) => d.revenue)) : 1;

  return (
    <div className="admin-overview">
      <div className="reports-filter">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            className={`reports-filter__pill ${preset === p.id ? "is-active" : ""}`}
            onClick={() => setPreset(p.id)}
          >
            {p.label}
          </button>
        ))}
        {preset === "custom" && (
          <span className="reports-filter__custom">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span>até</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </span>
        )}
        {range && (
          <span className="reports-filter__range">
            {fmtDate(range.from)} até {fmtDate(range.to)}
          </span>
        )}
      </div>

      {error ? (
        <p className="admin-error">{error}</p>
      ) : preset === "custom" && !range ? (
        <p className="admin-loading">Escolha as duas datas para ver o período personalizado.</p>
      ) : !data ? (
        <p className="admin-loading">Carregando…</p>
      ) : (
        <>
          <div className="admin-stat-grid">
            <div className="admin-stat">
              <span>FATURAMENTO</span>
              <strong>{money(data.revenue)}</strong>
              {variation !== null && (
                <small className={variation >= 0 ? "is-ok" : "is-warn"}>
                  {variation >= 0 ? "▲" : "▼"} {Math.abs(variation).toFixed(1)}% vs período anterior
                </small>
              )}
            </div>
            <div className="admin-stat">
              <span>PAGAMENTOS</span>
              <strong>{data.paymentsTotal}</strong>
              <small>{data.paymentsByStatus.CREDITS_RELEASED ?? 0} aprovados</small>
            </div>
            <div className="admin-stat">
              <span>SESSÕES</span>
              <strong>{data.sessionsTotal}</strong>
            </div>
            <div className="admin-stat">
              <span>TICKET MÉDIO</span>
              <strong>{money(data.ticketMedio)}</strong>
            </div>
            <div className="admin-stat">
              <span>CRÉDITOS VENDIDOS</span>
              <strong>{data.creditsSold}</strong>
            </div>
            <div className="admin-stat">
              <span>CRÉDITOS CONSUMIDOS</span>
              <strong>{data.creditsConsumed}</strong>
            </div>
            <div className="admin-stat">
              <span>SALDO ATUAL</span>
              <strong>{data.creditsBalance}</strong>
            </div>
          </div>

          <div className="admin-card">
            <h3>Faturamento por dia</h3>
            {data.daily.length === 0 ? (
              <p className="admin-note">Nenhum pagamento aprovado neste período.</p>
            ) : (
              <div className="reports-bars">
                {data.daily.map((d) => (
                  <div key={d.date} className="reports-bars__col" title={`${d.date}: ${money(d.revenue)} · ${d.sessions} sessão(ões)`}>
                    <div className="reports-bars__bar" style={{ height: `${(d.revenue / maxDaily) * 100}%` }} />
                    <span>{d.date.slice(8, 10)}/{d.date.slice(5, 7)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="reports-grid-2">
            <div className="admin-card">
              <h3>Pacotes mais vendidos</h3>
              {data.packages.length === 0 ? (
                <p className="admin-note">Nenhuma venda neste período.</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Pacote</th>
                      <th>Vendas</th>
                      <th>Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.packages.map((p) => (
                      <tr key={`${p.credits}-${p.amount}`}>
                        <td>{p.credits} créditos</td>
                        <td>{p.sales}</td>
                        <td>{money(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="admin-card">
              <h3>Modos de jogo</h3>
              {Object.keys(data.sessionsByMode).length === 0 ? (
                <p className="admin-note">Nenhuma sessão neste período.</p>
              ) : (
                <ul className="reports-list">
                  {Object.entries(data.sessionsByMode).map(([mode, count]) => (
                    <li key={mode}>
                      <span>{MODE_LABEL[mode] ?? mode}</span>
                      <strong>{count}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="admin-card">
            <h3>Pagamentos por status</h3>
            <ul className="reports-list">
              {Object.entries(data.paymentsByStatus).map(([status, count]) => (
                <li key={status}>
                  <span>{status}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          </div>

          <p className="admin-note">
            Créditos são uma carteira única da máquina (não ligados a um pagamento específico), então
            "vendidos × consumidos" é a conciliação correta — não existe rastreio 1 pagamento = 1 sessão.
          </p>
        </>
      )}
    </div>
  );
}

export default Reports;
