import { getState, updatePlayer } from '../state/GameState.js';
import { OPERATORS } from '../data/operators.js';
import { DICE_TYPES, DICE_CLASSES } from '../data/dice.js';
import { RELICS } from '../data/relics.js';
import { applyPickupEffect } from '../systems/RelicManager.js';
import {
  generateShopStock, buyOperator, buyDiceUpgrade,
  buyNewDie, removeOperator, buyRelic,
  buyHeal, buyMaxHpUp, duplicateOperator, removeDie,
} from '../systems/ShopSystem.js';
import { eventBus } from '../utils/eventBus.js';
import { playClick, playGold, playHeal } from '../utils/audio.js';

const OP_SORT_GROUP = {
  lparen: 0, rparen: 1, power: 2, log: 3, multiply: 4, divide: 5, modulo: 6,
  add: 7, subtract: 8, negate: 9, sqrt: 10, triangle: 11, rectangle: 12,
  factorial: 13, concat: 14,
};
const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, legendary: 3 };

function sortOperatorHand(hand) {
  return hand.map((opId, i) => ({ opId, i })).sort((a, b) => {
    const ga = OP_SORT_GROUP[a.opId] ?? 99, gb = OP_SORT_GROUP[b.opId] ?? 99;
    if (ga !== gb) return ga - gb;
    return (RARITY_ORDER[OPERATORS[a.opId]?.rarity] ?? 0) - (RARITY_ORDER[OPERATORS[b.opId]?.rarity] ?? 0);
  });
}

let currentStock = null;
let removingOperator = false;
let duplicatingOperator = false;
let removingDie = false;
let shopRng = null;

export function openShop(rng) {
  const state = getState();
  shopRng = rng;
  currentStock = generateShopStock(state.run.floor, state.player, rng, state.run.ascension || 0);
  removingOperator = false;
  duplicatingOperator = false;
  removingDie = false;
  render();
}

export function render() {
  const container = document.getElementById('shop-screen');
  if (!container) return;

  const state = getState();
  const { player } = state;

  container.innerHTML = `
    <div class="shop-header">
      <div class="shop-title">Shop</div>
      <div class="shop-gold">Gold: <span class="gold-amount">${player.gold}</span></div>
    </div>
    <div class="shop-sections">
      ${renderOperatorSection(player)}
      ${renderDiceUpgradeSection(player)}
      ${renderNewDieSection(player)}
      ${renderRelicSection(player)}
      ${renderServicesSection(player)}
    </div>
    <div class="shop-inventory">
      <div class="shop-section-title">Your Inventory</div>
      <div class="shop-inventory-row">
        <span class="inventory-label">Dice:</span>
        ${player.dicePool.map((d, i) => {
          const rmClass = removingDie ? 'removable' : '';
          const cls = DICE_CLASSES[d.diceClass];
          const classLabel = d.diceClass !== 'standard' ? ` ${cls?.badge || ''}` : '';
          return `<span class="inv-die ${rmClass}" data-rm-die="${i}" style="color:${DICE_TYPES[d.type].color}">${d.type}${classLabel}</span>`;
        }).join(' ')}
      </div>
      <div class="shop-inventory-row">
        <span class="inventory-label">Operators:</span>
        ${sortOperatorHand(player.operatorHand).map(({ opId, i }) => {
          const op = OPERATORS[opId];
          const rmClass = removingOperator ? 'removable' : '';
          const dupClass = duplicatingOperator ? 'duplicable' : '';
          return `<span class="inv-op ${rmClass} ${dupClass}" data-rm-index="${i}" data-dup-index="${i}" title="${op?.name}">${op?.symbol || '?'}</span>`;
        }).join(' ')}
      </div>
    </div>
    <button class="btn btn-primary" id="btn-leave-shop">Leave Shop</button>
  `;

  bindEvents(container);
}

