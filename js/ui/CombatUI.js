import { getState } from '../state/GameState.js';
import { OPERATORS } from '../data/operators.js';
import { DICE_TYPES, DICE_CLASSES, getDieFaces } from '../data/dice.js';
import {
  placeToken, removeToken, moveToken, clearExpression,
  evaluateExpression, rerollDice, toggleHoldDie, getCombatPreview,
  rerollBossTarget,
} from '../systems/CombatManager.js';
import { tokensToString } from '../systems/ExpressionEngine.js';
import { eventBus } from '../utils/eventBus.js';
import { playDiceRoll, playHit, playMiss, playExact, playCombo, playVictory, playDefeat, playClick, playGold, playSquish, playEnemyRoll } from '../utils/audio.js';

const screen = document.getElementById('combat-screen');
const monsterArea = document.getElementById('monster-area');
const expressionArea = document.getElementById('expression-area');
const diceArea = document.getElementById('dice-area');
const operatorArea = document.getElementById('operator-area');

export function initCombatUI() {
  eventBus.on('combatChanged', render);
  eventBus.on('combatStart', onCombatStart);
  eventBus.on('expressionChanged', renderExpression);
  eventBus.on('combatResolved', onCombatResolved);
  eventBus.on('diceRerolled', onDiceRerolled);

}

let isRolling = false;
let attackAnimationPending = false;

async function onCombatStart() {
  const state = getState();
  if (!state?.combat) return;
  render();
  playDiceRoll();
  await animateDiceRoll(state.combat.dice);
}

async function onDiceRerolled({ dice }) {
  playDiceRoll();
  await animateDiceRoll(dice);
}

// Animate dice rolling — cycling numbers from actual face arrays + shake, then settle
async function animateDiceRoll(dice) {
  isRolling = true;

  // Get the die wrapper elements in the tray
  const wrapperEls = diceArea.querySelectorAll('.die-wrapper');
  if (wrapperEls.length === 0) return;

  const finalValues = dice.map(d => d.value);
  const intervals = [];

  wrapperEls.forEach((wrapperEl, i) => {
    const die = dice[i];
    if (!die || die.held) return; // don't animate held dice

    wrapperEl.classList.add('rolling');
    const valueEl = wrapperEl.querySelector('.die-value');
    if (!valueEl) return;

    // Get the actual faces for this die type + class
    const faces = getDieFaces(die.type, die.diceClass);

    // Rapidly cycle random face values
    const interval = setInterval(() => {
      valueEl.textContent = faces[Math.floor(Math.random() * faces.length)];
    }, 50);
    intervals.push({ interval, wrapperEl, valueEl, finalValue: finalValues[i] });
  });

  // Stagger the settling: each die stops at a different time
  for (let i = 0; i < intervals.length; i++) {
    const delay = 300 + i * 150 + Math.random() * 200;
    setTimeout(() => {
      const { interval, wrapperEl, valueEl, finalValue } = intervals[i];
      clearInterval(interval);
      valueEl.textContent = finalValue;
      wrapperEl.classList.remove('rolling');
      wrapperEl.classList.add('settled');
      setTimeout(() => wrapperEl.classList.remove('settled'), 300);
    }, delay);
  }

  // Wait for all to finish
  const totalTime = 300 + intervals.length * 150 + 400;
  await new Promise(resolve => setTimeout(resolve, totalTime));

  isRolling = false;

}

export function render() {
  const state = getState();
  if (!state?.combat) return;

  renderMonster();
  renderExpression();
  renderDice();
  renderOperators();

  // Victory/defeat overlay is handled entirely by onCombatResolved, not here.
  // This just clears the overlay when returning to building phase.
  if (state.combat.phase === 'building') {
    clearCombatResult();
  }
}

