import { CubeView } from './render.js';
import {
  createCube, cloneCube, applyAlg, parseAlg, invertAlg, invertMove, randomScramble, isSolved, homeOf,
} from './cube.js';
import {
  solve, STAGES, stageDone, stageIndex, progress, displayTokens,
} from './solver.js';
import { LESSONS } from './lessons.js';
import {
  h, icon, chips, haptic, store, confetti, toast,
} from './ui.js';

const app = document.getElementById('app');
const canvas = document.getElementById('gl');
const view = new CubeView(canvas);

const COLOR_NAME = { F: 'green', R: 'orange', B: 'blue', L: 'red' };
const SIDES = ['F', 'R', 'B', 'L'];

const baseHaptic = (_t, _m, user) => haptic(user ? 'tap' : 'soft');
function resetListeners() {
  view.listeners = { moveend: [baseHaptic] };
}
resetListeners();

// Camera tilt that best shows what a step changes.
function cameraFor(step, topView) {
  if (step.stage === 'cross') return { pitch: -32 };
  if (step.stage === 'ycross' || topView) return { pitch: 52 };
  return {};
}

// ---------------------------------------------------------------- screen manager
let current = null;

function show(screen) {
  if (current?.leave) current.leave();
  view.clearQueue();
  view.finishNow();
  view.setHighlight([]);
  view.idleSpin = false;
  view.turnEnabled = false;
  view.speed = 1;
  view.setView(0);
  resetListeners();
  const old = app.firstElementChild;
  const el = screen.render();
  el.classList.add('screen', 'enter');
  app.append(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('enter')));
  if (old) {
    old.classList.add('leave');
    setTimeout(() => old.remove(), 380);
  }
  current = screen;
  requestAnimationFrame(() => screen.layout?.());
}

function measureInsets(top, bottom) {
  const t = top ? top.getBoundingClientRect().bottom : 0;
  const b = bottom ? window.innerHeight - bottom.getBoundingClientRect().top : 0;
  view.setInsets(t + 8, b + 8);
}

function topBar(title, onBack, extra) {
  return h('header', { class: 'topbar' },
    h('button', { class: 'iconbtn glass', 'aria-label': 'Back', onclick: onBack }, icon('back')),
    h('div', { class: 'topbar-title' }, title),
    extra || h('div', { class: 'iconbtn ghost' }));
}

// ---------------------------------------------------------------- HOME
function lessonsDone() {
  return new Set(store.read().done || []);
}

function markDone(id) {
  const done = lessonsDone();
  done.add(id);
  store.write({ done: [...done] });
}

const HomeScreen = {
  render() {
    view.setState(createCube());
    view.setView(0);
    view.idleSpin = true;
    view.interactive = true;
    const done = lessonsDone();
    const next = LESSONS.find((l) => !done.has(l.id)) || LESSONS[0];
    const pct = Math.round((done.size / LESSONS.length) * 100);
    const nextIdx = LESSONS.indexOf(next);

    this.head = h('div', { class: 'hero' },
      h('div', { class: 'eyebrow' }, 'CUBE TUTOR'),
      h('h1', { class: 'display' }, 'Solve the cube.', h('br'), h('span', { class: 'grad' }, 'Step by step.')));

    const ring = h('div', { class: 'ring', style: { '--p': pct } }, h('span', {}, `${pct}%`));
    this.panel = h('div', { class: 'panel glass home-panel' },
      h('button', { class: 'continue', onclick: () => show(LessonScreen(nextIdx)) },
        ring,
        h('div', { class: 'continue-text' },
          h('div', { class: 'kicker' }, done.size ? 'Continue learning' : 'Start here'),
          h('div', { class: 'continue-title' }, `${nextIdx + 1}. ${next.title}`),
          h('div', { class: 'continue-sub' }, next.blurb)),
        h('span', { class: 'go' }, icon('next'))),
      h('div', { class: 'tiles' },
        h('button', { class: 'tile', onclick: () => show(GuideScreen()) },
          h('span', { class: 'tile-ic violet' }, icon('wand')),
          h('span', { class: 'tile-title' }, 'Solve with me'),
          h('span', { class: 'tile-sub' }, 'Guided solve, move by move')),
        h('button', { class: 'tile', onclick: () => show(FreeScreen()) },
          h('span', { class: 'tile-ic cyan' }, icon('hand')),
          h('span', { class: 'tile-title' }, 'Free play'),
          h('span', { class: 'tile-sub' }, 'Swipe, scramble, explore'))),
      h('button', { class: 'linkrow', onclick: () => show(LessonListScreen) },
        icon('book'), h('span', {}, 'All lessons'), h('span', { class: 'muted' }, `${done.size}/${LESSONS.length}`), icon('next')));

    // gentle showcase: a pretty pattern that comes and goes
    const pattern = ['M2', 'E2', 'S2'];
    let on = false;
    this.timer = setInterval(() => {
      if (view.busy) return;
      view.speed = 0.55;
      view.enqueue(on ? invertAlg(pattern) : pattern);
      on = !on;
    }, 4200);

    return h('main', { class: 'home' }, this.head, this.panel);
  },
  layout() {
    measureInsets(this.head, this.panel);
  },
  leave() {
    clearInterval(this.timer);
  },
};

