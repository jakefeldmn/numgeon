export const MONSTERS = {
  // ===================== ACT 1 — Regular (tier 1) =====================
  slime: {
    name: 'Gel Cube',
    hpRange: [8, 16],
    attackDie: 'd4',
    attackDiceCount: 1,
    tier: 1,
    art: '\uD83D\uDFE9',
  },
  rat: {
    name: 'Sewer Rat',
    hpRange: [6, 12],
    attackDie: 'd6',
    attackDiceCount: 1,
    tier: 1,
    art: '\uD83D\uDC00',
  },
  goblin: {
    name: 'Goblin Arithmancer',
    hpRange: [12, 22],
    attackDie: 'd6',
    attackDiceCount: 1,
    tier: 1,
    art: '\uD83D\uDC7A',
  },
  skeleton: {
    name: 'Bone Counter',
    hpRange: [15, 25],
    attackDie: 'd6',
    attackDiceCount: 1,
    tier: 1,
    art: '\uD83D\uDC80',
  },
  bat: {
    name: 'Cave Bat',
    hpRange: [5, 10],
    attackDie: 'd8',
    attackDiceCount: 1,
    tier: 1,
    art: '\uD83E\uDD87',
  },
  spider: {
    name: 'Webweaver',
    hpRange: [10, 18],
    attackDie: 'd6',
    attackDiceCount: 1,
    tier: 1,
    art: '\uD83D\uDD77',
  },
  mushroom: {
    name: 'Toxic Spore',
    hpRange: [7, 14],
    attackDie: 'd4',
    attackDiceCount: 1,
    tier: 1,
    art: '\uD83C\uDF44',
  },
  snake: {
    name: 'Viper',
    hpRange: [8, 15],
    attackDie: 'd8',
    attackDiceCount: 1,
    tier: 1,
    art: '\uD83D\uDC0D',
  },
  ghost: {
    name: 'Wraith',
    hpRange: [11, 19],
    attackDie: 'd6',
    attackDiceCount: 1,
    tier: 1,
    art: '\uD83D\uDC7B',
  },

  // ===================== ACT 1 — Elites (tier 2) =====================
  ogre: {
    name: 'Ogre Mathematician',
    hpRange: [30, 45],
    attackDie: 'd8',
    attackDiceCount: 2,
    tier: 2,
    elite: true,
    art: '\uD83D\uDC79',
  },
  mimic: {
    name: 'Mimic Chest',
    hpRange: [25, 35],
    attackDie: 'd10',
    attackDiceCount: 2,
    tier: 2,
    elite: true,
    art: '\uD83D\uDCE6',
  },
  gargoyle: {
    name: 'Stone Gargoyle',
    hpRange: [28, 40],
    attackDie: 'd8',
    attackDiceCount: 2,
    tier: 2,
    elite: true,
    art: '\uD83E\uDEA8',
  },

  // ===================== ACT 1 — Boss (tier 10) =====================
  prime_minister: {
    name: 'The Prime Minister',
    hpRange: [50, 65],
    attackDie: 'd4',
    attackDiceCount: 2,
    tier: 10,
    elite: true,
    boss: true,
    art: '\uD83E\uDDD9',
    bossAbility: 'Only prime-numbered results deal damage.',
  },

  // ===================== ACT 2 — Regular (tier 3) =====================
  golem: {
    name: 'Clay Golem',
    hpRange: [20, 35],
    attackDie: 'd8',
    attackDiceCount: 1,
    tier: 3,
    art: '\uD83E\uDEA8',
  },
  wizard: {
    name: 'Rogue Wizard',
    hpRange: [18, 28],
    attackDie: 'd10',
    attackDiceCount: 1,
    tier: 3,
    art: '\uD83E\uDDD9\u200D\u2642\uFE0F',
  },
  imp: {
    name: 'Flame Imp',
    hpRange: [15, 25],
    attackDie: 'd10',
    attackDiceCount: 1,
    tier: 3,
    art: '\uD83D\uDD25',
  },
  wolf: {
    name: 'Dire Wolf',
    hpRange: [22, 32],
    attackDie: 'd8',
    attackDiceCount: 2,
    tier: 3,
    art: '\uD83D\uDC3A',
  },
  eye: {
    name: 'Floating Eye',
    hpRange: [16, 26],
    attackDie: 'd8',
    attackDiceCount: 1,
    tier: 3,
    art: '\uD83D\uDC41',
  },
  troll: {
    name: 'Bridge Troll',
    hpRange: [25, 38],
    attackDie: 'd8',
    attackDiceCount: 2,
    tier: 3,
    art: '\uD83E\uDDCC',
  },
  scorpion: {
    name: 'Giant Scorpion',
    hpRange: [20, 30],
    attackDie: 'd10',
    attackDiceCount: 1,
    tier: 3,
    art: '\uD83E\uDD82',
  },
  shadow: {
    name: 'Shadow Stalker',
    hpRange: [18, 28],
    attackDie: 'd10',
    attackDiceCount: 1,
    tier: 3,
    art: '\uD83C\uDF11',
  },

  // ===================== ACT 2 — Elites (tier 4) =====================
  dragon: {
    name: 'Young Dragon',
    hpRange: [45, 65],
    attackDie: 'd10',
    attackDiceCount: 2,
    tier: 4,
    elite: true,
    art: '\uD83D\uDC09',
  },
  lich: {
    name: 'Lich Numeromancer',
    hpRange: [40, 55],
    attackDie: 'd12',
    attackDiceCount: 2,
    tier: 4,
    elite: true,
    art: '\uD83D\uDC80',
  },
  hydra: {
    name: 'Hydra',
    hpRange: [50, 70],
    attackDie: 'd8',
    attackDiceCount: 3,
    tier: 4,
    elite: true,
    art: '\uD83D\uDC32',
  },

  // ===================== ACT 2 — Boss (tier 20) =====================
  palindromer: {
    name: 'The Palindromer',
    hpRange: [70, 90],
    attackDie: 'd6',
    attackDiceCount: 2,
    tier: 20,
    elite: true,
    boss: true,
    art: '\uD83C\uDFAD',
    bossAbility: 'Only palindrome results deal damage.',
  },

  // ===================== ACT 3 — Regular (tier 5) =====================
  demon: {
    name: 'Infernal Demon',
    hpRange: [35, 55],
    attackDie: 'd10',
    attackDiceCount: 2,
    tier: 5,
    art: '\uD83D\uDC7F',
  },
  elemental: {
    name: 'Chaos Elemental',
    hpRange: [30, 50],
    attackDie: 'd12',
    attackDiceCount: 1,
    tier: 5,
    art: '\uD83C\uDF0A',
  },
  chimera: {
    name: 'Chimera',
    hpRange: [40, 60],
    attackDie: 'd10',
    attackDiceCount: 2,
    tier: 5,
    art: '\uD83E\uDD81',
  },
  phantom: {
    name: 'Phantom',
    hpRange: [28, 45],
    attackDie: 'd12',
    attackDiceCount: 1,
    tier: 5,
    art: '\uD83D\uDC7B',
  },
  wyvern: {
    name: 'Wyvern',
    hpRange: [38, 58],
    attackDie: 'd10',
    attackDiceCount: 2,
    tier: 5,
    art: '\uD83D\uDC32',
  },
  minotaur: {
    name: 'Minotaur',
    hpRange: [45, 65],
    attackDie: 'd10',
    attackDiceCount: 2,
    tier: 5,
    art: '\uD83D\uDC02',
  },
  necromancer: {
    name: 'Necromancer',
    hpRange: [32, 48],
    attackDie: 'd12',
    attackDiceCount: 2,
    tier: 5,
    art: '\uD83E\uDDD9\u200D\u2640\uFE0F',
  },
  colossus: {
    name: 'Iron Colossus',
    hpRange: [50, 70],
    attackDie: 'd8',
    attackDiceCount: 3,
    tier: 5,
    art: '\uD83E\uDD16',
  },

  // ===================== ACT 3 — Elites (tier 6) =====================
  ancient_dragon: {
    name: 'Ancient Dragon',
    hpRange: [65, 90],
    attackDie: 'd12',
    attackDiceCount: 3,
    tier: 6,
    elite: true,
    art: '\uD83D\uDC09',
  },
  archlich: {
    name: 'Archlich',
    hpRange: [55, 80],
    attackDie: 'd12',
    attackDiceCount: 2,
    tier: 6,
    elite: true,
    art: '\u2620',
  },
  seraph: {
    name: 'Fallen Seraph',
    hpRange: [60, 85],
    attackDie: 'd10',
    attackDiceCount: 3,
    tier: 6,
    elite: true,
    art: '\uD83D\uDC7C',
  },

  // ===================== ACT 3 — Boss (tier 30) =====================
  the_infinity: {
    name: 'The Infinity',
    hpRange: [100, 130],
    attackDie: 'd8',
    attackDiceCount: 3,
    tier: 30,
    elite: true,
    boss: true,
    art: '\u267E',
    bossAbility: 'Only perfect square results deal damage.',
  },
};

