// Combat conditions modify the rules of each encounter.
// Each monster gets 0-2 conditions based on floor depth.

export const CONDITIONS = {
  // --- Damage rules ---
  gentle: {
    id: 'gentle',
    name: 'Gentle',
    icon: '🕊️',
    description: 'No overkill penalty',
    tier: 0,
    category: 'damage',
  },
  harsh: {
    id: 'harsh',
    name: 'Harsh',
    icon: '🔥',
    description: 'Take the FULL difference as damage if you miss',
    tier: 2,
    category: 'damage',
  },
  glass_cannon: {
    id: 'glass_cannon',
    name: 'Glass Cannon',
    icon: '💥',
    description: 'Deal double damage, but take double overkill',
    tier: 2,
    category: 'damage',
  },

  // --- Targeting rules ---
  tight_window: {
    id: 'tight_window',
    name: 'Tight Window',
    icon: '🪟',
    description: 'Must be within 3 of target or deal no damage',
    tier: 2,
    category: 'targeting',
  },
  no_overkill: {
    id: 'no_overkill',
    name: 'No Overkill',
    icon: '⚖️',
    description: 'Going over the target deals zero damage',
    tier: 1,
    category: 'targeting',
  },
  must_overkill: {
    id: 'must_overkill',
    name: 'Brute Force',
    icon: '💪',
    description: 'Must exceed the target. Exact hits and underkills deal no damage',
    tier: 1,
    category: 'targeting',
  },

  // --- Dice constraints ---
  use_3_dice: {
    id: 'use_3_dice',
    name: "Three's Company",
    icon: '🎲',
    description: 'Must use at least 3 dice',
    tier: 1,
    category: 'constraint',
  },
  use_all_dice: {
    id: 'use_all_dice',
    name: 'All In',
    icon: '🃏',
    description: 'Must use ALL your dice',
    tier: 3,
    category: 'constraint',
  },
  max_2_ops: {
    id: 'max_2_ops',
    name: 'Keep It Simple',
    icon: '✌️',
    description: 'Can only use 2 operators max',
    tier: 1,
    category: 'constraint',
  },
  single_die: {
    id: 'single_die',
    name: 'One Shot',
    icon: '🎯',
    description: 'Can only use 1 die. Choose wisely.',
    tier: 2,
    category: 'constraint',
  },

  // --- Number rules ---
  even_only: {
    id: 'even_only',
    name: 'Even Steven',
    icon: '2️⃣',
    description: 'Result must be even to deal damage',
    tier: 1,
    category: 'number',
  },
  odd_only: {
    id: 'odd_only',
    name: 'Odd One Out',
    icon: '1️⃣',
    description: 'Result must be odd to deal damage',
    tier: 1,
    category: 'number',
  },
  no_fractions: {
    id: 'no_fractions',
    name: 'Whole Numbers Only',
    icon: '🔢',
    description: 'Decimal results deal no damage',
    tier: 1,
    category: 'number',
  },
  decimal_target: {
    id: 'decimal_target',
    name: 'Decimal Dance',
    icon: '📐',
    description: 'Target includes a decimal',
    tier: 2,
    category: 'special',
  },
};

// Which conditions can appear per floor range
const FLOOR_POOLS = [
  { minFloor: 0, maxFloor: 1, pool: ['gentle', 'even_only', 'odd_only'] },
  { minFloor: 2, maxFloor: 4, pool: ['even_only', 'odd_only', 'use_3_dice', 'no_overkill', 'must_overkill', 'max_2_ops', 'no_fractions'] },
  { minFloor: 5, maxFloor: 7, pool: ['even_only', 'odd_only', 'use_3_dice', 'no_overkill', 'must_overkill', 'max_2_ops', 'no_fractions', 'harsh', 'tight_window', 'glass_cannon', 'single_die', 'decimal_target'] },
  { minFloor: 8, maxFloor: 99, pool: ['use_3_dice', 'no_overkill', 'must_overkill', 'use_all_dice', 'max_2_ops', 'harsh', 'tight_window', 'glass_cannon', 'single_die', 'decimal_target', 'even_only', 'odd_only', 'no_fractions'] },
];

