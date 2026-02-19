import { getState } from '../state/GameState.js';
import { RELICS } from '../data/relics.js';
import { eventBus } from '../utils/eventBus.js';
import { toggleMute } from '../utils/audio.js';

const hudEl = document.getElementById('player-hud');
let isMuted = false;

export function initHUD() {
  render();
  eventBus.on('playerChanged', render);
  eventBus.on('stateChanged', render);
}

export function showHUD() {
  hudEl.classList.remove('hidden');
}

export function hideHUD() {
  hudEl.classList.add('hidden');
}

function render() {
  const state = getState();
  if (!state) return;

  const { player, run } = state;
  const hpPct = (player.hp / player.maxHp) * 100;

  const relicHtml = player.relics.length > 0
    ? `<div class="hud-relics">${player.relics.map(id => {
        const r = RELICS[id];
        return r ? `<span class="hud-relic" title="${r.name}: ${r.description}">${r.emoji}</span>` : '';
      }).join('')}</div>`
    : '';

  hudEl.innerHTML = `
    <div class="hud-stat">
      <span class="hud-hp">HP ${player.hp}/${player.maxHp}</span>
      <div class="hp-bar-container">
        <div class="hp-bar-fill" style="width: ${hpPct}%"></div>
      </div>
    </div>
    <div class="hud-stat">
      <span class="hud-gold">Gold ${player.gold}</span>
    </div>
    ${relicHtml}
    <div class="hud-stat hud-floor">
      Act ${run.act} / Floor ${run.floor + 1}
    </div>
    <button class="hud-mute-btn" id="btn-mute" title="Toggle sound">${isMuted ? '🔇' : '🔊'}</button>
    <button class="hud-giveup-btn" id="btn-giveup" title="Give up run">Give Up</button>
  `;

  document.getElementById('btn-mute')?.addEventListener('click', () => {
    isMuted = toggleMute();
    document.getElementById('btn-mute').textContent = isMuted ? '🔇' : '🔊';
  });

  document.getElementById('btn-giveup')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to give up this run?')) {
      eventBus.emit('giveUp');
    }
  });
}
