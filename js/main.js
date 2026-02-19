import { createNewRun, getState, setScreen, setMap, updatePlayer, loadState, incrementRunStat } from './state/GameState.js';
import { startCombat } from './systems/CombatManager.js';
import { generateMap } from './systems/MapGenerator.js';
import { initHUD, showHUD, hideHUD } from './ui/PlayerHUD.js';
import { initCombatUI, render as renderCombat } from './ui/CombatUI.js';
import { initMapUI, renderMap, startMapAnimation, stopMapAnimation } from './ui/MapUI.js';
import { openShop } from './ui/ShopUI.js';
import { openEvent } from './ui/EventUI.js';
import { openReward, openRestSite } from './ui/RewardUI.js';
import { getMonstersByTier, getElitesByTier, getBossByAct } from './data/monsters.js';
import { LOADOUTS, DICE_CLASSES } from './data/dice.js';
import { RELICS } from './data/relics.js';
import { OPERATORS } from './data/operators.js';
import { createRNG } from './utils/random.js';
import { eventBus } from './utils/eventBus.js';
import { saveGame, hasSave, loadGame, deleteSave } from './state/SaveLoad.js';
import { initAudio, playClick, playBgMusic, stopBgMusic } from './utils/audio.js';
import { getStats, recordRunStart, recordWin, recordLoss, recordMonsterKill, recordExactHit, recordCombo } from './state/RunStats.js';
import { getUnlockedAscension, unlockNextAscension, ASCENSION_LEVELS, hasAscensionMod } from './state/Ascension.js';
import { isLoadoutUnlocked, getLoadoutUnlockHint, getAllMilestones } from './state/MetaProgress.js';

// --- Per-Act Color Themes ---
const ACT_THEMES = {
  1: { // Dungeon: cool blue-purple (default)
    '--bg-dark': '#0a0a1a',
    '--bg-mid': '#12122a',
    '--bg-light': '#1a1a3a',
    '--bg-card': '#22224a',
    '--border-color': '#333366',
    '--border-highlight': '#5555aa',
    '--text-secondary': '#8888aa',
    '--text-dim': '#555577',
  },
  2: { // Inferno: warm reds/browns
    '--bg-dark': '#1a0a0a',
    '--bg-mid': '#2a1210',
    '--bg-light': '#3a1a16',
    '--bg-card': '#4a2220',
    '--border-color': '#663333',
    '--border-highlight': '#aa5544',
    '--text-secondary': '#aa8877',
    '--text-dim': '#775544',
  },
  3: { // Void: deep purples/cosmic
    '--bg-dark': '#0a0a1e',
    '--bg-mid': '#16102e',
    '--bg-light': '#221a40',
    '--bg-card': '#2e2252',
    '--border-color': '#443366',
    '--border-highlight': '#7755bb',
    '--text-secondary': '#9988cc',
    '--text-dim': '#665588',
  },
};

function setActTheme(act) {
  const theme = ACT_THEMES[act] || ACT_THEMES[1];
  const root = document.documentElement.style;
  for (const [prop, value] of Object.entries(theme)) {
    root.setProperty(prop, value);
  }
}

// Screen management
const screens = {
  title: document.getElementById('title-screen'),
  loadout: document.getElementById('loadout-screen'),
  map: document.getElementById('map-screen'),
  combat: document.getElementById('combat-screen'),
  reward: document.getElementById('reward-screen'),
  shop: document.getElementById('shop-screen'),
  event: document.getElementById('event-screen'),
  rest: document.getElementById('rest-screen'),
  gameOver: document.getElementById('game-over-screen'),
};

let transitioning = false;

