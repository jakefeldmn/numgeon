import { RELICS } from '../data/relics.js';
import { DICE_TYPES, getDieFaces } from '../data/dice.js';
import { getState, updatePlayer } from '../state/GameState.js';
import { isPrime, isFibonacci } from '../utils/math.js';

// Per-combat state for relics that reset each fight
let combatTurnCount = 0;
let rubberShieldUsed = false;

// Apply a relic's one-time pickup effect
export function applyPickupEffect(relicId) {
  const state = getState();
  const player = state.player;

  switch (relicId) {
    case 'loaded_dice':
      updatePlayer({ rerollsPerTurn: player.rerollsPerTurn + 1 });
      break;
    case 'iron_skin':
      updatePlayer({ maxHp: player.maxHp + 15, hp: player.hp + 15 });
      break;
    case 'glass_cannon':
      updatePlayer({ maxHp: Math.max(20, player.maxHp - 20), hp: Math.min(player.hp, Math.max(20, player.maxHp - 20)) });
      break;
  }
}

// Hook: onCombatStart — modify combat state at the start of combat.
// Returns modifications to apply to dice array and rerolls.
export function triggerCombatStart(dice, rerolls, rng) {
  const state = getState();
  const relics = state.player.relics;
  let modDice = [...dice];
  let modRerolls = rerolls;

  // Reset per-combat state
  combatTurnCount = 1;
  rubberShieldUsed = false;

  for (const relicId of relics) {
    switch (relicId) {
      case 'lucky_coin':
        modRerolls += 1;
        break;
      case 'mirror_shard': {
        // Duplicate a random die
        if (modDice.length > 0) {
          const source = rng.pick(modDice);
          modDice.push({
            ...source,
            id: `mirror-${Date.now()}`,
            value: source.value,
          });
        }
        break;
      }
      case 'extra_hand': {
        // Add a bonus d6
        const sides = DICE_TYPES.d6.sides;
        modDice.push({
          id: `extra-${Date.now()}`,
          type: 'd6',
          value: rng.nextInt(1, sides),
          held: false,
        });
        break;
      }
    }
  }

  return { dice: modDice, rerolls: modRerolls };
}

// Hook: onRoll — modify dice values after rolling.
export function triggerOnRoll(dice) {
  const state = getState();
  const relics = state.player.relics;

  let modDice = dice;

  for (const relicId of relics) {
    switch (relicId) {
      case 'chaos_orb':
        modDice = modDice.map(d => {
          const max = DICE_TYPES[d.type]?.sides || 6;
          return { ...d, value: Math.min(d.value + 1, max) };
        });
        break;
      case 'lucky_dice':
        modDice = modDice.map(d => {
          // Roll again and keep the higher value
          const faces = getDieFaces(d.type, d.diceClass);
          const reroll = faces[Math.floor(Math.random() * faces.length)];
          return { ...d, value: Math.max(d.value, reroll) };
        });
        break;
    }
  }

  return modDice;
}

// Hook: onEvaluate — modify the effective value or multiplier after expression evaluation.
// Returns { effectiveValue, preventOverkillDamage, bonusMultiplier }
export function triggerOnEvaluate(rawValue, effectiveValue, target, combos) {
  const state = getState();
  const relics = state.player.relics;

  let modValue = effectiveValue;
  let preventOverkillDamage = false;
  let bonusMultiplier = 1;

  for (const relicId of relics) {
    switch (relicId) {
      case 'magnifying_glass':
        if (isPrime(Math.abs(Math.round(rawValue)))) {
          bonusMultiplier *= 1.5;
        }
        break;
      case 'modular_ring':
        if (modValue > target && target > 0) {
          modValue = (modValue % target) || target;
          preventOverkillDamage = true;
        }
        break;
      case 'berserker_mark':
        preventOverkillDamage = true;
        bonusMultiplier *= 0.8;
        break;
      case 'decimal_lens':
        modValue = Math.round(modValue);
        break;
      case 'head_start':
        if (combatTurnCount === 1) {
          modValue += 5;
        }
        break;
      case 'glass_cannon':
        bonusMultiplier *= 1.5;
        break;
      case 'golden_ratio':
        if (isFibonacci(Math.abs(Math.round(rawValue)))) {
          updatePlayer({ hp: Math.min(getState().player.maxHp, getState().player.hp + 3) });
        }
        break;
      case 'perfectionist':
        if (Math.abs(modValue - target) < 0.001) {
          const st = getState();
          updatePlayer({ maxHp: st.player.maxHp + 2, hp: st.player.hp + 2 });
        }
        break;
    }
  }

  modValue = Math.round(modValue * bonusMultiplier);
  combatTurnCount++;

  return { effectiveValue: modValue, preventOverkillDamage, bonusMultiplier };
}