// --- Combo animation + visual juice on resolve ---
function onCombatResolved({ combos, totalMultiplier, monsterDead, playerDead, phase }) {
  if (combos && combos.length > 0) {
    showComboSequence(combos, totalMultiplier);
  }

  const state = getState();
  const lr = state?.combat?.lastResult;

  // --- Floating damage numbers ---
  if (lr) {
    // Damage dealt to monster
    if (lr.exact) {
      showFloatingDamage(monsterArea, `EXACT!`, 'damage-exact');
    } else if (lr.overkill || lr.nearMiss) {
      showFloatingDamage(monsterArea, `-${Math.round(lr.value)}`, 'damage-dealt');
    } else if (lr.value > 0 && !monsterDead) {
      showFloatingDamage(monsterArea, `-${Math.round(lr.value)}`, 'damage-dealt');
    }

    // Damage taken by player — show monster attack dice rolling in monster area
    const hasAttackAnim = lr.attackRolls && lr.attackRolls.length > 0;
    if (hasAttackAnim) {
      attackAnimationPending = true;
      setTimeout(() => {
        showMonsterAttackRoll(lr.attackRolls, lr.attackDie, lr.damageTaken, () => {
          // Animation done — now show victory/defeat overlay
          attackAnimationPending = false;
          if (phase === 'victory') {
            screen.classList.add('victory-flash');
            setTimeout(() => screen.classList.remove('victory-flash'), 600);
            setTimeout(() => playVictory(), 200);
            setTimeout(() => playGold(), 600);
          } else if (phase === 'defeat') {
            screen.classList.add('defeat-flash');
            setTimeout(() => screen.classList.remove('defeat-flash'), 600);
            setTimeout(() => playDefeat(), 200);
          }
          renderCombatResult();
          // Gold earned
          if (lr.goldEarned > 0 && monsterDead) {
            setTimeout(() => showFloatingDamage(monsterArea, `+${lr.goldEarned} gold`, 'gold-earned'), 300);
          }
        });
      }, 500);
    } else if (lr.damageTaken > 0) {
      setTimeout(() => {
        showFloatingDamage(monsterArea, `-${lr.damageTaken} HP`, 'damage-taken');
        playSquish();
        screen.classList.add('shaking');
        setTimeout(() => screen.classList.remove('shaking'), 400);
      }, 400);
    }

    // Gold earned (only if no attack animation — otherwise handled in callback)
    if (!hasAttackAnim && lr.goldEarned > 0 && monsterDead) {
      setTimeout(() => {
        showFloatingDamage(monsterArea, `+${lr.goldEarned} gold`, 'gold-earned');
      }, 600);
    }
  }

  // --- Monster hit/death animation ---
  const monsterArt = monsterArea.querySelector('.monster-art');
  if (monsterArt) {
    if (monsterDead) {
      monsterArt.classList.add('dying');
    } else if (lr?.value > 0) {
      monsterArt.classList.add('hit-flash');
      setTimeout(() => monsterArt.classList.remove('hit-flash'), 300);
    }
  }

  // --- Target number change animation ---
  if (!monsterDead && !playerDead) {
    const targetEl = monsterArea.querySelector('.monster-target');
    if (targetEl) {
      targetEl.classList.add('changed');
      setTimeout(() => targetEl.classList.remove('changed'), 500);
    }
  }

  // --- Screen flash, sounds, and result overlay ---
  const hasAttack = lr?.attackRolls?.length > 0;
  if (!hasAttack) {
    // No attack animation — show result overlay immediately
    if (phase === 'victory') {
      screen.classList.add('victory-flash');
      setTimeout(() => screen.classList.remove('victory-flash'), 600);
      setTimeout(() => playVictory(), 200);
      setTimeout(() => playGold(), 600);
      renderCombatResult();
    } else if (phase === 'defeat') {
      screen.classList.add('defeat-flash');
      setTimeout(() => screen.classList.remove('defeat-flash'), 600);
      setTimeout(() => playDefeat(), 200);
      renderCombatResult();
    } else {
      if (lr?.exact) playExact();
      else if (lr?.overkill || lr?.nearMiss) playHit();
      else playMiss();
    }
  } else {
    // Attack animation pending — hit/miss sound plays now, overlay comes after animation
    if (lr?.exact) playExact();
    else if (lr?.overkill || lr?.nearMiss) playHit();
    else playMiss();
  }
  if (combos && combos.length > 0) {
    setTimeout(() => playCombo(), 100);
  }
}