function showScreen(name, options = {}) {
  if (transitioning) return;

  const currentEl = Object.values(screens).find(el => el.classList.contains('active'));
  const nextEl = screens[name];

  // If same screen, no current, or first load — instant switch
  if (!currentEl || currentEl === nextEl) {
    for (const [key, el] of Object.entries(screens)) {
      el.classList.toggle('hidden', key !== name);
      el.classList.toggle('active', key === name);
      el.classList.remove('exiting');
    }
    setScreen(name);
    afterScreenShown(name, options);
    return;
  }

  transitioning = true;

  // Phase 1: Fade out old screen
  currentEl.classList.add('exiting');
  currentEl.classList.remove('active');

  setTimeout(() => {
    // Phase 2: Hide old, show new
    for (const [key, el] of Object.entries(screens)) {
      if (key !== name) {
        el.classList.add('hidden');
        el.classList.remove('active', 'exiting');
      }
    }

    nextEl.classList.remove('hidden');
    nextEl.offsetHeight; // force reflow
    nextEl.classList.add('active');

    if (options.dramatic) {
      nextEl.classList.add('entering-combat');
      setTimeout(() => nextEl.classList.remove('entering-combat'), 500);
    }

    setScreen(name);

    setTimeout(() => {
      transitioning = false;
      afterScreenShown(name, options);
    }, 350);
  }, 380); // slightly longer than the 350ms CSS transition
}

function afterScreenShown(name) {
  if (name === 'title' || name === 'loadout') {
    hideHUD();
    stopMapAnimation();
  } else {
    showHUD();
  }

  if (name === 'loadout' || name === 'map' || name === 'combat' || name === 'shop' || name === 'event' || name === 'rest' || name === 'reward') {
    playBgMusic();
  } else {
    stopBgMusic();
  }

  if (name === 'map') {
    requestAnimationFrame(() => {
      renderMap();
      startMapAnimation();
    });
  } else {
    stopMapAnimation();
  }
}

// Get the right monster tiers for the current act
function getActTiers(act) {
  if (act === 1) return { regular: 1, elite: 2 };
  if (act === 2) return { regular: 3, elite: 4 };
  return { regular: 5, elite: 6 };
}

// Track last combat info for rewards
let lastCombatElite = false;
let lastCombatExact = false;
let currentAscension = 0;

// Initialize UI systems
initHUD();
initCombatUI();
initMapUI();

// Title screen — New Run
document.getElementById('btn-new-run').addEventListener('click', () => {
  initAudio();
  playClick();
  showLoadoutScreen();
});

// Continue button (if save exists)
function setupTitleScreen() {
  const titleContent = document.querySelector('.title-content');
  const existingContinue = document.getElementById('btn-continue-run');
  if (existingContinue) existingContinue.remove();
  document.getElementById('title-stats')?.remove();

  if (hasSave()) {
    const btn = document.createElement('button');
    btn.id = 'btn-continue-run';
    btn.className = 'btn btn-secondary';
    btn.textContent = 'Continue Run';
    btn.style.marginTop = '8px';
    titleContent.querySelector('#btn-new-run').after(btn);

    btn.addEventListener('click', () => {
      initAudio();
      playClick();
      const loaded = loadGame();
      if (loaded) {
        loadState(loaded);
        currentAscension = loaded.run?.ascension || 0;
        setActTheme(loaded.run?.act || 1);
        showScreen('map');
      }
    });
  }

  // Show lifetime stats
  const stats = getStats();
  if (stats.totalRuns > 0) {
    const statsDiv = document.createElement('div');
    statsDiv.id = 'title-stats';
    statsDiv.className = 'title-stats';

    // Milestones
    const milestones = getAllMilestones();
    const milestoneHtml = milestones.map(m =>
      `<span class="milestone-chip ${m.completed ? 'done' : ''}" title="${m.description}">${m.completed ? '&#10003;' : '&#9675;'} ${m.name}</span>`
    ).join('');

    statsDiv.innerHTML = `
      <div class="title-stats-header">Lifetime Stats</div>
      <div class="title-stats-grid">
        <span>Runs: ${stats.totalRuns}</span>
        <span>Wins: ${stats.wins}</span>
        <span>Monsters: ${stats.totalMonstersSlain}</span>
        <span>Exact Hits: ${stats.totalExactHits}</span>
        <span>Best Combo: x${stats.highestComboMultiplier}</span>
        <span>Highest Act: ${stats.highestAct}</span>
      </div>
      <div class="title-stats-header" style="margin-top: 10px;">Milestones</div>
      <div class="milestone-row">${milestoneHtml}</div>
    `;
    titleContent.appendChild(statsDiv);
  }
}

setupTitleScreen();

