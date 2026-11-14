import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCube, applyAlg, applyMove, isSolved, facelets, invertAlg, randomScramble, cloneCube, simplify,
} from '../src/cube.js';

const ALL = ['R', 'L', 'U', 'D', 'F', 'B', 'M', 'E', 'S', 'r', 'l', 'u', 'd', 'f', 'b', 'x', 'y', 'z'];

test('solved cube is solved', () => {
  assert.ok(isSolved(createCube()));
});

test('every move applied four times is identity', () => {
  for (const m of ALL) {
    const c = createCube();
    applyAlg(c, [m, m, m, m]);
    assert.ok(isSolved(c), m);
    // and the exact cubie state matches (not just colours)
    const ref = createCube();
    c.cubies.forEach((k, i) => assert.deepEqual(k.pos, ref.cubies[i].pos, m));
  }
});

test('single move is not identity; prime undoes; 2 equals two quarters', () => {
  for (const m of ALL.filter((k) => !'xyz'.includes(k))) {
    const c = createCube();
    applyMove(c, m);
    assert.ok(!isSolved(c), m);
    applyMove(c, `${m}'`);
    assert.ok(isSolved(c), m);
    const a = applyAlg(createCube(), `${m}2`);
    const b = applyAlg(createCube(), [m, m]);
    assert.deepEqual(facelets(a), facelets(b));
  }
});

test('sexy move (R U R\' U\') has order 6', () => {
  const c = createCube();
  for (let i = 0; i < 5; i++) {
    applyAlg(c, "R U R' U'");
    assert.ok(!isSolved(c));
  }
  applyAlg(c, "R U R' U'");
  assert.ok(isSolved(c));
});

test('turn directions match standard notation', () => {
  // R moves the F-face right column up to U: after R, U face right column shows F colour (green).
  let fl = facelets(applyAlg(createCube(), 'R'));
  assert.deepEqual([fl.U[2], fl.U[5], fl.U[8]], ['F', 'F', 'F']);
  // U moves F front-row stickers to L: after U, L top row shows F colour.
  fl = facelets(applyAlg(createCube(), 'U'));
  assert.deepEqual(fl.L.slice(0, 3), ['F', 'F', 'F']);
  // F moves U bottom row to R left column.
  fl = facelets(applyAlg(createCube(), 'F'));
  assert.deepEqual([fl.R[0], fl.R[3], fl.R[6]], ['U', 'U', 'U']);
  // L moves U left column to F left column.
  fl = facelets(applyAlg(createCube(), 'L'));
  assert.deepEqual([fl.F[0], fl.F[3], fl.F[6]], ['U', 'U', 'U']);
  // D moves F bottom row to R bottom row.
  fl = facelets(applyAlg(createCube(), 'D'));
  assert.deepEqual(fl.R.slice(6), ['F', 'F', 'F']);
  // B moves U top row to L left column.
  fl = facelets(applyAlg(createCube(), 'B'));
  assert.deepEqual([fl.L[0], fl.L[3], fl.L[6]], ['U', 'U', 'U']);
  // M follows L: F middle column goes to D.
  fl = facelets(applyAlg(createCube(), 'M'));
  assert.deepEqual([fl.D[1], fl.D[4], fl.D[7]], ['F', 'F', 'F']);
  // x follows R: whole cube, F goes to U.
  fl = facelets(applyAlg(createCube(), 'x'));
  assert.ok(fl.U.every((s) => s === 'F'));
  assert.ok(isSolved(applyAlg(createCube(), 'x y z')));
});

test('each face shows 9 stickers of 6 colours, 9 each, after scrambles', () => {
  for (let i = 0; i < 50; i++) {
    const c = applyAlg(createCube(), randomScramble(25));
    const fl = facelets(c);
    const counts = {};
    for (const f of Object.keys(fl)) for (const s of fl[f]) counts[s] = (counts[s] || 0) + 1;
    assert.deepEqual(Object.values(counts).sort(), [9, 9, 9, 9, 9, 9]);
  }
});

test('scramble followed by its inverse is solved', () => {
  for (let i = 0; i < 50; i++) {
    const s = randomScramble(25);
    const c = applyAlg(createCube(), s);
    applyAlg(c, invertAlg(s));
    assert.ok(isSolved(c));
  }
});

test('clone is independent', () => {
  const a = createCube();
  const b = cloneCube(a);
  applyMove(b, 'R');
  assert.ok(isSolved(a));
  assert.ok(!isSolved(b));
});

test('simplify merges same-face turns', () => {
  assert.deepEqual(simplify(['U', 'U']), ['U2']);
  assert.deepEqual(simplify(['U', "U'"]), []);
  assert.deepEqual(simplify(['U2', 'U']), ["U'"]);
  assert.deepEqual(simplify(['R', 'U', "U'", "R'"]), []);
});