// Show a floating damage number anchored to an element
function showFloatingDamage(anchorEl, text, className) {
  const el = document.createElement('div');
  el.className = `floating-damage ${className}`;
  el.textContent = text;

  // Position relative to anchor
  const rect = anchorEl.getBoundingClientRect();
  const screenRect = screen.getBoundingClientRect();
  el.style.left = `${rect.left - screenRect.left + rect.width / 2 - 40 + (Math.random() * 40 - 20)}px`;
  el.style.top = `${rect.top - screenRect.top + rect.height / 3}px`;

  screen.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

// Show the monster's attack dice rolling inside the monster area
function showMonsterAttackRoll(attackRolls, attackDie, totalDamage, onComplete) {
  const dieSides = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };
  const sides = dieSides[attackDie] || 6;

  // Light up the persistent attack dice icon
  const atkDiceIcons = monsterArea.querySelectorAll('.monster-atk-die-icon');
  atkDiceIcons.forEach(el => el.classList.add('active'));

  // Create a container for the attack roll inside the monster area
  const rollContainer = document.createElement('div');
  rollContainer.className = 'monster-attack-roll-area';
  rollContainer.innerHTML = `<div class="monster-attack-label">Monster attacks!</div>`;
  monsterArea.appendChild(rollContainer);

  playEnemyRoll();

  const diceRow = document.createElement('div');
  diceRow.className = 'monster-attack-dice-row';
  rollContainer.appendChild(diceRow);

  // Stagger each die appearing and rolling
  attackRolls.forEach((rollValue, i) => {
    const delay = 400 + i * 700;

    setTimeout(() => {
      const dieEl = document.createElement('div');
      dieEl.className = 'monster-roll-die rolling';
      dieEl.textContent = '?';
      diceRow.appendChild(dieEl);

      // Cycle random values
      const interval = setInterval(() => {
        dieEl.textContent = Math.floor(Math.random() * sides) + 1;
      }, 60);

      // Settle after 600ms
      setTimeout(() => {
        clearInterval(interval);
        dieEl.textContent = rollValue;
        dieEl.classList.remove('rolling');
        dieEl.classList.add('settled');
        playClick();
      }, 600);
    }, delay);
  });

  // Deactivate persistent icon after all dice launched
  setTimeout(() => {
    atkDiceIcons.forEach(el => el.classList.remove('active'));
  }, 400 + attackRolls.length * 700);

  // After all dice settled, show total
  const totalDelay = 400 + attackRolls.length * 700 + 400;
  setTimeout(() => {
    const totalEl = document.createElement('div');
    totalEl.className = 'monster-attack-total';

    if (totalDamage === 0) {
      // Relic blocked the damage
      totalEl.textContent = 'Blocked!';
      totalEl.classList.add('blocked');
    } else {
      totalEl.textContent = `= ${totalDamage} damage!`;
      playSquish();
      screen.classList.add('shaking');
      setTimeout(() => screen.classList.remove('shaking'), 400);
    }

    rollContainer.appendChild(totalEl);
    requestAnimationFrame(() => totalEl.classList.add('visible'));

    // Clean up after a pause, then trigger callback
    setTimeout(() => {
      rollContainer.style.transition = 'opacity 0.4s ease';
      rollContainer.style.opacity = '0';
      setTimeout(() => {
        rollContainer.remove();
        if (onComplete) onComplete();
      }, 400);
    }, 1500);
  }, totalDelay);
}

