import { getState, updatePlayer, setCombat, incrementRunStat, setRunStatMax } from '../state/GameState.js';
import { createMonsterInstance, getMonstersByTier, getElitesByTier } from '../data/monsters.js';
import { rollAllDice, rerollUnheld } from './DiceRoller.js';
import { evaluate } from './ExpressionEngine.js';
import { evaluateCombos } from './ScoringEngine.js';
import { CONDITIONS, pickConditions, validateConditions, calculateDamage } from '../data/conditions.js';
import {
  triggerCombatStart, triggerOnRoll, triggerOnEvaluate,
  triggerOnTakeDamage, triggerLethalCheck, triggerOnGoldGain,
  triggerOnCombatEnd, triggerOnReroll,
} from './RelicManager.js';
import { createRNG } from '../utils/random.js';
import { eventBus } from '../utils/eventBus.js';
import { isPrime, isPalindrome, isPerfectSquare } from '../utils/math.js';

let combatRng = null;

export function startCombat(monsterId, isElite = false) {
  const state = getState();
  combatRng = createRNG(state.run.seed + state.run.floor * 1000);

  if (!monsterId) {
    const pool = isElite ? getElitesByTier(2) : getMonstersByTier(1);
    monsterId = combatRng.pick(pool);
  }

  const ascension = state.run.ascension || 0;
  const monster = createMonsterInstance(monsterId, combatRng, state.run.floor, ascension);

  // Pick combat conditions for this encounter
  const conditions = pickConditions(state.run.floor, combatRng, monster.hp, state.player.operatorHand, ascension);

  // If decimal_target condition, make the target a decimal
  if (conditions.includes('decimal_target')) {
    const decimalPart = combatRng.pick([0.5, 0.25, 0.75]);
    monster.hp = Math.floor(monster.hp) + decimalPart;
    monster.maxHp = monster.hp;
  }

  // Create dice with null values first (blank), then roll
  const blankDice = state.player.dicePool.map(d => ({ ...d, value: null, held: false }));

  const condNames = conditions.map(id => {
    const c = CONDITIONS[id];
    return `${c.icon} ${c.name}: ${c.description}`;
  });

  const log = [`A ${monster.name} appears! Target: ${monster.hp}`];
  if (condNames.length > 0) {
    log.push(`Conditions: ${condNames.join(' | ')}`);
  }

  // Set combat with blank dice first
  setCombat({
    monster,
    dice: blankDice,
    conditions,
    turn: 1,
    rerollsLeft: state.player.rerollsPerTurn,
    phase: 'building',
    expressionSlots: [],
    log,
    bossTargetRerollUsed: false,
  });

  // Now roll — the UI will animate from blank to values
  let dice = rollAllDice(state.player.dicePool, combatRng);
  dice = triggerOnRoll(dice);

  const combatMods = triggerCombatStart(dice, state.player.rerollsPerTurn, combatRng);
  dice = combatMods.dice;
  const rerolls = combatMods.rerolls;

  setCombat({
    ...getState().combat,
    dice,
    rerollsLeft: rerolls,
  });

  eventBus.emit('combatStart', { monster, dice, conditions });
}

export function rerollDice() {
  const state = getState();
  const combat = state.combat;
  if (!combat || combat.rerollsLeft <= 0) return false;

  const placedDiceIds = combat.expressionSlots
    .filter(t => t.type === 'number')
    .map(t => t.dieId);

  let dice = rerollUnheld(combat.dice, combatRng);
  dice = triggerOnRoll(dice);
  triggerOnReroll();

  setCombat({
    ...combat,
    dice,
    rerollsLeft: combat.rerollsLeft - 1,
    expressionSlots: combat.expressionSlots.filter(t =>
      !placedDiceIds.includes(t.dieId) || combat.dice.find(d => d.id === t.dieId)?.held
    ),
    log: [...combat.log, 'Rerolled unheld dice!'],
  });

  eventBus.emit('diceRerolled', { dice });
  return true;
}

