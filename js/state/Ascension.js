// Ascension system — stackable difficulty modifiers unlocked by winning

const ASCENSION_KEY = 'numgeon_ascension';

// Each level adds a new modifier on top of all previous ones
export const ASCENSION_LEVELS = [
  { level: 1, name: 'Thinner Margins', description: 'Near-miss threshold reduced from 3 to 2.' },
  { level: 2, name: 'Poverty', description: 'Start with 25 gold instead of 50.' },
  { level: 3, name: 'Fragile', description: 'Start with 60 HP instead of 80.' },
  { level: 4, name: 'Stingy Monsters', description: 'Earn 30% less gold from combat.' },
  { level: 5, name: 'Tougher Hides', description: 'All monsters have +15% HP.' },
  { level: 6, name: 'No Free Lunch', description: 'Rest sites only heal 20% HP (down from 30%).' },
  { level: 7, name: 'Extra Conditions', description: 'Monsters can have up to 3 conditions.' },
  { level: 8, name: 'Price Gouging', description: 'All shop prices increased by 40%.' },
  { level: 9, name: 'Relentless', description: 'Monster attack dice upgraded by one tier.' },
  { level: 10, name: 'The Final Challenge', description: 'Start with 1 fewer die.' },
];

export function getUnlockedAscension() {
  try {
    const val = localStorage.getItem(ASCENSION_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export function unlockNextAscension() {
  const current = getUnlockedAscension();
  const next = Math.min(current + 1, ASCENSION_LEVELS.length);
  try {
    localStorage.setItem(ASCENSION_KEY, String(next));
  } catch {}
  return next;
}

// Get all active modifiers for a given ascension level
export function getAscensionModifiers(level) {
  return ASCENSION_LEVELS.filter(a => a.level <= level);
}

// Check if a specific ascension modifier is active
export function hasAscensionMod(level, modLevel) {
  return level >= modLevel;
}