function renderOperatorSection(player) {
  if (!currentStock?.operators?.length) return '';

  const cards = currentStock.operators.map((item, i) => {
    const op = OPERATORS[item.opId];
    if (!op) return '';
    const canAfford = player.gold >= item.price;
    return `
      <div class="shop-item ${canAfford ? '' : 'cannot-afford'}" data-buy-op="${i}">
        <div class="shop-item-icon operator-symbol" style="color: var(--accent-blue)">${op.symbol}</div>
        <div class="shop-item-name">${op.name}</div>
        <div class="shop-item-desc">${op.description}</div>
        <div class="shop-item-price">${item.price} gold</div>
      </div>`;
  }).join('');

  return `
    <div class="shop-section">
      <div class="shop-section-title">Operators</div>
      <div class="shop-items">${cards}</div>
    </div>`;
}

function renderDiceUpgradeSection(player) {
  if (!currentStock?.diceUpgrades?.length) return '';

  const cards = currentStock.diceUpgrades.map((item, i) => {
    const fromDice = DICE_TYPES[item.fromType];
    const toDice = DICE_TYPES[item.toType];
    const canAfford = player.gold >= item.price;
    return `
      <div class="shop-item ${canAfford ? '' : 'cannot-afford'}" data-buy-upgrade="${i}">
        <div class="shop-item-icon">
          <span style="color:${fromDice.color}">${item.fromType}</span>
          <span style="color:var(--text-dim)"> \u2192 </span>
          <span style="color:${toDice.color}">${item.toType}</span>
        </div>
        <div class="shop-item-name">Upgrade Die</div>
        <div class="shop-item-desc">Upgrade your ${item.fromType} to a ${item.toType}</div>
        <div class="shop-item-price">${item.price} gold</div>
      </div>`;
  }).join('');

  return `
    <div class="shop-section">
      <div class="shop-section-title">Dice Upgrades</div>
      <div class="shop-items">${cards}</div>
    </div>`;
}

function renderNewDieSection(player) {
  if (!currentStock?.newDie) return '';

  const item = currentStock.newDie;
  const dice = DICE_TYPES[item.type];
  const canAfford = player.gold >= item.price;

  return `
    <div class="shop-section">
      <div class="shop-section-title">New Die</div>
      <div class="shop-items">
        <div class="shop-item ${canAfford ? '' : 'cannot-afford'}" data-buy-new-die>
          <div class="shop-item-icon" style="color:${dice.color}">${item.type}</div>
          <div class="shop-item-name">Buy ${item.type}</div>
          <div class="shop-item-desc">Add a new ${item.type} to your pool</div>
          <div class="shop-item-price">${item.price} gold</div>
        </div>
      </div>
    </div>`;
}

function renderRelicSection(player) {
  if (!currentStock?.relic) return '';

  const item = currentStock.relic;
  const r = RELICS[item.relicId];
  if (!r) return '';
  const canAfford = player.gold >= item.price;

  return `
    <div class="shop-section">
      <div class="shop-section-title">Relic</div>
      <div class="shop-items">
        <div class="shop-item ${canAfford ? '' : 'cannot-afford'}" data-buy-relic>
          <div class="shop-item-icon">${r.emoji}</div>
          <div class="shop-item-name">${r.name}</div>
          <div class="shop-item-desc">${r.description}</div>
          <div class="shop-item-price">${item.price} gold</div>
        </div>
      </div>
    </div>`;
}