export function rerollBossTarget() {
  const state = getState();
  const combat = state.combat;
  if (!combat || !combat.monster.boss || combat.bossTargetRerollUsed) return false;

  const hpRange = combat.monster.hpRange;
  if (!hpRange) return false;

  // Generate a new HP within the original range, with floor scaling like createMonsterInstance
  let newHp = combatRng.nextInt(hpRange[0], hpRange[1]);
  const hpMultiplier = Math.pow(1.15, state.run.floor);
  newHp = Math.round(newHp * hpMultiplier);
  // Ascension 5: Tougher Hides
  if ((state.run.ascension || 0) >= 5) {
    newHp = Math.round(newHp * 1.15);
  }
  newHp = Math.max(5, newHp);

  const updatedMonster = { ...combat.monster, hp: newHp, maxHp: newHp };

  setCombat({
    ...combat,
    monster: updatedMonster,
    bossTargetRerollUsed: true,
    expressionSlots: [],
    log: [...combat.log, `Boss target rerolled! New target: ${newHp}`],
  });

  eventBus.emit('bossTargetRerolled', { newHp });
  return true;
}

export function toggleHoldDie(dieId) {
  const state = getState();
  const combat = state.combat;
  if (!combat) return;

  const dice = combat.dice.map(d =>
    d.id === dieId ? { ...d, held: !d.held } : d
  );

  setCombat({ ...combat, dice });
}

export function placeToken(token, slotIndex) {
  const state = getState();
  const combat = state.combat;
  if (!combat || combat.phase !== 'building') return;

  const slots = [...combat.expressionSlots];

  if (slotIndex !== undefined && slotIndex <= slots.length) {
    slots.splice(slotIndex, 0, token);
  } else {
    slots.push(token);
  }

  setCombat({ ...combat, expressionSlots: slots });
  eventBus.emit('expressionChanged', { slots });
}

export function removeToken(slotIndex) {
  const state = getState();
  const combat = state.combat;
  if (!combat || combat.phase !== 'building') return;

  const removed = combat.expressionSlots[slotIndex];
  const slots = combat.expressionSlots.filter((_, i) => i !== slotIndex);

  setCombat({ ...combat, expressionSlots: slots });
  eventBus.emit('expressionChanged', { slots });
  return removed;
}

export function moveToken(fromIndex, toIndex) {
  const state = getState();
  const combat = state.combat;
  if (!combat || combat.phase !== 'building') return;

  const slots = [...combat.expressionSlots];
  if (fromIndex < 0 || fromIndex >= slots.length) return;
  if (toIndex < 0 || toIndex > slots.length) return;

  const [token] = slots.splice(fromIndex, 1);
  // Adjust toIndex if it was after the removed element
  const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex;
  slots.splice(insertAt, 0, token);

  setCombat({ ...combat, expressionSlots: slots });
  eventBus.emit('expressionChanged', { slots });
}

export function clearExpression() {
  const state = getState();
  const combat = state.combat;
  if (!combat) return;

  setCombat({ ...combat, expressionSlots: [] });
  eventBus.emit('expressionChanged', { slots: [] });
}

