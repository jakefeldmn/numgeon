// Each event has a title, flavor text, and 2-3 choices.
// Each choice has display text, a description of the risk, and an outcome function.
// Outcome functions receive (state, rng) and return { changes, message }.
// changes = partial player state update. message = result text shown to user.

export const EVENTS = [
  {
    id: 'wandering_mathematician',
    title: 'Wandering Mathematician',
    text: 'A cloaked figure blocks your path. "Solve my riddle, and I shall reward you. Fail, and pay the price."',
    choices: [
      {
        text: 'Attempt the riddle',
        risk: '60% chance: gain operator. 40%: lose 8 HP.',
        outcome: (state, rng) => {
          if (rng.next() < 0.6) {
            const options = ['modulo', 'concat', 'negate', 'sqrt'];
            const op = rng.pick(options);
            return {
              changes: { operatorHand: [...state.player.operatorHand, op] },
              message: `You solved the riddle! Gained a ${op} operator.`,
              positive: true,
            };
          }
          return {
            changes: { hp: Math.max(1, state.player.hp - 8) },
            message: 'The riddle stumped you. Lost 8 HP.',
            positive: false,
          };
        },
      },
      {
        text: 'Politely decline',
        risk: 'Safe: gain 15 gold.',
        outcome: (state) => ({
          changes: { gold: state.player.gold + 15 },
          message: '"A pity," the figure sighs, tossing you some coins. +15 gold.',
          positive: true,
        }),
      },
    ],
  },
  {
    id: 'mysterious_shrine',
    title: 'Mysterious Shrine',
    text: 'Ancient numerals glow faintly on a stone altar. The air hums with mathematical energy.',
    choices: [
      {
        text: 'Touch the shrine',
        risk: '50% chance: +10 max HP. 50%: lose 10 HP.',
        outcome: (state, rng) => {
          if (rng.next() < 0.5) {
            return {
              changes: { maxHp: state.player.maxHp + 10, hp: state.player.hp + 10 },
              message: 'The shrine blesses you with vitality! Max HP +10.',
              positive: true,
            };
          }
          return {
            changes: { hp: Math.max(1, state.player.hp - 10) },
            message: 'The shrine zaps you with arcane force! Lost 10 HP.',
            positive: false,
          };
        },
      },
      {
        text: 'Pray at the shrine',
        risk: 'Heal to full HP, but lose 20 gold.',
        outcome: (state) => {
          if (state.player.gold < 20) {
            return {
              changes: {},
              message: 'Your pockets are too light. The shrine does not respond.',
              positive: false,
            };
          }
          return {
            changes: { hp: state.player.maxHp, gold: state.player.gold - 20 },
            message: 'The shrine heals your wounds completely. -20 gold.',
            positive: true,
          };
        },
      },
      {
        text: 'Walk away',
        risk: 'Nothing happens.',
        outcome: () => ({
          changes: {},
          message: 'You leave the shrine undisturbed.',
          positive: null,
        }),
      },
    ],
  },
  {
    id: 'treasure_goblin',
    title: 'Treasure Goblin',
    text: 'A cackling goblin drops a heavy sack and bolts into the darkness!',
    choices: [
      {
        text: 'Chase the goblin',
        risk: '+30 gold, but lose 5 HP from the pursuit.',
        outcome: (state) => ({
          changes: { gold: state.player.gold + 30, hp: Math.max(1, state.player.hp - 5) },
          message: 'You tackle the goblin and reclaim the treasure! +30 gold, -5 HP.',
          positive: true,
        }),
      },
      {
        text: 'Take the dropped sack',
        risk: 'Safe: +10 gold.',
        outcome: (state) => ({
          changes: { gold: state.player.gold + 10 },
          message: 'The sack jingles with coins. +10 gold.',
          positive: true,
        }),
      },
    ],
  },
  {
    id: 'number_spirit',
    title: 'Spirit of Numbers',
    text: 'A translucent figure materializes before you. "I can enhance your dice... for a price."',
    choices: [
      {
        text: 'Offer 50 gold',
        risk: 'Spend 50 gold to upgrade your worst die.',
        outcome: (state) => {
          if (state.player.gold < 50) {
            return {
              changes: {},
              message: 'You lack the gold. The spirit fades away.',
              positive: false,
            };
          }
          const TIERS = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
          const pool = state.player.dicePool;
          // Find worst die
          let worstIdx = 0;
          let worstTier = TIERS.indexOf(pool[0].type);
          for (let i = 1; i < pool.length; i++) {
            const tier = TIERS.indexOf(pool[i].type);
            if (tier < worstTier) { worstIdx = i; worstTier = tier; }
          }
          if (worstTier >= TIERS.length - 1) {
            return {
              changes: { gold: state.player.gold - 50 },
              message: 'Your dice are already at their peak. The spirit takes the gold anyway.',
              positive: false,
            };
          }
          const newPool = [...pool];
          newPool[worstIdx] = { ...newPool[worstIdx], type: TIERS[worstTier + 1] };
          return {
            changes: { gold: state.player.gold - 50, dicePool: newPool },
            message: `The spirit upgrades your ${TIERS[worstTier]} to a ${TIERS[worstTier + 1]}! -50 gold.`,
            positive: true,
          };
        },
      },
      {
        text: 'Offer 5 HP',
        risk: 'Lose 5 HP to gain a random operator.',
        outcome: (state, rng) => {
          const options = ['multiply', 'divide', 'power', 'modulo', 'concat', 'negate', 'sqrt'];
          const op = rng.pick(options);
          return {
            changes: {
              hp: Math.max(1, state.player.hp - 5),
              operatorHand: [...state.player.operatorHand, op],
            },
            message: `The spirit extracts a bit of your life force and grants you a ${op} operator. -5 HP.`,
            positive: true,
          };
        },
      },
      {
        text: 'Decline',
        risk: 'Nothing happens.',
        outcome: () => ({
          changes: {},
          message: 'The spirit nods solemnly and vanishes.',
          positive: null,
        }),
      },
    ],
  },
  {
    id: 'dice_fountain',
    title: 'Fountain of Chance',
    text: 'A bubbling fountain inscribed with dice symbols. Toss a coin and make a wish?',
    choices: [
      {
        text: 'Toss a coin (10 gold)',
        risk: '70% chance: gain an extra d6. 30%: nothing.',
        outcome: (state, rng) => {
          if (state.player.gold < 10) {
            return {
              changes: {},
              message: "You don't have enough gold for an offering.",
              positive: false,
            };
          }
          if (rng.next() < 0.7) {
            const newDie = { id: `die-${Date.now()}`, type: 'd6', value: null, held: false };
            return {
              changes: {
                gold: state.player.gold - 10,
                dicePool: [...state.player.dicePool, newDie],
              },
              message: 'The fountain glows! A shiny new d6 materializes. -10 gold.',
              positive: true,
            };
          }
          return {
            changes: { gold: state.player.gold - 10 },
            message: 'The coin sinks without effect. -10 gold.',
            positive: false,
          };
        },
      },
      {
        text: 'Drink from the fountain',
        risk: 'Heal 15 HP.',
        outcome: (state) => ({
          changes: { hp: Math.min(state.player.maxHp, state.player.hp + 15) },
          message: 'The water is refreshing. +15 HP.',
          positive: true,
        }),
      },
    ],
  },
  {
    id: 'cursed_operator',
    title: 'Cursed Tome',
    text: 'A tattered book lies open. The page shows a powerful but dangerous operator.',
    choices: [
      {
        text: 'Take the operator',
        risk: 'Gain factorial (!) operator, but lose 12 HP.',
        outcome: (state) => ({
          changes: {
            hp: Math.max(1, state.player.hp - 12),
            operatorHand: [...state.player.operatorHand, 'factorial'],
          },
          message: 'Dark energy courses through you as you learn Factorial (!). -12 HP.',
          positive: true,
        }),
      },
      {
        text: 'Burn the book',
        risk: 'Gain 25 gold from the ashes.',
        outcome: (state) => ({
          changes: { gold: state.player.gold + 25 },
          message: 'The book crumbles to ash, revealing hidden coins. +25 gold.',
          positive: true,
        }),
      },
    ],
  },
  {
    id: 'the_gambler',
    title: 'The Gambler',
    text: 'A shadowy figure sits at a stone table, shuffling dice between their fingers. "Double or nothing, friend?"',
    choices: [
      {
        text: 'Bet 30 gold',
        risk: '50/50: double your bet or lose it all.',
        outcome: (state, rng) => {
          if (state.player.gold < 30) {
            return { changes: {}, message: "You can't afford the ante.", positive: false };
          }
          if (rng.next() < 0.5) {
            return {
              changes: { gold: state.player.gold + 30 },
              message: 'Winner! The gambler flips you a heavy pouch. +30 gold.',
              positive: true,
            };
          }
          return {
            changes: { gold: state.player.gold - 30 },
            message: '"Better luck next time." The gambler pockets your gold. -30 gold.',
            positive: false,
          };
        },
      },
      {
        text: 'Bet a die',
        risk: '50/50: gain a d8 or lose your worst die.',
        outcome: (state, rng) => {
          if (state.player.dicePool.length <= 3) {
            return { changes: {}, message: "You can't risk losing dice when you have so few.", positive: false };
          }
          if (rng.next() < 0.5) {
            const newDie = { id: `die-${Date.now()}`, type: 'd8', diceClass: 'standard', value: null, held: false };
            return {
              changes: { dicePool: [...state.player.dicePool, newDie] },
              message: 'You win a gleaming d8! The gambler tips their hat.',
              positive: true,
            };
          }
          const TIERS = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
          const pool = [...state.player.dicePool];
          let worstIdx = 0;
          let worstTier = TIERS.indexOf(pool[0].type);
          for (let i = 1; i < pool.length; i++) {
            const tier = TIERS.indexOf(pool[i].type);
            if (tier < worstTier) { worstIdx = i; worstTier = tier; }
          }
          const lost = pool[worstIdx].type;
          pool.splice(worstIdx, 1);
          return {
            changes: { dicePool: pool },
            message: `The gambler snatches your ${lost}. "A deal's a deal."`,
            positive: false,
          };
        },
      },
      {
        text: 'Walk away',
        risk: 'Nothing happens.',
        outcome: () => ({ changes: {}, message: '"Your loss." The gambler shrugs.', positive: null }),
      },
    ],
  },
  {
    id: 'forgotten_library',
    title: 'Forgotten Library',
    text: 'Dusty shelves stretch into darkness. Mathematical treatises line every wall. You could study here for a while.',
    choices: [
      {
        text: 'Study operators',
        risk: 'Gain 2 random operators, but lose 15 HP from exhaustion.',
        outcome: (state, rng) => {
          const pool = ['add', 'subtract', 'multiply', 'divide', 'modulo', 'negate', 'triangle', 'rectangle'];
          const op1 = rng.pick(pool);
          const op2 = rng.pick(pool);
          return {
            changes: {
              hp: Math.max(1, state.player.hp - 15),
              operatorHand: [...state.player.operatorHand, op1, op2],
            },
            message: `Hours of study pay off! Gained ${op1} and ${op2}. -15 HP from exhaustion.`,
            positive: true,
          };
        },
      },
      {
        text: 'Search for treasure',
        risk: '40%: find 40 gold. 60%: find nothing, disturb a rat.',
        outcome: (state, rng) => {
          if (rng.next() < 0.4) {
            return {
              changes: { gold: state.player.gold + 40 },
              message: 'Behind a loose stone, a coin purse! +40 gold.',
              positive: true,
            };
          }
          return {
            changes: { hp: Math.max(1, state.player.hp - 3) },
            message: 'A rat bites you as you rummage. Nothing found. -3 HP.',
            positive: false,
          };
        },
      },
      {
        text: 'Take a nap',
        risk: 'Heal 10 HP.',
        outcome: (state) => ({
          changes: { hp: Math.min(state.player.maxHp, state.player.hp + 10) },
          message: 'You rest among the books. Peaceful. +10 HP.',
          positive: true,
        }),
      },
    ],
  },
  {
    id: 'mirror_pool',
    title: 'Mirror Pool',
    text: 'A still pool reflects a warped version of you. Your reflection holds different dice.',
    choices: [
      {
        text: 'Swap with your reflection',
        risk: 'Replace your worst die with a random d4-d12.',
        outcome: (state, rng) => {
          const TIERS = ['d4', 'd6', 'd8', 'd10', 'd12'];
          const pool = [...state.player.dicePool];
          let worstIdx = 0;
          let worstTier = TIERS.indexOf(pool[0].type);
          for (let i = 1; i < pool.length; i++) {
            const tier = TIERS.indexOf(pool[i].type);
            if (tier >= 0 && (worstTier < 0 || tier < worstTier)) { worstIdx = i; worstTier = tier; }
          }
          const oldType = pool[worstIdx].type;
          const newType = rng.pick(TIERS);
          pool[worstIdx] = { ...pool[worstIdx], type: newType };
          return {
            changes: { dicePool: pool },
            message: `Your ${oldType} shimmers and becomes a ${newType}!`,
            positive: TIERS.indexOf(newType) > worstTier,
          };
        },
      },
      {
        text: 'Shatter the reflection',
        risk: 'Gain +5 max HP. The pool goes dark.',
        outcome: (state) => ({
          changes: { maxHp: state.player.maxHp + 5, hp: state.player.hp + 5 },
          message: 'The glass shatters into stardust. You feel stronger. +5 max HP.',
          positive: true,
        }),
      },
    ],
  },
  {
    id: 'traveling_merchant',
    title: 'Traveling Merchant',
    text: '"Psst! I got deals you won\'t find in any shop. Special prices, just for you."',
    choices: [
      {
        text: 'Buy mystery operator (25 gold)',
        risk: 'Random rare+ operator for 25 gold.',
        outcome: (state, rng) => {
          if (state.player.gold < 25) {
            return { changes: {}, message: "\"Come back when you've got coin, friend.\"", positive: false };
          }
          const pool = ['power', 'concat', 'sqrt', 'factorial', 'triangle', 'rectangle'];
          const op = rng.pick(pool);
          return {
            changes: { gold: state.player.gold - 25, operatorHand: [...state.player.operatorHand, op] },
            message: `The merchant unwraps a glowing ${op} operator. "Pleasure doing business." -25 gold.`,
            positive: true,
          };
        },
      },
      {
        text: 'Buy mystery die (35 gold)',
        risk: 'Random d6-d10 for 35 gold.',
        outcome: (state, rng) => {
          if (state.player.gold < 35) {
            return { changes: {}, message: "\"No gold, no deal.\"", positive: false };
          }
          const types = ['d6', 'd8', 'd10'];
          const classes = ['standard', 'standard', 'fibonacci', 'square', 'prime'];
          const type = rng.pick(types);
          const cls = rng.pick(classes);
          const newDie = { id: `die-${Date.now()}`, type, diceClass: cls, value: null, held: false };
          const label = cls !== 'standard' ? `${cls} ${type}` : type;
          return {
            changes: { gold: state.player.gold - 35, dicePool: [...state.player.dicePool, newDie] },
            message: `The merchant reveals a ${label}! "Handle with care." -35 gold.`,
            positive: true,
          };
        },
      },
      {
        text: '"No thanks"',
        risk: 'Nothing happens.',
        outcome: () => ({ changes: {}, message: '"Your loss!" The merchant vanishes into the shadows.', positive: null }),
      },
    ],
  },
  {
    id: 'the_forge',
    title: 'The Forge',
    text: 'A dwarf hammers at an anvil, shaping dice from molten metal. "I can reforge one of yours. Stronger, but different."',
    choices: [
      {
        text: 'Reforge a die (change its class)',
        risk: 'Transform your first standard die into fibonacci, square, or prime.',
        outcome: (state, rng) => {
          const pool = [...state.player.dicePool];
          const stdIdx = pool.findIndex(d => d.diceClass === 'standard' || !d.diceClass);
          if (stdIdx < 0) {
            return { changes: {}, message: '"All your dice are already special. Nothing to reforge."', positive: false };
          }
          const newClass = rng.pick(['fibonacci', 'square', 'prime']);
          pool[stdIdx] = { ...pool[stdIdx], diceClass: newClass };
          return {
            changes: { dicePool: pool },
            message: `The dwarf hammers your ${pool[stdIdx].type} into a ${newClass} die! Its faces shift and glow.`,
            positive: true,
          };
        },
      },
      {
        text: 'Upgrade a die (+1 tier)',
        risk: 'Costs 20 gold. Upgrades your worst die.',
        outcome: (state) => {
          if (state.player.gold < 20) {
            return { changes: {}, message: '"Forging ain\'t free, friend."', positive: false };
          }
          const TIERS = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
          const pool = [...state.player.dicePool];
          let worstIdx = 0;
          let worstTier = TIERS.indexOf(pool[0].type);
          for (let i = 1; i < pool.length; i++) {
            const tier = TIERS.indexOf(pool[i].type);
            if (tier < worstTier) { worstIdx = i; worstTier = tier; }
          }
          if (worstTier >= TIERS.length - 1) {
            return { changes: { gold: state.player.gold - 20 }, message: '"Already top quality! But I\'ll take the gold."', positive: false };
          }
          const oldType = pool[worstIdx].type;
          pool[worstIdx] = { ...pool[worstIdx], type: TIERS[worstTier + 1] };
          return {
            changes: { gold: state.player.gold - 20, dicePool: pool },
            message: `The dwarf hammers your ${oldType} into a ${TIERS[worstTier + 1]}! -20 gold.`,
            positive: true,
          };
        },
      },
    ],
  },
  {
    id: 'trapped_chest',
    title: 'Trapped Chest',
    text: 'A wooden chest sits in the corner, chained shut. Scratch marks surround it. Something inside rattles.',
    choices: [
      {
        text: 'Force it open',
        risk: '33% each: 60 gold, +8 max HP, or 15 damage.',
        outcome: (state, rng) => {
          const roll = rng.next();
          if (roll < 0.33) {
            return {
              changes: { gold: state.player.gold + 60 },
              message: 'Jackpot! The chest is full of gold coins. +60 gold.',
              positive: true,
            };
          } else if (roll < 0.66) {
            return {
              changes: { maxHp: state.player.maxHp + 8, hp: state.player.hp + 8 },
              message: 'A warm light envelops you from the chest. +8 max HP.',
              positive: true,
            };
          }
          return {
            changes: { hp: Math.max(1, state.player.hp - 15) },
            message: 'A poison dart fires from the lock! -15 HP.',
            positive: false,
          };
        },
      },
      {
        text: 'Pick the lock carefully',
        risk: 'Safe: +20 gold, takes time.',
        outcome: (state) => ({
          changes: { gold: state.player.gold + 20 },
          message: 'With patience, the lock clicks open. Some coins inside. +20 gold.',
          positive: true,
        }),
      },
      {
        text: 'Leave it alone',
        risk: 'Nothing happens.',
        outcome: () => ({
          changes: {},
          message: 'Probably for the best. You move on.',
          positive: null,
        }),
      },
    ],
  },
  {
    id: 'sacrifice_altar',
    title: 'Altar of Sacrifice',
    text: 'A blood-red altar thrums with power. An inscription reads: "Give of yourself, receive in kind."',
    choices: [
      {
        text: 'Sacrifice 20 HP',
        risk: 'Lose 20 HP. Gain a random rare operator.',
        outcome: (state, rng) => {
          if (state.player.hp <= 20) {
            return { changes: {}, message: 'You are too weak to survive this sacrifice.', positive: false };
          }
          const pool = ['power', 'concat', 'sqrt', 'factorial'];
          const op = rng.pick(pool);
          return {
            changes: { hp: state.player.hp - 20, operatorHand: [...state.player.operatorHand, op] },
            message: `Blood drips onto the altar. A ${op} operator materializes. -20 HP.`,
            positive: true,
          };
        },
      },
      {
        text: 'Sacrifice 10 max HP',
        risk: 'Permanently lose 10 max HP. Gain +1 reroll per turn.',
        outcome: (state) => {
          if (state.player.maxHp <= 20) {
            return { changes: {}, message: 'Your life force is too diminished.', positive: false };
          }
          return {
            changes: {
              maxHp: state.player.maxHp - 10,
              hp: Math.min(state.player.hp, state.player.maxHp - 10),
              rerollsPerTurn: state.player.rerollsPerTurn + 1,
            },
            message: 'Your vitality wanes, but you feel quicker. -10 max HP, +1 reroll per turn!',
            positive: true,
          };
        },
      },
      {
        text: 'Back away',
        risk: 'Nothing happens.',
        outcome: () => ({ changes: {}, message: 'The altar dims as you retreat. Wise choice... or was it?', positive: null }),
      },
    ],
  },
  {
    id: 'dice_thief',
    title: 'Dice Thief',
    text: 'A nimble figure snatches one of your dice and darts away! They pause at the exit, grinning. "Catch me and I\'ll give you something better."',
    choices: [
      {
        text: 'Chase them',
        risk: '70% catch: get your die back + a bonus d6. 30%: lose the die + 5 HP.',
        outcome: (state, rng) => {
          if (state.player.dicePool.length <= 3) {
            return { changes: {}, message: 'The thief sees your meager collection and tosses the die back. "Not worth my time."', positive: null };
          }
          if (rng.next() < 0.7) {
            const newDie = { id: `die-${Date.now()}`, type: 'd6', diceClass: 'standard', value: null, held: false };
            return {
              changes: { dicePool: [...state.player.dicePool, newDie] },
              message: 'You tackle the thief! They drop your die AND one of theirs. +1 bonus d6!',
              positive: true,
            };
          }
          const pool = [...state.player.dicePool];
          pool.pop();
          return {
            changes: { dicePool: pool, hp: Math.max(1, state.player.hp - 5) },
            message: 'The thief is too fast! Lost a die and tripped chasing them. -1 die, -5 HP.',
            positive: false,
          };
        },
      },
      {
        text: 'Let them go',
        risk: 'Lose your last die, but gain 25 gold dropped in their escape.',
        outcome: (state) => {
          if (state.player.dicePool.length <= 3) {
            return { changes: {}, message: 'The thief sees your meager collection and tosses the die back. "Not worth my time."', positive: null };
          }
          const pool = [...state.player.dicePool];
          pool.pop();
          return {
            changes: { dicePool: pool, gold: state.player.gold + 25 },
            message: 'The thief escapes, but drops some coins. -1 die, +25 gold.',
            positive: false,
          };
        },
      },
    ],
  },
  {
    id: 'wishing_well',
    title: 'Wishing Well',
    text: 'A deep well carved with ancient runes. Coins glitter far below. A sign reads: "One wish per traveler."',
    choices: [
      {
        text: 'Wish for power (toss 40 gold)',
        risk: 'Spend 40 gold. Gain +1 reroll per turn permanently.',
        outcome: (state) => {
          if (state.player.gold < 40) {
            return { changes: {}, message: 'The well demands a greater offering.', positive: false };
          }
          return {
            changes: { gold: state.player.gold - 40, rerollsPerTurn: state.player.rerollsPerTurn + 1 },
            message: 'The coins vanish mid-fall. You feel luckier. +1 reroll per turn!',
            positive: true,
          };
        },
      },
      {
        text: 'Wish for health (toss 20 gold)',
        risk: 'Spend 20 gold. Gain +15 max HP.',
        outcome: (state) => {
          if (state.player.gold < 20) {
            return { changes: {}, message: 'The well demands a greater offering.', positive: false };
          }
          return {
            changes: { gold: state.player.gold - 20, maxHp: state.player.maxHp + 15, hp: state.player.hp + 15 },
            message: 'Warm light rises from the well. +15 max HP.',
            positive: true,
          };
        },
      },
      {
        text: 'Fish out coins',
        risk: '50%: grab 30 gold. 50%: fall in, lose 10 HP.',
        outcome: (state, rng) => {
          if (rng.next() < 0.5) {
            return {
              changes: { gold: state.player.gold + 30 },
              message: 'You snag a handful of coins from the ledge! +30 gold.',
              positive: true,
            };
          }
          return {
            changes: { hp: Math.max(1, state.player.hp - 10) },
            message: 'You slip and tumble in! Soaking wet and bruised. -10 HP.',
            positive: false,
          };
        },
      },
    ],
  },
  {
    id: 'operator_merchant',
    title: 'Operator Peddler',
    text: 'A strange figure has operators laid out on a blanket. "Trade you. One of yours for one of mine."',
    choices: [
      {
        text: 'Trade your first operator',
        risk: 'Lose your 1st operator, gain a random rare one.',
        outcome: (state, rng) => {
          if (state.player.operatorHand.length === 0) {
            return { changes: {}, message: '"Nothing to trade? Be on your way."', positive: false };
          }
          const lost = state.player.operatorHand[0];
          const pool = ['power', 'concat', 'sqrt', 'triangle', 'rectangle', 'modulo', 'negate'];
          const gained = rng.pick(pool.filter(o => o !== lost));
          const newHand = [gained, ...state.player.operatorHand.slice(1)];
          return {
            changes: { operatorHand: newHand },
            message: `Traded ${lost} for ${gained}. "Pleasure doing business."`,
            positive: true,
          };
        },
      },
      {
        text: 'Buy one (15 gold)',
        risk: 'Pay 15 gold for a random operator.',
        outcome: (state, rng) => {
          if (state.player.gold < 15) {
            return { changes: {}, message: '"No charity here, friend."', positive: false };
          }
          const pool = ['add', 'subtract', 'multiply', 'divide', 'modulo', 'negate', 'triangle', 'rectangle'];
          const op = rng.pick(pool);
          return {
            changes: { gold: state.player.gold - 15, operatorHand: [...state.player.operatorHand, op] },
            message: `Bought a ${op} operator. -15 gold.`,
            positive: true,
          };
        },
      },
      {
        text: 'Move along',
        risk: 'Nothing happens.',
        outcome: () => ({ changes: {}, message: 'The peddler folds up their blanket and disappears.', positive: null }),
      },
    ],
  },
  {
    id: 'ancient_puzzle',
    title: 'Ancient Puzzle Door',
    text: 'A stone door carved with gears and numbers blocks the passage. Three levers protrude from the wall.',
    choices: [
      {
        text: 'Pull the left lever',
        risk: '33% each: 50 gold, heal to full, or lose 12 HP.',
        outcome: (state, rng) => {
          const roll = rng.next();
          if (roll < 0.33) {
            return { changes: { gold: state.player.gold + 50 }, message: 'Coins pour from the wall! +50 gold.', positive: true };
          } else if (roll < 0.66) {
            return { changes: { hp: state.player.maxHp }, message: 'A healing wave washes over you. Full HP!', positive: true };
          }
          return { changes: { hp: Math.max(1, state.player.hp - 12) }, message: 'A blade swings from the ceiling! -12 HP.', positive: false };
        },
      },
      {
        text: 'Pull the right lever',
        risk: '33% each: gain d10, gain rare operator, or lose 10 HP.',
        outcome: (state, rng) => {
          const roll = rng.next();
          if (roll < 0.33) {
            const newDie = { id: `die-${Date.now()}`, type: 'd10', diceClass: 'standard', value: null, held: false };
            return { changes: { dicePool: [...state.player.dicePool, newDie] }, message: 'A d10 rolls out of a slot! +1 d10.', positive: true };
          } else if (roll < 0.66) {
            const op = rng.pick(['power', 'sqrt', 'concat', 'triangle', 'rectangle']);
            return { changes: { operatorHand: [...state.player.operatorHand, op] }, message: `A scroll unfurls: ${op}! +1 operator.`, positive: true };
          }
          return { changes: { hp: Math.max(1, state.player.hp - 10) }, message: 'Poisonous gas fills the room! -10 HP.', positive: false };
        },
      },
      {
        text: 'Pull the middle lever',
        risk: '50% gain +1 reroll permanently. 50% lose 15 HP.',
        outcome: (state, rng) => {
          if (rng.next() < 0.5) {
            return {
              changes: { rerollsPerTurn: state.player.rerollsPerTurn + 1 },
              message: 'The gears align perfectly! You feel sharper. +1 reroll per turn permanently.',
              positive: true,
            };
          }
          return {
            changes: { hp: Math.max(1, state.player.hp - 15) },
            message: 'The middle mechanism jams and explodes! Shrapnel hits you. -15 HP.',
            positive: false,
          };
        },
      },
      {
        text: 'Squeeze past the door',
        risk: 'Safe but costs 5 HP.',
        outcome: (state) => ({
          changes: { hp: Math.max(1, state.player.hp - 5) },
          message: 'You scrape through a narrow gap beside the door. Bruised but through. -5 HP.',
          positive: false,
        }),
      },
    ],
    // Custom interactive rendering — visual puzzle door with clickable levers
    customRender(container, rng, state, onResult) {
      container.innerHTML = `
        <div class="event-content">
          <div class="event-title">Ancient Puzzle Door</div>
          <div class="event-text">A massive stone door blocks the corridor. Gears and number glyphs cover its surface. Three iron levers protrude from the wall beside it. A narrow gap runs along one edge — just wide enough to squeeze through.</div>

          <div class="puzzle-door-scene">
            <div class="puzzle-door">
              <div class="puzzle-door-surface">
                <div class="puzzle-gear gear-1">⚙</div>
                <div class="puzzle-gear gear-2">⚙</div>
                <div class="puzzle-gear gear-3">⚙</div>
                <div class="puzzle-glyphs">∑ π φ ∞</div>
              </div>
            </div>

            <div class="puzzle-levers">
              <div class="puzzle-lever" data-lever="0">
                <div class="lever-label">I</div>
                <div class="lever-handle"></div>
                <div class="lever-base"></div>
                <div class="lever-hint">Gold / Heal / Trap</div>
              </div>
              <div class="puzzle-lever" data-lever="2">
                <div class="lever-label">II</div>
                <div class="lever-handle"></div>
                <div class="lever-base"></div>
                <div class="lever-hint">Reroll / Explosion</div>
              </div>
              <div class="puzzle-lever" data-lever="1">
                <div class="lever-label">III</div>
                <div class="lever-handle"></div>
                <div class="lever-base"></div>
                <div class="lever-hint">Die / Scroll / Gas</div>
              </div>
            </div>

            <div class="puzzle-gap" data-lever="3">
              <div class="puzzle-gap-visual">
                <div class="gap-wall left"></div>
                <div class="gap-space"></div>
                <div class="gap-wall right"></div>
              </div>
              <div class="gap-label">Squeeze through<br><span class="gap-cost">-5 HP</span></div>
            </div>
          </div>
        </div>
      `;

      const choices = this.choices;
      let resolved = false;

      // Wire up levers
      container.querySelectorAll('.puzzle-lever').forEach(el => {
        el.addEventListener('click', () => {
          if (resolved) return;
          resolved = true;

          const idx = parseInt(el.dataset.lever);
          el.classList.add('pulled');

          // Spin gears
          container.querySelectorAll('.puzzle-gear').forEach(g => g.classList.add('spinning'));

          // Resolve after animation
          setTimeout(() => {
            const result = choices[idx].outcome(state, rng);
            onResult(result);
          }, 1200);
        });
      });

      // Wire up gap
      container.querySelector('.puzzle-gap').addEventListener('click', () => {
        if (resolved) return;
        resolved = true;

        const gap = container.querySelector('.puzzle-gap');
        gap.classList.add('squeezing');

        setTimeout(() => {
          const result = choices[3].outcome(state, rng);
          onResult(result);
        }, 800);
      });
    },
  },
  {
    id: 'the_collector',
    title: 'The Collector',
    text: 'An elderly figure peers at your dice through a monocle. "Exquisite! I\'ll pay handsomely for one."',
    choices: [
      {
        text: 'Sell a die (gain 50 gold)',
        risk: 'Lose your worst die, gain 50 gold.',
        outcome: (state) => {
          if (state.player.dicePool.length <= 3) {
            return { changes: {}, message: '"You need those more than I do. Keep them."', positive: false };
          }
          const TIERS = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
          const pool = [...state.player.dicePool];
          let worstIdx = 0;
          let worstTier = TIERS.indexOf(pool[0].type);
          for (let i = 1; i < pool.length; i++) {
            const tier = TIERS.indexOf(pool[i].type);
            if (tier < worstTier) { worstIdx = i; worstTier = tier; }
          }
          const sold = pool[worstIdx].type;
          pool.splice(worstIdx, 1);
          return {
            changes: { dicePool: pool, gold: state.player.gold + 50 },
            message: `"Lovely ${sold}!" The collector pays generously. +50 gold.`,
            positive: true,
          };
        },
      },
      {
        text: 'Show off your collection',
        risk: 'If you have 6+ dice, gain 25 gold as a tip.',
        outcome: (state) => {
          if (state.player.dicePool.length >= 6) {
            return {
              changes: { gold: state.player.gold + 25 },
              message: '"Magnificent collection!" The collector tips you. +25 gold.',
              positive: true,
            };
          }
          return { changes: {}, message: '"Hmm, a modest collection. Come back when you have more."', positive: null };
        },
      },
    ],
  },
  {
    id: 'high_stakes_table',
    title: 'High Stakes Table',
    text: 'Translucent ghosts sit at a card table, chips stacked high. One beckons you over. "Care to wager, mortal?"',
    choices: [
      {
        text: 'Bet half your gold',
        risk: '40% double it back. 60% lose the bet.',
        outcome: (state, rng) => {
          const bet = Math.floor(state.player.gold / 2);
          if (bet <= 0) {
            return { changes: {}, message: 'The ghosts laugh. "You have nothing to wager, mortal."', positive: false };
          }
          if (rng.next() < 0.4) {
            return {
              changes: { gold: state.player.gold + bet },
              message: `The spirits applaud! You doubled your bet. +${bet} gold.`,
              positive: true,
            };
          }
          return {
            changes: { gold: state.player.gold - bet },
            message: `The ghosts cackle as your coins vanish. -${bet} gold.`,
            positive: false,
          };
        },
      },
      {
        text: 'Watch a round',
        risk: 'Safe: gain 10 gold.',
        outcome: (state) => ({
          changes: { gold: state.player.gold + 10 },
          message: 'You observe the ghostly game. One spirit flips you a coin for the entertainment. +10 gold.',
          positive: true,
        }),
      },
    ],
  },
  {
    id: 'lucky_streak',
    title: 'Lucky Streak',
    text: 'A stone slot machine juts from the dungeon wall, its reels etched with arcane symbols. A sign reads: "15 GOLD PER PULL."',
    choices: [
      {
        text: 'Pull the lever (costs 15 gold)',
        risk: '33%: gain d10/d12. 33%: gain factorial. 33%: lose 20 HP.',
        outcome: (state, rng) => {
          if (state.player.gold < 15) {
            return { changes: {}, message: 'You pat your empty pockets. The machine mocks you with silence.', positive: false };
          }
          const roll = rng.next();
          if (roll < 0.33) {
            const type = rng.pick(['d10', 'd12']);
            const newDie = { id: 'die-' + Date.now(), type, diceClass: 'standard', value: null, held: false };
            return {
              changes: { gold: state.player.gold - 15, dicePool: [...state.player.dicePool, newDie] },
              message: `Jackpot! A ${type} tumbles out of the machine. -15 gold.`,
              positive: true,
            };
          } else if (roll < 0.66) {
            return {
              changes: { gold: state.player.gold - 15, operatorHand: [...state.player.operatorHand, 'factorial'] },
              message: 'The reels align on "!" — a factorial operator drops into your hand. -15 gold.',
              positive: true,
            };
          }
          return {
            changes: { gold: state.player.gold - 15, hp: Math.max(1, state.player.hp - 20) },
            message: 'The machine sparks and electrocutes you! -15 gold, -20 HP.',
            positive: false,
          };
        },
      },
      {
        text: 'Kick it',
        risk: '50%: shakes out 25 gold. 50%: falls on foot, 8 damage.',
        outcome: (state, rng) => {
          if (rng.next() < 0.5) {
            return {
              changes: { gold: state.player.gold + 25 },
              message: 'Coins rattle loose from the machine! +25 gold.',
              positive: true,
            };
          }
          return {
            changes: { hp: Math.max(1, state.player.hp - 8) },
            message: 'The machine topples onto your foot! -8 HP.',
            positive: false,
          };
        },
      },
    ],
  },
  {
    id: 'chaos_forge',
    title: 'The Chaos Forge',
    text: 'An unstable forge crackles with shifting flames — blue, green, violet. The anvil hums with chaotic energy.',
    choices: [
      {
        text: 'Reforge a die',
        risk: 'Changes a random die to a different class.',
        outcome: (state, rng) => {
          const pool = [...state.player.dicePool];
          if (pool.length === 0) {
            return { changes: {}, message: 'You have no dice to reforge.', positive: false };
          }
          const idx = Math.floor(rng.next() * pool.length);
          const current = pool[idx].diceClass || 'standard';
          const classes = ['standard', 'fibonacci', 'square', 'prime'].filter(c => c !== current);
          const newClass = rng.pick(classes);
          pool[idx] = { ...pool[idx], diceClass: newClass };
          return {
            changes: { dicePool: pool },
            message: `The forge reshapes your ${pool[idx].type} from ${current} to ${newClass}!`,
            positive: true,
          };
        },
      },
      {
        text: 'Forge an operator',
        risk: 'Remove your last operator, gain a random rare one.',
        outcome: (state, rng) => {
          if (state.player.operatorHand.length === 0) {
            return { changes: {}, message: 'You have no operators to sacrifice to the forge.', positive: false };
          }
          const newHand = state.player.operatorHand.slice(0, -1);
          const rare = rng.pick(['power', 'sqrt', 'factorial', 'concat', 'log']);
          newHand.push(rare);
          return {
            changes: { operatorHand: newHand },
            message: `The forge consumes your last operator and produces a ${rare}!`,
            positive: true,
          };
        },
      },
      {
        text: 'Back away',
        risk: 'Nothing happens.',
        outcome: () => ({
          changes: {},
          message: 'The forge sputters as you retreat. Probably wise — those flames looked hungry.',
          positive: null,
        }),
      },
    ],
  },
  {
    id: 'operator_fusion',
    title: 'Operator Fusion Chamber',
    text: 'A crystal chamber pulses with energy. Two pedestals flank a central orb. An inscription reads: "Two become one, greater than before."',
    choices: [
      {
        text: 'Fuse operators',
        risk: 'Need 4+ operators. Remove 2, gain a powerful one.',
        outcome: (state, rng) => {
          if (state.player.operatorHand.length < 4) {
            return { changes: {}, message: 'The chamber dims. Not enough operators to sustain the fusion.', positive: false };
          }
          const newHand = state.player.operatorHand.slice(0, -2);
          const fused = rng.pick(['power', 'sqrt', 'factorial', 'concat']);
          newHand.push(fused);
          return {
            changes: { operatorHand: newHand },
            message: `Two operators dissolve into light and reform as ${fused}!`,
            positive: true,
          };
        },
      },
      {
        text: 'Decline',
        risk: 'Nothing happens.',
        outcome: () => ({
          changes: {},
          message: 'You step back from the chamber. The crystals fade.',
          positive: null,
        }),
      },
    ],
  },
  {
    id: 'ancient_armory',
    title: 'Ancient Armory',
    text: 'Racks of enchanted weapons and tools line the walls of a forgotten armory. Dust motes dance in the torchlight.',
    choices: [
      {
        text: 'Take a die',
        risk: 'Gain a random d8/d10/d12 with random class.',
        outcome: (state, rng) => {
          const type = rng.pick(['d8', 'd10', 'd12']);
          const cls = rng.pick(['standard', 'fibonacci', 'square', 'prime']);
          const newDie = { id: 'die-' + Date.now(), type, diceClass: cls, value: null, held: false };
          const label = cls !== 'standard' ? `${cls} ${type}` : type;
          return {
            changes: { dicePool: [...state.player.dicePool, newDie] },
            message: `You pull a ${label} from the weapon rack. It hums with energy.`,
            positive: true,
          };
        },
      },
      {
        text: 'Take an operator',
        risk: 'Gain a random rare operator.',
        outcome: (state, rng) => {
          const op = rng.pick(['power', 'sqrt', 'factorial', 'concat', 'log']);
          return {
            changes: { operatorHand: [...state.player.operatorHand, op] },
            message: `You grab a scroll from the rack — it contains ${op}!`,
            positive: true,
          };
        },
      },
      {
        text: 'Take gold',
        risk: 'Gain 50 gold.',
        outcome: (state) => ({
          changes: { gold: state.player.gold + 50 },
          message: 'You fill your pockets from a chest of ancient coins. +50 gold.',
          positive: true,
        }),
      },
    ],
  },
  {
    id: 'blood_contract',
    title: 'Blood Contract',
    text: 'A demon materializes in a swirl of crimson smoke, holding a parchment and quill. "Sign here, and power beyond measure is yours. The cost? A trifle."',
    choices: [
      {
        text: 'Sign the contract',
        risk: 'Lose 25 max HP permanently. Gain d20 + factorial.',
        outcome: (state) => {
          if (state.player.maxHp <= 30) {
            return { changes: {}, message: 'The demon examines you and frowns. "Too feeble. You wouldn\'t survive the terms."', positive: false };
          }
          const newMaxHp = state.player.maxHp - 25;
          const newHp = Math.min(state.player.hp, newMaxHp);
          const newDie = { id: 'die-' + Date.now(), type: 'd20', diceClass: 'standard', value: null, held: false };
          return {
            changes: {
              maxHp: newMaxHp,
              hp: newHp,
              dicePool: [...state.player.dicePool, newDie],
              operatorHand: [...state.player.operatorHand, 'factorial'],
            },
            message: 'Pain sears through you as the contract burns into your skin. Gained a d20 and factorial! -25 max HP.',
            positive: true,
          };
        },
      },
      {
        text: 'Tear it up',
        risk: 'Demon attacks: lose 10 HP, gain 20 gold.',
        outcome: (state) => ({
          changes: {
            hp: Math.max(1, state.player.hp - 10),
            gold: state.player.gold + 20,
          },
          message: 'The demon shrieks as you shred the parchment! It claws you before vanishing, dropping gold. -10 HP, +20 gold.',
          positive: false,
        }),
      },
    ],
  },
  {
    id: 'cursed_die',
    title: 'The Cursed Die',
    text: 'A massive d20 sits in a circle of glowing runes, pulsing with dark energy. Shadows writhe around it. Power radiates from every face.',
    choices: [
      {
        text: 'Take it',
        risk: 'Gain d20, but permanently lose 15 max HP.',
        outcome: (state) => {
          const newMaxHp = state.player.maxHp - 15;
          const newHp = Math.min(state.player.hp, newMaxHp);
          const newDie = { id: 'die-' + Date.now(), type: 'd20', diceClass: 'standard', value: null, held: false };
          return {
            changes: {
              maxHp: newMaxHp,
              hp: newHp,
              dicePool: [...state.player.dicePool, newDie],
            },
            message: 'The runes sear your hands as you grab the d20. Your life force drains. +1 d20, -15 max HP.',
            positive: true,
          };
        },
      },
      {
        text: 'Destroy it',
        risk: 'Safe: gain 35 gold from the shattered runes.',
        outcome: (state) => ({
          changes: { gold: state.player.gold + 35 },
          message: 'You smash the cursed die. The rune circle crumbles, revealing gold embedded in the stone. +35 gold.',
          positive: true,
        }),
      },
    ],
  },
  {
    id: 'lost_scholar',
    title: 'Lost Scholar',
    text: 'An injured scholar huddles against the wall, clutching a bundle of scrolls. "Please... I just need to reach the surface."',
    choices: [
      {
        text: 'Help them (lose 5 HP)',
        risk: 'Lose 5 HP. Gain 2 random operators.',
        outcome: (state, rng) => {
          const pool = ['add', 'subtract', 'multiply', 'divide', 'modulo', 'negate'];
          const op1 = rng.pick(pool);
          const op2 = rng.pick(pool);
          return {
            changes: {
              hp: Math.max(1, state.player.hp - 5),
              operatorHand: [...state.player.operatorHand, op1, op2],
            },
            message: `The scholar thanks you with two scrolls: ${op1} and ${op2}. -5 HP.`,
            positive: true,
          };
        },
      },
      {
        text: 'Take their scrolls',
        risk: 'Gain 1 random operator + 15 gold.',
        outcome: (state, rng) => {
          const pool = ['add', 'subtract', 'multiply', 'divide', 'modulo', 'negate'];
          const op = rng.pick(pool);
          return {
            changes: {
              gold: state.player.gold + 15,
              operatorHand: [...state.player.operatorHand, op],
            },
            message: `You snatch a scroll (${op}) and the scholar's coin purse. +1 operator, +15 gold.`,
            positive: true,
          };
        },
      },
      {
        text: 'Point toward the exit',
        risk: 'Safe: gain 10 gold.',
        outcome: (state) => ({
          changes: { gold: state.player.gold + 10 },
          message: '"Bless you!" The scholar presses a few coins into your hand before limping away. +10 gold.',
          positive: true,
        }),
      },
    ],
  },
  {
    id: 'rival_adventurer',
    title: 'Rival Adventurer',
    text: 'Another adventurer blocks the corridor, arms crossed. "Only one of us gets the loot ahead. Unless... we settle this like professionals."',
    choices: [
      {
        text: 'Accept the duel',
        risk: '60%: gain a random d8/d10/d12. 40%: lose 25 gold.',
        outcome: (state, rng) => {
          if (rng.next() < 0.6) {
            const type = rng.pick(['d8', 'd10', 'd12']);
            const newDie = { id: 'die-' + Date.now(), type, diceClass: 'standard', value: null, held: false };
            return {
              changes: { dicePool: [...state.player.dicePool, newDie] },
              message: `You win the duel! The rival tosses you a ${type} in defeat.`,
              positive: true,
            };
          }
          return {
            changes: { gold: Math.max(0, state.player.gold - 25) },
            message: 'The rival bests you and demands payment. -25 gold.',
            positive: false,
          };
        },
      },
      {
        text: 'Share a meal',
        risk: 'Both heal 10 HP.',
        outcome: (state) => ({
          changes: { hp: Math.min(state.player.maxHp, state.player.hp + 10) },
          message: 'You share rations and swap stories. A rare moment of peace. +10 HP.',
          positive: true,
        }),
      },
    ],
  },
  {
    id: 'collapsing_bridge',
    title: 'Collapsing Bridge',
    text: 'A crumbling stone bridge spans a bottomless chasm. Rocks crumble from its edges as you watch. The alternative is a long, winding detour.',
    choices: [
      {
        text: 'Sprint across',
        risk: '70%: safe + 20 gold. 30%: fall, lose 20 HP.',
        outcome: (state, rng) => {
          if (rng.next() < 0.7) {
            return {
              changes: { gold: state.player.gold + 20 },
              message: 'You dash across just as the bridge crumbles behind you! Found coins on the other side. +20 gold.',
              positive: true,
            };
          }
          return {
            changes: { hp: Math.max(1, state.player.hp - 20) },
            message: 'The bridge gives way! You barely grab the ledge and pull yourself up, battered. -20 HP.',
            positive: false,
          };
        },
      },
      {
        text: 'Take the long way',
        risk: 'Safe but exhausting. Lose 5 HP.',
        outcome: (state) => ({
          changes: { hp: Math.max(1, state.player.hp - 5) },
          message: 'The detour is grueling but safe. You arrive exhausted. -5 HP.',
          positive: false,
        }),
      },
    ],
  },
  {
    id: 'poison_fog',
    title: 'Poison Fog',
    text: 'A thick green mist rolls through the corridor ahead. The air stings your eyes. Something glints deeper within the fog.',
    choices: [
      {
        text: 'Push through',
        risk: 'Lose 10 HP, but find 40 gold.',
        outcome: (state) => ({
          changes: {
            hp: Math.max(1, state.player.hp - 10),
            gold: state.player.gold + 40,
          },
          message: 'You choke through the fog and find a hidden chest! -10 HP, +40 gold.',
          positive: true,
        }),
      },
      {
        text: 'Wait it out',
        risk: 'Minor exposure. Lose 3 HP.',
        outcome: (state) => ({
          changes: { hp: Math.max(1, state.player.hp - 3) },
          message: 'The fog eventually thins. Some residue stings your lungs. -3 HP.',
          positive: false,
        }),
      },
      {
        text: 'Fan it with operators',
        risk: 'Need 5+ operators. No damage + 15 gold. Else lose 5 HP.',
        outcome: (state) => {
          if (state.player.operatorHand.length >= 5) {
            return {
              changes: { gold: state.player.gold + 15 },
              message: 'You wave your operator scrolls furiously. The fog disperses, revealing coins! +15 gold.',
              positive: true,
            };
          }
          return {
            changes: { hp: Math.max(1, state.player.hp - 5) },
            message: 'Not enough wind power! The feeble breeze barely moves the fog. You inhale a lungful. -5 HP.',
            positive: false,
          };
        },
      },
    ],
  },
  {
    id: 'dark_pact',
    title: 'Dark Pact',
    text: 'A shadowy presence coils around you, whispering promises. "I can sharpen your instincts... if you pay in life force."',
    choices: [
      {
        text: 'Accept the pact',
        risk: 'Gain +2 rerolls permanently. Lose 20 max HP permanently.',
        outcome: (state) => {
          if (state.player.maxHp <= 25) {
            return { changes: {}, message: 'The shadow recoils. "There is barely enough life in you to sustain the pact."', positive: false };
          }
          const newMaxHp = state.player.maxHp - 20;
          const newHp = Math.min(state.player.hp, newMaxHp);
          return {
            changes: {
              maxHp: newMaxHp,
              hp: newHp,
              rerollsPerTurn: state.player.rerollsPerTurn + 2,
            },
            message: 'Darkness seeps into your veins. Your reflexes sharpen. +2 rerolls per turn, -20 max HP.',
            positive: true,
          };
        },
      },
      {
        text: 'Refuse',
        risk: 'Safe: gain 15 gold.',
        outcome: (state) => ({
          changes: { gold: state.player.gold + 15 },
          message: 'The shadow hisses and dissipates, leaving behind a handful of dark coins. +15 gold.',
          positive: true,
        }),
      },
    ],
  },
  {
    id: 'prime_gate',
    title: 'The Prime Gate',
    text: 'A towering door inscribed with prime numbers blocks the passage. The numbers glow faintly, as if sensing your approach.',
    choices: [
      {
        text: 'Step through',
        risk: 'If you have prime-class dice: free passage + 30 gold. Else: lose 15 HP.',
        outcome: (state) => {
          const hasPrime = state.player.dicePool.some(d => d.diceClass === 'prime');
          if (hasPrime) {
            return {
              changes: { gold: state.player.gold + 30 },
              message: 'Your prime dice resonate with the gate! It swings open, revealing a cache of gold. +30 gold.',
              positive: true,
            };
          }
          return {
            changes: { hp: Math.max(1, state.player.hp - 15) },
            message: 'The gate rejects you! A shockwave of prime energy blasts you backward. -15 HP.',
            positive: false,
          };
        },
      },
      {
        text: 'Find another way',
        risk: 'Safe: gain 5 gold.',
        outcome: (state) => ({
          changes: { gold: state.player.gold + 5 },
          message: 'You find a side passage. A few coins glint in the dust. +5 gold.',
          positive: true,
        }),
      },
    ],
  },
  {
    id: 'fibonacci_spiral',
    title: 'Fibonacci Spiral',
    text: 'A golden spiral pattern is etched into the floor, pulsing with warm light. The sequence 1, 1, 2, 3, 5, 8, 13... spirals inward.',
    choices: [
      {
        text: 'Walk the spiral',
        risk: 'If you have fibonacci-class dice: gain triangle or rectangle operator. Else: 10 gold.',
        outcome: (state, rng) => {
          const hasFib = state.player.dicePool.some(d => d.diceClass === 'fibonacci');
          if (hasFib) {
            const op = rng.pick(['triangle', 'rectangle']);
            return {
              changes: { operatorHand: [...state.player.operatorHand, op] },
              message: `Your fibonacci dice harmonize with the spiral! A ${op} operator materializes before you.`,
              positive: true,
            };
          }
          return {
            changes: { gold: state.player.gold + 10 },
            message: 'The spiral glows but does not respond to you. Some coins appear as a consolation. +10 gold.',
            positive: true,
          };
        },
      },
      {
        text: 'Study it',
        risk: 'Safe: gain 20 gold.',
        outcome: (state) => ({
          changes: { gold: state.player.gold + 20 },
          message: 'You study the mathematical beauty of the spiral. Loose tiles reveal hidden coins. +20 gold.',
          positive: true,
        }),
      },
    ],
  },
];
