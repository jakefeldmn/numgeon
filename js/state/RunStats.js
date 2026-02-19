// Run statistics — persistent across all runs via localStorage

const STATS_KEY = 'numgeon_stats';

const DEFAULT_STATS = {
  totalRuns: 0,
  wins: 0,
  losses: 0,
  highestFloor: 0,
  highestAct: 0,
  totalGoldEarned: 0,
  totalMonstersSlain: 0,
  totalExactHits: 0,
  highestComboMultiplier: 1,
  totalCombosTriggered: 0,
  highestAscension: 0,
  fastestWinTurns: Infinity,
};

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats:', e);
  }
}

export function getStats() {
  return loadStats();
}

export function recordRunStart() {
  const stats = loadStats();
  stats.totalRuns++;
  saveStats(stats);
}

export function recordWin(act, floor, goldEarned, ascension = 0) {
  const stats = loadStats();
  stats.wins++;
  stats.highestAct = Math.max(stats.highestAct, act);
  stats.highestFloor = Math.max(stats.highestFloor, floor);
  stats.totalGoldEarned += goldEarned;
  if (ascension > stats.highestAscension) stats.highestAscension = ascension;
  saveStats(stats);
}

export function recordLoss(act, floor, goldEarned) {
  const stats = loadStats();
  stats.losses++;
  stats.highestAct = Math.max(stats.highestAct, act);
  stats.highestFloor = Math.max(stats.highestFloor, floor);
  stats.totalGoldEarned += goldEarned;
  saveStats(stats);
}

export function recordMonsterKill() {
  const stats = loadStats();
  stats.totalMonstersSlain++;
  saveStats(stats);
}

export function recordExactHit() {
  const stats = loadStats();
  stats.totalExactHits++;
  saveStats(stats);
}

export function recordCombo(multiplier, comboCount) {
  const stats = loadStats();
  stats.totalCombosTriggered += comboCount;
  stats.highestComboMultiplier = Math.max(stats.highestComboMultiplier, multiplier);
  saveStats(stats);
}
