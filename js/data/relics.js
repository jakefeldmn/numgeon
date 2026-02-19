// Relic definitions.
// Each relic has an id, name, description, rarity, emoji, and optional hooks.
// Hooks are string keys that RelicManager listens for.
// Effects are applied by RelicManager based on the hook context.

export const RELICS = {
  loaded_dice: {
    name: 'Loaded Dice',
    description: '+1 reroll per turn.',
    rarity: 'common',
    emoji: '\uD83C\uDFB2',
    hook: 'onPickup',
    // Applied as a permanent stat change on pickup
  },
  iron_skin: {
    name: 'Iron Skin',
    description: '+15 max HP.',
    rarity: 'common',
    emoji: '\uD83D\uDEE1',
    hook: 'onPickup',
  },
  gold_magnet: {
    name: 'Gold Magnet',
    description: 'Earn 25% more gold from combat.',
    rarity: 'common',
    emoji: '\uD83E\uDDF2',
    hook: 'onGoldGain',
  },
  lucky_coin: {
    name: 'Lucky Coin',
    description: 'Start each combat with +1 reroll.',
    rarity: 'common',
    emoji: '\uD83E\uDE99',
    hook: 'onCombatStart',
  },
  magnifying_glass: {
    name: 'Magnifying Glass',
    description: 'Prime number results get an extra x1.5 multiplier.',
    rarity: 'uncommon',
    emoji: '\uD83D\uDD0D',
    hook: 'onEvaluate',
  },
  mirror_shard: {
    name: 'Mirror Shard',
    description: 'Duplicate one random die at the start of each combat.',
    rarity: 'rare',
    emoji: '\uD83E\uDE9E',
    hook: 'onCombatStart',
  },
  modular_ring: {
    name: 'Ring of Modular Arithmetic',
    description: 'Overkill damage wraps around (mod target). No self-damage from overkill.',
    rarity: 'legendary',
    emoji: '\uD83D\uDCAD',
    hook: 'onEvaluate',
  },
  thick_skin: {
    name: 'Thick Skin',
    description: 'Reduce all damage taken by 2.',
    rarity: 'uncommon',
    emoji: '\uD83E\uDDA7',
    hook: 'onTakeDamage',
  },
  decimal_lens: {
    name: 'Decimal Lens',
    description: 'Your results are rounded to the nearest integer (helps with division).',
    rarity: 'common',
    emoji: '\uD83D\uDC53',
    hook: 'onEvaluate',
  },
  berserker_mark: {
    name: "Berserker's Mark",
    description: 'Overkill no longer damages you, but you deal 20% less effective damage.',
    rarity: 'rare',
    emoji: '\u2694',
    hook: 'onEvaluate',
  },
  combo_crown: {
    name: 'Combo Crown',
    description: 'Each combo triggered gives +5 bonus gold.',
    rarity: 'uncommon',
    emoji: '\uD83D\uDC51',
    hook: 'onGoldGain',
  },
  phoenix_feather: {
    name: 'Phoenix Feather',
    description: 'Once per run: survive a killing blow with 1 HP. Consumed on use.',
    rarity: 'legendary',
    emoji: '\uD83E\uDE76',
    hook: 'onTakeDamage',
    consumable: true,
  },
  extra_hand: {
    name: 'Extra Hand',
    description: 'Start each combat with one free bonus d6.',
    rarity: 'uncommon',
    emoji: '\u270B',
    hook: 'onCombatStart',
  },
  sharpened_mind: {
    name: 'Sharpened Mind',
    description: 'Exact hits give double gold bonus.',
    rarity: 'uncommon',
    emoji: '\uD83E\uDDE0',
    hook: 'onGoldGain',
  },
  alchemist_flask: {
    name: "Alchemist's Flask",
    description: 'Heal 3 HP after each combat victory.',
    rarity: 'common',
    emoji: '\u2697',
    hook: 'onCombatEnd',
  },
  chaos_orb: {
    name: 'Chaos Orb',
    description: 'All dice rolls get +1 to their result (capped at max faces).',
    rarity: 'rare',
    emoji: '\uD83D\uDD2E',
    hook: 'onRoll',
  },

  // ===== New build-defining relics =====
  lucky_dice: {
    name: 'Lucky Dice',
    description: 'All dice roll twice and keep the higher result.',
    rarity: 'legendary',
    emoji: '\uD83C\uDF40',
    hook: 'onRoll',
  },
  recycler: {
    name: 'Recycler',
    description: 'Each operator can be placed twice per combat (resets each turn).',
    rarity: 'rare',
    emoji: '\u267B',
    hook: 'passive',
  },
  head_start: {
    name: 'Head Start',
    description: 'The first expression you evaluate each combat gets +5 to the result.',
    rarity: 'uncommon',
    emoji: '\uD83C\uDFC1',
    hook: 'onEvaluate',
  },
  double_or_nothing: {
    name: 'Double or Nothing',
    description: 'Exact hits give 3x gold. Overkill/underkill deals double retaliation.',
    rarity: 'rare',
    emoji: '\uD83C\uDFB0',
    hook: 'onEvaluate',
  },
  echo_chamber: {
    name: 'Echo Chamber',
    description: 'Gold multiplier from combos is doubled.',
    rarity: 'legendary',
    emoji: '\uD83D\uDD0A',
    hook: 'onGoldGain',
  },
  rubber_shield: {
    name: 'Rubber Shield',
    description: 'The first hit each combat deals 0 damage to you.',
    rarity: 'uncommon',
    emoji: '\uD83D\uDEE1',
    hook: 'onTakeDamage',
    perCombat: true,
  },
  golden_ratio: {
    name: 'Golden Ratio',
    description: 'Fibonacci number results heal you for 3 HP.',
    rarity: 'rare',
    emoji: '\uD83C\uDF00',
    hook: 'onEvaluate',
  },
  glass_cannon: {
    name: 'Glass Cannon Relic',
    description: 'Deal 50% more effective damage, but you have 20 less max HP.',
    rarity: 'rare',
    emoji: '\uD83D\uDCA3',
    hook: 'onPickup',
  },
  second_wind: {
    name: 'Second Wind',
    description: 'Heal 1 HP every time you reroll dice.',
    rarity: 'uncommon',
    emoji: '\uD83D\uDCA8',
    hook: 'onReroll',
  },
  perfectionist: {
    name: 'Perfectionist',
    description: 'Exact hits permanently increase your max HP by 2.',
    rarity: 'legendary',
    emoji: '\u2B50',
    hook: 'onEvaluate',
  },
};

export function getRelicsByRarity(rarity) {
  return Object.entries(RELICS)
    .filter(([, r]) => r.rarity === rarity)
    .map(([key]) => key);
}

export function getRelicPool(floor) {
  const pool = [];
  pool.push(...getRelicsByRarity('common'));
  if (floor >= 2) pool.push(...getRelicsByRarity('uncommon'));
  if (floor >= 5) pool.push(...getRelicsByRarity('rare'));
  if (floor >= 8) pool.push(...getRelicsByRarity('legendary'));
  return pool;
}