function showComboSequence(combos, totalMultiplier) {
  document.getElementById('combo-display')?.remove();

  const container = document.createElement('div');
  container.id = 'combo-display';
  container.className = 'combo-display';
  screen.appendChild(container);

  // Show all combos at once with staggered fade-in (faster)
  combos.forEach((combo, i) => {
    setTimeout(() => {
      const chip = document.createElement('div');
      chip.className = 'combo-chip';
      chip.style.setProperty('--combo-color', combo.color);
      chip.innerHTML = `
        <span class="combo-emoji">${combo.emoji}</span>
        <span class="combo-name">${combo.name}</span>
        <span class="combo-mult">x${combo.multiplier} gold</span>
      `;
      container.appendChild(chip);
      requestAnimationFrame(() => chip.classList.add('visible'));
    }, i * 200);
  });

  // Show total if multiple combos
  if (totalMultiplier > 1) {
    setTimeout(() => {
      const total = document.createElement('div');
      total.className = 'combo-chip visible';
      total.style.setProperty('--combo-color', '#ffd700');
      total.innerHTML = `<span class="combo-name">TOTAL: x${totalMultiplier} GOLD</span>`;
      container.appendChild(total);
    }, combos.length * 200 + 100);
  }

  // Fade out quickly so it doesn't block the result overlay
  setTimeout(() => {
    container.classList.add('fading');
    setTimeout(() => container.remove(), 400);
  }, combos.length * 200 + 1200);
}

// --- Monster ---
function renderMonster() {
  const state = getState();
  const { monster, conditions } = state.combat;
  const hpPct = (monster.hp / monster.maxHp) * 100;

  let conditionsHtml = '';
  if (conditions && conditions.length > 0) {
    const condChips = conditions.map(id => {
      return `<span class="condition-chip" data-cond="${id}"></span>`;
    }).join('');
    conditionsHtml = `<div class="condition-bar">${condChips}</div>`;
  }

  // Show the monster's attack dice (count + type)
  const atkDieLabel = monster.attackDie || 'd6';
  const atkCount = monster.attackDiceCount || 1;

  monsterArea.innerHTML = `
    <div class="monster-art">${monster.art}</div>
    <div class="monster-name">${monster.name}</div>
    <div class="monster-target-label">TARGET</div>
    <div class="monster-target">${monster.hp}</div>
    <div class="monster-hp-bar">
      <div class="monster-hp-fill" style="width: ${hpPct}%"></div>
    </div>
    <div style="font-size: 0.75rem; color: var(--text-secondary)">
      HP ${monster.hp}/${monster.maxHp}
    </div>
    <div class="monster-atk-dice" id="monster-atk-dice">
      <span class="monster-atk-dice-label">ATK</span>
      ${Array.from({ length: atkCount }, () => `<div class="monster-atk-die-icon">${atkDieLabel}</div>`).join('')}
    </div>
    ${monster.bossAbility ? `<div class="boss-ability">${monster.bossAbility}</div>` : ''}
    ${monster.boss && !state.combat.bossTargetRerollUsed ? `<button class="btn btn-small boss-reroll-btn" id="btn-boss-reroll">Reroll Target (1x)</button>` : ''}
    ${monster.boss && state.combat.bossTargetRerollUsed ? `<div class="boss-reroll-used">Target reroll used</div>` : ''}
    ${conditionsHtml}
  `;

  // Boss target reroll button
  document.getElementById('btn-boss-reroll')?.addEventListener('click', () => {
    playClick();
    rerollBossTarget();
    render();
  });

  // Fill in condition chips (async import)
  if (conditions && conditions.length > 0) {
    import('../data/conditions.js').then(({ CONDITIONS: CONDS }) => {
      monsterArea.querySelectorAll('.condition-chip').forEach(el => {
        const c = CONDS[el.dataset.cond];
        if (c) {
          el.innerHTML = `${c.icon} ${c.name}`;
          el.title = c.description;
        }
      });
    });
  }
}