export function evaluateExpression() {
  const state = getState();
  const combat = state.combat;
  if (!combat || combat.phase !== 'building') return null;

  const result = evaluate(combat.expressionSlots);
  if (!result.valid) {
    eventBus.emit('evaluationError', { error: result.error });
    return result;
  }

  const conditions = combat.conditions || [];
  const target = combat.monster.hp;
  const rawValue = result.result;

  // --- Validate conditions (dice count, operator count, etc.) ---
  const condCheck = validateConditions(conditions, rawValue, combat.expressionSlots);
  if (!condCheck.valid) {
    eventBus.emit('evaluationError', { error: condCheck.reason });
    return { valid: false, error: condCheck.reason };
  }

  // Check use_all_dice separately (needs total dice count)
  if (conditions.includes('use_all_dice')) {
    const diceUsed = combat.expressionSlots.filter(t => t.type === 'number').length;
    if (diceUsed < combat.dice.length) {
      eventBus.emit('evaluationError', { error: 'Must use ALL dice!' });
      return { valid: false, error: 'Must use ALL dice!' };
    }
  }

  // --- Boss ability check: restrict which results deal damage ---
  let bossBlocked = false;
  if (combat.monster.bossAbility) {
    if (combat.monster.id === 'prime_minister' && !isPrime(Math.round(rawValue))) {
      bossBlocked = true;
    } else if (combat.monster.id === 'palindromer' && !isPalindrome(Math.round(rawValue))) {
      bossBlocked = true;
    } else if (combat.monster.id === 'the_infinity' && !isPerfectSquare(Math.round(rawValue))) {
      bossBlocked = true;
    }
  }

  // --- Scoring: detect combos and compute multiplier ---
  const scoring = evaluateCombos({
    result: rawValue,
    target,
    tokens: combat.expressionSlots,
    totalDice: combat.dice.length,
  });

  // Multiplier now affects GOLD, not the damage value.
  // The raw expression result is used directly for damage calculation.
  const damageValue = rawValue;

  // --- Relic hook: onEvaluate ---
  const evalMods = triggerOnEvaluate(rawValue, damageValue, target, scoring.combos);

  const log = [...combat.log];

  // Log combos
  if (scoring.combos.length > 0) {
    const comboNames = scoring.combos.map(c => `${c.emoji} ${c.name} (x${c.multiplier})`).join(', ');
    log.push(`COMBOS: ${comboNames} \u2192 x${scoring.totalMultiplier} gold!`);
  }

  // --- Calculate damage using conditions system ---
  let damageResult;
  if (bossBlocked) {
    // Boss ability nullifies the damage entirely
    damageResult = {
      dealt: 0,
      exact: false,
      overkill: false,
      underkill: false,
      nearMiss: false,
      retaliate: true, // boss retaliates when ability blocks
      reason: `${combat.monster.bossAbility} Your result of ${Math.round(rawValue)} was blocked!`,
    };
  } else {
    const ascLvl = state.run.ascension || 0;
    damageResult = calculateDamage(conditions, damageValue, target, ascLvl);
  }

  let playerHp = state.player.hp;
  let newMonsterHp = combat.monster.hp;
  let goldBonus = 0;

  // Roll the monster's attack dice (fixed count from monster data)
  const attackDieSides = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };
  const atkSides = attackDieSides[combat.monster.attackDie] || 6;
  const attackRolls = damageResult.retaliate ? (combat.monster.attackDiceCount || 1) : 0;
  const attackRollResults = [];
  let totalDamageTaken = 0;

  for (let i = 0; i < attackRolls; i++) {
    const roll = combatRng.nextInt(1, atkSides);
    attackRollResults.push(roll);
    totalDamageTaken += roll;
  }

  // Apply relic damage reduction
  if (totalDamageTaken > 0) {
    totalDamageTaken = triggerOnTakeDamage(totalDamageTaken);
  }

  // Prevent overkill damage via relic
  if (damageResult.overkill && evalMods.preventOverkillDamage) {
    totalDamageTaken = 0;
  }

  playerHp = Math.max(0, playerHp - totalDamageTaken);

  if (damageResult.exact) {
    newMonsterHp = 0;
    goldBonus = Math.floor(target / 2) + 10;
    log.push(`EXACT HIT! ${damageValue} = ${target}. Bonus gold!`);
  } else if (damageResult.nearMiss) {
    newMonsterHp = 0;
    const rollStr = attackRollResults.join(' + ');
    log.push(`Near miss! Monster slain, but it rolls ${attackRolls}${combat.monster.attackDie}: [${rollStr}] = ${totalDamageTaken} damage!`);
  } else if (damageResult.overkill) {
    newMonsterHp = 0;
    if (totalDamageTaken > 0) {
      const rollStr = attackRollResults.join(' + ');
      log.push(`Overkill! Monster slain, but it rolls ${attackRolls}${combat.monster.attackDie}: [${rollStr}] = ${totalDamageTaken} damage!`);
    } else {
      log.push(`Overkill! Monster slain!${evalMods.preventOverkillDamage ? ' (overkill damage prevented)' : ''}`);
    }
  } else if (damageResult.underkill) {
    newMonsterHp = Math.ceil(target - damageResult.dealt);
    const rollStr = attackRollResults.join(' + ');
    log.push(`Underkill! Monster has ${newMonsterHp} HP left. It rolls ${attackRolls}${combat.monster.attackDie}: [${rollStr}] = ${totalDamageTaken} damage!`);
  } else if (damageResult.dealt === 0) {
    const rollStr = attackRollResults.join(' + ');
    log.push(`${damageResult.reason} Monster rolls ${attackRolls}${combat.monster.attackDie}: [${rollStr}] = ${totalDamageTaken} damage!`);
  }

  // Relic hook: lethal check
  const lethalCheck = triggerLethalCheck(playerHp);
  if (lethalCheck.prevented) {
    playerHp = lethalCheck.hp;
    log.push(lethalCheck.message);
  }

  const monsterDead = newMonsterHp <= 0;
  const playerDead = playerHp <= 0;
  const wasExactHit = damageResult.exact;
  const wasNearMiss = damageResult.nearMiss || false;

  // Gold calculation — combos multiply gold earned
  let baseGold = monsterDead ? (combat.monster.elite ? 30 : 15) + Math.floor(state.run.floor * 2) : 0;
  baseGold += goldBonus;
  // Ascension 4: Stingy Monsters — earn 30% less gold from combat
  if ((state.run.ascension || 0) >= 4) {
    baseGold = Math.floor(baseGold * 0.7);
  }
  // Apply combo multiplier to gold
  let comboGold = Math.floor(baseGold * scoring.totalMultiplier);
  const totalGold = triggerOnGoldGain(comboGold, scoring.combos, wasExactHit);

  updatePlayer({
    hp: playerHp,
    gold: state.player.gold + totalGold,
  });

  let phase = 'building';
  if (monsterDead) {
    phase = 'victory';
    log.push(`Victory! Earned ${totalGold} gold.${scoring.totalMultiplier > 1 ? ` (x${scoring.totalMultiplier} from combos!)` : ''}`);
    triggerOnCombatEnd(true);
  } else if (playerDead) {
    phase = 'defeat';
    log.push('You have been defeated...');
    triggerOnCombatEnd(false);
  }

  // --- Per-run stat tracking ---
  incrementRunStat('turnsPlayed');
  if (damageResult.dealt > 0) incrementRunStat('totalDamageDealt', Math.round(damageResult.dealt));
  if (totalDamageTaken > 0) incrementRunStat('totalDamageTaken', totalDamageTaken);
  if (wasExactHit) incrementRunStat('exactHits');
  if (scoring.combos.length > 0) {
    incrementRunStat('totalCombosTriggered', scoring.combos.length);
    setRunStatMax('bestComboMultiplier', scoring.totalMultiplier);
  }
  if (totalGold > 0) incrementRunStat('goldEarned', totalGold);
  if (monsterDead) incrementRunStat('monstersKilled');

  const updatedMonster = { ...combat.monster, hp: newMonsterHp };

  // Next turn: start with blank dice, then roll
  let newDice = combat.dice;
  let newRerolls = combat.rerollsLeft;
  if (!monsterDead && !playerDead) {
    // Blank dice first
    newDice = state.player.dicePool.map(d => ({ ...d, value: null, held: false }));
    newRerolls = state.player.rerollsPerTurn;
    log.push(`--- Turn ${combat.turn + 1} --- New target: ${newMonsterHp}`);
  }

  setCombat({
    ...combat,
    monster: updatedMonster,
    dice: newDice,
    turn: monsterDead || playerDead ? combat.turn : combat.turn + 1,
    rerollsLeft: newRerolls,
    phase,
    expressionSlots: [],
    log,
    lastResult: {
      rawValue,
      value: damageValue,
      target,
      exact: wasExactHit,
      nearMiss: wasNearMiss,
      overkill: damageResult.overkill,
      goldEarned: totalGold,
      combos: scoring.combos,
      totalMultiplier: scoring.totalMultiplier,
      attackRolls: attackRollResults,
      attackDie: combat.monster.attackDie,
      damageTaken: totalDamageTaken,
    },
  });

  // If next turn, roll after a brief delay so blank dice show first
  if (!monsterDead && !playerDead) {
    setTimeout(() => {
      const freshCombat = getState().combat;
      if (!freshCombat || freshCombat.phase !== 'building') return;

      let rolledDice = rollAllDice(state.player.dicePool, combatRng);
      rolledDice = triggerOnRoll(rolledDice);
      const turnMods = triggerCombatStart(rolledDice, state.player.rerollsPerTurn, combatRng);
      rolledDice = turnMods.dice;

      setCombat({
        ...getState().combat,
        dice: rolledDice,
        rerollsLeft: turnMods.rerolls,
      });

      eventBus.emit('diceRerolled', { dice: rolledDice });
    }, 200);
  }

  eventBus.emit('combatResolved', {
    result: damageValue,
    rawResult: rawValue,
    target,
    monsterDead,
    playerDead,
    phase,
    combos: scoring.combos,
    totalMultiplier: scoring.totalMultiplier,
  });

  return result;
}

