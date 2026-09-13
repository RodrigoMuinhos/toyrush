import { useCallback, useEffect, useRef, useState } from "react";
import { request as paymentApi, HttpError as PaymentError } from "../../shared/http";
import type { Balance, Catalog } from "../../payments/types";
import { Reports } from "./Reports";
import { Health } from "./Health";
import "./adminPanel.css";

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type TabId =
  | "overview"
  | "audit"
  | "usage"
  | "financial"
  | "library"
  | "sessions"
  | "payments"
  | "health"
  | "settings";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Visão geral" },
  { id: "audit", label: "Auditoria fiscal" },
  { id: "usage", label: "Relatórios e indicadores" },
  { id: "financial", label: "Financeiro" },
  { id: "library", label: "Biblioteca de jogos" },
  { id: "sessions", label: "Sessões / partidas" },
  { id: "payments", label: "Pagamentos" },
  { id: "health", label: "Saúde do totem" },
  { id: "settings", label: "Configurações" },
];

const TAB_ICONS: Record<TabId, string> = { overview: "▦", audit: "▤", usage: "▥", financial: "$", library: "▣", sessions: "▷", payments: "▱", health: "♡", settings: "⚙" };
const TAB_DESCRIPTIONS: Record<TabId, string> = {
  overview: "Acompanhe a máquina, os créditos e a operação em um só lugar.",
  usage: "Visão financeira, comercial e operacional da Toy Factory.",
  health: "Conectividade e disponibilidade dos serviços do totem.",
  audit: "Conferência e rastreabilidade das transações.", financial: "Gestão financeira da operação.",
  library: "Organização dos jogos da sua máquina.", sessions: "Acompanhamento das partidas do totem.",
  payments: "Acompanhamento das cobranças e recebimentos Pix.", settings: "Preferências e configuração da operação.",
};

