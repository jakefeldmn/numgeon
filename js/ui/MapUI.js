import { getState, setMap, advanceFloor } from '../state/GameState.js';
import { getReachableNodes, visitNode } from '../systems/MapGenerator.js';
import { eventBus } from '../utils/eventBus.js';

const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');

function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Cached theme colors — refreshed each renderMap() call
let mapTheme = {};

const NODE_ICONS = {
  monster: { symbol: '\u2694', color: '#ff4a4a' },     // crossed swords
  elite: { symbol: '\u2620', color: '#ff8800' },        // skull
  event: { symbol: '?', color: '#4ae74a' },
  rest: { symbol: '\u2665', color: '#ff6b9d' },         // heart
  shop: { symbol: '$', color: '#ffd700' },
  boss: { symbol: '\u2654', color: '#ff2222' },          // crown
};

// Layout constants
const PADDING_X = 60;
const PADDING_TOP = 50;
const PADDING_BOTTOM = 50;
const NODE_RADIUS = 18;

let hoverNode = null;
let nodePositions = new Map(); // nodeId -> { x, y }

export function initMapUI() {
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('resize', () => {
    const state = getState();
    if (state?.map && state.screen === 'map') renderMap();
  });
}

export function renderMap() {
  const state = getState();
  if (!state?.map) return;

  // Cache CSS theme colors for canvas drawing
  mapTheme = {
    bgDark: getCSSVar('--bg-dark') || '#0a0a1a',
    bgMid: getCSSVar('--bg-mid') || '#12122a',
    bgLight: getCSSVar('--bg-light') || '#1a1a3a',
    borderColor: getCSSVar('--border-color') || '#333366',
    borderHighlight: getCSSVar('--border-highlight') || '#5555aa',
    textDim: getCSSVar('--text-dim') || '#555577',
  };

  resizeCanvas();
  const map = state.map;
  const reachable = new Set(getReachableNodes(map));

  // Calculate positions
  calculatePositions(map);

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw edges
  for (const edge of map.edges) {
    const fromPos = nodePositions.get(edge.from);
    const toPos = nodePositions.get(edge.to);
    if (!fromPos || !toPos) continue;

    const fromNode = map.nodes.find(n => n.id === edge.from);
    const toNode = map.nodes.find(n => n.id === edge.to);
    const isPath = fromNode?.visited && toNode?.visited;
    const isNextStep = fromNode?.id === map.currentNodeId && reachable.has(toNode?.id);

    drawEdge(fromPos, toPos, isPath, isNextStep);
  }

  // Draw nodes
  for (const node of map.nodes) {
    const pos = nodePositions.get(node.id);
    if (!pos) continue;

    const isReachable = reachable.has(node.id);
    const isCurrent = node.id === map.currentNodeId;
    const isHovered = hoverNode === node.id;

    drawNode(pos, node, isReachable, isCurrent, isHovered);
  }
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

function calculatePositions(map) {
  nodePositions.clear();

  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  const colSpacing = (w - PADDING_X * 2) / (map.cols - 1);
  const rowSpacing = (h - PADDING_TOP - PADDING_BOTTOM) / (map.rows - 1);

  for (const node of map.nodes) {
    // Map rows go bottom (row 0) to top (row max), so flip Y
    const x = PADDING_X + node.col * colSpacing;
    const y = h - PADDING_BOTTOM - node.row * rowSpacing;
    nodePositions.set(node.id, { x, y });
  }
}

function drawEdge(from, to, isPath, isNextStep) {
  ctx.beginPath();
  ctx.strokeStyle = isPath ? mapTheme.borderHighlight : isNextStep ? 'rgba(74, 158, 255, 0.6)' : hexToRgba(mapTheme.borderColor, 0.5);
  ctx.lineWidth = isPath ? 3 : isNextStep ? 2.5 : 1.5;

  if (isNextStep) {
    ctx.setLineDash([6, 4]);
  } else {
    ctx.setLineDash([]);
  }

  // Bezier curve
  const midY = (from.y + to.y) / 2;
  ctx.moveTo(from.x, from.y);
  ctx.bezierCurveTo(from.x, midY, to.x, midY, to.x, to.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawNode(pos, node, isReachable, isCurrent, isHovered) {
  const config = NODE_ICONS[node.type] || NODE_ICONS.monster;
  const radius = NODE_RADIUS + (isHovered ? 3 : 0);

  // Background circle
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);

  if (isCurrent) {
    ctx.fillStyle = mapTheme.bgLight;
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 3;
  } else if (node.visited) {
    ctx.fillStyle = mapTheme.bgDark;
    ctx.strokeStyle = mapTheme.borderColor;
    ctx.lineWidth = 2;
  } else if (isReachable) {
    ctx.fillStyle = mapTheme.bgLight;
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 2.5;
  } else {
    ctx.fillStyle = mapTheme.bgDark;
    ctx.strokeStyle = mapTheme.textDim;
    ctx.lineWidth = 1.5;
  }

  ctx.fill();
  ctx.stroke();

  // Pulsing glow for reachable nodes
  if (isReachable && !isCurrent) {
    const time = Date.now() / 1000;
    const glow = 0.15 + Math.sin(time * 2) * 0.1;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${hexToRgb(config.color)}, ${glow})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Icon
  ctx.fillStyle = node.visited && !isCurrent ? mapTheme.textDim : config.color;
  ctx.font = `bold ${radius}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(config.symbol, pos.x, pos.y);

  // Label below for reachable/hovered
  if ((isReachable || isCurrent) && node.type !== 'monster') {
    ctx.fillStyle = 'rgba(200, 200, 220, 0.7)';
    ctx.font = '10px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(node.type.toUpperCase(), pos.x, pos.y + radius + 14);
  }
}

function handleClick(e) {
  const state = getState();
  if (!state?.map) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const reachable = new Set(getReachableNodes(state.map));

  for (const node of state.map.nodes) {
    const pos = nodePositions.get(node.id);
    if (!pos) continue;

    const dx = x - pos.x;
    const dy = y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= NODE_RADIUS + 5 && reachable.has(node.id)) {
      // Visit this node
      const updatedMap = visitNode(state.map, node.id);
      setMap(updatedMap);
      advanceFloor();

      eventBus.emit('nodeSelected', { node });
      renderMap();
      return;
    }
  }
}

function handleMouseMove(e) {
  const state = getState();
  if (!state?.map) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  let newHover = null;
  const reachable = new Set(getReachableNodes(state.map));

  for (const node of state.map.nodes) {
    const pos = nodePositions.get(node.id);
    if (!pos) continue;

    const dx = x - pos.x;
    const dy = y - pos.y;
    if (Math.sqrt(dx * dx + dy * dy) <= NODE_RADIUS + 5) {
      if (reachable.has(node.id)) {
        newHover = node.id;
        canvas.style.cursor = 'pointer';
      }
      break;
    }
  }

  if (!newHover) canvas.style.cursor = 'default';
  if (newHover !== hoverNode) {
    hoverNode = newHover;
    renderMap();
  }
}

function hexToRgb(hex) {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return '255, 255, 255';
  return `${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}`;
}

function hexToRgba(hex, alpha) {
  return `rgba(${hexToRgb(hex)}, ${alpha})`;
}

// Animation loop for pulsing
let animating = false;
export function startMapAnimation() {
  if (animating) return;
  animating = true;
  function loop() {
    if (!animating) return;
    const state = getState();
    if (state?.screen === 'map') {
      renderMap();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

export function stopMapAnimation() {
  animating = false;
}