// ---------------------------------------------------------------- LESSON LIST
const LessonListScreen = {
  render() {
    view.setState(createCube());
    view.idleSpin = true;
    const done = lessonsDone();
    this.bar = topBar('Lessons', () => show(HomeScreen));
    this.list = h('div', { class: 'panel glass list-panel' },
      h('div', { class: 'list-head' },
        h('div', { class: 'kicker' }, 'Beginner method'),
        h('div', { class: 'list-title' }, '9 short lessons'),
        h('div', { class: 'muted' }, 'About 20 minutes in total. Learn at your own pace.')),
      h('div', { class: 'lesson-list' }, LESSONS.map((l, i) => h('button', {
        class: `lesson-row${done.has(l.id) ? ' done' : ''}`,
        onclick: () => show(LessonScreen(i)),
      },
      h('span', { class: 'num' }, done.has(l.id) ? icon('check') : String(i + 1)),
      h('span', { class: 'lr-text' }, h('span', { class: 'lr-title' }, l.title), h('span', { class: 'lr-sub' }, l.blurb)),
      icon('next')))));
    return h('main', { class: 'lessons' }, this.bar, this.list);
  },
  layout() {
    view.setInsets(70, window.innerHeight * 0.62);
  },
};

// ---------------------------------------------------------------- LESSON
function practiceCase(stageId) {
  const idx = stageIndex(stageId);
  for (let tries = 0; tries < 20; tries++) {
    const scr = randomScramble(25);
    const base = applyAlg(createCube(), scr);
    const prev = idx > 0 ? STAGES[idx - 1].id : null;
    const st = prev ? solve(base, { upTo: prev }).cube : base;
    if (!stageDone(st, stageId)) return st;
  }
  return applyAlg(createCube(), randomScramble(25));
}

function piecesFor(which) {
  const ids = [];
  const m = view.model;
  for (const c of m.cubies) {
    const nz = c.home.filter((v) => v !== 0).length;
    if (which === 'all') ids.push(c.id);
    if (which === 'centers' && nz === 1) ids.push(c.id);
    if (which === 'edges' && nz === 2) ids.push(c.id);
    if (which === 'corners' && nz === 3) ids.push(c.id);
    if (which === 'middle' && nz === 2 && c.home[1] === 0) ids.push(c.id);
    if (which === 'slot-fr') {
      const hm = homeOf('D', 'F', 'R');
      if (c.home.every((v, i) => v === hm[i])) ids.push(c.id);
    }
  }
  return ids;
}

function goalState(stageId) {
  // what the cube looks like right after this stage: take a random case and solve up to it
  const scr = randomScramble(25);
  return solve(applyAlg(createCube(), scr), { upTo: stageId }).cube;
}

