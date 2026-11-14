import test from 'node:test';
import assert from 'node:assert/strict';
import { createCube, applyAlg, isSolved, invertAlg, parseAlg } from '../src/cube.js';
import { LESSONS } from '../src/lessons.js';
import { STAGES } from '../src/solver.js';

test('every demo: setup then algorithm returns to solved', () => {
  for (const l of LESSONS) {
    for (const p of l.pages) {
      const a = p.action;
      if (a?.type !== 'demo') continue;
      const reps = a.repeat || 1;
      const alg = Array(reps).fill(a.alg).join(' ');
      const setup = a.fromSolved ? [] : (a.setup ? parseAlg(a.setup) : invertAlg(alg));
      const c = applyAlg(createCube(), setup);
      if (!a.fromSolved) assert.ok(!isSolved(c), `${l.id}: setup should scramble`);
      applyAlg(c, alg);
      assert.ok(isSolved(c), `${l.id}: ${p.heading}`);
    }
  }
});

test('lesson stage ids exist', () => {
  const ids = new Set(STAGES.map((s) => s.id));
  for (const l of LESSONS) {
    if (l.stage) assert.ok(ids.has(l.stage), l.id);
    for (const p of l.pages) if (p.action?.stage) assert.ok(ids.has(p.action.stage));
  }
});

test('the twist demo only twists two top corners (rest of cube intact)', () => {
  const l = LESSONS.find((x) => x.id === 'orient');
  const alg = l.pages[0].action.alg;
  const c = applyAlg(createCube(), invertAlg(alg));
  const bottomAndMiddle = c.cubies.filter((k) => k.home[1] < 1);
  for (const k of bottomAndMiddle) assert.deepEqual(k.pos, k.home);
});
