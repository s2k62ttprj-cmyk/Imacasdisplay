// Beginner (layer-by-layer) solver that produces human-teachable steps.
// White cross on the bottom (D), then white corners, middle edges, then the yellow layer.
//
// Every step is { stage, title, text, moves, alg?, view } where:
//   moves – the real moves applied to the cube (fixed orientation, centers never move)
//   alg   – the textbook algorithm as the learner would read it while holding the cube
//           with `view` face in front (0=F, 1=R, 2=B, 3=L)
//   view  – which face should face the learner (the camera swings there)

import {
  cloneCube, applyAlg, applyMove, parseAlg, findCubie, cubieAt, pieceSolved, stickerNormal,
  homeOf, FACE_NORMAL, faceOfNormal, isSolved, simplify, FACE_COLOR, centerColor,
} from './cube.js';

export const STAGES = [
  { id: 'cross', title: 'White cross' },
  { id: 'corners', title: 'White corners' },
  { id: 'middle', title: 'Middle layer' },
  { id: 'ycross', title: 'Yellow cross' },
  { id: 'yedges', title: 'Yellow edges' },
  { id: 'ycorners', title: 'Position yellow corners' },
  { id: 'orient', title: 'Twist yellow corners' },
];

const SIDES = ['F', 'R', 'B', 'L']; // view order around the cube (looking from above, clockwise)

// Remap an algorithm written for "front = F" so it is executed with `view` in front.
const VIEW_MAP = [
  { F: 'F', R: 'R', B: 'B', L: 'L' },
  { F: 'R', R: 'B', B: 'L', L: 'F' },
  { F: 'B', R: 'L', B: 'F', L: 'R' },
  { F: 'L', R: 'F', B: 'R', L: 'B' },
];

export function remap(alg, view) {
  const map = VIEW_MAP[((view % 4) + 4) % 4];
  return parseAlg(alg).map((t) => (map[t[0]] ? map[t[0]] + t.slice(1) : t));
}

const ALG = {
  trigger: "R U R' U'",
  rightInsert: "U R U' R' U' F' U F",
  leftInsert: "U' L' U L U F U' F'",
  ycross: "F R U R' U' F'",
  sune: "R U R' U R U2 R'",
  niklas: "U R U' L' U R' U' L",
  twist: "R' D' R D",
};
export const ALGS = ALG;

const name = (f) => FACE_COLOR[f];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

function pieceName(home) {
  const faces = [];
  if (home[1] === -1) faces.push('D');
  if (home[1] === 1) faces.push('U');
  if (home[2] === 1) faces.push('F');
  if (home[2] === -1) faces.push('B');
  if (home[0] === 1) faces.push('R');
  if (home[0] === -1) faces.push('L');
  return faces.map(name).join('-');
}

// ---------- small search helper (IDDFS over a move set) ----------
function iddfs(cube, moveSet, goal, maxDepth) {
  if (goal(cube)) return [];
  const path = [];
  const rec = (c, depth, lastFace) => {
    if (depth === 0) return goal(c);
    for (const m of moveSet) {
      if (m[0] === lastFace) continue;
      const n = cloneCube(c);
      applyMove(n, m);
      path.push(m);
      if (rec(n, depth - 1, m[0])) return true;
      path.pop();
    }
    return false;
  };
  for (let d = 1; d <= maxDepth; d++) {
    if (rec(cube, d, null)) return path.slice();
  }
  return null;
}