function LessonScreen(lessonIdx) {
  const lesson = LESSONS[lessonIdx];
  let page = 0;
  let runToken = 0;
  const S = {};

  function renderPage() {
    runToken++;
    const my = runToken;
    const p = lesson.pages[page];
    const a = p.action || {};
    resetListeners();
    view.clearQueue();
    view.finishNow();
    view.setHighlight([]);
    view.idleSpin = false;
    view.turnEnabled = false;
    view.speed = 1;
    view.setView(0, a.topView ? { pitch: 52 } : {});

    const body = h('div', { class: 'lesson-body' },
      h('div', { class: 'kicker' }, `Lesson ${lessonIdx + 1} · ${page + 1}/${lesson.pages.length}`),
      h('h2', { class: 'h2' }, p.heading),
      h('p', { class: 'body', html: p.body }));
    const extra = h('div', { class: 'lesson-extra' });
    const controls = h('div', { class: 'controls' });

    const prevBtn = h('button', { class: 'btn ghost', disabled: page === 0 ? true : undefined, onclick: () => { page--; renderPage(); } }, icon('prev'), 'Back');
    const isLast = page === lesson.pages.length - 1;
    const nextBtn = h('button', {
      class: 'btn primary',
      onclick: () => {
        if (isLast) {
          markDone(lesson.id);
          if (lessonIdx + 1 < LESSONS.length) show(LessonScreen(lessonIdx + 1));
          else show(HomeScreen);
        } else {
          page++;
          renderPage();
        }
      },
    }, isLast ? (lessonIdx + 1 < LESSONS.length ? 'Next lesson' : 'Finish') : 'Next', icon('next'));

    if (a.type === 'pieces') {
      view.setState(createCube());
      view.idleSpin = true;
      if (a.which !== 'none') view.setHighlight(piecesFor(a.which), { dim: a.which !== 'all' });
    } else if (a.type === 'goal') {
      view.setState(goalState(a.stage));
      view.idleSpin = true;
      // first-layer goals are on the bottom: tilt the camera underneath
      if (a.stage === 'cross' || a.stage === 'corners') view.setView(0, { pitch: -38 });
    } else if (a.type === 'pad') {
      view.setState(createCube());
      view.turnEnabled = true;
      const pad = h('div', { class: 'pad' }, a.moves.map((m) => h('button', {
        class: 'padbtn',
        onclick: () => {
          if (view.queue.length > 1) return;
          view.enqueue(m, { user: true });
        },
      }, m)));
      const reset = h('button', { class: 'btn small ghost', onclick: () => view.setState(createCube()) }, icon('replay'), 'Reset');
      extra.append(pad, h('div', { class: 'row-end' }, reset));
    } else if (a.type === 'free') {
      view.setState(createCube());
      view.turnEnabled = true;
      extra.append(h('div', { class: 'row-end' },
        h('button', { class: 'btn small ghost', onclick: () => view.setState(createCube()) }, icon('replay'), 'Reset')));
    } else if (a.type === 'demo') {
      const reps = a.repeat || 1;
      const alg = parseAlg(Array(reps).fill(a.alg).join(' '));
      const setup = a.fromSolved ? [] : (a.setup ? parseAlg(a.setup) : invertAlg(alg));
      const chipList = chips(alg);
      extra.append(chipList.el);
      const play = () => {
        runToken++;
        const tok = runToken;
        view.clearQueue();
        view.finishNow();
        view.setState(applyAlg(createCube(), setup));
        chipList.reset();
        playBtn.disabled = true;
        setTimeout(() => {
          if (tok !== runToken) return;
          alg.forEach((m, i) => view.enqueue(m, { meta: { demo: tok, i } }));
        }, 650);
      };
      view.on('movestart', (_t, meta) => {
        if (meta?.demo === runToken) chipList.setActive(meta.i);
      });
      view.on('idle', () => {
        playBtn.disabled = false;
        chipList.setActive(alg.length);
      });
      const playBtn = h('button', { class: 'btn small ghost', onclick: play }, icon('replay'), 'Replay');
      const slow = h('button', { class: 'btn small ghost toggle', onclick: () => { view.speed = view.speed === 1 ? 0.5 : 1; slow.classList.toggle('on', view.speed !== 1); } }, '½× speed');
      extra.append(h('div', { class: 'row-end' }, slow, playBtn));
      view.setState(applyAlg(createCube(), setup));
      setTimeout(() => { if (my === runToken) play(); }, 500);
    } else if (a.type === 'practice') {
      setupPractice(a, extra, my);
    }

    controls.append(prevBtn, nextBtn);
    const card = h('div', { class: 'panel glass lesson-panel' }, body, extra, controls);
    S.panel.replaceChildren(card);
    S.dots.replaceChildren(...lesson.pages.map((_, i) => h('span', { class: `dot${i === page ? ' on' : ''}${i < page ? ' past' : ''}` })));
    requestAnimationFrame(() => measureInsets(S.bar, S.panel));
  }

  function setupPractice(a, extra, my) {
    const stage = a.stage;
    const stageTitle = STAGES[stageIndex(stage)].title;
    const status = h('div', { class: 'status' }, h('span', { class: 'pill' }, 'Your turn'), h('span', { class: 'muted' }, `Goal: ${stageTitle.toLowerCase()}`));
    const hint = h('div', { class: 'hint hidden' });
    let completed = false;
    const fresh = () => {
      completed = false;
      view.clearQueue();
      view.finishNow();
      view.setState(practiceCase(stage));
      hint.classList.add('hidden');
      status.replaceChildren(h('span', { class: 'pill' }, 'Your turn'), h('span', { class: 'muted' }, `Goal: ${stageTitle.toLowerCase()}`));
      showBtn.disabled = false;
    };
    const check = () => {
      if (my !== runToken || completed || view.busy) return;
      if (stageDone(view.model, stage)) {
        completed = true;
        markDone(lesson.id);
        haptic('success');
        confetti();
        status.replaceChildren(h('span', { class: 'pill good' }, icon('check'), 'Nailed it'), h('span', { class: 'muted' }, `${stageTitle} complete`));
        hint.classList.add('hidden');
        showBtn.disabled = true;
      }
    };
    const showMe = () => {
      if (view.busy || completed) return;
      const { steps } = solve(view.model, { upTo: stage });
      const step = steps[0];
      if (!step) { check(); return; }
      const chipList = chips(displayTokens(step), { small: true });
      const holdNote = step.view ? h('div', { class: 'hold' }, `Hold ${COLOR_NAME[SIDES[step.view]]} in front`) : null;
      hint.replaceChildren(...[h('div', { class: 'hint-title' }, icon('bulb'), step.title), h('div', { class: 'hint-text' }, step.text), holdNote, chipList.el].filter(Boolean));
      hint.classList.remove('hidden');
      view.setView(step.view || 0, cameraFor(step, a.topView));
      const tok = Symbol('hint');
      step.moves.forEach((m, i) => view.enqueue(m, { meta: { hint: tok, i } }));
      view.on('movestart', (_t, meta) => { if (meta?.hint === tok) chipList.setActive(meta.i); });
      requestAnimationFrame(() => measureInsets(S.bar, S.panel));
    };
    view.on('idle', check);
    view.on('usermove', () => hint.classList.add('hidden'));
    const showBtn = h('button', { class: 'btn small ghost', onclick: showMe }, icon('bulb'), 'Show me');
    const newBtn = h('button', { class: 'btn small ghost', onclick: fresh }, icon('shuffle'), 'New case');
    extra.append(status, hint, h('div', { class: 'row-end' }, newBtn, showBtn));
    view.turnEnabled = true;
    fresh();
  }

  return {
    render() {
      S.dots = h('div', { class: 'dots' });
      S.bar = topBar(h('div', { class: 'tb-stack' }, h('span', {}, lesson.title), S.dots), () => show(LessonListScreen));
      S.panel = h('div', { class: 'panel-wrap' });
      const el = h('main', { class: 'lesson' }, S.bar, S.panel);
      setTimeout(renderPage, 0);
      return el;
    },
    layout() {
      measureInsets(S.bar, S.panel);
    },
    leave() {
      runToken++;
    },
  };
}