export function getCombatPreview() {
  const state = getState();
  if (!state?.combat) return null;

  const result = evaluate(state.combat.expressionSlots);
  if (!result.valid) return result;

  const target = state.combat.monster.hp;

  const scoring = evaluateCombos({
    result: result.result,
    target,
    tokens: state.combat.expressionSlots,
    totalDice: state.combat.dice.length,
  });

  // Check conditions validity for the preview
  const conditions = state.combat.conditions || [];
  const condCheck = validateConditions(conditions, result.result, state.combat.expressionSlots);

  // Boss ability preview warning
  let bossWarning = null;
  const monster = state.combat.monster;
  if (monster.bossAbility) {
    const rounded = Math.round(result.result);
    if (monster.id === 'prime_minister' && !isPrime(rounded)) {
      bossWarning = `Not prime! ${monster.bossAbility}`;
    } else if (monster.id === 'palindromer' && !isPalindrome(rounded)) {
      bossWarning = `Not a palindrome! ${monster.bossAbility}`;
    } else if (monster.id === 'the_infinity' && !isPerfectSquare(rounded)) {
      bossWarning = `Not a perfect square! ${monster.bossAbility}`;
    }
  }

  // Damage consequence preview — uses monster's fixed attack dice
  let damagePreview = null;
  const atkDie = monster.attackDie || 'd6';
  const atkCount = monster.attackDiceCount || 1;
  const attackDieSides = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };
  const sides = attackDieSides[atkDie] || 6;

  if (condCheck.valid && !bossWarning) {
    const ascLvl = state.run.ascension || 0;
    const dmgResult = calculateDamage(conditions, result.result, target, ascLvl);
    const rollCount = dmgResult.retaliate ? atkCount : 0;
    damagePreview = {
      ...dmgResult,
      attackDie: atkDie,
      attackDiceCount: rollCount,
      minDamage: rollCount * 1,
      maxDamage: rollCount * sides,
      diff: Math.abs(result.result - target),
    };
  } else if (bossWarning) {
    damagePreview = { retaliate: true, attackDie: atkDie, attackDiceCount: atkCount, minDamage: atkCount, maxDamage: atkCount * sides, bossBlocked: true };
  }

  return {
    ...result,
    combos: scoring.combos,
    totalMultiplier: scoring.totalMultiplier,
    conditionError: condCheck.valid ? null : condCheck.reason,
    bossWarning,
    damagePreview,
  };
}