// --- Expression ---
function renderExpression() {
  const state = getState();
  if (!state?.combat) return;

  const { expressionSlots, phase } = state.combat;
  const preview = getCombatPreview();
  const disabled = phase !== 'building';

  // Build the big calculator display
  let calcDisplay = '';
  let resultDisplay = '';
  let comboHtml = '';

  if (expressionSlots.length === 0) {
    calcDisplay = '<span class="calc-placeholder">Click dice and operators below to build your equation</span>';
  } else {
    // Show each token in the expression with colors, draggable for reordering
    calcDisplay = expressionSlots.map((token, i) => {
      if (token.type === 'number') {
        const color = token.dieType ? DICE_TYPES[token.dieType]?.color || '' : '';
        return `<span class="calc-token calc-number" data-remove="${i}" data-drag-idx="${i}" draggable="true" style="color: ${color}">${token.value}</span>`;
      } else {
        const op = OPERATORS[token.id];
        return `<span class="calc-token calc-operator" data-remove="${i}" data-drag-idx="${i}" draggable="true">${op.symbol}</span>`;
      }
    }).join('');
  }

  if (preview && preview.valid) {
    let condWarning = '';
    if (preview.conditionError) {
      condWarning = `<span class="calc-cond-error">${preview.conditionError}</span>`;
    }

    let bossWarn = '';
    if (preview.bossWarning) {
      bossWarn = `<span class="calc-boss-warning">${preview.bossWarning}</span>`;
    }

    const displayResult = Number.isInteger(preview.result) ? preview.result : Math.round(preview.result * 100) / 100;

    // Build damage consequence preview
    let consequenceHtml = '';
    if (preview.damagePreview && !preview.conditionError) {
      const dp = preview.damagePreview;
      if (dp.exact) {
        consequenceHtml = `<div class="calc-consequence exact">EXACT HIT! No retaliation</div>`;
      } else if (dp.nearMiss) {
        consequenceHtml = `<div class="calc-consequence near">Near miss — kills, but monster rolls ${dp.attackDiceCount}${dp.attackDie} (${dp.minDamage}-${dp.maxDamage} dmg)</div>`;
      } else if (dp.overkill) {
        if (dp.attackDiceCount === 0) {
          consequenceHtml = `<div class="calc-consequence safe">Overkill — no retaliation</div>`;
        } else {
          consequenceHtml = `<div class="calc-consequence over">Overkill by ${Math.round(dp.diff)} — rolls ${dp.attackDiceCount}${dp.attackDie} (${dp.minDamage}-${dp.maxDamage} dmg)</div>`;
        }
      } else if (dp.underkill) {
        consequenceHtml = `<div class="calc-consequence under">Underkill by ${Math.round(dp.diff)} — monster survives, rolls ${dp.attackDiceCount}${dp.attackDie} (${dp.minDamage}-${dp.maxDamage} dmg)</div>`;
      } else if (dp.bossBlocked) {
        consequenceHtml = `<div class="calc-consequence over">Blocked! Monster rolls ${dp.attackDiceCount}${dp.attackDie} (${dp.minDamage}-${dp.maxDamage} dmg)</div>`;
      } else if (dp.retaliate) {
        consequenceHtml = `<div class="calc-consequence over">${dp.reason || 'No damage dealt'} — rolls ${dp.attackDiceCount}${dp.attackDie} (${dp.minDamage}-${dp.maxDamage} dmg)</div>`;
      }
    }

    resultDisplay = `
      <div class="calc-result valid">
        <span class="calc-equals">= ${displayResult}</span>
        ${condWarning}
        ${bossWarn}
      </div>
      ${consequenceHtml}
    `;

    // Show which combos triggered so player knows the gold multiplier
    if (preview.combos && preview.combos.length > 0) {
      comboHtml = `<div class="combo-preview">
        ${preview.combos.map(c => `<span class="combo-preview-chip" style="--combo-color: ${c.color}">${c.emoji} ${c.name} x${c.multiplier}</span>`).join('')}
        <span class="combo-total-mult">x${preview.totalMultiplier} gold</span>
      </div>`;
    }
  } else if (preview && !preview.valid && expressionSlots.length > 0) {
    resultDisplay = `<div class="calc-result invalid"><span class="calc-equals">${preview.error || 'Incomplete...'}</span></div>`;
  }

  expressionArea.innerHTML = `
    <div class="calc-display" id="calc-display">
      <div class="calc-expression">${calcDisplay}</div>
      ${resultDisplay}
    </div>
    ${comboHtml}
    <div class="expression-controls">
      <button class="btn btn-primary" id="btn-evaluate" ${disabled || !preview?.valid || preview?.conditionError ? 'disabled' : ''}>
        ${preview?.conditionError ? 'Conditions Not Met' : 'Evaluate'}
      </button>
      <button class="btn btn-small" id="btn-undo" ${disabled || expressionSlots.length === 0 ? 'disabled' : ''}>
        Undo
      </button>
      <button class="btn btn-small" id="btn-clear" ${disabled || expressionSlots.length === 0 ? 'disabled' : ''}>
        Clear
      </button>
    </div>
    ${renderCombatLog()}
  `;

  // Click tokens in the calculator display to remove them, drag to reorder
  if (!disabled) {
    let dragFromIdx = null;

    expressionArea.querySelectorAll('.calc-token').forEach(el => {
      // Click to remove
      el.addEventListener('click', (e) => {
        // Don't remove if we just finished a drag
        if (el.dataset.wasDragged) { delete el.dataset.wasDragged; return; }
        const idx = parseInt(el.dataset.remove);
        removeToken(idx);
        renderDice();
        renderOperators();
      });

      // Drag to reorder
      el.addEventListener('dragstart', (e) => {
        dragFromIdx = parseInt(el.dataset.dragIdx);
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragFromIdx);
      });

      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        expressionArea.querySelectorAll('.calc-token').forEach(t => t.classList.remove('drag-over-left', 'drag-over-right'));
      });

      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const toIdx = parseInt(el.dataset.dragIdx);
        if (dragFromIdx === null || toIdx === dragFromIdx) return;
        // Show drop indicator
        expressionArea.querySelectorAll('.calc-token').forEach(t => t.classList.remove('drag-over-left', 'drag-over-right'));
        el.classList.add(toIdx < dragFromIdx ? 'drag-over-left' : 'drag-over-right');
      });

      el.addEventListener('dragleave', () => {
        el.classList.remove('drag-over-left', 'drag-over-right');
      });

      el.addEventListener('drop', (e) => {
        e.preventDefault();
        const toIdx = parseInt(el.dataset.dragIdx);
        if (dragFromIdx !== null && dragFromIdx !== toIdx) {
          moveToken(dragFromIdx, toIdx);
          el.dataset.wasDragged = 'true';
          renderDice();
          renderOperators();
        }
        dragFromIdx = null;
      });
    });
  }

  document.getElementById('btn-evaluate')?.addEventListener('click', () => {
    if (!disabled) { playClick(); evaluateExpression(); }
  });

  document.getElementById('btn-undo')?.addEventListener('click', () => {
    if (!disabled && expressionSlots.length > 0) {
      removeToken(expressionSlots.length - 1);
      renderDice();
      renderOperators();
    }
  });

  document.getElementById('btn-clear')?.addEventListener('click', () => {
    if (!disabled) {
      clearExpression();
      renderDice();
      renderOperators();
    }
  });
}

