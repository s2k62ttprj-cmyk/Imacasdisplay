// Logical 3x3 cube model — the single source of truth for both rendering and teaching.
//
// Orientation used throughout the app (beginner method, white on the bottom):
//   U = yellow, D = white, F = green, B = blue, R = orange, L = red.
// Coordinates: +x = R, +y = U, +z = F. Each cubie keeps its home position and a
// rotation matrix (columns = images of the local x/y/z axes in world space).

export const FACES = ['U', 'D', 'F', 'B', 'R', 'L'];

export const FACE_NORMAL = {
  U: [0, 1, 0], D: [0, -1, 0],
  F: [0, 0, 1], B: [0, 0, -1],
  R: [1, 0, 0], L: [-1, 0, 0],
};

export const FACE_COLOR = { U: 'yellow', D: 'white', F: 'green', B: 'blue', R: 'orange', L: 'red' };

// Quarter-turn definitions: axis (0=x,1=y,2=z), layers, quarter-turn sign about +axis.
const BASE_MOVES = {
  R: { axis: 0, layers: [1], q: -1 },
  L: { axis: 0, layers: [-1], q: 1 },
  U: { axis: 1, layers: [1], q: -1 },
  D: { axis: 1, layers: [-1], q: 1 },
  F: { axis: 2, layers: [1], q: -1 },
  B: { axis: 2, layers: [-1], q: 1 },
  M: { axis: 0, layers: [0], q: 1 },
  E: { axis: 1, layers: [0], q: 1 },
  S: { axis: 2, layers: [0], q: -1 },
  r: { axis: 0, layers: [0, 1], q: -1 },
  l: { axis: 0, layers: [-1, 0], q: 1 },
  u: { axis: 1, layers: [0, 1], q: -1 },
  d: { axis: 1, layers: [-1, 0], q: 1 },
  f: { axis: 2, layers: [0, 1], q: -1 },
  b: { axis: 2, layers: [-1, 0], q: 1 },
  x: { axis: 0, layers: [-1, 0, 1], q: -1 },
  y: { axis: 1, layers: [-1, 0, 1], q: -1 },
  z: { axis: 2, layers: [-1, 0, 1], q: -1 },
};

export const MOVE_RE = /^([RLUDFBMESrludfbxyz])(2|')?$/;

export function parseMove(token) {
  const m = MOVE_RE.exec(token);
  if (!m) throw new Error(`Invalid move: ${token}`);
  const base = BASE_MOVES[m[1]];
  const turns = m[2] === '2' ? 2 : m[2] === "'" ? -1 : 1;
  return { name: token, face: m[1], axis: base.axis, layers: base.layers, q: base.q * turns, turns };
}

export function parseAlg(alg) {
  if (Array.isArray(alg)) return alg.slice();
  return alg.replace(/[()]/g, ' ').trim().split(/\s+/).filter(Boolean);
}

export function invertMove(token) {
  const m = MOVE_RE.exec(token);
  if (!m) throw new Error(`Invalid move: ${token}`);
  if (m[2] === '2') return token;
  return m[2] === "'" ? m[1] : `${m[1]}'`;
}

export function invertAlg(alg) {
  return parseAlg(alg).reverse().map(invertMove);
}

// Rotate an integer vector by +90° about an axis.
function rot90(v, axis) {
  const [x, y, z] = v;
  if (axis === 0) return [x, -z, y];
  if (axis === 1) return [z, y, -x];
  return [-y, x, z];
}

export function rotateVec(v, axis, q) {
  let r = v;
  const n = ((q % 4) + 4) % 4;
  for (let i = 0; i < n; i++) r = rot90(r, axis);
  return r;
}

const IDENTITY = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; // columns

function sameVec(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

export function faceOfNormal(n) {
  for (const f of FACES) if (sameVec(FACE_NORMAL[f], n)) return f;
  return null;
}

// Build a solved cube: 26 cubies (core omitted).
export function createCube() {
  const cubies = [];
  let id = 0;
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue;
        const home = [x, y, z];
        const stickers = [];
        for (const f of FACES) {
          const n = FACE_NORMAL[f];
          const axis = n[0] ? 0 : n[1] ? 1 : 2;
          if (home[axis] !== 0 && home[axis] === n[axis]) stickers.push({ local: n, color: f });
        }
        cubies.push({ id: id++, home, pos: home.slice(), cols: IDENTITY.map((c) => c.slice()), stickers });
      }
    }
  }
  return { cubies };
}

export function cloneCube(cube) {
  return {
    cubies: cube.cubies.map((c) => ({
      id: c.id,
      home: c.home,
      pos: c.pos.slice(),
      cols: c.cols.map((col) => col.slice()),
      stickers: c.stickers,
    })),
  };
}

// World-space normal of a local sticker normal.
export function worldNormal(cubie, local) {
  const out = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) out[i] += cubie.cols[j][i] * local[j];
  }
  return out;
}

export function cubiesInMove(cube, mv) {
  return cube.cubies.filter((c) => mv.layers.includes(c.pos[mv.axis]));
}

