// Meta-progression — unlock system based on lifetime stats.
// Loadouts, operators, and relics unlock as players hit milestones.
// Uses RunStats data to derive what's unlocked — no separate storage needed.

import { getStats } from './RunStats.js';

// Milestone definitions: each has a condition check and what it unlocks
const MILESTONES = [
  {
    id: 'first_run',
    name: 'First Steps',
    description: 'Complete your first run (win or lose)',
    check: (stats) => stats.totalRuns >= 1,
    unlocks: { loadout: 'naturalist' },
  },
  {
    id: 'act2_reached',
    name: 'Deep Delver',
    description: 'Reach Act 2',
    check: (stats) => stats.highestAct >= 2,
    unlocks: { loadout: 'architect' },
  },
  {
    id: 'first_win',
    name: 'Conqueror',
    description: 'Win a run',
    check: (stats) => stats.wins >= 1,
    unlocks: { loadout: 'chaos' },
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Win 3 runs',
    check: (stats) => stats.wins >= 3,
    unlocks: { loadout: 'minimalist' },
  },
  {
    id: 'marksman',
    name: 'Marksman',
    description: 'Land 25 exact hits (lifetime)',
    check: (stats) => stats.totalExactHits >= 25,
    unlocks: { loadout: 'gambler' },
  },
];

// Check which milestones are complete
export function getCompletedMilestones() {
  const stats = getStats();
  return MILESTONES.filter(m => m.check(stats)).map(m => m.id);
}

// Check if a specific loadout is unlocked
export function isLoadoutUnlocked(loadoutId) {
  // Standard is always unlocked
  if (loadoutId === 'standard') return true;

  const completed = getCompletedMilestones();
  return MILESTONES.some(m => m.unlocks.loadout === loadoutId && completed.includes(m.id));
}

// Get the unlock requirement text for a locked loadout
export function getLoadoutUnlockHint(loadoutId) {
  const milestone = MILESTONES.find(m => m.unlocks.loadout === loadoutId);
  if (!milestone) return null;
  return milestone.description;
}

// Get all milestones with their completion status (for display)
export function getAllMilestones() {
  const stats = getStats();
  return MILESTONES.map(m => ({
    ...m,
    completed: m.check(stats),
  }));
}