// Auto-place: clicking a die immediately adds it to the expression
function autoPlaceDie(dieIndex) {
  const state = getState();
  if (!state?.combat || state.combat.phase !== 'building') return;
  const die = state.combat.dice[dieIndex];
  if (!die || die.value === null) return;
  placeToken({
    type: 'number',
    value: die.value,
    dieId: die.id,
    dieIndex: dieIndex,
    dieType: die.type,
    dieClass: die.diceClass,
  });
  renderDice();
  renderOperators();
}

// Auto-place: clicking an operator immediately adds it to the expression
function autoPlaceOperator(opIndex) {
  const state = getState();
  if (!state?.combat || state.combat.phase !== 'building') return;
  const opId = state.player.operatorHand[opIndex];
  if (!opId) return;
  placeToken({
    type: 'operator',
    id: opId,
    handIndex: opIndex,
  });
  renderDice();
  renderOperators();
}

// --- Dice ---
function renderDice() {
  const state = getState();
  if (!state?.combat) return;

  const { dice, rerollsLeft, phase } = state.combat;
  const disabled = phase !== 'building';

  const usedDieIds = new Set(
    state.combat.expressionSlots
      .filter(t => t.type === 'number' && t.dieId)
      .map(t => t.dieId)
  );

  let diceHtml = '';
  dice.forEach((die, i) => {
    const dieType = DICE_TYPES[die.type];
    const dieClass = DICE_CLASSES[die.diceClass] || DICE_CLASSES.standard;
    const isUsed = usedDieIds.has(die.id);
    const isSpecial = die.diceClass !== 'standard';

    // Class badge for non-standard dice
    const classBadge = isSpecial
      ? `<span class="die-class-badge badge-${die.diceClass}">${dieClass.badge}</span>`
      : '';

    // Hold badge
    const holdBadge = die.held ? '<span class="die-hold-badge">HELD</span>' : '';

    diceHtml += `
      <div class="die-wrapper ${isUsed ? 'used' : ''} ${die.held ? 'held' : ''}"
           data-die-index="${i}">
        <div class="die die-${die.type} die-class-${die.diceClass}">
          <span class="die-value" style="color: ${dieType.color}">${die.value ?? '?'}</span>
          <span class="die-type">${die.type}</span>
        </div>
        ${classBadge}
        ${holdBadge}
      </div>`;
  });

  diceArea.innerHTML = `
    <div class="dice-area-header">
      <span class="dice-area-label">Your Dice <span class="dice-hint">(click to add)</span></span>
      <button class="btn btn-small" id="btn-reroll" ${disabled || rerollsLeft <= 0 ? 'disabled' : ''}>
        Reroll (${rerollsLeft})
      </button>
    </div>
    <div class="dice-tray">${diceHtml}</div>
  `;

  if (!disabled) {
    diceArea.querySelectorAll('.die-wrapper:not(.used)').forEach(el => {
      const idx = parseInt(el.dataset.dieIndex);

      // Left click: add to expression immediately
      el.addEventListener('click', () => autoPlaceDie(idx));

      // Right click: hold/unhold for rerolls
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        toggleHoldDie(dice[idx].id);
      });
    });
  }

  document.getElementById('btn-reroll')?.addEventListener('click', () => {
    if (!disabled) { playClick(); rerollDice(); }
  });
}