// --- Loadout Selection ---
function showLoadoutScreen() {
  setActTheme(1); // Reset to default palette
  const loadoutScreen = document.getElementById('loadout-screen');

  let cardsHtml = '';
  for (const [id, loadout] of Object.entries(LOADOUTS)) {
    const unlocked = isLoadoutUnlocked(id);
    const diffClass = loadout.difficulty.toLowerCase();

    if (!unlocked) {
      const hint = getLoadoutUnlockHint(id) || 'Unknown requirement';
      cardsHtml += `
        <div class="loadout-card locked">
          <div class="loadout-name">???</div>
          <div class="loadout-difficulty ${diffClass}">${loadout.difficulty}</div>
          <div class="loadout-desc loadout-locked-hint">${hint}</div>
          <div class="loadout-lock-icon">Locked</div>
        </div>`;
      continue;
    }

    const diceChips = loadout.dice.map(d => {
      const cls = d.diceClass !== 'standard' ? `class-${d.diceClass}` : '';
      const label = d.diceClass !== 'standard'
        ? `${d.type} ${DICE_CLASSES[d.diceClass].badge}`
        : d.type;
      return `<span class="loadout-die-chip ${cls}">${label}</span>`;
    }).join('');

    cardsHtml += `
      <div class="loadout-card" data-loadout="${id}">
        <div class="loadout-name">${loadout.name}</div>
        <div class="loadout-difficulty ${diffClass}">${loadout.difficulty}</div>
        <div class="loadout-desc">${loadout.description}</div>
        <div class="loadout-dice-preview">${diceChips}</div>
      </div>`;
  }

  const unlocked = getUnlockedAscension();
  let ascensionHtml = '';
  if (unlocked > 0) {
    const options = ['<option value="0">No Ascension</option>'];
    for (let i = 1; i <= unlocked; i++) {
      const a = ASCENSION_LEVELS[i - 1];
      options.push(`<option value="${i}">Ascension ${i}: ${a.name}</option>`);
    }
    ascensionHtml = `
      <div class="ascension-selector">
        <label class="ascension-label">Difficulty:</label>
        <select id="ascension-select" class="ascension-select">${options.join('')}</select>
      </div>`;
  }

  loadoutScreen.innerHTML = `
    <div class="loadout-title">Choose Your Dice</div>
    <div class="loadout-subtitle">Each loadout gives you a different set of dice to start with</div>
    ${ascensionHtml}
    <div class="loadout-choices">${cardsHtml}</div>
  `;

  showScreen('loadout');

  loadoutScreen.querySelectorAll('.loadout-card').forEach(card => {
    card.addEventListener('click', () => {
      playClick();
      const loadoutId = card.dataset.loadout;
      const ascSelect = document.getElementById('ascension-select');
      const ascLevel = ascSelect ? parseInt(ascSelect.value, 10) : 0;
      startNewRun(loadoutId, ascLevel);
    });
  });
}

function startNewRun(loadoutId = 'standard', ascension = 0) {
  deleteSave();
  recordRunStart();
  currentAscension = ascension;
  const seed = Date.now();
  createNewRun(seed, loadoutId);

  const state = getState();
  // Apply ascension modifiers to starting state
  if (hasAscensionMod(ascension, 2)) {
    updatePlayer({ gold: 25 }); // Poverty: less starting gold
  }
  if (hasAscensionMod(ascension, 3)) {
    updatePlayer({ hp: 60, maxHp: 60 }); // Fragile: less starting HP
  }
  if (hasAscensionMod(ascension, 10)) {
    // Remove one die from starting pool
    const pool = state.player.dicePool;
    if (pool.length > 3) {
      updatePlayer({ dicePool: pool.slice(0, -1) });
    }
  }

  // Store ascension level in run state
  state.run.ascension = ascension;

  setActTheme(1);
  const map = generateMap(seed, 1);
  setMap(map);
  saveGame();

  showScreen('map');
}