// Hook: onTakeDamage — modify incoming damage to the player.
// Returns the modified damage amount.
export function triggerOnTakeDamage(damage) {
  const state = getState();
  const relics = state.player.relics;
  let modDamage = damage;

  for (const relicId of relics) {
    switch (relicId) {
      case 'thick_skin':
        modDamage = Math.max(0, modDamage - 2);
        break;
      case 'rubber_shield':
        if (!rubberShieldUsed) {
          rubberShieldUsed = true;
          modDamage = 0;
        }
        break;
      case 'double_or_nothing':
        // Double retaliation damage (the gold bonus is handled in onGoldGain)
        modDamage = modDamage * 2;
        break;
    }
  }

  return modDamage;
}

// Hook: onTakeDamage (lethal) — check for phoenix feather.
// Returns true if death was prevented.
export function triggerLethalCheck(finalHp) {
  if (finalHp > 0) return { prevented: false, hp: finalHp };

  const state = getState();
  const relics = [...state.player.relics];

  const phoenixIdx = relics.indexOf('phoenix_feather');
  if (phoenixIdx >= 0) {
    relics.splice(phoenixIdx, 1);
    updatePlayer({ relics });
    return { prevented: true, hp: 1, message: 'Phoenix Feather saves you from death!' };
  }

  return { prevented: false, hp: finalHp };
}

// Hook: onGoldGain — modify gold earned.
export function triggerOnGoldGain(baseGold, combos, wasExactHit) {
  const state = getState();
  const relics = state.player.relics;
  let modGold = baseGold;

  for (const relicId of relics) {
    switch (relicId) {
      case 'gold_magnet':
        modGold = Math.floor(modGold * 1.25);
        break;
      case 'combo_crown':
        if (combos && combos.length > 0) {
          modGold += combos.length * 5;
        }
        break;
      case 'sharpened_mind':
        if (wasExactHit) {
          modGold = Math.floor(modGold * 1.5);
        }
        break;
      case 'echo_chamber':
        // Double the combo multiplier effect on gold
        if (combos && combos.length > 0) {
          modGold = Math.floor(modGold * 2);
        }
        break;
      case 'double_or_nothing':
        if (wasExactHit) {
          modGold = Math.floor(modGold * 3);
        }
        break;
    }
  }

  return modGold;
}

// Hook: onCombatEnd — apply post-combat effects.
export function triggerOnCombatEnd(victory) {
  if (!victory) return;

  const state = getState();
  const relics = state.player.relics;

  for (const relicId of relics) {
    switch (relicId) {
      case 'alchemist_flask':
        updatePlayer({ hp: Math.min(state.player.maxHp, state.player.hp + 3) });
        break;
    }
  }
}

// Hook: onReroll — triggered when player rerolls dice.
export function triggerOnReroll() {
  const state = getState();
  const relics = state.player.relics;

  for (const relicId of relics) {
    switch (relicId) {
      case 'second_wind':
        updatePlayer({ hp: Math.min(state.player.maxHp, state.player.hp + 1) });
        break;
    }
  }
}

// Check if player has a specific relic
export function hasRelic(relicId) {
  const state = getState();
  return state.player.relics.includes(relicId);
}