export function pickConditions(floor, rng, monsterHp = 999, playerOperators = [], ascension = 0) {
  // Find the right pool for this floor
  const entry = FLOOR_POOLS.find(e => floor >= e.minFloor && floor <= e.maxFloor) || FLOOR_POOLS[0];
  const pool = entry.pool;

  // Floor 0: no conditions (tutorial fight)
  if (floor === 0) return [];

  // Chance of getting conditions increases with floor
  const condChance = Math.min(0.3 + floor * 0.08, 0.85);
  if (rng.next() > condChance) return [];

  // Check if player can produce decimals (has divide or sqrt)
  const canMakeDecimals = playerOperators.includes('divide') || playerOperators.includes('sqrt');

  // Ascension 7: allow up to 3 conditions instead of 2
  const maxConditions = ascension >= 7 ? 3 : 2;

  // Pick 1-maxConditions conditions, avoiding conflicts
  const shuffled = rng.shuffle([...pool]);
  const picked = [];
  const usedCategories = new Set();

  for (const id of shuffled) {
    if (picked.length >= maxConditions) break;
    const cond = CONDITIONS[id];
    // Don't double up on same category (except 'number')
    if (cond.category !== 'number' && usedCategories.has(cond.category)) continue;
    // Don't combine conflicting conditions
    if (id === 'no_overkill' && picked.some(c => c === 'must_overkill')) continue;
    if (id === 'must_overkill' && picked.some(c => c === 'no_overkill')) continue;
    if (id === 'gentle' && picked.some(c => c === 'harsh')) continue;
    if (id === 'harsh' && picked.some(c => c === 'gentle')) continue;
    if (id === 'single_die' && picked.some(c => c === 'use_3_dice' || c === 'use_all_dice')) continue;
    if ((id === 'use_3_dice' || id === 'use_all_dice') && picked.some(c => c === 'single_die')) continue;
    if (id === 'even_only' && picked.some(c => c === 'odd_only')) continue;
    if (id === 'odd_only' && picked.some(c => c === 'even_only')) continue;
    // One Shot is only viable when the target is reachable with 1 die + operators
    if (id === 'single_die' && monsterHp > 30) continue;
    // Decimal target only if the player has divide or sqrt to produce decimals
    if (id === 'decimal_target' && !canMakeDecimals) continue;

    picked.push(id);
    usedCategories.add(cond.category);
  }

  return picked;
}

// Validate whether the player's expression meets all conditions
export function validateConditions(conditionIds, result, tokens) {
  const diceUsed = tokens.filter(t => t.type === 'number').length;
  const opsUsed = tokens.filter(t => t.type === 'operator').length;

  for (const id of conditionIds) {
    switch (id) {
      case 'use_3_dice':
        if (diceUsed < 3) return { valid: false, reason: 'Must use at least 3 dice' };
        break;
      case 'use_all_dice':
        // This is checked externally since we need total dice count
        break;
      case 'max_2_ops':
        if (opsUsed > 2) return { valid: false, reason: 'Max 2 operators allowed' };
        break;
      case 'single_die':
        if (diceUsed > 1) return { valid: false, reason: 'Can only use 1 die' };
        break;
      case 'even_only':
        if (result % 2 !== 0) return { valid: false, reason: 'Result must be even' };
        break;
      case 'odd_only':
        if (Math.floor(result) !== result || result % 2 === 0) return { valid: false, reason: 'Result must be odd' };
        break;
      case 'no_fractions':
        if (result !== Math.floor(result)) return { valid: false, reason: 'No decimals allowed' };
        break;
    }
  }

  return { valid: true };
}

// Calculate damage based on conditions.
// Returns { dealt, retaliate, exact?, nearMiss?, overkill?, underkill?, reason? }
// retaliate = whether the monster gets to roll its attack dice.
// The monster always rolls its fixed attackDiceCount — this function just says yes/no.
export function calculateDamage(conditionIds, result, target, ascension = 0) {
  const diff = Math.abs(result - target);
  const isOver = result > target;
  const isExact = diff < 0.001; // account for floating point
  const isUnder = result < target && !isExact;

  // Check targeting rules first
  for (const id of conditionIds) {
    switch (id) {
      case 'no_overkill':
        if (isOver) return { dealt: 0, retaliate: true, reason: 'No overkill allowed!' };
        break;
      case 'must_overkill':
        if (!isOver) return { dealt: 0, retaliate: true, reason: 'Must exceed the target!' };
        break;
      case 'tight_window':
        if (diff > 3 && !isExact) return { dealt: 0, retaliate: true, reason: 'Outside the tight window!' };
        break;
    }
  }

  // Exact hit — no retaliation
  if (isExact) {
    return { dealt: target, retaliate: false, exact: true };
  }

  const hasGentle = conditionIds.includes('gentle');
  const hasGlassCannon = conditionIds.includes('glass_cannon');

  // Overkill — monster dies, retaliates unless gentle
  if (isOver) {
    return { dealt: target, retaliate: !hasGentle, overkill: true };
  }

  // Near miss — within threshold of target from below → kill but monster retaliates
  // Ascension 1: threshold reduced from 3 to 2
  const nearMissThreshold = ascension >= 1 ? 2 : 3;
  if (isUnder && diff <= nearMissThreshold) {
    return { dealt: target, retaliate: true, nearMiss: true };
  }

  // Underkill — monster survives, retaliates
  const dealt = hasGlassCannon ? Math.ceil(result * 2) : Math.ceil(result);
  return { dealt, retaliate: true, underkill: true };
}
