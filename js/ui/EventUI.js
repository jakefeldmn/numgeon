import { getState, updatePlayer } from '../state/GameState.js';
import { pickEvent, resolveChoice } from '../systems/EventSystem.js';
import { eventBus } from '../utils/eventBus.js';
import { playClick, playHeal, playGold } from '../utils/audio.js';

let currentEvent = null;

export function openEvent(rng) {
  currentEvent = pickEvent(rng);
  renderEvent(rng);
}

function renderEvent(rng) {
  const container = document.getElementById('event-screen');
  if (!container || !currentEvent) return;

  // Custom interactive rendering for special events
  if (currentEvent.customRender) {
    const state = getState();
    currentEvent.customRender(container, rng, state, (result) => {
      if (result.changes && Object.keys(result.changes).length > 0) {
        const beforeState = getState();
        updatePlayer(result.changes);
        if (result.changes.hp && result.changes.hp > beforeState.player.hp) playHeal();
        if (result.changes.gold && result.changes.gold > beforeState.player.gold) playGold();
      }
      renderResult(result);
    });
    return;
  }

  container.innerHTML = `
    <div class="event-content">
      <div class="event-title">${currentEvent.title}</div>
      <div class="event-text">${currentEvent.text}</div>
      <div class="event-choices">
        ${currentEvent.choices.map((c, i) => `
          <div class="event-choice-card" data-choice="${i}">
            <div class="event-choice-text">${c.text}</div>
            <div class="event-choice-risk">${c.risk}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.event-choice-card').forEach(el => {
    el.addEventListener('click', () => {
      playClick();
      const idx = parseInt(el.dataset.choice);
      const state = getState();
      const result = resolveChoice(currentEvent, idx, state, rng);

      if (result.changes && Object.keys(result.changes).length > 0) {
        updatePlayer(result.changes);
        // Play appropriate sound based on outcome
        if (result.changes.hp && result.changes.hp > state.player.hp) playHeal();
        if (result.changes.gold && result.changes.gold > state.player.gold) playGold();
      }

      renderResult(result);
    });
  });
}

function renderResult(result) {
  const container = document.getElementById('event-screen');
  if (!container) return;

  const colorClass = result.positive === true ? 'positive' :
                     result.positive === false ? 'negative' : 'neutral';

  container.innerHTML = `
    <div class="event-content">
      <div class="event-title">${currentEvent.title}</div>
      <div class="event-result ${colorClass}">
        ${result.message}
      </div>
      <button class="btn btn-primary" id="btn-event-done">Continue</button>
    </div>
  `;

  document.getElementById('btn-event-done').addEventListener('click', () => {
    currentEvent = null;
    eventBus.emit('eventDone');
  });
}
