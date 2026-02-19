import { getDieFaces } from '../data/dice.js';

export function rollAllDice(dicePool, rng) {
  return dicePool.map(die => {
    const faces = getDieFaces(die.type, die.diceClass);
    return {
      ...die,
      value: rng.pick(faces),
      held: false,
    };
  });
}

export function rollSingleDie(die, rng) {
  const faces = getDieFaces(die.type, die.diceClass);
  return {
    ...die,
    value: rng.pick(faces),
  };
}

export function rerollUnheld(dicePool, rng) {
  return dicePool.map(die => {
    if (die.held) return die;
    const faces = getDieFaces(die.type, die.diceClass);
    return {
      ...die,
      value: rng.pick(faces),
    };
  });
}
