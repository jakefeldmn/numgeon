import { createRNG } from '../utils/random.js';

const COLS = 7;
const ROWS = 15;
const NUM_PATHS = 6;

const NODE_TYPES = ['monster', 'event', 'elite', 'rest', 'shop'];
const TYPE_WEIGHTS = [45, 22, 16, 12, 5]; // monster, event, elite, rest, shop

export function generateMap(seed, act = 1) {
  const rng = createRNG(seed);
  const nodeMap = new Map(); // "row-col" -> node
  const edges = [];

  // Generate paths
  const paths = [];
  const usedStarts = new Set();

  for (let p = 0; p < NUM_PATHS; p++) {
    const path = [];
    let col;

    // Ensure first two paths start at different columns
    if (p < 2) {
      do {
        col = rng.nextInt(0, COLS - 1);
      } while (usedStarts.has(col));
      usedStarts.add(col);
    } else {
      col = rng.nextInt(0, COLS - 1);
    }

    path.push({ row: 0, col });

    for (let row = 1; row <= ROWS; row++) {
      // Move column by -1, 0, or +1
      const delta = rng.nextInt(-1, 1);
      col = Math.max(0, Math.min(COLS - 1, col + delta));
      path.push({ row, col });
    }

    paths.push(path);
  }

  // Collect all unique nodes and edges, checking for crossing
  for (const path of paths) {
    for (let i = 0; i < path.length; i++) {
      const { row, col } = path[i];
      const key = `${row}-${col}`;
      if (!nodeMap.has(key)) {
        nodeMap.set(key, {
          id: key,
          row,
          col,
          type: 'monster', // assigned later
          visited: false,
        });
      }

      if (i < path.length - 1) {
        const next = path[i + 1];
        const edgeKey = `${row}-${col}>${next.row}-${next.col}`;
        const exists = edges.some(e => e.key === edgeKey);
        if (!exists) {
          edges.push({
            key: edgeKey,
            from: `${row}-${col}`,
            to: `${next.row}-${next.col}`,
          });
        }
      }
    }
  }

  // Remove crossing edges
  removeCrossingEdges(edges, nodeMap);

  // Assign node types
  const nodes = Array.from(nodeMap.values());
  assignNodeTypes(nodes, edges, rng, act);

  // Add boss node
  const bossNode = {
    id: `${ROWS + 1}-3`,
    row: ROWS + 1,
    col: 3,
    type: 'boss',
    visited: false,
  };
  nodes.push(bossNode);

  // Connect all row ROWS nodes to the boss
  for (const node of nodes) {
    if (node.row === ROWS) {
      edges.push({
        key: `${node.id}>${bossNode.id}`,
        from: node.id,
        to: bossNode.id,
      });
    }
  }

  return {
    nodes,
    edges: edges.map(e => ({ from: e.from, to: e.to })),
    currentNodeId: null,
    rows: ROWS + 2, // including boss row
    cols: COLS,
  };
}

function removeCrossingEdges(edges, nodeMap) {
  // Two edges cross if they go from the same row and their columns swap
  // e.g., (row, col1) -> (row+1, col2) and (row, col3) -> (row+1, col4)
  // where col1 < col3 but col2 > col4 (or vice versa)
  const toRemove = new Set();

  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const a = edges[i];
      const b = edges[j];

      const aFrom = nodeMap.get(a.from);
      const aTo = nodeMap.get(a.to);
      const bFrom = nodeMap.get(b.from);
      const bTo = nodeMap.get(b.to);

      if (!aFrom || !aTo || !bFrom || !bTo) continue;

      // Only check edges on the same row transition
      if (aFrom.row !== bFrom.row || aTo.row !== bTo.row) continue;

      // Check for crossing
      if ((aFrom.col < bFrom.col && aTo.col > bTo.col) ||
          (aFrom.col > bFrom.col && aTo.col < bTo.col)) {
        toRemove.add(j); // remove the later edge
      }
    }
  }

  // Remove in reverse order to preserve indices
  const indices = Array.from(toRemove).sort((a, b) => b - a);
  for (const idx of indices) {
    edges.splice(idx, 1);
  }

  // Safety: ensure every non-final-row node has at least one outgoing edge
  const nodesArr = Array.from(nodeMap.values());
  for (const node of nodesArr) {
    if (node.row >= ROWS) continue; // last row connects to boss separately
    const hasOutgoing = edges.some(e => e.from === node.id);
    if (!hasOutgoing) {
      // Find the nearest node in the next row and connect to it
      const nextRowNodes = nodesArr.filter(n => n.row === node.row + 1);
      if (nextRowNodes.length > 0) {
        const nearest = nextRowNodes.reduce((best, n) =>
          Math.abs(n.col - node.col) < Math.abs(best.col - node.col) ? n : best
        );
        edges.push({
          key: `${node.id}>${nearest.id}`,
          from: node.id,
          to: nearest.id,
        });
      }
    }
  }
}

function assignNodeTypes(nodes, edges, rng, act) {
  for (const node of nodes) {
    const { row } = node;

    // Fixed rows
    if (row === 0) {
      node.type = 'monster';
      continue;
    }
    if (row === ROWS) {
      node.type = 'rest';
      continue;
    }
    if (row === Math.floor(ROWS / 2)) {
      node.type = 'shop';
      continue;
    }

    // Constraints: no elites or rests before row 5
    let types = [...NODE_TYPES];
    let weights = [...TYPE_WEIGHTS];

    if (row < 5) {
      // Remove elite and rest
      const eliteIdx = types.indexOf('elite');
      if (eliteIdx >= 0) { types.splice(eliteIdx, 1); weights.splice(eliteIdx, 1); }
      const restIdx = types.indexOf('rest');
      if (restIdx >= 0) { types.splice(restIdx, 1); weights.splice(restIdx, 1); }
    }

    // No rest on row before boss (ROWS - 1)
    if (row === ROWS - 1) {
      const restIdx = types.indexOf('rest');
      if (restIdx >= 0) { types.splice(restIdx, 1); weights.splice(restIdx, 1); }
    }

    node.type = rng.weightedPick(types, weights);
  }

  // Post-process: prevent consecutive elites/rests/shops along each path
  // (simplified: just check direct connections)
  const noConsecutive = ['elite', 'rest', 'shop'];
  for (const edge of edges) {
    const from = nodes.find(n => n.id === edge.from);
    const to = nodes.find(n => n.id === edge.to);
    if (!from || !to) continue;

    if (noConsecutive.includes(from.type) && from.type === to.type) {
      to.type = 'monster'; // fallback
    }
  }
}

export function getReachableNodes(map) {
  if (!map.currentNodeId) {
    // No node visited yet — can reach any row 0 node
    return map.nodes.filter(n => n.row === 0).map(n => n.id);
  }

  // Can reach any node connected by an edge from the current node
  return map.edges
    .filter(e => e.from === map.currentNodeId)
    .map(e => e.to);
}

export function visitNode(map, nodeId) {
  const node = map.nodes.find(n => n.id === nodeId);
  if (!node) return map;

  return {
    ...map,
    currentNodeId: nodeId,
    nodes: map.nodes.map(n =>
      n.id === nodeId ? { ...n, visited: true } : n
    ),
  };
}
