import { OPERATORS } from '../data/operators.js';
import { DICE_TYPES } from '../data/dice.js';
import { RELICS, getRelicPool } from '../data/relics.js';

// Generate shop stock for a given floor.
export function generateShopStock(floor, playerState, rng, ascension = 0) {
  const stock = {
    operators: [],
    diceUpgrades: [],
    removal: null,
    relic: null,
  };

  // --- Operator cards for sale (2-3) ---
  const opPool = [];
  const common = ['add', 'subtract', 'multiply'];
  const uncommon = ['divide', 'modulo', 'negate', 'lparen', 'rparen', 'triangle', 'rectangle'];
  const rare = ['power', 'sqrt', 'log'];
  const legendary = ['factorial'];
  const exotic = ['concat'];

  opPool.push(...common);
  if (floor >= 1) opPool.push(...uncommon);
  if (floor >= 3) opPool.push(...rare);
  if (floor >= 6) opPool.push(...legendary);
  if (floor >= 3 && rng.next() < 0.33) opPool.push(...exotic);

  const numOps = rng.nextInt(2, 3);
  const shuffled = rng.shuffle(opPool);
  for (let i = 0; i < numOps && i < shuffled.length; i++) {
    const opId = shuffled[i];
    const op = OPERATORS[opId];
    // Price with markup (1.5-2.1x base cost)
    const price = Math.floor(op.cost * (1.5 + rng.next() * 0.6));
    stock.operators.push({ opId, price });
  }

  // --- Dice upgrades (1-2 based on what player has) ---
  const upgradable = playerState.dicePool.filter(die => {
    return DICE_TYPES[die.type]?.upgradeTo != null;
  });

  if (upgradable.length > 0) {
    const numUpgrades = Math.min(rng.nextInt(1, 2), upgradable.length);
    const picked = rng.shuffle(upgradable).slice(0, numUpgrades);

    for (const die of picked) {
      const fromType = DICE_TYPES[die.type];
      const toType = fromType.upgradeTo;
      stock.diceUpgrades.push({
        dieId: die.id,
        fromType: die.type,
        toType,
        price: Math.floor(fromType.cost * 1.8),
      });
    }
  }

  // --- Services (randomly pick 2-3 from the available pool) ---
  stock.services = {};

  const availableServices = [];

  // Operator removal
  if (playerState.operatorHand.length > 3) {
    availableServices.push({
      key: 'removal',
      data: { price: 75 + Math.floor(floor * 8) },
    });
  }

  // Heal (only if injured)
  if (playerState.hp < playerState.maxHp) {
    const healAmount = Math.floor(playerState.maxHp * 0.4);
    availableServices.push({
      key: 'heal',
      data: { price: 50 + Math.floor(floor * 5), healAmount },
    });
  }

  // Max HP Up
  availableServices.push({
    key: 'maxHpUp',
    data: { price: 100 + Math.floor(floor * 12), amount: 10 },
  });

  // Operator Duplicate
  if (playerState.operatorHand.length > 0) {
    availableServices.push({
      key: 'duplicate',
      data: { price: 70 + Math.floor(floor * 10) },
    });
  }

  // Dice Removal
  if (playerState.dicePool.length > 3) {
    availableServices.push({
      key: 'diceRemoval',
      data: { price: 65 + Math.floor(floor * 7) },
    });
  }

  // Reroll Shop (always a candidate)
  availableServices.push({
    key: 'reroll',
    data: { price: 25 + Math.floor(floor * 4) },
  });

  // Pick 2-3 services randomly from the pool
  const numServices = Math.min(rng.nextInt(2, 3), availableServices.length);
  const pickedServices = rng.shuffle(availableServices).slice(0, numServices);
  for (const svc of pickedServices) {
    stock.services[svc.key] = svc.data;
  }

  // --- Extra dice for sale (rare) ---
  if (rng.next() < 0.3 && playerState.dicePool.length < 8) {
    const newDieTypes = ['d4', 'd6', 'd8'];
    const dieType = rng.pick(newDieTypes);
    stock.newDie = {
      type: dieType,
      price: Math.floor(DICE_TYPES[dieType].cost * 1.5) + 40,
    };
  }

  // --- Relic for sale (one, if available) ---
  const relicPool = getRelicPool(floor).filter(id => !playerState.relics.includes(id));
  if (relicPool.length > 0 && rng.next() < 0.6) {
    const relicId = rng.pick(relicPool);
    const r = RELICS[relicId];
    const rarityPrices = { common: 120, uncommon: 180, rare: 260, legendary: 400 };
    stock.relic = {
      relicId,
      price: rarityPrices[r.rarity] || 100,
    };
  }

  // Ascension 8: Price Gouging — all shop prices increased by 40%
  if (ascension >= 8) {
    const gouge = (p) => Math.floor(p * 1.4);
    stock.operators.forEach(o => o.price = gouge(o.price));
    stock.diceUpgrades.forEach(u => u.price = gouge(u.price));
    if (stock.newDie) stock.newDie.price = gouge(stock.newDie.price);
    if (stock.relic) stock.relic.price = gouge(stock.relic.price);
    for (const key of Object.keys(stock.services)) {
      if (stock.services[key]?.price) stock.services[key].price = gouge(stock.services[key].price);
    }
  }

  return stock;
}