export function getMonstersByTier(tier) {
  return Object.entries(MONSTERS)
    .filter(([, m]) => m.tier === tier && !m.elite)
    .map(([key]) => key);
}

export function getElitesByTier(tier) {
  return Object.entries(MONSTERS)
    .filter(([, m]) => m.tier === tier && m.elite)
    .map(([key]) => key);
}

export function getBossByAct(act) {
  const bossTier = act === 1 ? 10 : act === 2 ? 20 : 30;
  const bosses = Object.entries(MONSTERS)
    .filter(([, m]) => m.tier === bossTier && m.boss)
    .map(([key]) => key);
  return bosses[0] || 'ogre';
}

// Floor scaling: HP grows with floor. Attack die can upgrade at higher floors.
export function createMonsterInstance(monsterId, rng, floor = 0, ascension = 0) {
  const def = MONSTERS[monsterId];

  // Base HP from range
  let baseHp = rng.nextInt(def.hpRange[0], def.hpRange[1]);

  // Floor scaling: HP grows ~15% per floor, compounding
  const hpMultiplier = Math.pow(1.15, floor);
  let scaledHp = Math.round(baseHp * hpMultiplier);

  // Ascension 5: Tougher Hides — all monsters have +15% HP
  if (ascension >= 5) {
    scaledHp = Math.round(scaledHp * 1.15);
  }

  // After floor 3, bias toward "hard" numbers
  if (floor >= 3) {
    scaledHp = makeHarderTarget(scaledHp, floor, rng);
  }

  // Attack die upgrades at higher floors
  const dieProgression = ['d4', 'd6', 'd8', 'd10', 'd12'];
  let dieIndex = dieProgression.indexOf(def.attackDie);
  if (dieIndex === -1) dieIndex = 1; // default d6
  // Upgrade attack die every 4 floors
  dieIndex = Math.min(dieIndex + Math.floor(floor / 4), dieProgression.length - 1);
  // Ascension 9: Relentless — monster attack dice upgraded by one tier
  if (ascension >= 9) {
    dieIndex = Math.min(dieIndex + 1, dieProgression.length - 1);
  }
  const attackDie = dieProgression[dieIndex];

  return {
    id: monsterId,
    name: def.name,
    hp: scaledHp,
    maxHp: scaledHp,
    attackDie,
    attackDiceCount: def.attackDiceCount || 1,
    art: def.art,
    elite: !!def.elite,
    boss: !!def.boss,
    bossAbility: def.bossAbility || null,
    hpRange: def.hpRange,
  };
}