export function applyMove(cube, token) {
  const mv = typeof token === 'string' ? parseMove(token) : token;
  for (const c of cube.cubies) {
    if (!mv.layers.includes(c.pos[mv.axis])) continue;
    c.pos = rotateVec(c.pos, mv.axis, mv.q);
    c.cols = c.cols.map((col) => rotateVec(col, mv.axis, mv.q));
  }
  return cube;
}

export function applyAlg(cube, alg) {
  for (const t of parseAlg(alg)) applyMove(cube, t);
  return cube;
}

// Color (home face letter) showing on a given face at a given position.
export function stickerAt(cube, pos, face) {
  const n = FACE_NORMAL[face];
  const c = cube.cubies.find((k) => sameVec(k.pos, pos));
  if (!c) return null;
  for (const s of c.stickers) {
    if (sameVec(worldNormal(c, s.local), n)) return s.color;
  }
  return null;
}

// Facelets per face as a 3x3 grid, row-major, as seen looking at that face
// (U viewed with F at the bottom, D viewed with F at the top, side faces with U on top).
const FACE_GRID = {
  U: (r, c) => [c - 1, 1, r - 1],
  D: (r, c) => [c - 1, -1, 1 - r],
  F: (r, c) => [c - 1, 1 - r, 1],
  B: (r, c) => [1 - c, 1 - r, -1],
  R: (r, c) => [1, 1 - r, 1 - c],
  L: (r, c) => [-1, 1 - r, c - 1],
};

export function facelets(cube) {
  const out = {};
  for (const f of FACES) {
    const grid = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) grid.push(stickerAt(cube, FACE_GRID[f](r, c), f));
    out[f] = grid;
  }
  return out;
}

export function centerColor(cube, face) {
  return stickerAt(cube, FACE_NORMAL[face], face);
}

// Solved relative to the centers (so whole-cube rotations still count as solved).
export function isSolved(cube) {
  const fl = facelets(cube);
  return FACES.every((f) => fl[f].every((s) => s === fl[f][4]));
}

// A piece is "home" when it sits at its home position with every sticker facing
// its own face. Assumes centers are at home (solver never moves them).
export function pieceSolved(cube, home) {
  const c = cube.cubies.find((k) => sameVec(k.home, home));
  if (!sameVec(c.pos, home)) return false;
  return c.stickers.every((s) => sameVec(worldNormal(c, s.local), FACE_NORMAL[s.color]));
}

export function findCubie(cube, home) {
  return cube.cubies.find((k) => sameVec(k.home, home));
}

export function cubieAt(cube, pos) {
  return cube.cubies.find((k) => sameVec(k.pos, pos));
}

// World normal of the sticker with the given colour on a cubie.
export function stickerNormal(cubie, color) {
  const s = cubie.stickers.find((k) => k.color === color);
  return s ? worldNormal(cubie, s.local) : null;
}

export function homeOf(...faces) {
  const v = [0, 0, 0];
  for (const f of faces) {
    const n = FACE_NORMAL[f];
    for (let i = 0; i < 3; i++) v[i] += n[i];
  }
  return v;
}

const SCRAMBLE_FACES = ['R', 'L', 'U', 'D', 'F', 'B'];
const AXIS_OF = { R: 0, L: 0, U: 1, D: 1, F: 2, B: 2 };

export function randomScramble(length = 22, rng = Math.random) {
  const out = [];
  let prev = null;
  let prevAxisRun = [];
  while (out.length < length) {
    const f = SCRAMBLE_FACES[Math.floor(rng() * 6)];
    if (f === prev) continue;
    // avoid e.g. R L R (same axis thrice / repeats)
    if (prevAxisRun.length && AXIS_OF[prevAxisRun[0]] === AXIS_OF[f] && prevAxisRun.includes(f)) continue;
    if (prevAxisRun.length >= 2 && AXIS_OF[prevAxisRun[0]] === AXIS_OF[f]) continue;
    const suffix = ['', "'", '2'][Math.floor(rng() * 3)];
    out.push(f + suffix);
    if (prev && AXIS_OF[prev] === AXIS_OF[f]) prevAxisRun.push(f);
    else prevAxisRun = [f];
    prev = f;
  }
  return out;
}

// Merge consecutive same-face turns (U U -> U2, U U' -> nothing).
export function simplify(moves) {
  const out = [];
  for (const t of moves) {
    const m = MOVE_RE.exec(t);
    const top = out.length ? MOVE_RE.exec(out[out.length - 1]) : null;
    if (top && top[1] === m[1]) {
      const amt = (x) => (x[2] === '2' ? 2 : x[2] === "'" ? 3 : 1);
      const total = (amt(top) + amt(m)) % 4;
      out.pop();
      if (total === 1) out.push(m[1]);
      else if (total === 2) out.push(`${m[1]}2`);
      else if (total === 3) out.push(`${m[1]}'`);
    } else {
      out.push(t);
    }
  }
  return out;
}
