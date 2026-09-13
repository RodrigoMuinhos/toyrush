import { FriendArt } from "./FriendArt";
import "./friends.css";
import type { PT } from "../../game/types";
import { PCONF } from "../../game/constants";
export function Piece3D({
  type,
  size = 40,
  exploding = false,
  dimmed = false,
  explosionDelay = 0,
}: {
  type: PT;
  size?: number;
  exploding?: boolean;
  dimmed?: boolean;
  explosionDelay?: number;
}) {
  const p = PCONF[type];
  return (
    <div
      className={`garden-piece garden-${type}`}
      role="img"
      aria-label={p.label}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        opacity: dimmed ? 0.35 : 1,
        animation: exploding ? `piece-explode .5s ease-out ${explosionDelay}ms forwards` : undefined,
      }}
    >
      <FriendArt type={type} />
    </div>
  );
}
export default Piece3D;
