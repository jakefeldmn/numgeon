export const DICE_TYPES = {
  d4:  { sides: 4,  name: 'd4',  color: '#e74c3c', upgradeTo: 'd6',  cost: 75 },
  d6:  { sides: 6,  name: 'd6',  color: '#3498db', upgradeTo: 'd8',  cost: 100 },
  d8:  { sides: 8,  name: 'd8',  color: '#2ecc71', upgradeTo: 'd10', cost: 125 },
  d10: { sides: 10, name: 'd10', color: '#e67e22', upgradeTo: 'd12', cost: 150 },
  d12: { sides: 12, name: 'd12', color: '#9b59b6', upgradeTo: 'd20', cost: 200 },
  d20: { sides: 20, name: 'd20', color: '#f1c40f', upgradeTo: null,  cost: null },
};

// --- Face generators for each dice class ---
// Each class defines what numbers appear on the faces of a die.
// A "fibonacci d6" has 6 faces, but they show fibonacci numbers instead of 1-6.

function standardFaces(sides) {
  return Array.from({ length: sides }, (_, i) => i + 1);
}

function fibonacciFaces(sides) {
  const fibs = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];
  return fibs.slice(0, sides);
}

function squareFaces(sides) {
  return Array.from({ length: sides }, (_, i) => (i + 1) * (i + 1));
}

function primeFaces(sides) {
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71];
  return primes.slice(0, sides);
}

// Dice classes — define what numbers appear on the faces.
// Standard dice show 1-N. Special dice show different number sequences.
export const DICE_CLASSES = {
  standard: {
    id: 'standard',
    name: 'Standard',
    color: '#ccccdd',
    badge: '',
    description: 'Normal faces: 1, 2, 3, 4, 5, 6...',
    getFaces: standardFaces,
  },
  fibonacci: {
    id: 'fibonacci',
    name: 'Fibonacci',
    color: '#55efc4',
    badge: 'Fib',
    description: 'Fibonacci faces: 1, 1, 2, 3, 5, 8...',
    getFaces: fibonacciFaces,
  },
  square: {
    id: 'square',
    name: 'Square',
    color: '#74b9ff',
    badge: 'Sq',
    description: 'Perfect square faces: 1, 4, 9, 16, 25...',
    getFaces: squareFaces,
  },
  prime: {
    id: 'prime',
    name: 'Prime',
    color: '#b44aff',
    badge: 'Pr',
    description: 'Prime faces: 2, 3, 5, 7, 11, 13...',
    getFaces: primeFaces,
  },
};

// Get the face array for a specific die type + class combination
export function getDieFaces(dieType, diceClass = 'standard') {
  const sides = DICE_TYPES[dieType]?.sides || 6;
  const cls = DICE_CLASSES[diceClass] || DICE_CLASSES.standard;
  return cls.getFaces(sides);
}

// Starting loadouts — player picks one at the start of each run
export const LOADOUTS = {
  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'All normal dice. Predictable numbers, straightforward math.',
    difficulty: 'Easy',
    dice: [
      { type: 'd6', diceClass: 'standard' },
      { type: 'd6', diceClass: 'standard' },
      { type: 'd6', diceClass: 'standard' },
      { type: 'd4', diceClass: 'standard' },
      { type: 'd8', diceClass: 'standard' },
    ],
  },
  naturalist: {
    id: 'naturalist',
    name: 'Naturalist',
    description: 'Fibonacci dice give unusual numbers: 1, 1, 2, 3, 5, 8...',
    difficulty: 'Medium',
    dice: [
      { type: 'd6', diceClass: 'standard' },
      { type: 'd6', diceClass: 'fibonacci' },
      { type: 'd6', diceClass: 'fibonacci' },
      { type: 'd4', diceClass: 'standard' },
      { type: 'd8', diceClass: 'standard' },
    ],
  },
  architect: {
    id: 'architect',
    name: 'Architect',
    description: 'Square dice produce big jumps: 1, 4, 9, 16, 25, 36...',
    difficulty: 'Medium',
    dice: [
      { type: 'd6', diceClass: 'standard' },
      { type: 'd6', diceClass: 'square' },
      { type: 'd4', diceClass: 'square' },
      { type: 'd6', diceClass: 'standard' },
      { type: 'd8', diceClass: 'standard' },
    ],
  },
  chaos: {
    id: 'chaos',
    name: 'Chaos',
    description: 'A wild mix of special dice. Big numbers, weird math.',
    difficulty: 'Hard',
    dice: [
      { type: 'd6', diceClass: 'fibonacci' },
      { type: 'd6', diceClass: 'square' },
      { type: 'd6', diceClass: 'prime' },
      { type: 'd4', diceClass: 'standard' },
      { type: 'd8', diceClass: 'standard' },
    ],
  },
  minimalist: {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Only 3 dice, but they are bigger. Every roll counts.',
    difficulty: 'Hard',
    dice: [
      { type: 'd10', diceClass: 'standard' },
      { type: 'd8', diceClass: 'standard' },
      { type: 'd8', diceClass: 'standard' },
    ],
  },
  gambler: {
    id: 'gambler',
    name: 'Gambler',
    description: 'All prime dice. Weird numbers, but powerful combos if you know your primes.',
    difficulty: 'Expert',
    dice: [
      { type: 'd6', diceClass: 'prime' },
      { type: 'd6', diceClass: 'prime' },
      { type: 'd6', diceClass: 'prime' },
      { type: 'd8', diceClass: 'prime' },
      { type: 'd4', diceClass: 'prime' },
    ],
  },
};

export function createDie(type, id, diceClass = 'standard') {
  return { id, type, diceClass, value: null, held: false };
}

export function getStartingDice(loadoutId = 'standard') {
  const loadout = LOADOUTS[loadoutId] || LOADOUTS.standard;
  return loadout.dice.map((d, i) => createDie(d.type, `die-${i}`, d.diceClass));
}