// --- Operators ---

// PEMDAS sort: Parentheses → Exponents → Multiply/Divide/Mod → Add/Subtract → Unary → Concat
const OP_SORT_GROUP = {
  lparen: 0, rparen: 1,
  power: 2, log: 3,
  multiply: 4, divide: 5, modulo: 6,
  add: 7, subtract: 8,
  negate: 9, sqrt: 10,
  triangle: 11, rectangle: 12, factorial: 13,
  concat: 14,
};

const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, legendary: 3 };

function renderOperators() {
  const state = getState();
  if (!state?.combat) return;

  const { phase } = state.combat;
  const disabled = phase !== 'building';

  const usedIndices = new Set(
    state.combat.expressionSlots
      .filter(t => t.type === 'operator' && t.handIndex !== undefined)
      .map(t => t.handIndex)
  );

  // Build indexed entries then sort by PEMDAS group, then rarity
  const entries = state.player.operatorHand.map((opId, i) => ({ opId, i }));
  entries.sort((a, b) => {
    const groupA = OP_SORT_GROUP[a.opId] ?? 99;
    const groupB = OP_SORT_GROUP[b.opId] ?? 99;
    if (groupA !== groupB) return groupA - groupB;
    const rarA = RARITY_ORDER[OPERATORS[a.opId]?.rarity] ?? 0;
    const rarB = RARITY_ORDER[OPERATORS[b.opId]?.rarity] ?? 0;
    return rarA - rarB;
  });

  let html = '';
  entries.forEach(({ opId, i }) => {
    const op = OPERATORS[opId];
    if (!op) return;
    const isUsed = usedIndices.has(i);

    html += `
      <div class="operator-card ${isUsed ? 'used' : ''} rarity-${op.rarity}"
           data-op-index="${i}">
        <span class="operator-symbol">${op.symbol}</span>
        <span class="operator-name">${op.name}</span>
        <div class="card-tooltip">${op.description}</div>
      </div>`;
  });

  operatorArea.innerHTML = `
    <div class="operator-area-label">Your Operators <span class="dice-hint">(click to add)</span></div>
    <div class="operator-hand">${html}</div>
  `;

  if (!disabled) {
    operatorArea.querySelectorAll('.operator-card:not(.used)').forEach(el => {
      const idx = parseInt(el.dataset.opIndex);
      el.addEventListener('click', () => autoPlaceOperator(idx));
    });
  }
}

