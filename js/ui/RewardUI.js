import { getState, updatePlayer } from '../state/GameState.js';
import { OPERATORS } from '../data/operators.js';
import { DICE_TYPES } from '../data/dice.js';
import { RELICS, getRelicPool } from '../data/relics.js';
import { applyPickupEffect } from '../systems/RelicManager.js';
import { generateOperatorReward } from '../data/rewards.js';
import { eventBus } from '../utils/eventBus.js';
import { playClick, playHeal } from '../utils/audio.js';

export function openReward(isElite, exactHit, rng) {
  const state = getState();
  const floor = state.run.floor;

  const operatorChoices = generateOperatorReward(floor, rng);

  // Elite fights also offer a relic choice
  let relicChoices = [];
  if (isElite) {
    relicChoices = generateRelicChoices(floor, state.player.relics, rng);
  }

  renderReward(operatorChoices, relicChoices, isElite);
}

function generateRelicChoices(floor, ownedRelics, rng) {
  const pool = getRelicPool(floor).filter(id => !ownedRelics.includes(id));
  if (pool.length === 0) return [];
  const shuffled = rng.shuffle(pool);
  return shuffled.slice(0, Math.min(3, shuffled.length));
}

function renderReward(operatorChoices, relicChoices, isElite) {
  const container = document.getElementById('reward-screen');
  if (!container) return;

  // Operator cards
  const opCards = operatorChoices.map((opId, i) => {
    const op = OPERATORS[opId];
    if (!op) return '';
    return `
      <div class="reward-op-card rarity-${op.rarity}" data-pick-op="${i}" data-op-id="${opId}">
        <div class="reward-op-symbol">${op.symbol}</div>
        <div class="reward-op-name">${op.name}</div>
        <div class="reward-op-desc">${op.description}</div>
        <div class="reward-op-rarity">${op.rarity}</div>
      </div>`;
  }).join('');

  // Relic cards (elite only)
  let relicSection = '';
  if (relicChoices.length > 0) {
    const relicCards = relicChoices.map((relicId, i) => {
      const r = RELICS[relicId];
      if (!r) return '';
      return `
        <div class="reward-relic-card rarity-${r.rarity}" data-pick-relic="${i}" data-relic-id="${relicId}">
          <div class="reward-relic-emoji">${r.emoji}</div>
          <div class="reward-relic-name">${r.name}</div>
          <div class="reward-relic-desc">${r.description}</div>
          <div class="reward-op-rarity">${r.rarity}</div>
        </div>`;
    }).join('');

    relicSection = `
      <div class="reward-subtitle" style="margin-top: 12px;">Choose a relic:</div>
      <div class="reward-relic-choices">${relicCards}</div>
    `;
  }

  container.innerHTML = `
    <div class="reward-content">
      <div class="reward-title">${isElite ? 'Elite ' : ''}Victory Reward</div>
      <div class="reward-subtitle">Choose an operator to add to your hand:</div>
      <div class="reward-op-choices">${opCards}</div>
      ${relicSection}
      <button class="btn btn-small" id="btn-skip-reward" style="margin-top: 12px;">Skip</button>
    </div>
  `;

  // Bind operator picks
  container.querySelectorAll('[data-pick-op]').forEach(el => {
    el.addEventListener('click', () => {
      playClick();
      const opId = el.dataset.opId;
      const state = getState();
      updatePlayer({
        operatorHand: [...state.player.operatorHand, opId],
      });

      // If there are relic choices, show just those remaining
      if (relicChoices.length > 0) {
        renderRelicOnly(relicChoices);
      } else {
        eventBus.emit('rewardDone');
      }
    });
  });

  // Bind relic picks
  container.querySelectorAll('[data-pick-relic]').forEach(el => {
    el.addEventListener('click', () => {
      playClick();
      const relicId = el.dataset.relicId;
      pickRelic(relicId);
      eventBus.emit('rewardDone');
    });
  });

  document.getElementById('btn-skip-reward')?.addEventListener('click', () => {
    playClick();
    eventBus.emit('rewardDone');
  });
}