function renderServicesSection(player) {
  const services = currentStock?.services;
  if (!services) return '';

  const cards = [];

  // Heal
  if (services.heal) {
    const s = services.heal;
    const canAfford = player.gold >= s.price;
    cards.push(`
      <div class="shop-item ${canAfford ? '' : 'cannot-afford'}" data-buy-heal>
        <div class="shop-item-icon" style="color:var(--accent-green)">\u2764</div>
        <div class="shop-item-name">Heal</div>
        <div class="shop-item-desc">Restore ${s.healAmount} HP</div>
        <div class="shop-item-price">${s.price} gold</div>
      </div>`);
  }

  // Max HP Up
  if (services.maxHpUp) {
    const s = services.maxHpUp;
    const canAfford = player.gold >= s.price;
    cards.push(`
      <div class="shop-item ${canAfford ? '' : 'cannot-afford'}" data-buy-maxhp>
        <div class="shop-item-icon" style="color:var(--accent-red)">\u2B06</div>
        <div class="shop-item-name">Max HP Up</div>
        <div class="shop-item-desc">Permanently gain +${s.amount} Max HP</div>
        <div class="shop-item-price">${s.price} gold</div>
      </div>`);
  }

  // Operator Removal
  if (services.removal) {
    const s = services.removal;
    const canAfford = player.gold >= s.price;
    cards.push(`
      <div class="shop-item ${canAfford ? '' : 'cannot-afford'}" data-remove-op>
        <div class="shop-item-icon" style="color:var(--accent-red)">\u2716</div>
        <div class="shop-item-name">Remove Operator</div>
        <div class="shop-item-desc">${removingOperator ? 'Click an operator below to remove it' : 'Remove one operator from hand'}</div>
        <div class="shop-item-price">${s.price} gold</div>
      </div>`);
  }

  // Operator Duplicate
  if (services.duplicate) {
    const s = services.duplicate;
    const canAfford = player.gold >= s.price;
    cards.push(`
      <div class="shop-item ${canAfford ? '' : 'cannot-afford'}" data-dup-op>
        <div class="shop-item-icon" style="color:var(--accent-purple)">\u2750</div>
        <div class="shop-item-name">Duplicate Op</div>
        <div class="shop-item-desc">${duplicatingOperator ? 'Click an operator below to copy it' : 'Copy one of your operators'}</div>
        <div class="shop-item-price">${s.price} gold</div>
      </div>`);
  }

  // Dice Removal
  if (services.diceRemoval) {
    const s = services.diceRemoval;
    const canAfford = player.gold >= s.price;
    cards.push(`
      <div class="shop-item ${canAfford ? '' : 'cannot-afford'}" data-remove-die>
        <div class="shop-item-icon" style="color:var(--accent-red)">\u2B07</div>
        <div class="shop-item-name">Remove Die</div>
        <div class="shop-item-desc">${removingDie ? 'Click a die below to remove it' : 'Remove one die from your pool'}</div>
        <div class="shop-item-price">${s.price} gold</div>
      </div>`);
  }

  // Reroll Shop
  if (services.reroll) {
    const s = services.reroll;
    const canAfford = player.gold >= s.price;
    cards.push(`
      <div class="shop-item ${canAfford ? '' : 'cannot-afford'}" data-reroll-shop>
        <div class="shop-item-icon" style="color:var(--accent-blue)">\u21BB</div>
        <div class="shop-item-name">Reroll Stock</div>
        <div class="shop-item-desc">Refresh all shop items</div>
        <div class="shop-item-price">${s.price} gold</div>
      </div>`);
  }

  if (cards.length === 0) return '';

  return `
    <div class="shop-section">
      <div class="shop-section-title">Services</div>
      <div class="shop-items">${cards.join('')}</div>
    </div>`;
}

