import { EVENTS } from '../data/events.js';

export function pickEvent(rng) {
  return rng.pick(EVENTS);
}

export function resolveChoice(event, choiceIndex, state, rng) {
  const choice = event.choices[choiceIndex];
  if (!choice) return { changes: {}, message: 'Invalid choice.', positive: false };
  return choice.outcome(state, rng);
}
