const screens = {
  title: document.getElementById('title-screen'),
  map: document.getElementById('map-screen'),
  combat: document.getElementById('combat-screen'),
  reward: document.getElementById('reward-screen'),
  gameOver: document.getElementById('game-over-screen'),
};

let currentScreen = 'title';

export function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.classList.toggle('hidden', key !== name);
    el.classList.toggle('active', key === name);
  }
  currentScreen = name;
}

export function getCurrentScreen() {
  return currentScreen;
}