function bindEvents(container) {
  // Buy operator
  container.querySelectorAll('[data-buy-op]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.buyOp);
      const item = currentStock.operators[idx];
      const state = getState();
      const result = buyOperator(item.opId, item.price, state.player);
      if (result.success) {
        playGold();
        updatePlayer(result.changes);
        currentStock.operators.splice(idx, 1);
        render();
      }
    });
  });

  // Buy dice upgrade
  container.querySelectorAll('[data-buy-upgrade]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.buyUpgrade);
      const item = currentStock.diceUpgrades[idx];
      const state = getState();
      const result = buyDiceUpgrade(item.dieId, item.toType, item.price, state.player);
      if (result.success) {
        playGold();
        updatePlayer(result.changes);
        currentStock.diceUpgrades.splice(idx, 1);
        render();
      }
    });
  });

  // Buy new die
  container.querySelector('[data-buy-new-die]')?.addEventListener('click', () => {
    const item = currentStock.newDie;
    const state = getState();
    const result = buyNewDie(item.type, item.price, state.player);
    if (result.success) {
      playGold();
      updatePlayer(result.changes);
      currentStock.newDie = null;
      render();
    }
  });

  // Buy relic
  container.querySelector('[data-buy-relic]')?.addEventListener('click', () => {
    const item = currentStock.relic;
    if (!item) return;
    const state = getState();
    const result = buyRelic(item.relicId, item.price, state.player);
    if (result.success) {
      updatePlayer(result.changes);
      applyPickupEffect(item.relicId);
      currentStock.relic = null;
      render();
    }
  });

  // --- Services ---

  // Heal
  container.querySelector('[data-buy-heal]')?.addEventListener('click', () => {
    const s = currentStock.services.heal;
    if (!s) return;
    const state = getState();
    const result = buyHeal(s.price, s.healAmount, state.player);
    if (result.success) {
      playHeal();
      updatePlayer(result.changes);
      currentStock.services.heal = null;
      render();
    }
  });

  // Max HP Up
  container.querySelector('[data-buy-maxhp]')?.addEventListener('click', () => {
    const s = currentStock.services.maxHpUp;
    if (!s) return;
    const state = getState();
    const result = buyMaxHpUp(s.price, s.amount, state.player);
    if (result.success) {
      updatePlayer(result.changes);
      currentStock.services.maxHpUp = null;
      render();
    }
  });

  // Remove operator (toggle mode)
  container.querySelector('[data-remove-op]')?.addEventListener('click', () => {
    removingOperator = !removingOperator;
    duplicatingOperator = false;
    removingDie = false;
    render();
  });

  // Duplicate operator (toggle mode)
  container.querySelector('[data-dup-op]')?.addEventListener('click', () => {
    duplicatingOperator = !duplicatingOperator;
    removingOperator = false;
    removingDie = false;
    render();
  });

  // Dice removal (toggle mode)
  container.querySelector('[data-remove-die]')?.addEventListener('click', () => {
    removingDie = !removingDie;
    removingOperator = false;
    duplicatingOperator = false;
    render();
  });

  // Reroll shop stock
  container.querySelector('[data-reroll-shop]')?.addEventListener('click', () => {
    const s = currentStock.services.reroll;
    if (!s) return;
    const state = getState();
    if (state.player.gold < s.price) return;
    updatePlayer({ gold: state.player.gold - s.price });
    currentStock = generateShopStock(state.run.floor, getState().player, shopRng, state.run.ascension || 0);
    currentStock.services.reroll = null; // one-time per shop visit
    removingOperator = false;
    duplicatingOperator = false;
    removingDie = false;
    render();
  });

  // Click operator in inventory to remove it
  if (removingOperator) {
    container.querySelectorAll('.inv-op.removable').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.rmIndex);
        const state = getState();
        const result = removeOperator(idx, currentStock.services.removal.price, state.player);
        if (result.success) {
          updatePlayer(result.changes);
          removingOperator = false;
          currentStock.services.removal = null;
          render();
        }
      });
    });
  }

  // Click operator in inventory to duplicate it
  if (duplicatingOperator) {
    container.querySelectorAll('.inv-op.duplicable').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.dupIndex);
        const state = getState();
        const result = duplicateOperator(idx, currentStock.services.duplicate.price, state.player);
        if (result.success) {
          updatePlayer(result.changes);
          duplicatingOperator = false;
          currentStock.services.duplicate = null;
          render();
        }
      });
    });
  }

  // Click die in inventory to remove it
  if (removingDie) {
    container.querySelectorAll('.inv-die.removable').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.rmDie);
        const state = getState();
        const result = removeDie(idx, currentStock.services.diceRemoval.price, state.player);
        if (result.success) {
          updatePlayer(result.changes);
          removingDie = false;
          currentStock.services.diceRemoval = null;
          render();
        }
      });
    });
  }

  // Leave
  container.querySelector('#btn-leave-shop')?.addEventListener('click', () => {
    playClick();
    eventBus.emit('shopLeave');
  });
}
