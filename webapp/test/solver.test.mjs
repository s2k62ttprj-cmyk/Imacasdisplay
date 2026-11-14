import test from 'node:test';
import assert from 'node:assert/strict';
import { createCube, applyAlg, isSolved, randomScramble, cloneCube, pieceSolved, homeOf, invertAlg } from '../src/cube.js';
import { solve, STAGES, remap, ALGS } from '../src/solver.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('beginner solver solves 300 random scrambles, step moves replay to solved', () => {
  const r = rng(42);
  let total = 0;
  let maxMoves = 0;
  for (let i = 0; i < 300; i++) {
    const scr = randomScramble(25, r);
    const cube = applyAlg(createCube(), scr);
    const { steps } = solve(cube);
    const replay = cloneCube(cube);
    let n = 0;
    for (const s of steps) { applyAlg(replay, s.moves); n += s.moves.length; }
    assert.ok(isSolved(replay), `scramble ${scr.join(' ')}`);
    total += n;
    maxMoves = Math.max(maxMoves, n);
  }
  console.log(`avg moves ${(total / 300).toFixed(1)}, max ${maxMoves}`);
});

test('solver handles whole-cube rotations and slice moves', () => {
  const r = rng(7);
  for (let i = 0; i < 40; i++) {
    const scr = [...randomScramble(20, r), 'x', 'M', "y'", 'E2', 'z'];
    const cube = applyAlg(createCube(), scr);
    const { steps } = solve(cube);
    const replay = cloneCube(cube);
    for (const s of steps) applyAlg(replay, s.moves);
    assert.ok(isSolved(replay));
  }
});

test('stage boundaries: upTo leaves exactly that progress', () => {
  const r = rng(99);
  for (let i = 0; i < 60; i++) {
    const cube = applyAlg(createCube(), randomScramble(25, r));
    const { cube: afterCross } = solve(cube, { upTo: 'cross' });
    for (const s of ['F', 'R', 'B', 'L']) assert.ok(pieceSolved(afterCross, homeOf('D', s)));
    const { cube: afterMiddle } = solve(cube, { upTo: 'middle' });
    for (const s of ['F', 'R', 'B', 'L']) assert.ok(pieceSolved(afterMiddle, homeOf('D', s)));
    for (const [a, b] of [['F', 'R'], ['R', 'B'], ['B', 'L'], ['L', 'F']]) {
      assert.ok(pieceSolved(afterMiddle, homeOf('D', a, b)));
      assert.ok(pieceSolved(afterMiddle, homeOf(a, b)));
    }
  }
});

test('every taught algorithm is a valid, non-trivial cube algorithm and remap preserves order', () => {
  for (const [k, alg] of Object.entries(ALGS)) {
    const c = applyAlg(createCube(), alg);
    assert.ok(!isSolved(c), k);
    applyAlg(c, invertAlg(alg));
    assert.ok(isSolved(c), k);
    for (let v = 0; v < 4; v++) {
      const d = applyAlg(createCube(), remap(alg, v));
      assert.ok(!isSolved(d));
    }
  }
});

test('every step has a known stage and text', () => {
  const cube = applyAlg(createCube(), randomScramble(25, rng(3)));
  const ids = new Set(['hold', ...STAGES.map((s) => s.id)]);
  for (const s of solve(cube).steps) {
    assert.ok(ids.has(s.stage));
    assert.ok(s.title && s.text && s.moves.length);
  }
});

import { stageDone, progress } from '../src/solver.js';

test('stageDone agrees with solve(upTo)', () => {
  const r = rng(1234);
  for (let i = 0; i < 40; i++) {
    const cube = applyAlg(createCube(), randomScramble(25, r));
    assert.equal(progress(cube) < STAGES.length, true);
    for (const st of STAGES) {
      const { cube: after } = solve(cube, { upTo: st.id });
      assert.ok(stageDone(after, st.id), st.id);
    }
  }
  assert.equal(progress(createCube()), STAGES.length);
  assert.equal(progress(applyAlg(createCube(), 'x y')), STAGES.length);
});

import { viewerNotation, displayTokens } from '../src/solver.js';

test('displayed notation, read from the step view, reproduces the real moves', () => {
  const r = rng(555);
  for (let i = 0; i < 60; i++) {
    const cube = applyAlg(createCube(), randomScramble(25, r));
    for (const st of solve(cube).steps) {
      assert.deepEqual(remap(displayTokens(st), st.view || 0), st.moves, `${st.stage} ${st.title}`);
    }
  }
  assert.deepEqual(viewerNotation(['L'], 3), ['F']);
});
