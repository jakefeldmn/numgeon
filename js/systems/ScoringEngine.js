import { isPrime, isPalindrome, isPowerOfTwo } from '../utils/math.js';

// Each combo has an id, display name, check function, and multiplier.
// check receives { result, diceUsed, totalDice, operatorsUsed, tokens }
const COMBOS = [
  {
    id: 'exact_hit',
    name: 'EXACT HIT',
    emoji: '\uD83C\uDFAF',
    multiplier: 1.5,
    color: '#ffd700',
    check: ({ result, target }) => result === target,
  },
  {
    id: 'prime_time',
    name: 'PRIME TIME',
    emoji: '\u2728',
    multiplier: 1.5,
    color: '#b44aff',
    check: ({ result }) => Number.isInteger(result) && result > 1 && isPrime(Math.abs(result)),
  },
  {
    id: 'palindrome',
    name: 'PALINDROME',
    emoji: '\uD83E\uDE9E',
    multiplier: 1.3,
    color: '#4ae7e7',
    check: ({ result }) => isPalindrome(result),
  },
  {
    id: 'power_of_two',
    name: 'POWER OF 2',
    emoji: '\u00B2',
    multiplier: 1.3,
    color: '#e67e22',
    check: ({ result }) => Number.isInteger(result) && isPowerOfTwo(Math.abs(result)) && Math.abs(result) > 2,
  },
  {
    id: 'all_dice',
    name: 'ALL DICE',
    emoji: '\uD83C\uDFB2',
    multiplier: 2.0,
    color: '#ff6b9d',
    check: ({ diceUsed, totalDice }) => totalDice > 1 && diceUsed === totalDice,
  },
  {
    id: 'no_operators',
    name: 'NAKED NUMBER',
    emoji: '\uD83D\uDCAA',
    multiplier: 3.0,
    color: '#ff4a4a',
    check: ({ operatorsUsed, diceUsed }) => operatorsUsed === 0 && diceUsed === 1,
  },
  {
    id: 'the_answer',
    name: 'THE ANSWER',
    emoji: '\uD83D\uDE80',
    multiplier: 1.42,
    color: '#00ff88',
    check: ({ result }) => result === 42,
  },
  {
    id: 'century',
    name: 'CENTURY',
    emoji: '\uD83D\uDCAF',
    multiplier: 2.0,
    color: '#ffd700',
    check: ({ result }) => result === 100,
  },
  {
    id: 'triple_threat',
    name: 'TRIPLE THREAT',
    emoji: '\u2747',
    multiplier: 1.5,
    color: '#ff8800',
    check: ({ tokens }) => {
      const values = tokens.filter(t => t.type === 'number').map(t => t.value);
      const counts = {};
      for (const v of values) counts[v] = (counts[v] || 0) + 1;
      return Object.values(counts).some(c => c >= 3);
    },
  },
  {
    id: 'big_number',
    name: 'GO BIG',
    emoji: '\uD83D\uDCC8',
    multiplier: 1.4,
    color: '#e74c3c',
    check: ({ result }) => Math.abs(result) >= 200,
  },
];

// Evaluate which combos triggered and compute final multiplier.
// Returns { combos: [{ id, name, emoji, multiplier, color }], totalMultiplier }
export function evaluateCombos({ result, target, tokens, totalDice }) {
  const diceUsed = tokens.filter(t => t.type === 'number').length;
  const operatorsUsed = tokens.filter(t => t.type === 'operator').length;

  const context = { result, target, diceUsed, totalDice, operatorsUsed, tokens };

  const triggered = [];
  let totalMultiplier = 1;

  for (const combo of COMBOS) {
    if (combo.check(context)) {
      triggered.push({
        id: combo.id,
        name: combo.name,
        emoji: combo.emoji,
        multiplier: combo.multiplier,
        color: combo.color,
      });
      totalMultiplier *= combo.multiplier;
    }
  }

  // Round to 2 decimals
  totalMultiplier = Math.round(totalMultiplier * 100) / 100;

  return { combos: triggered, totalMultiplier };
}

export function getComboList() {
  return COMBOS.map(c => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    multiplier: c.multiplier,
    color: c.color,
  }));
}