const FACE_MOVES = ['U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'B', "B'", 'B2', 'R', "R'", 'R2', 'L', "L'", 'L2'];

// ---------- stage 1: white cross ----------
const CROSS_EDGES = SIDES.map((s) => homeOf('D', s));

function crossDone(cube, k = 4) {
  return CROSS_EDGES.slice(0, k).every((h) => pieceSolved(cube, h));
}

function solveCross(cube, steps) {
  for (let i = 0; i < 4; i++) {
    const home = CROSS_EDGES[i];
    const side = SIDES[i];
    if (pieceSolved(cube, home) && crossDone(cube, i)) continue;
    const goal = (c) => crossDone(c, i) && pieceSolved(c, home);
    // Prefer short solutions that avoid disturbing the rest; depth 7 is always enough per edge.
    const moves = iddfs(cube, FACE_MOVES, goal, 7);
    if (!moves) throw new Error('cross search failed');
    applyAlg(cube, moves);
    steps.push({
      stage: 'cross',
      title: `White–${name(side)} edge`,
      text: `Bring the white–${name(side)} edge down so its white sticker is on the bottom and its ${name(side)} sticker lines up with the ${name(side)} centre.`,
      moves,
      view: i,
    });
  }
}

// ---------- stage 2: white corners ----------
// Slot k (0..3) = bottom corner between SIDES[k] and SIDES[k+1] (front-right when viewing SIDES[k]).
const CORNER_SLOTS = SIDES.map((s, k) => homeOf('D', s, SIDES[(k + 1) % 4]));

function slotOfPos(pos) {
  // which view k has this position as its front-right column
  for (let k = 0; k < 4; k++) {
    const h = CORNER_SLOTS[k];
    if (h[0] === pos[0] && h[2] === pos[2]) return k;
  }
  return -1;
}

function firstLayerDone(cube) {
  return crossDone(cube) && CORNER_SLOTS.every((h) => pieceSolved(cube, h));
}

function solveCorners(cube, steps) {
  for (let k = 0; k < 4; k++) {
    const home = CORNER_SLOTS[k];
    if (pieceSolved(cube, home)) continue;
    const label = pieceName(home);
    let c = findCubie(cube, home);
    // 1. If stuck in the bottom layer, pop it out.
    if (c.pos[1] === -1) {
      const v = slotOfPos(c.pos);
      const moves = remap(ALG.trigger, v);
      applyAlg(cube, moves);
      steps.push({
        stage: 'corners',
        title: `Free the ${label} corner`,
        text: `The ${label} corner is stuck in the bottom layer. Hold that slot at front-right and do R U R' U' once to lift it to the top.`,
        moves, alg: ALG.trigger, view: v,
      });
      c = findCubie(cube, home);
    }
    // 2. Turn U until it sits above its slot.
    const goalAbove = (cc) => {
      const p = findCubie(cc, home).pos;
      return p[1] === 1 && p[0] === home[0] && p[2] === home[2];
    };
    const u = iddfs(cube, ['U', "U'", 'U2'], goalAbove, 1);
    if (u.length) {
      applyAlg(cube, u);
      steps.push({
        stage: 'corners',
        title: `Line up the ${label} corner`,
        text: `Turn the top layer until the ${label} corner sits directly above the spot where it belongs.`,
        moves: u, view: k,
      });
    }
    // 3. Repeat the trigger until it's solved.
    const moves = [];
    let reps = 0;
    while (!pieceSolved(cube, home)) {
      const m = remap(ALG.trigger, k);
      applyAlg(cube, m);
      moves.push(...m);
      reps++;
      if (reps > 6) throw new Error('corner did not resolve');
    }
    steps.push({
      stage: 'corners',
      title: `Insert the ${label} corner`,
      text: `With the slot at front-right, repeat R U R' U' until the corner drops in with white on the bottom (${reps} time${reps > 1 ? 's' : ''} here).`,
      moves, alg: Array(reps).fill(ALG.trigger).join(' '), reps, view: k,
    });
  }
}

// ---------- stage 3: middle layer ----------
const MIDDLE_EDGES = SIDES.map((s, k) => homeOf(s, SIDES[(k + 1) % 4])); // front-right edge of view k

function middleDone(cube) {
  return firstLayerDone(cube) && MIDDLE_EDGES.every((h) => pieceSolved(cube, h));
}

function solveMiddle(cube, steps) {
  for (let guard = 0; guard < 12 && !middleDone(cube); guard++) {
    // Find an unsolved middle edge sitting in the top layer.
    let target = MIDDLE_EDGES.find((h) => !pieceSolved(cube, h) && findCubie(cube, h).pos[1] === 1);
    if (!target) {
      // All remaining ones are stuck in the middle layer: pop one out.
      const stuck = MIDDLE_EDGES.find((h) => !pieceSolved(cube, h));
      const p = findCubie(cube, stuck).pos;
      const v = MIDDLE_EDGES.findIndex((h) => h[0] === p[0] && h[2] === p[2]);
      const moves = remap(ALG.rightInsert, v);
      applyAlg(cube, moves);
      steps.push({
        stage: 'middle',
        title: `Free the ${pieceName(stuck)} edge`,
        text: 'This edge is in the middle layer but in the wrong place or flipped. Insert any top edge into its slot with the right-hand algorithm to push it out to the top.',
        moves, alg: ALG.rightInsert, view: v,
      });
      continue;
    }
    // Rotate U so the edge's side colour matches the centre beneath it.
    let u = null;
    let view = -1;
    let dir = null;
    for (const pre of [[], ['U'], ["U'"], ['U2']]) {
      const t = cloneCube(cube);
      applyAlg(t, pre);
      const c = findCubie(t, target);
      // the sticker that faces sideways
      const side = c.stickers.find((s) => stickerNormal(c, s.color)[1] === 0);
      const up = c.stickers.find((s) => stickerNormal(c, s.color)[1] === 1);
      const face = faceOfNormal(stickerNormal(c, side.color));
      if (side.color !== face) continue;
      u = pre;
      view = SIDES.indexOf(face);
      // Goes right if the U-colour belongs to the face on the right of the view.
      dir = up.color === SIDES[(view + 1) % 4] ? 'right' : 'left';
      break;
    }
    if (u.length) {
      applyAlg(cube, u);
      steps.push({
        stage: 'middle',
        title: `Line up the ${pieceName(target)} edge`,
        text: `Turn the top layer until the edge's front colour matches the centre below it, making an upside-down “T”.`,
        moves: u, view,
      });
    }
    const alg = dir === 'right' ? ALG.rightInsert : ALG.leftInsert;
    const moves = remap(alg, view);
    applyAlg(cube, moves);
    const other = dir === 'right' ? SIDES[(view + 1) % 4] : SIDES[(view + 3) % 4];
    steps.push({
      stage: 'middle',
      title: `Insert to the ${dir}`,
      text: `Its top colour is ${name(other)}, which is on the ${dir}, so use the ${dir}-hand algorithm.`,
      moves, alg, view,
    });
  }
  if (!middleDone(cube)) throw new Error('middle layer failed');
}

// ---------- last layer helpers ----------
const TOP_EDGES = SIDES.map((s) => homeOf('U', s));
const TOP_CORNERS = SIDES.map((s, k) => homeOf('U', s, SIDES[(k + 1) % 4]));

function yellowEdgeUp(cube, sideIdx) {
  const c = cubieAt(cube, TOP_EDGES[sideIdx]);
  const n = stickerNormal(c, 'U');
  return n && n[1] === 1;
}

function yellowCrossShape(cube) {
  const up = [0, 1, 2, 3].map((i) => yellowEdgeUp(cube, i)); // F R B L
  const count = up.filter(Boolean).length;
  return { up, count };
}

function solveYellowCross(cube, steps) {
  for (let guard = 0; guard < 4; guard++) {
    const { up, count } = yellowCrossShape(cube);
    if (count === 4) return;
    let view = 0;
    let shape = 'dot';
    if (count === 2) {
      if ((up[0] && up[2]) || (up[1] && up[3])) {
        shape = 'line';
        // line must run left-right as seen from the front: edges at R and L of that view
        view = up[1] ? 0 : 1;
      } else {
        shape = 'L';
        // L must point to back and left of the view: edges at (view+2) and (view+3)
        for (let v = 0; v < 4; v++) if (up[(v + 2) % 4] && up[(v + 3) % 4]) view = v;
      }
    }
    const moves = remap(ALG.ycross, view);
    applyAlg(cube, moves);
    const text = {
      dot: 'No yellow edges up yet (a “dot”). Do the algorithm once — it will make an L shape.',
      L: 'You have an L shape. Hold it so the L points to the back and left (like 9 and 12 o’clock), then do the algorithm.',
      line: 'You have a line. Hold it horizontally (left–right) and do the algorithm to finish the cross.',
    }[shape];
    steps.push({ stage: 'ycross', title: `Yellow cross: ${shape === 'L' ? 'L shape' : shape}`, text, moves, alg: ALG.ycross, view, shape });
  }
  if (yellowCrossShape(cube).count !== 4) throw new Error('yellow cross failed');
}

function edgesMatched(cube) {
  return [0, 1, 2, 3].map((i) => {
    const c = cubieAt(cube, TOP_EDGES[i]);
    const side = c.stickers.find((s) => s.color !== 'U');
    return side.color === SIDES[i];
  });
}

function solveYellowEdges(cube, steps) {
  for (let guard = 0; guard < 5; guard++) {
    // best U alignment
    let best = null;
    for (const pre of [[], ['U'], ["U'"], ['U2']]) {
      const t = cloneCube(cube);
      applyAlg(t, pre);
      const m = edgesMatched(t);
      const n = m.filter(Boolean).length;
      if (!best || n > best.n) best = { pre, m, n };
    }
    if (best.pre.length) {
      applyAlg(cube, best.pre);
      steps.push({
        stage: 'yedges',
        title: 'Match the edges',
        text: best.n === 4
          ? 'Turn the top layer — all four edges now match their centres.'
          : 'Turn the top layer until at least two yellow-layer edges match their side centres.',
        moves: best.pre, view: 0,
      });
    }
    if (best.n === 4) return;
    const m = best.m;
    let view = 0;
    let kind = 'opposite';
    for (let v = 0; v < 4; v++) {
      // matched edges at back (v+2) and right (v+1) of the view
      if (m[(v + 2) % 4] && m[(v + 1) % 4]) { view = v; kind = 'adjacent'; }
    }
    const alg = `${ALG.sune} U`;
    const moves = remap(alg, view);
    applyAlg(cube, moves);
    steps.push({
      stage: 'yedges',
      title: kind === 'adjacent' ? 'Swap two edges' : 'Opposite edges',
      text: kind === 'adjacent'
        ? 'Hold the cube so the two matching edges are at the back and on the right, then do R U R\' U R U2 R\' U.'
        : 'The matching edges are opposite each other. Do the algorithm once from any side; you will get an adjacent pair.',
      moves, alg, view,
    });
  }
  if (!edgesMatched(cube).every(Boolean)) throw new Error('yellow edges failed');
}

function cornerInPlace(cube, k) {
  const c = cubieAt(cube, TOP_CORNERS[k]);
  const want = ['U', SIDES[k], SIDES[(k + 1) % 4]].sort().join('');
  return c.stickers.map((s) => s.color).sort().join('') === want;
}

function solveYellowCornersPosition(cube, steps) {
  for (let guard = 0; guard < 4; guard++) {
    const ok = [0, 1, 2, 3].map((k) => cornerInPlace(cube, k));
    if (ok.every(Boolean)) return;
    const k = ok.findIndex(Boolean);
    const view = k === -1 ? 0 : k;
    const moves = remap(ALG.niklas, view);
    applyAlg(cube, moves);
    steps.push({
      stage: 'ycorners',
      title: k === -1 ? 'Cycle the corners' : 'Cycle three corners',
      text: k === -1
        ? 'No corner is in its correct spot yet. Do the algorithm once from any side; afterwards one corner will be in place.'
        : 'One corner is already in the right spot (twisted is fine). Hold it at front-right-top and do the algorithm; repeat if needed.',
      moves, alg: ALG.niklas, view,
    });
  }
  if (![0, 1, 2, 3].every((k) => cornerInPlace(cube, k))) throw new Error('corner positioning failed');
}

function solveOrientCorners(cube, steps) {
  // Hold the cube with the F side in front the whole time. Fix the corner at
  // front-right-top with R' D' R D, then turn U to bring the next corner there.
  const ufr = TOP_CORNERS[0];
  for (let i = 0; i < 4; i++) {
    const c = cubieAt(cube, ufr);
    const n = stickerNormal(c, 'U');
    if (!(n[1] === 1)) {
      const moves = [];
      let reps = 0;
      while (stickerNormal(cubieAt(cube, ufr), 'U')[1] !== 1) {
        // one R' D' R D swaps the corner out temporarily; it is back after every pair
        const m = parseAlg(`${ALG.twist} ${ALG.twist}`);
        applyAlg(cube, m);
        moves.push(...m);
        reps += 2;
        if (reps > 4) throw new Error('twist failed');
      }
      steps.push({
        stage: 'orient',
        title: 'Twist a corner',
        text: `Repeat R' D' R D until yellow faces up on the front-right-top corner (${reps} times). The bottom will look messed up — that's expected, keep going!`,
        moves, alg: Array(reps / 2).fill(`${ALG.twist} ${ALG.twist}`).join(' '), reps, view: 0,
      });
    }
    if (i < 3) {
      // move to the next corner (only if something is left to fix)
      const remaining = [1, 2, 3].some((k) => stickerNormal(cubieAt(cube, TOP_CORNERS[k]), 'U')[1] !== 1);
      if (!remaining) break;
      applyMove(cube, 'U');
      steps.push({
        stage: 'orient', title: 'Next corner', text: 'Turn only the top layer (U) to bring the next twisted corner to the front-right-top. Do not rotate the whole cube.', moves: ['U'], view: 0,
      });
    }
  }
  const fin = iddfs(cube, ['U', "U'", 'U2'], isSolved, 1);
  if (fin === null) throw new Error('final alignment failed');
  if (fin.length) {
    applyAlg(cube, fin);
    steps.push({ stage: 'orient', title: 'Final turn', text: 'Turn the top layer to line everything up. Solved!', moves: fin, view: 0 });
  }
}

const STAGE_FN = {
  cross: solveCross,
  corners: solveCorners,
  middle: solveMiddle,
  ycross: solveYellowCross,
  yedges: solveYellowEdges,
  ycorners: solveYellowCornersPosition,
  orient: solveOrientCorners,
};

// Ensure the cube is held with white on D and green on F (centres home).
export function orientationMoves(cube) {
  const wanted = (c) => centerColor(c, 'D') === 'D' && centerColor(c, 'F') === 'F';
  return iddfs(cube, ['x', "x'", 'x2', 'y', "y'", 'y2', 'z', "z'", 'z2'], wanted, 2) || [];
}

/**
 * Solve `cube` (not modified) with the beginner method.
 * @param {object} cube
 * @param {{ upTo?: string }} [opts] stop after this stage id
 * @returns {{ steps: object[], cube: object }}
 */
export function solve(cube, opts = {}) {
  const work = cloneCube(cube);
  const steps = [];
  const orient = orientationMoves(work);
  if (orient.length) {
    applyAlg(work, orient);
    steps.push({
      stage: 'hold', title: 'Hold the cube', text: 'Turn the whole cube so the white centre is on the bottom and the green centre faces you.', moves: orient, view: 0,
    });
  }
  for (const st of STAGES) {
    STAGE_FN[st.id](work, steps);
    if (opts.upTo === st.id) break;
  }
  for (const s of steps) s.moves = simplify(s.moves);
  return { steps: steps.filter((s) => s.moves.length), cube: work };
}

export function stageIndex(id) {
  return STAGES.findIndex((s) => s.id === id);
}

export { cap, FACE_NORMAL };

const DONE = {
  cross: (c) => crossDone(c),
  corners: (c) => firstLayerDone(c),
  middle: (c) => middleDone(c),
  ycross: (c) => middleDone(c) && yellowCrossShape(c).count === 4,
  yedges: (c) => middleDone(c) && yellowCrossShape(c).count === 4 && edgesMatched(c).every(Boolean),
  ycorners: (c) => middleDone(c) && yellowCrossShape(c).count === 4 && edgesMatched(c).every(Boolean)
    && [0, 1, 2, 3].every((k) => cornerInPlace(c, k)),
  orient: (c) => isSolved(c),
};

/** True when `stageId` (and every earlier stage) is complete, regardless of how the cube is held. */
export function stageDone(cube, stageId) {
  const work = cloneCube(cube);
  applyAlg(work, orientationMoves(work));
  return DONE[stageId](work);
}

/** Index of the first unfinished stage (STAGES.length when solved). */
export function progress(cube) {
  for (let i = 0; i < STAGES.length; i++) if (!stageDone(cube, STAGES[i].id)) return i;
  return STAGES.length;
}

/** Translate physical moves into the notation a learner holding `view` in front would read. */
export function viewerNotation(moves, view) {
  const map = VIEW_MAP[((view % 4) + 4) % 4];
  const inv = {};
  for (const [k, v] of Object.entries(map)) inv[v] = k;
  return parseAlg(moves).map((t) => (inv[t[0]] ? inv[t[0]] + t.slice(1) : t));
}

/** Notation tokens to display for a step (textbook alg when it matches, else translated moves). */
export function displayTokens(step) {
  if (step.alg && parseAlg(step.alg).length === step.moves.length) return parseAlg(step.alg);
  return viewerNotation(step.moves, step.view || 0);
}