export function buyRelic(relicId, price, playerState) {
  if (playerState.gold < price) return { success: false, reason: 'Not enough gold' };
  if (playerState.relics.includes(relicId)) return { success: false, reason: 'Already owned' };
  return {
    success: true,
    changes: {
      gold: playerState.gold - price,
      relics: [...playerState.relics, relicId],
    },
  };
}

export function buyOperator(opId, price, playerState) {
  if (playerState.gold < price) return { success: false, reason: 'Not enough gold' };
  return {
    success: true,
    changes: {
      gold: playerState.gold - price,
      operatorHand: [...playerState.operatorHand, opId],
    },
  };
}

export function buyDiceUpgrade(dieId, toType, price, playerState) {
  if (playerState.gold < price) return { success: false, reason: 'Not enough gold' };
  const newPool = playerState.dicePool.map(d =>
    d.id === dieId ? { ...d, type: toType } : d
  );
  return {
    success: true,
    changes: { gold: playerState.gold - price, dicePool: newPool },
  };
}

export function buyNewDie(dieType, price, playerState) {
  if (playerState.gold < price) return { success: false, reason: 'Not enough gold' };
  const newDie = { id: `die-${Date.now()}`, type: dieType, value: null, held: false };
  return {
    success: true,
    changes: {
      gold: playerState.gold - price,
      dicePool: [...playerState.dicePool, newDie],
    },
  };
}

export function removeOperator(handIndex, price, playerState) {
  if (playerState.gold < price) return { success: false, reason: 'Not enough gold' };
  const newHand = playerState.operatorHand.filter((_, i) => i !== handIndex);
  return {
    success: true,
    changes: { gold: playerState.gold - price, operatorHand: newHand },
  };
}

export function buyHeal(price, healAmount, playerState) {
  if (playerState.gold < price) return { success: false, reason: 'Not enough gold' };
  const newHp = Math.min(playerState.hp + healAmount, playerState.maxHp);
  return {
    success: true,
    changes: { gold: playerState.gold - price, hp: newHp },
  };
}

export function buyMaxHpUp(price, amount, playerState) {
  if (playerState.gold < price) return { success: false, reason: 'Not enough gold' };
  return {
    success: true,
    changes: {
      gold: playerState.gold - price,
      maxHp: playerState.maxHp + amount,
      hp: playerState.hp + amount,
    },
  };
}

export function duplicateOperator(handIndex, price, playerState) {
  if (playerState.gold < price) return { success: false, reason: 'Not enough gold' };
  const opId = playerState.operatorHand[handIndex];
  if (!opId) return { success: false, reason: 'Invalid operator' };
  return {
    success: true,
    changes: {
      gold: playerState.gold - price,
      operatorHand: [...playerState.operatorHand, opId],
    },
  };
}

export function removeDie(dieIndex, price, playerState) {
  if (playerState.gold < price) return { success: false, reason: 'Not enough gold' };
  if (playerState.dicePool.length <= 3) return { success: false, reason: 'Need at least 3 dice' };
  const newPool = playerState.dicePool.filter((_, i) => i !== dieIndex);
  return {
    success: true,
    changes: { gold: playerState.gold - price, dicePool: newPool },
  };
}