// ---------------------------------------------------------------- GUIDE (solve with me)
function GuideScreen(startState) {
  const S = {};
  let steps = [];
  let idx = 0;
  let playing = false;
  let busyStep = false;
  let token = 0;

  function stageLabel(st) {
    if (st.stage === 'hold') return 'Get ready';
    return STAGES[stageIndex(st.stage)].title;
  }

  function renderProgress() {
    const cur = steps[idx];
    const at = cur ? Math.max(0, stageIndex(cur.stage)) : STAGES.length;
    S.progress.replaceChildren(...STAGES.map((s, i) => h('span', { class: `seg${i < at ? ' done' : ''}${i === at ? ' now' : ''}` })));
  }

  function renderStep() {
    renderProgress();
    const st = steps[idx];
    if (!st) {
      S.card.replaceChildren(
        h('div', { class: 'kicker' }, 'Complete'),
        h('h2', { class: 'h2' }, 'Solved!'),
        h('p', { class: 'body' }, 'That’s the whole beginner method. Scramble again and try to lead the way yourself — tap “Show me” only when you’re stuck.'),
        h('div', { class: 'controls' },
          h('button', { class: 'btn ghost', onclick: () => show(HomeScreen) }, 'Home'),
          h('button', { class: 'btn primary', onclick: newScramble }, icon('shuffle'), 'Scramble')));
      requestAnimationFrame(() => measureInsets(S.top, S.card));
      return;
    }
    S.chips = chips(displayTokens(st));
    const hold = st.view ? h('div', { class: 'hold' }, `Hold the ${COLOR_NAME[SIDES[st.view]]} side in front`) : null;
    S.playBtn = h('button', { class: 'btn round primary', 'aria-label': 'Play', onclick: togglePlay }, icon(playing ? 'pause' : 'play'));
    S.card.replaceChildren(...[
      h('div', { class: 'kicker' }, `${stageLabel(st)} · step ${idx + 1} of ${steps.length}`),
      h('h2', { class: 'h2' }, st.title),
      h('p', { class: 'body' }, st.text),
      hold,
      S.chips.el,
      h('div', { class: 'controls three' },
        h('button', { class: 'btn round ghost', 'aria-label': 'Previous step', onclick: prevStep, disabled: idx === 0 ? true : undefined }, icon('prev')),
        S.playBtn,
        h('button', { class: 'btn round ghost', 'aria-label': 'Next step', onclick: nextStep }, icon('next')))].filter(Boolean));
    view.setView(st.view || 0, cameraFor(st));
    requestAnimationFrame(() => measureInsets(S.top, S.card));
  }

  function runStep(after) {
    const st = steps[idx];
    if (!st || busyStep) return;
    busyStep = true;
    const my = ++token;
    st.moves.forEach((m, i) => view.enqueue(m, { meta: { g: my, i } }));
    const onStart = (_t, meta) => { if (meta?.g === my) S.chips?.setActive(meta.i); };
    const onIdle = () => {
      if (my !== token) return;
      busyStep = false;
      S.chips?.setActive(st.moves.length);
      after?.();
    };
    view.on('movestart', onStart);
    view.on('idle', onIdle);
  }

  function nextStep() {
    if (busyStep) return;
    runStep(() => {
      setTimeout(() => {
        idx++;
        if (idx >= steps.length) {
          playing = false;
          haptic('success');
          confetti();
        }
        renderStep();
        if (playing) setTimeout(() => playing && nextStep(), 450);
      }, 350);
    });
  }

  function prevStep() {
    if (busyStep || idx === 0) return;
    playing = false;
    idx--;
    view.speed = 2.2;
    view.enqueue(invertAlg(steps[idx].moves));
    const my = ++token;
    view.on('idle', () => { if (my === token) { view.speed = S.speed; } });
    renderStep();
  }

  function togglePlay() {
    playing = !playing;
    S.playBtn.replaceChildren(icon(playing ? 'pause' : 'play'));
    if (playing) nextStep();
  }

  function compute() {
    steps = solve(view.model).steps;
    idx = 0;
    renderStep();
  }

  function newScramble() {
    playing = false;
    busyStep = false;
    token++;
    view.clearQueue();
    view.finishNow();
    view.setState(createCube());
    const scr = randomScramble(22);
    S.card.replaceChildren(h('div', { class: 'kicker' }, 'Scrambling'), h('h2', { class: 'h2' }, 'Mixing it up…'), chips(scr, { small: true }).el);
    requestAnimationFrame(() => measureInsets(S.top, S.card));
    view.speed = 3.2;
    view.enqueue(scr);
    const my = ++token;
    view.on('idle', () => {
      if (my !== token) return;
      view.speed = S.speed;
      compute();
    });
  }

  return {
    render() {
      S.speed = 1;
      S.progress = h('div', { class: 'progress' });
      const speedBtn = h('button', {
        class: 'iconbtn glass speed',
        onclick: () => {
          S.speed = S.speed === 1 ? 2 : S.speed === 2 ? 0.5 : 1;
          view.speed = S.speed;
          speedBtn.textContent = `${S.speed}×`;
        },
      }, '1×');
      S.top = h('div', { class: 'top-stack' }, topBar('Solve with me', () => show(HomeScreen), speedBtn), S.progress);
      S.card = h('div', { class: 'panel glass guide-panel' });
      const el = h('main', { class: 'guide' }, S.top, S.card);
      setTimeout(() => {
        if (startState && !isSolved(startState)) {
          view.setState(startState);
          compute();
        } else {
          newScramble();
        }
      }, 0);
      return el;
    },
    layout() {
      measureInsets(S.top, S.card);
    },
    leave() {
      token++;
      playing = false;
    },
  };
}

