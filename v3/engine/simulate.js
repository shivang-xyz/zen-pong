/* Headless full-game simulation — the engine's first consumer, and its
   permanent test rig. Runs a plain while loop (no requestAnimationFrame),
   producing the same committed-stroke data the live game paints to its
   persistent canvas, so art-lab.html can render finished artworks without
   playing.

   KNOWN DEVIATIONS FROM index.html (documented per brief Task 7):

   1. Spawn angle formula. index.html's mkBall uses
      `Math.random()*0.55+0.18` (see physics.js), which is what's ported
      here verbatim. This matches neither the "CORRECT" (0.85+0.28) nor the
      "WRONG" (0.5+0.2) formulas documented in root CLAUDE.md §7 — the
      live reference implementation and its own docs disagree. Per
      Shivang's decision (2026-07-05), this session ports the literal
      index.html value; the documented "CORRECT" formula was apparently
      never applied to the live build.

   2. AI jitter clock. Live updateAI() uses `Math.sin(Date.now()*0.002)*3`
      — real wall-clock time. A headless sim runs thousands of frames in
      milliseconds, so Date.now() would produce meaningless jitter. Replaced
      with a virtual frame clock, `tVirtual = frameCount * (1000/60)`, fed
      into the identical sin(t*0.002)*3 formula.

   3. Player stand-in paddle. index.html's left paddle is mouse-driven; this
      sim has no human input, so it's a second AI using the same
      updatePaddleAI logic as the real (right) AI, deliberately desynced so
      the two paddles never play identically:
        - PHASE_OFFSET_L = Math.PI/2 — quarter-cycle jitter offset, arbitrary
          but fixed.
        - REACTION_DELAY_FRAMES = 3 — the left stand-in targets the ball's
          position from 3 frames ago rather than its current position. A
          delay was chosen over reducing its speed cap because aiSpd/maxStep
          are shared, level-scaling values also used by score-driven
          difficulty — delaying reaction is a purely behavioral handicap
          that doesn't interact with that math. */

import { makeRng } from './rng.js';
import {
  W, H, PH, WIN,
  mkBall, advanceBall, ballBall, levelUp, pickTargetY, updatePaddleAI,
} from './physics.js';
import { jitterPath } from './strokes.js';
import { computeMeanSpeed } from './enhancements.js';

export const DEFAULT_PALETTE = ['#FF68AE', '#689AFF', '#8CFFB4', '#FFAE68', '#68D7FF'];

const PHASE_OFFSET_L = Math.PI / 2;
const REACTION_DELAY_FRAMES = 3;
const MAX_B = 1; // matches index.html: maxB is always 1 in the live build

function nextCol(palette, colState) {
  colState.i = (colState.i + 1) % palette.length;
  return palette[colState.i];
}

export function simulateGame({
  seed,
  winScore = WIN,
  maxPtsPerStroke = 500,
  jitterAmplitude = 0.5,
  palette = DEFAULT_PALETTE,
  wtRange = [1.0, 2.4],
  opRange = [0.50, 0.68],
  maxFrames = 120000,
} = {}) {
  const rng = makeRng(seed);
  const strokes = [];

  const paddleL = { y: H / 2 - PH / 2 };
  const paddleR = { y: H / 2 - PH / 2 };
  const targetHistoryL = [];

  const colState = { i: 0 };
  let balls = [];
  let ps = 0, as = 0, lv = 1, aiSpd = 2.6;
  let frameCount = 0;
  let paddleHits = 0;
  let playing = true;

  function spawnBall() {
    const col = palette[colState.i % palette.length];
    colState.i++;
    const b = mkBall(rng, lv, col, wtRange, opRange);
    b.pts = [{ x: b.x, y: b.y }];
    balls.push(b);
  }

  function commit(ball, eventType) {
    if (ball.pts.length < 2) return;
    strokes.push({
      pts: jitterPath(ball.pts, jitterAmplitude),
      col: ball.scol, wt: ball.wt, op: ball.op, event: eventType,
      speed: computeMeanSpeed(ball.pts), index: strokes.length,
    });
  }

  function checkLevel() {
    const tot = ps + as;
    if (tot > 0 && tot % 2 === 0) {
      lv++;
      aiSpd = Math.min(2.6 + lv * 0.40, 7.5);
      levelUp(balls);
    }
  }

  while (balls.length < MAX_B) spawnBall();

  while (playing && frameCount < maxFrames) {
    const tVirtual = frameCount * (1000 / 60);

    const rawTargetL = pickTargetY(balls, 'L');
    targetHistoryL.push(rawTargetL);
    if (targetHistoryL.length > REACTION_DELAY_FRAMES + 1) targetHistoryL.shift();
    const delayedTargetL = targetHistoryL[0];
    const prevPaddleLY = paddleL.y;
    updatePaddleAI(paddleL, delayedTargetL, aiSpd, tVirtual, PHASE_OFFSET_L);
    const padVelL = paddleL.y - prevPaddleLY;

    const targetR = pickTargetY(balls, 'R');
    updatePaddleAI(paddleR, targetR, aiSpd, tVirtual, 0);

    frameCount++;

    balls.forEach(b => {
      const events = advanceBall(b, paddleL, paddleR, padVelL, rng);
      events.forEach(ev => {
        commit(b, ev.type);
        if (ev.type === 'paddleHit') paddleHits++;
        b.col = nextCol(palette, colState);
        b.scol = b.col;
        b.pts = [{ x: b.x, y: b.y }];
      });
      b.pts.push({ x: b.x, y: b.y });
      if (b.pts.length > maxPtsPerStroke) {
        commit(b, 'overflow');
        b.pts = b.pts.slice(-4);
      }
    });

    ballBall(balls, rng);

    balls = balls.filter(b => {
      if (b.x < -30) { commit(b, 'score'); as++; checkLevel(); return false; }
      if (b.x > W + 30) { commit(b, 'score'); ps++; checkLevel(); return false; }
      return true;
    });

    while (balls.length < MAX_B && playing) spawnBall();

    if (ps >= winScore || as >= winScore) playing = false;
  }

  balls.forEach(b => commit(b, 'gameEnd'));

  return {
    strokes,
    meta: {
      seed, score: { ps, as }, rallies: paddleHits, frames: frameCount,
      truncated: frameCount >= maxFrames,
    },
  };
}