// --- Combat Log ---
function renderCombatLog() {
  const state = getState();
  if (!state?.combat) return '';

  const lines = state.combat.log.slice(-4);
  const logHtml = lines.map(line => {
    let cls = '';
    if (line.includes('EXACT HIT')) cls = 'hit-exact';
    else if (line.includes('Near miss')) cls = 'hit-near';
    else if (line.includes('Overkill')) cls = 'hit-over';
    else if (line.includes('Underkill')) cls = 'hit-under';
    else if (line.includes('COMBO')) cls = 'hit-combo';
    return `<p class="${cls}">${line}</p>`;
  }).join('');

  return `<div class="combat-log">${logHtml}</div>`;
}

// --- Victory / Defeat ---
function renderCombatResult() {
  const state = getState();
  if (!state?.combat) return;

  const { phase } = state.combat;
  const isVictory = phase === 'victory';

  clearCombatResult();

  const overlay = document.createElement('div');
  overlay.className = 'combat-result-overlay';
  overlay.id = 'combat-result-overlay';

  if (isVictory) {
    const lr = state.combat.lastResult;
    const comboSummary = lr?.combos?.length > 0
      ? `<div class="result-combos">${lr.combos.map(c => `<span class="result-combo-chip" style="color: ${c.color}">${c.emoji} ${c.name} (x${c.multiplier})</span>`).join('')}</div>`
      : '';

    const multiplierText = lr?.totalMultiplier > 1
      ? `<div class="result-multiplier">x${lr.totalMultiplier} gold bonus!</div>`
      : '';

    let hitType = '';
    let attackInfo = '';
    if (lr?.exact) {
      hitType = 'Perfect calculation!';
    } else if (lr?.nearMiss) {
      hitType = 'Close enough!';
      if (lr.damageTaken > 0) {
        attackInfo = `Monster rolled ${lr.attackRolls.length}${lr.attackDie}: [${lr.attackRolls.join(', ')}] = ${lr.damageTaken} damage`;
      } else if (lr.attackRolls?.length > 0) {
        attackInfo = `Monster rolled ${lr.attackRolls.length}${lr.attackDie}: [${lr.attackRolls.join(', ')}] — Blocked!`;
      }
    } else if (lr?.overkill && lr?.attackRolls?.length > 0 && lr?.damageTaken > 0) {
      hitType = 'Overkill!';
      attackInfo = `Monster rolled ${lr.attackRolls.length}${lr.attackDie}: [${lr.attackRolls.join(', ')}] = ${lr.damageTaken} damage`;
    } else if (lr?.overkill && lr?.attackRolls?.length > 0 && lr?.damageTaken === 0) {
      hitType = 'Overkill!';
      attackInfo = `Monster rolled ${lr.attackRolls.length}${lr.attackDie}: [${lr.attackRolls.join(', ')}] — Blocked!`;
    } else if (lr?.overkill) {
      hitType = 'Overkill! No retaliation.';
    }

    overlay.innerHTML = `
      <div class="combat-result-title victory">VICTORY</div>
      <div class="combat-result-stats">${hitType}</div>
      ${attackInfo ? `<div class="combat-result-stats" style="color: var(--accent-red)">${attackInfo}</div>` : ''}
      ${comboSummary}
      ${multiplierText}
      <div class="combat-result-stats">
        Gold earned: ${lr?.goldEarned || 0}
      </div>
      <button class="btn btn-primary" id="btn-continue">Continue</button>
    `;
  } else {
    overlay.innerHTML = `
      <div class="combat-result-title defeat">DEFEAT</div>
      <div class="combat-result-stats">
        Your mathematical prowess was insufficient.
      </div>
      <button class="btn btn-primary" id="btn-new-run-defeat">New Run</button>
    `;
  }

  screen.appendChild(overlay);

  document.getElementById('btn-continue')?.addEventListener('click', () => {
    eventBus.emit('combatContinue');
  });

  document.getElementById('btn-new-run-defeat')?.addEventListener('click', () => {
    eventBus.emit('combatDefeat');
  });
}

function clearCombatResult() {
  document.getElementById('combat-result-overlay')?.remove();
}