// Map node selected — transition to the appropriate screen
eventBus.on('nodeSelected', ({ node }) => {
  const state = getState();
  const rng = createRNG(state.run.seed + state.run.floor * 777);
  const tiers = getActTiers(state.run.act);

  switch (node.type) {
    case 'monster': {
      const pool = getMonstersByTier(tiers.regular);
      const monsterId = rng.pick(pool);
      lastCombatElite = false;
      showScreen('combat', { dramatic: true });
      startCombat(monsterId, false);
      renderCombat();
      break;
    }
    case 'elite': {
      const pool = getElitesByTier(tiers.elite);
      const monsterId = rng.pick(pool);
      lastCombatElite = true;
      showScreen('combat', { dramatic: true });
      startCombat(monsterId, true);
      renderCombat();
      break;
    }
    case 'boss': {
      const bossId = getBossByAct(state.run.act);
      lastCombatElite = true;
      showScreen('combat', { dramatic: true });
      startCombat(bossId, true);
      renderCombat();
      break;
    }
    case 'rest': {
      showScreen('rest');
      openRestSite();
      break;
    }
    case 'event': {
      showScreen('event');
      openEvent(rng);
      break;
    }
    case 'shop': {
      showScreen('shop');
      openShop(rng);
      break;
    }
    default: {
      showScreen('map');
      break;
    }
  }
});

// After combat victory, show reward screen
eventBus.on('combatContinue', () => {
  const state = getState();
  const rng = createRNG(state.run.seed + state.run.floor * 333);
  lastCombatExact = state.combat?.lastResult?.exact || false;

  // Record combat stats
  recordMonsterKill();
  if (lastCombatExact) recordExactHit();
  const lr = state.combat?.lastResult;
  if (lr?.combos?.length > 0) recordCombo(lr.totalMultiplier, lr.combos.length);

  // Check if this was a boss kill — advance to next act
  const bossId = getBossByAct(state.run.act);
  const wasBoss = state.combat?.monster?.id === bossId;

  if (wasBoss && state.run.act < 3) {
    // Show act transition, then generate new map
    showActTransition(state.run.act + 1);
    return;
  } else if (wasBoss && state.run.act >= 3) {
    // Game won!
    showVictoryScreen();
    return;
  }

  showScreen('reward');
  openReward(lastCombatElite, lastCombatExact, rng);
});

function showActTransition(nextAct) {
  const state = getState();
  const container = document.getElementById('reward-screen');

  container.innerHTML = `
    <div class="reward-content">
      <div class="reward-title" style="font-size: 2rem; color: var(--accent-gold);">ACT ${nextAct}</div>
      <div class="reward-subtitle" style="margin: 16px 0;">
        ${nextAct === 2 ? 'The dungeon grows darker. Stronger foes await...' : 'A new chapter begins...'}
      </div>
      <div class="reward-subtitle">You heal to full HP and gain +10 max HP.</div>
      <button class="btn btn-primary" id="btn-next-act">Continue</button>
    </div>
  `;

  showScreen('reward');

  document.getElementById('btn-next-act').addEventListener('click', () => {
    playClick();
    // Advance act, heal, generate new map
    state.run.act = nextAct;
    state.run.floor = 0;
    setActTheme(nextAct);
    updatePlayer({
      maxHp: state.player.maxHp + 10,
      hp: state.player.maxHp + 10,
    });

    const map = generateMap(state.run.seed + nextAct * 10000, nextAct);
    setMap(map);
    saveGame();
    showScreen('map');
  });
}

function showVictoryScreen() {
  const state = getState();
  deleteSave();
  recordWin(state.run.act, state.run.floor, state.player.gold, currentAscension);
  unlockNextAscension();
  showRunSummary(true);
}

