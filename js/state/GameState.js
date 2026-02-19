import { getStartingDice } from '../data/dice.js';
import { getStartingOperators } from '../data/operators.js';
import { eventBus } from '../utils/eventBus.js';

let state = null;

const DEFAULT_RUN_STATS = {
  monstersKilled: 0,
  exactHits: 0,
  totalDamageDealt: 0,
  totalDamageTaken: 0,
  totalCombosTriggered: 0,
  bestComboMultiplier: 1,
  turnsPlayed: 0,
  goldEarned: 0,
};

export function createNewRun(seed, loadoutId = 'standard') {
  state = {
    run: {
      seed: seed || Date.now(),
      floor: 0,
      act: 1,
      loadout: loadoutId,
      stats: { ...DEFAULT_RUN_STATS },
    },
    player: {
      hp: 80,
      maxHp: 80,
      gold: 50,
      dicePool: getStartingDice(loadoutId),
      operatorHand: getStartingOperators(),
      relics: [],
      rerollsPerTurn: 1,
    },
    combat: null,
    map: null,
    screen: 'title',
  };
  eventBus.emit('stateChanged', state);
  return state;
}

export function getState() {
  return state;
}

export function updatePlayer(updates) {
  Object.assign(state.player, updates);
  eventBus.emit('stateChanged', state);
  eventBus.emit('playerChanged', state.player);
}

export function setCombat(combat) {
  state.combat = combat;
  eventBus.emit('stateChanged', state);
  eventBus.emit('combatChanged', combat);
}

export function setMap(map) {
  state.map = map;
  eventBus.emit('stateChanged', state);
}

export function setScreen(screen) {
  if (state) state.screen = screen;
  eventBus.emit('screenChanged', screen);
}

export function advanceFloor() {
  state.run.floor++;
  eventBus.emit('stateChanged', state);
}

export function incrementRunStat(key, amount = 1) {
  if (state?.run?.stats && key in state.run.stats) {
    state.run.stats[key] += amount;
  }
}

export function setRunStatMax(key, value) {
  if (state?.run?.stats && key in state.run.stats) {
    state.run.stats[key] = Math.max(state.run.stats[key], value);
  }
}

export function loadState(saved) {
  state = {
    run: {
      ...saved.run,
      stats: saved.run?.stats || { ...DEFAULT_RUN_STATS },
    },
    player: saved.player,
    combat: null,
    map: saved.map,
    screen: 'map',
  };
  eventBus.emit('stateChanged', state);
  eventBus.emit('playerChanged', state.player);
}