// ---------------------------------------------------------------- FREE PLAY
function FreeScreen() {
  const S = {};
  const history = [];
  return {
    render() {
      view.setState(createCube());
      view.turnEnabled = true;
      view.on('usermove', (t) => history.push(t));
      const faces = ['R', 'L', 'U', 'D', 'F', 'B'];
      const pad = h('div', { class: 'pad six' }, faces.flatMap((f) => [f, `${f}'`]).map((m) => h('button', {
        class: 'padbtn',
        onclick: () => {
          if (view.queue.length > 1) return;
          view.enqueue(m, { user: true });
          history.push(m);
        },
      }, m)));
      const status = h('div', { class: 'status' });
      const refresh = () => {
        const p = progress(view.model);
        const label = p >= STAGES.length ? 'Solved' : p === 0 ? 'Scrambled' : `${STAGES[p - 1].title} ✓`;
        status.replaceChildren(h('span', { class: `pill${p >= STAGES.length ? ' good' : ''}` }, label), h('span', { class: 'muted' }, `${history.length} moves`));
      };
      view.on('idle', refresh);
      S.card = h('div', { class: 'panel glass free-panel' },
        h('div', { class: 'kicker' }, 'Free play'),
        h('p', { class: 'body small' }, 'Swipe across stickers to turn layers, or use the buttons. Drag the background to look around.'),
        pad,
        status,
        h('div', { class: 'controls four' },
          h('button', {
            class: 'btn small ghost',
            onclick: () => {
              if (view.busy || !history.length) return;
              view.enqueue(invertMove(history.pop()), { user: true });
            },
          }, icon('undo'), 'Undo'),
          h('button', {
            class: 'btn small ghost',
            onclick: () => {
              if (view.busy) return;
              const s = randomScramble(22);
              view.speed = 3;
              view.enqueue(s);
              history.length = 0;
              view.on('idle', () => { view.speed = 1; });
            },
          }, icon('shuffle'), 'Scramble'),
          h('button', { class: 'btn small ghost', onclick: () => { view.setState(createCube()); history.length = 0; refresh(); } }, icon('replay'), 'Reset'),
          h('button', { class: 'btn small primary', onclick: () => { if (!view.busy) show(GuideScreen(cloneCube(view.model))); } }, icon('wand'), 'Help')));
      refresh();
      S.bar = topBar('Free play', () => show(HomeScreen));
      return h('main', { class: 'free' }, S.bar, S.card);
    },
    layout() {
      measureInsets(S.bar, S.card);
    },
  };
}

// ---------------------------------------------------------------- boot
window.addEventListener('resize', () => current?.layout?.());
document.addEventListener('gesturestart', (e) => e.preventDefault());
show(HomeScreen);
requestAnimationFrame(() => document.body.classList.add('ready'));

// test hook for automated screenshots
window.__cube = { view, show, screens: { HomeScreen, LessonListScreen, LessonScreen, GuideScreen, FreeScreen } };