function showRunSummary(isWin) {
  const state = getState();
  const stats = state.run?.stats || {};
  const container = document.getElementById('game-over-screen');

  // Relic display
  const relicHtml = state.player.relics.length > 0
    ? state.player.relics.map(relicId => {
        const relic = RELICS[relicId];
        if (!relic) return '';
        return `<span class="summary-relic" title="${relic.name}: ${relic.description}">${relic.emoji}</span>`;
      }).join('')
    : '<span class="summary-none">None</span>';

  // Dice display
  const diceHtml = state.player.dicePool.map(d => {
    const cls = d.diceClass !== 'standard' ? `class-${d.diceClass}` : '';
    return `<span class="summary-die ${cls}">${d.type}</span>`;
  }).join('');

  // Operator display
  const opHtml = state.player.operatorHand.map(opId => {
    const op = OPERATORS[opId];
    return op ? `<span class="summary-op">${op.symbol}</span>` : '';
  }).join('');

  const titleColor = isWin ? 'var(--accent-gold)' : 'var(--accent-red)';
  const titleText = isWin ? 'VICTORY!' : 'DEFEAT';
  const subtitle = isWin
    ? 'You conquered the Numgeon!'
    : 'Your mathematical prowess was insufficient.';

  container.innerHTML = `
    <div class="run-summary">
      <div class="summary-title" style="color: ${titleColor}">${titleText}</div>
      <div class="summary-subtitle">${subtitle}</div>

      <div class="summary-section">
        <div class="summary-section-title">Run Overview</div>
        <div class="summary-grid">
          <div class="summary-stat">
            <span class="summary-stat-label">Act</span>
            <span class="summary-stat-value">${state.run.act}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-label">Floor</span>
            <span class="summary-stat-value">${state.run.floor + 1}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-label">Gold</span>
            <span class="summary-stat-value" style="color: var(--accent-gold)">${state.player.gold}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-label">HP</span>
            <span class="summary-stat-value">${state.player.hp}/${state.player.maxHp}</span>
          </div>
        </div>
      </div>

      <div class="summary-section">
        <div class="summary-section-title">Combat Stats</div>
        <div class="summary-grid">
          <div class="summary-stat">
            <span class="summary-stat-label">Monsters Killed</span>
            <span class="summary-stat-value">${stats.monstersKilled || 0}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-label">Exact Hits</span>
            <span class="summary-stat-value" style="color: var(--accent-gold)">${stats.exactHits || 0}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-label">Damage Dealt</span>
            <span class="summary-stat-value">${stats.totalDamageDealt || 0}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-label">Damage Taken</span>
            <span class="summary-stat-value" style="color: var(--accent-red)">${stats.totalDamageTaken || 0}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-label">Combos</span>
            <span class="summary-stat-value">${stats.totalCombosTriggered || 0}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-label">Best Combo</span>
            <span class="summary-stat-value">x${stats.bestComboMultiplier || 1}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-label">Turns</span>
            <span class="summary-stat-value">${stats.turnsPlayed || 0}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-label">Gold Earned</span>
            <span class="summary-stat-value">${stats.goldEarned || 0}</span>
          </div>
        </div>
      </div>

      <div class="summary-section">
        <div class="summary-section-title">Your Build</div>
        <div class="summary-build-row">
          <span class="summary-build-label">Relics</span>
          <div class="summary-build-items">${relicHtml}</div>
        </div>
        <div class="summary-build-row">
          <span class="summary-build-label">Dice</span>
          <div class="summary-build-items">${diceHtml}</div>
        </div>
        <div class="summary-build-row">
          <span class="summary-build-label">Operators</span>
          <div class="summary-build-items">${opHtml}</div>
        </div>
      </div>

      <button class="btn btn-primary" id="btn-summary-continue">New Run</button>
    </div>
  `;

  showScreen('gameOver');

  document.getElementById('btn-summary-continue').addEventListener('click', () => {
    playClick();
    setupTitleScreen();
    showLoadoutScreen();
  });
}

// After picking reward, return to map and auto-save
eventBus.on('rewardDone', () => {
  saveGame();
  showScreen('map');
});

// After event, return to map and auto-save
eventBus.on('eventDone', () => {
  saveGame();
  showScreen('map');
});

// After rest, return to map and auto-save
eventBus.on('restDone', () => {
  saveGame();
  showScreen('map');
});

// After shop, return to map and auto-save
eventBus.on('shopLeave', () => {
  saveGame();
  showScreen('map');
});

// New run request (from title screen or other)
eventBus.on('requestNewRun', () => {
  deleteSave();
  setupTitleScreen();
  showLoadoutScreen();
});

// Combat defeat — player died in combat
eventBus.on('combatDefeat', () => {
  const state = getState();
  deleteSave();
  recordLoss(state.run.act, state.run.floor, state.player.gold);
  showRunSummary(false);
});

// Give up — abandon current run
eventBus.on('giveUp', () => {
  const state = getState();
  deleteSave();
  recordLoss(state.run.act, state.run.floor, state.player.gold);
  showRunSummary(false);
});

// Start on title screen
showScreen('title');
