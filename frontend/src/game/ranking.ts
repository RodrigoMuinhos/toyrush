export type RankingEntry = {
  name: string;
  score: number;
  mode: string;
  date: string;
};

const STORAGE_KEY = "toy-factory-rush-ranking";

export function readRanking(): RankingEntry[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveRanking(entry: RankingEntry) {
  const next = [...readRanking(), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 7);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
