import type { CSSProperties } from "react";
import { ATTACKS, attackLevel } from "../../game/versusAttacks";
import type { AttackState } from "../../game/types";
import "./versusAttacks.css";

export function AttackFlights({ attacks }: { attacks: (AttackState | null)[] }) {
  return <div className="attack-flight-layer" aria-live="polite">{attacks.filter(a=>a?.stage === "flight").map(a => a && <div key={a.id} className={`versus-projectile from-player-${a.from}`} style={{ "--attack-color": ATTACKS[a.kind].color } as CSSProperties}>
    <strong>{ATTACKS[a.kind].icon}</strong><span>J{a.from} · {a.size >= 7 ? "SUPER ATAQUE" : a.size === 6 ? "ATAQUE FORTE" : "POWER ATTACK"}</span>
  </div>)}</div>;
}
export function AttackOverlay({ attack }: { attack: AttackState | null }) {
  if (!attack || attack.stage === "flight") return null;
  const info = ATTACKS[attack.kind];
  return <div className={`versus-overlay attack-${attack.kind} stage-${attack.stage}`} style={{ "--attack-color": info.color, "--attack-strength": attackLevel(attack.size) } as CSSProperties}>
    <div className="versus-attack-label" role="status"><b>{info.icon} {attack.stage === "recovery" ? "LIBERADO!" : attack.stage === "warning" ? `ALERTA · ${info.label}` : info.label}</b><small>ATAQUE DO J{attack.from}{attack.stage === "effect" && attack.remaining > 700 ? ` · ${(attack.remaining/1000).toFixed(1)}s` : ""}</small></div>
    {attack.kind === "boardFreeze" && attack.stage !== "warning" && <div className="board-ice"><span>❄</span><strong>{attack.stage === "recovery" ? "CRACK!" : Math.ceil(attack.remaining / 1000)}</strong><span>❄</span></div>}
    {attack.kind === "reverse" && <div className="reverse-arrows">← ↔ →<br />↑ ↕ ↓</div>}
    {attack.kind === "fog" && <div className="board-fog"><i /><i /><i /></div>}
    {attack.kind === "risingRow" && <div className="row-attack-warning">↑ ↑ ↑ ↑ ↑</div>}
  </div>;
}