const PLACEHOLDER_COPY: Record<Exclude<TabId, "overview" | "usage" | "health">, string> = {
  audit:
    "Registro imutável de cada transação (pagamento × crédito × partida), com detecção de divergências entre pagamentos aprovados e sessões liberadas.",
  financial:
    "Fechamento diário e mensal, split de consignação (empresa × evento) e exportação para prestação de contas.",
  library:
    "Jogos instalados no totem, versão, status e receita gerada por jogo.",
  sessions:
    "Histórico de partidas (session_id, modo, duração, créditos usados, pontuação, status).",
  payments:
    "Lista completa de pagamentos Pix com status (aprovado, pendente, cancelado, expirado, estornado).",
  settings:
    "Ajustes operacionais do totem (chave da máquina, sessão, catálogo) — hoje configurados via variáveis de ambiente do backend.",
};

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");

  const [balance, setBalance] = useState<Balance | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [overviewError, setOverviewError] = useState("");

  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    pinInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submitPin = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (busy) return;

      setBusy(true);
      setPinError("");

      try {
        await paymentApi<{ ok: boolean }>("/admin/verify-pin", { pin });
        setUnlocked(true);
      } catch (e) {
        setPinError(
          e instanceof PaymentError && e.status === 401
            ? "PIN incorreto."
            : (e as Error).message,
        );
        setPin("");
        pinInputRef.current?.focus();
      } finally {
        setBusy(false);
      }
    },
    [pin, busy],
  );

  useEffect(() => {
    if (!unlocked) return;
    let cancelled = false;

    (async () => {
      try {
        const [b, c] = await Promise.all([
          paymentApi<Balance>("/machine/balance"),
          paymentApi<Catalog & { machineId: string }>("/payments/packages"),
        ]);
        if (!cancelled) {
          setBalance(b);
          setCatalog(c);
        }
      } catch (e) {
        if (!cancelled) setOverviewError((e as Error).message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [unlocked]);

  if (!unlocked) {
    return (
      <div className="admin-overlay" role="dialog" aria-modal="true" aria-label="Central de controle">
        <div className="admin-lock-screen">
          <button className="admin-panel__close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
          <form className="admin-pin-gate" onSubmit={submitPin}>
            <span className="admin-lock-screen__brand">⚙ CENTRAL DE CONTROLE</span>
            <label htmlFor="admin-pin">PIN administrativo</label>
            <input
              id="admin-pin"
              ref={pinInputRef}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              disabled={busy}
              onChange={(e) => setPin(e.target.value)}
            />
            {pinError && (
              <p className="admin-pin-gate__error" role="alert">
                {pinError}
              </p>
            )}
            <button type="submit" disabled={busy || !pin}>
              {busy ? "Verificando…" : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeTab = TABS.find((t) => t.id === tab)!;

  return (
    <div className="admin-overlay" role="dialog" aria-modal="true" aria-label="Central de controle">
      <div className="admin-panel">
        <aside className="admin-sidebar">
          <div className="admin-sidebar__brand">
            <span className="admin-sidebar__logo">⚙</span>
            <div className="admin-sidebar__brand-text">
              <strong>TOY FACTORY</strong>
              {balance && <small>Central de controle · {balance.machineId}</small>}
            </div>
            <button className="admin-panel__close" onClick={onClose} aria-label="Fechar">
              ✕
            </button>
          </div>

          <span className="admin-sidebar__section">GESTÃO DA OPERAÇÃO</span>
          <nav className="admin-tabs" aria-label="Seções administrativas">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`admin-tabs__item ${tab === t.id ? "is-active" : ""}`}
                aria-current={tab === t.id ? "page" : undefined}
                onClick={() => setTab(t.id)}
              >
                <span className="admin-tabs__icon" aria-hidden="true">{TAB_ICONS[t.id]}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
          <div className="admin-sidebar__footer">Da diversão à gestão,<br />toda a operação em um só lugar.</div>
        </aside>

        <main className="admin-main">
          <div className="admin-section-bar"><span>{activeTab.label}</span><small>{balance?.machineId ?? "TOY FACTORY"}</small></div>
          <header className="admin-main__header">
            <span className="admin-main__eyebrow">TOY FACTORY · OPERAÇÃO</span>
            <h1>{activeTab.label}</h1>
            <p className="admin-main__subtitle">{TAB_DESCRIPTIONS[tab]}</p>
          </header>

          <div className="admin-content">
            {tab === "overview" ? (
              overviewError ? (
                <p className="admin-error">{overviewError}</p>
              ) : !balance || !catalog ? (
                <p className="admin-loading">Carregando…</p>
              ) : (
                <div className="admin-overview">
                  <div className="admin-stat-grid">
                    <div className="admin-stat">
                      <span>MÁQUINA</span>
                      <strong>{balance.machineId}</strong>
                    </div>
                    <div className="admin-stat">
                      <span>STATUS</span>
                      <strong className={catalog.ready ? "is-ok" : "is-warn"}>
                        {catalog.ready ? "● Pronto" : "● Não configurado"}
                      </strong>
                    </div>
                    <div className="admin-stat">
                      <span>SALDO ATUAL</span>
                      <strong>{balance.credits} crédito(s)</strong>
                    </div>
                    <div className="admin-stat">
                      <span>COBRANÇA ATIVA</span>
                      <strong>
                        {balance.activePayment
                          ? `${balance.activePayment.status} · ${money(balance.activePayment.amount)}`
                          : "Nenhuma"}
                      </strong>
                    </div>
                  </div>

                  <div className="admin-card">
                    <h3>Catálogo configurado</h3>
                    <p className="admin-card__description">Pacotes disponíveis para compra na máquina.</p>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Créditos</th>
                          <th>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catalog.packages.map((p) => (
                          <tr key={p.id}>
                            <td>{p.id}</td>
                            <td>{p.credits}</td>
                            <td>{money(p.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="admin-note">
                    Os demais módulos (auditoria fiscal, financeiro etc.) ainda não foram
                    implementados — veja Relatórios e indicadores para dados reais de uso.
                  </p>
                </div>
              )
            ) : tab === "usage" ? (
              <Reports />
            ) : tab === "health" ? (
              <Health />
            ) : (
              <div className="admin-card admin-placeholder">
                <p>{PLACEHOLDER_COPY[tab]}</p>
                <span className="admin-placeholder__badge">Em breve</span>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminPanel;