// Make a target number harder to hit with simple arithmetic.
function makeHarderTarget(baseHp, floor, rng) {
  const difficulty = Math.min(floor / 15, 1);

  if (rng.next() < 0.3 + difficulty * 0.4) {
    const prime = nearestPrime(baseHp);
    if (Math.abs(prime - baseHp) <= 5) {
      baseHp = prime;
    }
  }

  if (rng.next() < difficulty * 0.5) {
    if (baseHp % 2 === 0 || baseHp % 3 === 0 || baseHp % 5 === 0) {
      baseHp += rng.nextInt(1, 3);
    }
  }

  if (floor >= 8 && rng.next() < 0.3) {
    const bigPrimes = [53, 59, 61, 67, 71, 73, 79, 83, 89, 97,
                       101, 103, 107, 109, 113, 127, 131, 137, 139, 149,
                       151, 157, 163, 167, 173, 179, 181, 191, 193, 197];
    const minTarget = Math.round(baseHp * 0.8);
    const maxTarget = Math.round(baseHp * 1.3);
    const candidates = bigPrimes.filter(p => p >= minTarget && p <= maxTarget);
    if (candidates.length > 0) {
      baseHp = rng.pick(candidates);
    }
  }

  return Math.max(5, baseHp);
}

function nearestPrime(n) {
  if (isPrimeQuick(n)) return n;
  let lo = n - 1;
  let hi = n + 1;
  while (true) {
    if (lo >= 2 && isPrimeQuick(lo)) return lo;
    if (isPrimeQuick(hi)) return hi;
    lo--;
    hi++;
  }
}

function isPrimeQuick(n) {
  if (n < 2) return false;
  if (n === 2 || n === 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}
