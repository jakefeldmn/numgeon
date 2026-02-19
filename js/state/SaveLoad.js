import { getState } from './GameState.js';

const SAVE_KEY = 'numgeon_save';

export function saveGame() {
  try {
    const state = getState();
    if (!state || !state.map) return false;

    const saveData = {
      run: state.run,
      player: {
        hp: state.player.hp,
        maxHp: state.player.maxHp,
        gold: state.player.gold,
        dicePool: state.player.dicePool.map(d => ({
          id: d.id, type: d.type, diceClass: d.diceClass,
        })),
        operatorHand: [...state.player.operatorHand],
        relics: [...state.player.relics],
        rerollsPerTurn: state.player.rerollsPerTurn,
      },
      map: {
        nodes: state.map.nodes,
        edges: state.map.edges,
        currentNodeId: state.map.currentNodeId,
        rows: state.map.rows,
        cols: state.map.cols,
      },
    };

    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    return true;
  } catch (e) {
    console.error('Failed to save game:', e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load game:', e);
    return null;
  }
}

export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}
