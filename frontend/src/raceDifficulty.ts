export function raceDifficulty(
  score: number,
  elapsed: number,
  boostedAt: number | null,
) {
  const baseSpeed = 2.1 + Math.floor((boostedAt ?? elapsed) / 30) * 0.55;
  const steps =
    boostedAt === null ? 0 : Math.floor(Math.max(0, elapsed - boostedAt) / 20);
  const boosted = score > 1000;
  const multiplier = boosted ? 2 * (1 + steps * 0.24) : 1;
  const spawnChance = boosted
    ? Math.min(0.82, 0.18 * (1 + steps * 0.16))
    : 0.075;
  return {
    speed: baseSpeed * multiplier,
    spawnChance,
    centerBias: boosted ? Math.min(0.82, 0.48 + steps * 0.06) : 0.2,
  };
}

export function crossesPlayer(from: number, to: number, player: number) {
  return from < player + 8 && to > player - 8;
}
