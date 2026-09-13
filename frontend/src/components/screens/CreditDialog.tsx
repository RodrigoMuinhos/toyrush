import { useCallback, useEffect, useRef, useState } from "react";
import { useGamepadConfirm } from "../../hooks/useGamepadConfirm";
import {
  paymentApi,
  type Balance,
  type Catalog,
  type PixSession,
} from "../../payments/api";
import { SFX } from "../../audio/sound";
import "./pixPayment.css";

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type PackageOption = {
  id: string;
  credits: number;
  amount: number;
};

const DEFAULT_PACKAGES: PackageOption[] = [
  { id: "pkg-2-5", credits: 2, amount: 5 },
  { id: "pkg-4-10", credits: 4, amount: 10 },
  { id: "pkg-6-15", credits: 6, amount: 15 },
];

export function CreditDialog({
  credits,
  onClose,
  onPaid,
  initialError = "",
}: {
  credits: number;
  onClose: () => void;
  onPaid: () => Promise<void>;
  initialError?: string;
}) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [session, setSession] = useState<PixSession | null>(null);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [countdown, setCountdown] = useState<number | null>(null);

  const requestId = useRef(crypto.randomUUID());
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const locked = useRef(false);
  const paidHandled = useRef(false);

  const remaining = session
    ? Math.max(0, Math.ceil((Date.parse(session.expiresAt) - now) / 1000))
    : 0;

  const expired =
    !!session &&
    !session.creditsReleased &&
    (remaining === 0 ||
      ["EXPIRED", "CANCELLED", "PAID_LATE"].includes(session.status));

  const packageOptions =
    catalog?.packages && catalog.packages.length > 0
      ? catalog.packages
      : DEFAULT_PACKAGES;

  const finish = useCallback(async () => {
    if (locked.current) return;

    locked.current = true;
    setBusy(true);
    setCountdown(null);

    try {
      if (sessionRef.current) {
        await paymentApi(`/payments/${sessionRef.current.sessionId}/close`, {});
      }
      await onPaid();
    } catch (e) {
      setError((e as Error).message);
      setCountdown(2);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, [onPaid]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const current = sessionRef.current;

        if (current) {
          const updated = await paymentApi<PixSession>(
            `/payments/${current.sessionId}/status`,
          );

          if (
            !cancelled &&
            sessionRef.current?.sessionId === current.sessionId
          ) {
            setSession(updated);
          }
        } else {
          const [options, balance] = await Promise.all([
            paymentApi<Catalog>("/payments/packages"),
            paymentApi<Balance>("/machine/balance"),
          ]);

          if (!cancelled) {
            setCatalog(options);

            if (balance.activePayment && !locked.current) {
              setSession(balance.activePayment);
            }
          }
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) timer = setTimeout(poll, 2000);
      }
    };

    void poll();
    const ticker = setInterval(() => setNow(Date.now()), 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(ticker);
    };
  }, []);

  useEffect(() => {
    if (selected > packageOptions.length - 1) {
      setSelected(0);
    }
  }, [packageOptions, selected]);

  useEffect(() => {
    if (!session?.creditsReleased || paidHandled.current) return;

    paidHandled.current = true;
    setError("");
    SFX.gearMagic();
    setCountdown(2);
  }, [session]);

  useEffect(() => {
    if (countdown === null) return;

    const timer = setTimeout(() => {
      if (countdown <= 1) void finish();
      else setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, finish]);

  const close = useCallback(async () => {
    if (locked.current) return;

    locked.current = true;
    setBusy(true);
    setCountdown(null);

    try {
      if (sessionRef.current) {
        await paymentApi(`/payments/${sessionRef.current.sessionId}/close`, {});
      }
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, [onClose]);

  const retry = useCallback(async () => {
    if (locked.current) return;

    locked.current = true;
    setBusy(true);

    try {
      if (sessionRef.current) {
        await paymentApi(`/payments/${sessionRef.current.sessionId}/close`, {});
      }

      sessionRef.current = null;
      setSession(null);
      requestId.current = crypto.randomUUID();
      paidHandled.current = false;
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, []);

  const create = useCallback(
    async (index = selected) => {
      const selectedPackage = packageOptions[index];
      if (locked.current || !selectedPackage || !catalog?.ready) return;

      locked.current = true;
      setBusy(true);
      setError("");

      try {
        const result = await paymentApi<PixSession>("/payments/pix", {
          requestId: requestId.current,
          packageId: selectedPackage.id,
        });

        sessionRef.current = result;
        setSession(result);
      } catch (e) {
        setError((e as Error).message);

        try {
          const balance = await paymentApi<Balance>("/machine/balance");
          if (balance.activePayment) {
            sessionRef.current = balance.activePayment;
            setSession(balance.activePayment);
          }
        } catch {
          // Preserva o requestId para retry idempotente.
        }
      } finally {
        locked.current = false;
        setBusy(false);
      }
    },
    [catalog?.ready, packageOptions, selected],
  );

  const confirm = useCallback(() => {
    if (locked.current || session?.creditsReleased) return;

    if (expired && session?.status !== "PAID_LATE") {
      void retry();
    } else if (!session) {
      void create();
    }
  }, [session, expired, retry, create]);

  useGamepadConfirm(confirm, true, close);

  const choose = useCallback(
    (direction: number) => {
      if (sessionRef.current || locked.current) return;

      const count = packageOptions.length || 1;
      setSelected((value) => (value + direction + count) % count);
      SFX.gearMagic?.();
    },
    [packageOptions],
  );

  useEffect(() => {
    let frame = 0;
    let held = false;

    const pollGamepad = () => {
      let direction = 0;

      for (const pad of Array.from(navigator.getGamepads?.() || [])) {
        if (!pad) continue;

        if (pad.buttons[14]?.pressed || pad.axes[0] < -0.6) direction = -1;
        else if (pad.buttons[15]?.pressed || pad.axes[0] > 0.6) direction = 1;
      }

      if (direction && !held) choose(direction);
      held = direction !== 0;
      frame = requestAnimationFrame(pollGamepad);
    };

    frame = requestAnimationFrame(pollGamepad);

    const key = (event: KeyboardEvent) => {
      if (event.repeat) return;

      if (
        ["ArrowLeft", "ArrowRight", "Enter", " ", "Escape"].includes(event.key)
      ) {
        event.preventDefault();
      }

      if (event.key === "ArrowLeft") choose(-1);
      else if (event.key === "ArrowRight") choose(1);
      else if (event.key === "Enter" || event.key === " ") confirm();
      else if (event.key === "Escape") void close();
    };

    window.addEventListener("keydown", key);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", key);
    };
  }, [choose, confirm, close]);

  return (
    <div className="credit-overlay pix-overlay">
      <section
        className={`pix-dialog ${session ? "pix-dialog--payment" : "pix-dialog--packages"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pix-title"
      >
        <div className="pix-content-panel">
          <h2 id="pix-title" className="pix-title">
            {session?.creditsReleased
              ? "Pagamento aprovado!"
              : expired
                ? "Pix encerrado"
                : "Pague com "}
            {!session && <span>Pix</span>}
          </h2>

          {!session && (
            <div className="pix-package-selection">

              <div
                className="pix-package-grid"
                role="listbox"
                aria-label="Pacotes de créditos"
              >
                {packageOptions.map((pack, index) => {
                  const isSelected = selected === index;

                  return (
                    <button
                      key={pack.id}
                      type="button"
                      className={`pix-package-card ${isSelected ? "is-selected" : ""}`}
                      disabled={busy || !catalog?.ready}
                      aria-selected={isSelected}
                      role="option"
                      onMouseEnter={() => setSelected(index)}
                      onFocus={() => setSelected(index)}
                      onClick={() => {
                        setSelected(index);
                        void create(index);
                      }}
                    >
                      <div
                        className={`pix-token-stack pix-token-stack--${index + 1}`}
                        aria-hidden="true"
                      >
                        {Array.from({ length: Math.min(index + 1, 3) }).map(
                          (_, tokenIndex) => (
                            <span key={tokenIndex} className="pix-token">
                              ★
                            </span>
                          ),
                        )}
                      </div>

                      <strong>{pack.credits} CRÉDITOS</strong>
                      <b>{money(pack.amount)}</b>

                      <span className="pix-selected-badge">
                        {isSelected ? "✓ SELECIONADO" : " "}
                      </span>
                    </button>
                  );
                })}
              </div>

              {busy && (
                <div className="pix-loading" aria-label="Gerando Pix">
                  <i />
                  <i />
                  <i />
                </div>
              )}

              {catalog && !catalog.ready && (
                <p className="pix-status-message" role="status">
                  Pagamento ainda não configurado. Procure o atendimento.
                </p>
              )}

              {!catalog && !error && (
                <p className="pix-status-message" role="status">
                  Carregando pacotes…
                </p>
              )}
            </div>
          )}

          {session?.creditsReleased ? (
            <div className="pix-success" role="status">
              <span className="pix-success__check" aria-hidden="true">
                ✓
              </span>
              <strong>+{session.credits} CRÉDITOS</strong>
              <p>SALDO</p>
              <b className="pix-countdown">{session.balance}</b>
              <p>PREPARE-SE!</p>
              <small>Voltando à seleção do jogo…</small>
            </div>
          ) : session && !expired ? (
            <div className="pix-payment-stage">
              <div className="pix-purchase-summary">
                {session.credits} CRÉDITOS · {money(session.amount)}
              </div>

              <div className="pix-qr-shell">
                {session.qrCodeBase64 ? (
                  <img
                    className="pix-qr"
                    src={`data:image/png;base64,${session.qrCodeBase64}`}
                    alt="QR Code Pix para pagar este pacote"
                  />
                ) : (
                  <div className="pix-qr-wait" role="status">
                    Preparando seu QR Code…
                  </div>
                )}
              </div>

              <strong className="pix-scan">ESCANEIE COM SEU CELULAR</strong>
              <p className="pix-waiting" role="status">
                AGUARDANDO PAGAMENTO
              </p>

              <div className="pix-loading" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>

              <div className="pix-time">
                {String(Math.floor(remaining / 60)).padStart(2, "0")}:
                {String(remaining % 60).padStart(2, "0")}
                <small> RESTANTE</small>
              </div>

              <p className="pix-help">Escaneie com o aplicativo do seu banco.</p>
            </div>
          ) : session ? (
            <div className="pix-expired">
              <p>
                {session.status === "PAID_LATE"
                  ? "Pagamento recebido fora da sessão. Procure o atendimento com esta referência."
                  : "O tempo desta sessão terminou. Se já pagou, aguarde a confirmação antes de gerar outro Pix."}
              </p>
              <small className="pix-reference">
                Referência: {session.sessionId}
              </small>

              {session.status !== "PAID_LATE" && (
                <button
                  className="pix-primary"
                  disabled={busy}
                  onClick={() => void retry()}
                >
                  GERAR NOVO PIX
                </button>
              )}
            </div>
          ) : null}

          {error && (
            <p className="pix-error" role="alert">
              {error}
            </p>
          )}

          <div className="pix-balance">
            Saldo: {session?.balance ?? credits} crédito(s)
          </div>

          {!session?.creditsReleased && (
            <button
              className="pix-back"
              disabled={busy}
              onClick={() => void close()}
            >
              <span className="pix-back__button">B</span>
              {session ? "B / Y CANCELAR" : "B / Y VOLTAR"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
