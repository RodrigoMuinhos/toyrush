import { PCONF } from "../../game/constants";
import { isGear } from "../../game/powerGears";
import type { PT } from "../../game/types";

export function FriendArt({ type }: { type: PT }) {
  return (
    <svg className="garden-friend" viewBox="0 0 100 100" aria-hidden="true">
      <g stroke="#303052" strokeWidth="3" strokeLinejoin="round">
        {isGear(type) && (
          <>
            <circle
              cx="50"
              cy="50"
              r="30"
              fill={PCONF[type].main}
            />
            {Array.from({ length: 8 }, (_, i) => (
              <rect
                key={i}
                x="46"
                y="8"
                width="8"
                height="18"
                rx="2"
                fill={PCONF[type].hi}
                transform={`rotate(${i * 45} 50 50)`}
              />
            ))}
            <circle cx="50" cy="56" r="24" fill={PCONF[type].hi} stroke="none" />
            <text x="50" y="34" textAnchor="middle" fontSize="16" stroke="none" fill="#fff">
              {type.includes("Freeze") ? "❄" : type.includes("Fire") ? "♨" : type === "gearBlast" ? "✦" : type === "gearCross" ? "+" : "★"}
            </text>
            {(type.includes("Freeze") || type.includes("Fire")) && <text x="50" y="91" textAnchor="middle" fontSize="16" stroke="none" fill="#fff">{type.endsWith("Column") ? "↕" : "↔"}</text>}
          </>
        )}
        {type === "cone" && (
          <>
            <path
              d="M20 47 14 8Q32 9 40 30M60 30Q72 9 86 8L80 47"
              fill="#f56565"
            />
            <path
              d="m20 18 6 28 9-13m30 0 9 13 6-28"
              fill="#ffe7ce"
              stroke="none"
            />
            <path
              d="M50 27Q76 26 84 53L94 62Q82 89 50 93 18 89 6 62L16 53Q24 26 50 27"
              fill="#f56565"
            />
            <path
              d="M10 63Q31 57 50 77 69 57 90 63 77 87 50 90 23 87 10 63"
              fill="#fff2d9"
              stroke="none"
            />
          </>
        )}
        {type === "win" && (
          <>
            <circle cx="23" cy="24" r="18" fill="#73caff" />
            <circle cx="77" cy="24" r="18" fill="#73caff" />
            <circle cx="23" cy="24" r="10" fill="#f5b7d3" stroke="none" />
            <circle cx="77" cy="24" r="10" fill="#f5b7d3" stroke="none" />
            <ellipse cx="50" cy="59" rx="39" ry="35" fill="#73caff" />
            <ellipse
              cx="50"
              cy="73"
              rx="24"
              ry="18"
              fill="#e9faff"
              stroke="none"
            />
          </>
        )}
        {type === "str" && (
          <>
            <circle cx="28" cy="26" r="20" fill="#80e945" />
            <circle cx="72" cy="26" r="20" fill="#80e945" />
            <ellipse cx="50" cy="60" rx="43" ry="34" fill="#80e945" />
            <ellipse
              cx="50"
              cy="77"
              rx="26"
              ry="14"
              fill="#d8ff94"
              stroke="none"
            />
          </>
        )}
        {type === "wL" && (
          <>
            {[0, 72, 144, 216, 288].map((angle) => (
              <ellipse
                key={angle}
                cx="50"
                cy="23"
                rx="17"
                ry="20"
                transform={`rotate(${angle} 50 50)`}
                fill="#ffad5c"
              />
            ))}
            <circle cx="50" cy="50" r="26" fill="#ffe878" />
          </>
        )}
        {type === "wR" && (
          <>
            <g className="friend-wings">
              <ellipse
                cx="27"
                cy="34"
                rx="21"
                ry="27"
                transform="rotate(-24 27 34)"
                fill="#c49aef"
              />
              <ellipse
                cx="73"
                cy="34"
                rx="21"
                ry="27"
                transform="rotate(24 73 34)"
                fill="#c49aef"
              />
              <ellipse cx="29" cy="73" rx="20" ry="19" fill="#c49aef" />
              <ellipse cx="71" cy="73" rx="20" ry="19" fill="#c49aef" />
              <ellipse
                cx="24"
                cy="32"
                rx="10"
                ry="15"
                fill="#f6c7ec"
                stroke="none"
              />
              <ellipse
                cx="76"
                cy="32"
                rx="10"
                ry="15"
                fill="#f6c7ec"
                stroke="none"
              />
              <circle cx="27" cy="74" r="9" fill="#f6c7ec" stroke="none" />
              <circle cx="73" cy="74" r="9" fill="#f6c7ec" stroke="none" />
            </g>
            <path
              d="M44 30Q43 18 37 17M56 30Q57 18 63 17"
              fill="none"
              strokeLinecap="round"
            />
            <ellipse cx="50" cy="57" rx="21" ry="30" fill="#ffe6a0" />
          </>
        )}
        {type === "bomb" && (
          <path
            d="m50 5 13 27 30 5-22 23 5 32-26-15-26 15 5-32L7 37l30-5Z"
            fill="#ffdc4c"
          />
        )}
        {type === "fire" && (
          <path d="M60 4 17 55h28L36 96l48-57H56Z" fill="#ffe650" />
        )}
      </g>
      <g
        className="friend-expression"
        transform={type === "wL" ? "translate(0 -10)" : undefined}
      >
        <g className="friend-eyes" fill="#303052">
          <ellipse cx={type === "wR" ? 42 : 35} cy="53" rx="3.5" ry="5" />
          <ellipse cx={type === "wR" ? 58 : 65} cy="53" rx="3.5" ry="5" />
        </g>
        <g fill="#ff8898" opacity=".7">
          <ellipse cx={type === "wR" ? 40 : 26} cy="65" rx="5" ry="3" />
          <ellipse cx={type === "wR" ? 60 : 74} cy="65" rx="5" ry="3" />
        </g>
        {(type === "cone" || type === "win") && (
          <path d="M44 63Q50 59 56 63L50 69Z" fill="#303052" />
        )}
        <path
          d="M44 72Q50 80 56 72"
          fill="none"
          stroke="#303052"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
