// Post-combat reward tables.
// Rewards scale with floor number and whether the enemy was elite/boss.

export function generateGoldReward(floor, isElite, exactHitBonus = 0) {
  const base = isElite ? 25 : 12;
  const scaling = Math.floor(floor * 2.5);
  return base + scaling + exactHitBonus;
}

// Generate a pool of operator card choices for post-combat rewards.
// Returns 3 operator IDs for the player to pick from.
export function generateOperatorReward(floor, rng) {
  const pool = [];

  // Common ops always available
  const common = ['add', 'subtract', 'multiply'];
  // Uncommon ops become available after floor 2
  const uncommon = ['divide', 'modulo', 'negate', 'lparen', 'rparen', 'triangle', 'rectangle'];
  // Rare ops become available after floor 5
  const rare = ['power', 'sqrt', 'log'];
  // Legendary ops after floor 8
  const legendary = ['factorial'];
  // Exotic ops — very rare, only ~33% chance to even enter the pool
  const exotic = ['concat'];

  pool.push(...common);
  if (floor >= 2) pool.push(...uncommon);
  if (floor >= 5) pool.push(...rare);
  if (floor >= 8) pool.push(...legendary);
  if (floor >= 5 && rng.next() < 0.33) pool.push(...exotic);

  // Pick 3 distinct operators
  const shuffled = rng.shuffle(pool);
  return shuffled.slice(0, 3);
}

// For elite rewards, offer a choice between an operator and a dice upgrade
export function generateEliteReward(floor, rng) {
  return {
    operators: generateOperatorReward(floor, rng),
    extraGold: 15 + Math.floor(floor * 1.5),
  };
}