function renderRelicOnly(relicChoices) {
  const container = document.getElementById('reward-screen');
  if (!container) return;

  const relicCards = relicChoices.map((relicId, i) => {
    const r = RELICS[relicId];
    if (!r) return '';
    return `
      <div class="reward-relic-card rarity-${r.rarity}" data-pick-relic="${i}" data-relic-id="${relicId}">
        <div class="reward-relic-emoji">${r.emoji}</div>
        <div class="reward-relic-name">${r.name}</div>
        <div class="reward-relic-desc">${r.description}</div>
        <div class="reward-op-rarity">${r.rarity}</div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="reward-content">
      <div class="reward-title">Choose a Relic</div>
      <div class="reward-relic-choices">${relicCards}</div>
      <button class="btn btn-small" id="btn-skip-relic" style="margin-top: 12px;">Skip</button>
    </div>
  `;

  container.querySelectorAll('[data-pick-relic]').forEach(el => {
    el.addEventListener('click', () => {
      playClick();
      const relicId = el.dataset.relicId;
      pickRelic(relicId);
      eventBus.emit('rewardDone');
    });
  });

  document.getElementById('btn-skip-relic')?.addEventListener('click', () => {
    playClick();
    eventBus.emit('rewardDone');
  });
}

function pickRelic(relicId) {
  const state = getState();
  if (state.player.relics.includes(relicId)) return;

  updatePlayer({
    relics: [...state.player.relics, relicId],
  });

  // Apply one-time pickup effects
  applyPickupEffect(relicId);
}

// Rest site UI
export function openRestSite() {
  const container = document.getElementById('rest-screen');
  if (!container) return;

  const state = getState();
  // Ascension 6: No Free Lunch — rest heals 20% instead of 30%
  const healPercent = (state.run.ascension || 0) >= 6 ? 0.2 : 0.3;
  const healAmount = Math.floor(state.player.maxHp * healPercent);

  const upgradable = state.player.dicePool.filter(d => DICE_TYPES[d.type]?.upgradeTo != null);

  container.innerHTML = `
    <div class="rest-content">
      <div class="rest-title">Rest Site</div>
      <div class="rest-text">You find a campfire in a quiet alcove. The flames dance with mathematical precision.</div>
      <div class="rest-choices">
        <div class="rest-choice-card" id="btn-rest-heal">
          <div class="rest-choice-icon" style="color: var(--accent-red);">\u2665</div>
          <div class="rest-choice-name">Rest</div>
          <div class="rest-choice-desc">Heal ${healAmount} HP (${state.player.hp} \u2192 ${Math.min(state.player.maxHp, state.player.hp + healAmount)})</div>
        </div>
        <div class="rest-choice-card ${upgradable.length === 0 ? 'disabled' : ''}" id="btn-rest-upgrade">
          <div class="rest-choice-icon" style="color: var(--accent-blue);">\u2B06</div>
          <div class="rest-choice-name">Train</div>
          <div class="rest-choice-desc">${upgradable.length > 0 ? 'Upgrade your lowest die by one tier' : 'No dice to upgrade'}</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-rest-heal').addEventListener('click', () => {
    playHeal();
    const s = getState();
    updatePlayer({ hp: Math.min(s.player.maxHp, s.player.hp + healAmount) });
    eventBus.emit('restDone');
  });

  document.getElementById('btn-rest-upgrade').addEventListener('click', () => {
    if (upgradable.length === 0) return;
    playClick();
    const s = getState();
    const TIERS = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
    const pool = s.player.dicePool;

    let worstIdx = -1;
    let worstTier = TIERS.length;
    for (let i = 0; i < pool.length; i++) {
      const tier = TIERS.indexOf(pool[i].type);
      if (tier < worstTier && DICE_TYPES[pool[i].type]?.upgradeTo) {
        worstIdx = i;
        worstTier = tier;
      }
    }

    if (worstIdx >= 0) {
      const newPool = [...pool];
      newPool[worstIdx] = { ...newPool[worstIdx], type: TIERS[worstTier + 1] };
      updatePlayer({ dicePool: newPool });
    }

    eventBus.emit('restDone');
  });
}
