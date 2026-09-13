import type { PackageOption } from "../types";

function TokenIcon({ count }: { count: number }) {
  return <div className={`pix-token-stack pix-token-stack--${count}`} aria-hidden="true">
    {Array.from({ length: count }, (_, i) => <span key={i} className="pix-token">★</span>)}
  </div>;
}
export function CreditPackageSelector({ packages, selected, disabled, onSelect, onBuy }: {
  packages: PackageOption[]; selected: number; disabled: boolean;
  onSelect: (index: number) => void; onBuy: (index: number) => void;
}) {
  return <div className="pix-package-grid" role="listbox" aria-label="Pacotes de créditos">
    {packages.map((pack, index) => <button key={pack.id} type="button" role="option"
      className={`pix-package-card ${selected === index ? "is-selected" : ""}`}
      disabled={disabled} aria-selected={selected === index}
      onMouseEnter={() => onSelect(index)} onFocus={() => onSelect(index)} onClick={() => onBuy(index)}>
      <TokenIcon count={Math.min(index + 1, 3)} />
      <strong>{pack.credits} CRÉDITOS</strong>
      <b>{pack.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b>
      <span className="pix-selected-badge">{selected === index ? "✓ SELECIONADO" : " "}</span>
    </button>)}
  </div>;
}
