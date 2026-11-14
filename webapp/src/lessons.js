// Lesson content for the beginner layer-by-layer method.
// Page action types:
//   pieces    – highlight a piece type on a solved cube
//   pad       – show a move pad with the given moves to try
//   demo      – set up a case (inverse of the alg on a solved cube) and play the alg
//   practice  – generate a real case for `stage` and let the learner solve it (with hints)

export const LESSONS = [
  {
    id: 'meet',
    title: 'Meet the cube',
    blurb: 'Pieces, colours and how to hold it',
    pages: [
      {
        heading: 'Three kinds of pieces',
        body: `A cube isn't 54 stickers — it's <b>26 pieces</b>. Learn to see pieces, not stickers, and everything gets easier.`,
        action: { type: 'pieces', which: 'all' },
      },
      {
        heading: 'Centres never move',
        body: `The 6 <b>centres</b> have one colour and stay put relative to each other. The centre <i>is</i> the colour of its face: white is always opposite yellow, green opposite blue, red opposite orange.`,
        action: { type: 'pieces', which: 'centers' },
      },
      {
        heading: 'Edges have two colours',
        body: `There are 12 <b>edges</b>. Each one has exactly one correct spot — between the two centres that match its colours.`,
        action: { type: 'pieces', which: 'edges' },
      },
      {
        heading: 'Corners have three',
        body: `There are 8 <b>corners</b>. A corner is solved only when all three of its colours match the three centres around it.`,
        action: { type: 'pieces', which: 'corners' },
      },
      {
        heading: 'How to hold it',
        body: `In this course you'll hold the cube with the <b>white centre on the bottom</b> and the <b>green centre facing you</b>. Drag anywhere around the cube to look around it.`,
        action: { type: 'pieces', which: 'none' },
      },
    ],
  },
  {
    id: 'notation',
    title: 'Speaking cube',
    blurb: 'Move notation: R, U, F and friends',
    pages: [
      {
        heading: 'Every face has a letter',
        body: `<b>R</b> right · <b>L</b> left · <b>U</b> up (top) · <b>D</b> down (bottom) · <b>F</b> front · <b>B</b> back. A letter alone means: turn that face <b>clockwise</b>, as if you were looking straight at it.`,
        action: { type: 'pad', moves: ['R', 'L', 'U', 'D', 'F', 'B'] },
      },
      {
        heading: 'Prime means backwards',
        body: `An apostrophe — read “prime” — means <b>counter-clockwise</b>. So <b>R'</b> undoes <b>R</b>. Try R then R'.`,
        action: { type: 'pad', moves: ['R', "R'", 'U', "U'", 'F', "F'"] },
      },
      {
        heading: 'Two means twice',
        body: `<b>U2</b> means turn the top face twice (180°). Direction doesn't matter for a double turn.`,
        action: { type: 'pad', moves: ['U2', 'R2', 'F2', 'D2'] },
      },
      {
        heading: 'Your first algorithm',
        body: `An <b>algorithm</b> is just a sequence of moves. Watch <b>R U R' U'</b> — you'll use it constantly. Do it 6 times and the cube comes back to solved!`,
        action: { type: 'demo', alg: "R U R' U'", repeat: 6, fromSolved: true },
      },
      {
        heading: 'Swipe to turn',
        body: `You can also <b>swipe across stickers</b> to turn layers yourself. Swipe on the background to look around. Give it a try, then press <b>Reset</b>.`,
        action: { type: 'free' },
      },
    ],
  },
  {
    id: 'cross',
    stage: 'cross',
    title: 'The white cross',
    blurb: 'Step 1 — four white edges on the bottom',
    pages: [
      {
        heading: 'Goal',
        body: `Put the four <b>white edges</b> on the bottom face so they form a plus sign — and each edge's side colour matches the centre next to it.`,
        action: { type: 'goal', stage: 'cross' },
      },
      {
        heading: 'Line it up, then drop it',
        body: `Find a white edge in the top layer. Turn <b>U</b> until its side colour is above the matching centre, then turn that face twice (e.g. <b>F2</b>) to bring it down.`,
        action: { type: 'demo', alg: 'U F2', setup: "F2 U'" },
      },
      {
        heading: 'Edge flipped the wrong way?',
        body: `If white is facing sideways in the front, use <b>U' R' F R</b> (rotated as needed) — it flips the edge into place without breaking the others. Mostly: experiment! The cross is intuitive.`,
        action: { type: 'demo', alg: "U' R' F R", setup: "R' F' R U" },
      },
      {
        heading: 'Practice',
        body: `Here's a real scrambled cube. Make the white cross. Stuck? Tap <b>Show me</b> and I'll walk you through it, one edge at a time.`,
        action: { type: 'practice', stage: 'cross' },
      },
    ],
  },
  {
    id: 'corners',
    stage: 'corners',
    title: 'White corners',
    blurb: 'Step 2 — finish the first layer',
    pages: [
      {
        heading: 'Goal',
        body: `Fill in the four <b>white corners</b> so the whole bottom layer is solved — white face plus a matching stripe around the sides.`,
        action: { type: 'goal', stage: 'corners' },
      },
      {
        heading: 'Park it above its home',
        body: `Find a white corner in the top layer. Turn <b>U</b> until it sits directly above the spot it belongs in. Then hold the cube so that spot is at the <b>front-right</b>.`,
        action: { type: 'pieces', which: 'slot-fr' },
      },
      {
        heading: 'Repeat R U R\' U\'',
        body: `Now repeat <b>R U R' U'</b> until the corner drops in with white on the bottom. It takes 1, 3 or 5 repeats depending on how it's twisted.`,
        alg: "R U R' U'",
        action: { type: 'demo', alg: "R U R' U'", setup: "U R U' R'" },
      },
      {
        heading: 'Corner twisted in its spot?',
        body: `If a white corner is in the bottom layer but twisted (or in the wrong spot), hold it at front-right and keep repeating <b>R U R' U'</b>. The first one lifts it out, the next ones put it back correctly.`,
        action: { type: 'demo', alg: "R U R' U' R U R' U' R U R' U'" },
      },
      {
        heading: 'Practice',
        body: `Solve the first layer. The cross is already done for you.`,
        action: { type: 'practice', stage: 'corners' },
      },
    ],
  },
  {
    id: 'middle',
    stage: 'middle',
    title: 'The middle layer',
    blurb: 'Step 3 — two layers done',
    pages: [
      {
        heading: 'Find a middle edge',
        body: `Keep white on the bottom. Find an edge in the top layer <b>without yellow</b>. Turn <b>U</b> until its front colour matches the centre below — it makes an upside-down “T”.`,
        action: { type: 'goal', stage: 'middle' },
      },
      {
        heading: 'Edge goes right',
        body: `If the edge's top colour matches the <b>right</b> centre:<br><b>U R U' R' U' F' U F</b>`,
        alg: "U R U' R' U' F' U F",
        action: { type: 'demo', alg: "U R U' R' U' F' U F", setup: "F' U' F U R U R' U'" },
      },
      {
        heading: 'Edge goes left',
        body: `If it matches the <b>left</b> centre, mirror it:<br><b>U' L' U L U F U' F'</b>`,
        alg: "U' L' U L U F U' F'",
        action: { type: 'demo', alg: "U' L' U L U F U' F'", setup: "F U F' U' L' U' L U" },
      },
      {
        heading: 'Stuck in the middle?',
        body: `If an edge is in the middle layer but wrong, insert any top edge into that slot to kick it out, then solve it normally.`,
        action: { type: 'pieces', which: 'middle' },
      },
      {
        heading: 'Practice',
        body: `Finish the first two layers.`,
        action: { type: 'practice', stage: 'middle' },
      },
    ],
  },
  {
    id: 'ycross',
    stage: 'ycross',
    title: 'The yellow cross',
    blurb: 'Step 4 — a yellow plus on top',
    pages: [
      {
        heading: 'Only one algorithm',
        body: `Look at the top. Ignore the corners — you'll see a <b>dot</b>, an <b>L</b>, a <b>line</b> or a <b>cross</b> of yellow edges.<br><b>F R U R' U' F'</b>`,
        alg: "F R U R' U' F'",
        action: { type: 'demo', alg: "F R U R' U' F'", setup: "F U R U' R' F'", topView: true },
      },
      {
        heading: 'How to hold it',
        body: `<b>L shape:</b> point it to the back-left (9 and 12 o'clock).<br><b>Line:</b> hold it horizontal.<br><b>Dot:</b> any way — do the algorithm, you'll get an L.`,
        action: { type: 'goal', stage: 'ycross', topView: true },
      },
      {
        heading: 'Practice',
        body: `Make the yellow cross.`,
        action: { type: 'practice', stage: 'ycross', topView: true },
      },
    ],
  },
  {
    id: 'yedges',
    stage: 'yedges',
    title: 'Match the edges',
    blurb: 'Step 5 — line up the yellow edges',
    pages: [
      {
        heading: 'Find two that match',
        body: `Turn <b>U</b> until at least two yellow-edge side colours match their centres. If they're next to each other, hold them at the <b>back and right</b>.<br><b>R U R' U R U2 R' U</b>`,
        alg: "R U R' U R U2 R' U",
        action: { type: 'demo', alg: "R U R' U R U2 R' U", setup: "U' R U2 R' U' R U' R'" },
      },
      {
        heading: 'Opposite pair?',
        body: `If the matching edges are opposite each other, do the algorithm once from any side — then you'll have an adjacent pair to fix.`,
        action: { type: 'goal', stage: 'yedges' },
      },
      {
        heading: 'Practice',
        body: `Match all four yellow edges to their centres.`,
        action: { type: 'practice', stage: 'yedges' },
      },
    ],
  },
  {
    id: 'ycorners',
    stage: 'ycorners',
    title: 'Place the corners',
    blurb: 'Step 6 — corners in the right spots',
    pages: [
      {
        heading: 'Right spot, any twist',
        body: `A corner is “in place” if it has the right three colours for its spot — even if it's twisted. Find one and hold it at <b>front-right-top</b>.<br><b>U R U' L' U R' U' L</b>`,
        alg: "U R U' L' U R' U' L",
        action: { type: 'demo', alg: "U R U' L' U R' U' L", setup: "L' U R U' L U R' U'" },
      },
      {
        heading: 'None in place?',
        body: `Do the algorithm once from anywhere — one corner will land in place. Then repeat with that one at front-right until all four are placed.`,
        action: { type: 'goal', stage: 'ycorners' },
      },
      {
        heading: 'Practice',
        body: `Move every yellow corner to its correct spot.`,
        action: { type: 'practice', stage: 'ycorners' },
      },
    ],
  },
  {
    id: 'orient',
    stage: 'orient',
    title: 'Twist & finish',
    blurb: 'Step 7 — solve the cube!',
    pages: [
      {
        heading: 'Trust the process',
        body: `Hold an unsolved corner at <b>front-right-top</b>. Repeat <b>R' D' R D</b> until yellow faces up. The bottom will look scrambled — <b>don't panic</b>, it fixes itself.`,
        alg: "R' D' R D R' D' R D",
        action: { type: 'demo', alg: "R' D' R D R' D' R D U R' D' R D R' D' R D R' D' R D R' D' R D U'" },
      },
      {
        heading: 'Turn only the top',
        body: `When that corner is done, turn <b>U</b> (only the top layer!) to bring the next twisted corner to front-right. Never rotate the whole cube during this step.`,
        action: { type: 'goal', stage: 'orient' },
      },
      {
        heading: 'Practice',
        body: `Finish the cube!`,
        action: { type: 'practice', stage: 'orient' },
      },
    ],
  },
];
