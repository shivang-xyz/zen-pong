/* Headless ball/paddle physics — ported from root index.html.
   No DOM, no audio, no canvas. All randomness flows through the injected
   rng() (see rng.js) so a seeded run is bit-for-bit reproducible.

   Hit/bounce functions return plain event objects (or null) instead of
   playing sounds or toggling DOM classes — callers (simulate.js, and later
   the live app) decide what to do with an event. */

export const W = 1000, H = 630, PW = 8, PH = 64, BR = 6;
export const CR = 40;
export const PX = -PW, AX = W;
export const PAD_MIN = CR, PAD_MAX = H - CR - PH;
export const BASE_SPD = 5.2, WIN = 3;
export const MAX_SPD = BASE_SPD * 2.2;
export const CORNERS = [
  { cx: CR, cy: CR }, { cx: W - CR, cy: CR },
  { cx: CR, cy: H - CR }, { cx: W - CR, cy: H - CR },
];

function bspd(b) { return Math.hypot(b.vx, b.vy); }

/* 4-edge spawn. `a` uses the literal index.html formula (0.55+0.18), which
   does not match either variant documented in root CLAUDE.md §7 — see the
   deviation note at the top of simulate.js. `col` is resolved by the caller
   (palette/colIdx bookkeeping lives outside physics, see simulate.js). */
export function mkBall(rng, lv, col) {
  const edge = Math.floor(rng() * 4);
  let x, y, vx, vy;
  const s = BASE_SPD + lv * 0.18;
  const a = rng() * 0.55 + 0.18;
  if (edge === 0) {
    x = BR + 2; y = H / 2 + (rng() - 0.5) * 200;
    vx = Math.cos(a) * s; vy = (rng() - 0.5) * s * 0.8;
  } else if (edge === 1) {
    x = W - BR - 2; y = H / 2 + (rng() - 0.5) * 200;
    vx = -Math.cos(a) * s; vy = (rng() - 0.5) * s * 0.8;
  } else if (edge === 2) {
    x = W / 2 + (rng() - 0.5) * 400; y = BR + 2;
    vx = (rng() - 0.5) * s * 0.8; vy = Math.cos(a) * s;
  } else {
    x = W / 2 + (rng() - 0.5) * 400; y = H - BR - 2;
    vx = (rng() - 0.5) * s * 0.8; vy = -Math.cos(a) * s;
  }
  if (Math.abs(vx) < BASE_SPD * 0.3) {
    vx = (rng() < 0.5 ? 1 : -1) * BASE_SPD * 0.35;
  }
  return {
    x, y, vx, vy, col, scol: col,
    wt: 1.0 + rng() * 1.4,
    op: 0.50 + rng() * 0.18,
    spin: (rng() - 0.5) * 0.18,
  };
}

export function enforceMinAngle(b) {
  const minA = Math.PI / 10;
  const spd = Math.hypot(b.vx, b.vy);
  const ang = Math.atan2(b.vy, b.vx);
  const fromH = Math.min(Math.abs(ang), Math.PI - Math.abs(ang));
  if (fromH < minA) {
    const sy = b.vy >= 0 ? 1 : -1;
    const sx = b.vx >= 0 ? 1 : -1;
    b.vx = sx * Math.cos(minA) * spd;
    b.vy = sy * Math.sin(minA) * spd;
  }
}

function finishWallBounce(b, rng) {
  b.spin = -b.spin * 0.6 + (rng() - 0.5) * 0.10;
  const spd = Math.hypot(b.vx, b.vy);
  const maxVY = spd * Math.sin(0.96);
  if (Math.abs(b.vy) > maxVY) {
    b.vy = Math.sign(b.vy) * maxVY;
    b.vx = Math.sign(b.vx || 1) * Math.sqrt(spd * spd - b.vy * b.vy);
  }
  enforceMinAngle(b);
  return { type: 'wallHit', x: b.x, y: b.y };
}

/* Rounded-corner reflect + top/bottom bounce (0.92 damping, ±0.28 jitter).
   Bundles the post-bounce spin decay/vy clamp and enforceMinAngle call,
   matching the brief's wallHit description. Returns an event or null. */
export function wallHit(b, rng) {
  for (const c of CORNERS) {
    const inX = (c.cx <= CR) ? (b.x < c.cx) : (b.x > c.cx);
    const inY = (c.cy <= CR) ? (b.y < c.cy) : (b.y > c.cy);
    if (inX && inY) {
      const dx = b.x - c.cx, dy = b.y - c.cy, dist = Math.hypot(dx, dy);
      if (dist + BR > CR && dist > 0) {
        const nx = dx / dist, ny = dy / dist;
        b.x = c.cx + nx * (CR - BR - 0.5); b.y = c.cy + ny * (CR - BR - 0.5);
        const dot = b.vx * nx + b.vy * ny;
        if (dot > 0) {
          b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny;
          return finishWallBounce(b, rng);
        }
      }
      return null;
    }
  }
  if (b.y - BR < 0) {
    b.y = BR; b.vy = Math.abs(b.vy) * 0.92;
    const spd = Math.hypot(b.vx, b.vy);
    const ang = Math.atan2(b.vy, b.vx) + (rng() - 0.5) * 0.28;
    b.vx = Math.cos(ang) * spd; b.vy = Math.sin(ang) * spd;
    return finishWallBounce(b, rng);
  }
  if (b.y + BR > H) {
    b.y = H - BR; b.vy = -Math.abs(b.vy) * 0.92;
    const spd = Math.hypot(b.vx, b.vy);
    const ang = Math.atan2(b.vy, b.vx) + (rng() - 0.5) * 0.28;
    b.vx = Math.cos(ang) * spd; b.vy = Math.sin(ang) * spd;
    return finishWallBounce(b, rng);
  }
  return null;
}

/* Swept-segment paddle collision. paddleL/paddleR are {y} objects.
   padVelL is the left paddle's per-frame y-velocity (mouse, live game;
   AI-stand-in delta, sim) — only the left/player side transmits
   velocity-based spin, matching the original asymmetry exactly. */
export function sweptHit(b, paddleL, paddleR, padVelL, rng) {
  const px0 = b.x - b.vx, py0 = b.y - b.vy;
  if (b.vx < 0) {
    const face = PX + PW;
    if (Math.min(px0, b.x) - BR <= face && Math.max(px0, b.x) + BR >= face) {
      const t = (face - (px0 - BR)) / (b.x - BR - (px0 - BR));
      const iy = py0 + t * (b.y - py0);
      if (iy >= paddleL.y - BR && iy <= paddleL.y + PH + BR) {
        const rel = (iy - (paddleL.y + PH / 2)) / (PH / 2);
        const ang = rel * 0.62, s = Math.min(bspd(b) * 1.04, MAX_SPD);
        b.vx = Math.abs(Math.cos(ang) * s); b.vy = Math.sin(ang) * s;
        b.x = face + BR + 1; b.y = iy;
        const pvSpin = padVelL * 0.032;
        const randSpin = (rng() - 0.5) * 0.14;
        b.spin = pvSpin + randSpin;
        enforceMinAngle(b);
        return { type: 'paddleHit', side: 'L', x: b.x, y: b.y };
      }
    }
  }
  if (b.vx > 0) {
    const face = AX;
    if (Math.max(px0, b.x) + BR >= face && Math.min(px0, b.x) - BR <= face + PW) {
      const t = (face - (px0 + BR)) / (b.x + BR - (px0 + BR));
      const iy = py0 + t * (b.y - py0);
      if (iy >= paddleR.y - BR && iy <= paddleR.y + PH + BR) {
        const rel = (iy - (paddleR.y + PH / 2)) / (PH / 2);
        const ang = rel * 0.62, s = Math.min(bspd(b) * 1.03, MAX_SPD);
        b.vx = -Math.abs(Math.cos(ang) * s); b.vy = Math.sin(ang) * s;
        b.x = face - BR - 1; b.y = iy;
        b.spin = (rng() - 0.5) * 0.20;
        enforceMinAngle(b);
        return { type: 'paddleHit', side: 'R', x: b.x, y: b.y };
      }
    }
  }
  return null;
}

/* Per-frame spin nudge, position integration, min |vx| floor, wall/paddle
   collision tests, and the BASE_SPD*1.6 per-frame speed cap (documented
   quirk — ported as-is, do not fix). Returns this frame's events for b. */
export function advanceBall(b, paddleL, paddleR, padVelL, rng) {
  const events = [];
  if (Math.abs(b.spin) > 0.0002) {
    const spd = bspd(b) || 1;
    const px = -b.vy / spd;
    const py = b.vx / spd;
    b.vx += px * b.spin;
    b.vy += py * b.spin;
    const newSpd = bspd(b);
    if (newSpd > 0) { b.vx = b.vx / newSpd * spd; b.vy = b.vy / newSpd * spd; }
    b.spin *= 0.997;
  }

  b.x += b.vx; b.y += b.vy;

  if (Math.abs(b.vx) < BASE_SPD * 0.45) {
    b.vx = Math.sign(b.vx || 1) * BASE_SPD * 0.45;
  }

  const wallEv = wallHit(b, rng);
  if (wallEv) events.push(wallEv);

  const hitEv = sweptHit(b, paddleL, paddleR, padVelL, rng);
  if (hitEv) events.push(hitEv);

  const cs2 = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
  const capSpd = BASE_SPD * 1.6;
  if (cs2 > capSpd) {
    const ratio = capSpd / cs2;
    b.vx *= ratio; b.vy *= ratio;
  }
  return events;
}

/* Elastic push + spin exchange between overlapping balls. Returns collide
   events (used for sndCollide in the live game). */
export function ballBall(balls, rng) {
  const events = [];
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i], b = balls[j];
      const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy), minD = BR * 2 + 2;
      if (dist < minD && dist > 0) {
        const nx = dx / dist, ny = dy / dist, ov = (minD - dist) / 2;
        a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
        const dot = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (dot > 0) {
          a.vx -= dot * nx; a.vy -= dot * ny;
          b.vx += dot * nx; b.vy += dot * ny;
          const s = (rng() * 0.12 + 0.06);
          a.spin += s; b.spin -= s;
          events.push({ type: 'collide', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        }
      }
    }
  }
  return events;
}

/* Ball-speed scaling applied to all in-flight balls on level-up. Level/aiSpd
   bookkeeping (which is driven by total score, not physics) lives in the
   caller — see simulate.js. */
export function levelUp(balls) {
  balls.forEach(b => {
    const s = Math.min(bspd(b) * 1.06, MAX_SPD);
    const a = Math.atan2(b.vy, b.vx);
    b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s;
  });
}

/* Nearest ball approaching a paddle side ('L' or 'R'). Falls back to the
   vertical center when nothing is approaching. */
export function pickTargetY(balls, side) {
  const approaching = side === 'R'
    ? balls.filter(b => b.vx > 0).sort((a, b) => b.x - a.x)
    : balls.filter(b => b.vx < 0).sort((a, b) => a.x - b.x);
  const tgt = approaching[0];
  return tgt ? tgt.y : H / 2;
}

/* Generalized paddle AI: jitter + step + lag catch-up + clamp, given an
   already-resolved target y. `tVirtual` replaces Date.now() (see simulate.js
   deviation note) so behavior stays deterministic under a seed.
   `phaseOffset` lets a second consumer (the sim's player stand-in) desync
   its jitter from the primary AI. */
export function updatePaddleAI(paddle, targetY, aiSpd, tVirtual, phaseOffset = 0) {
  const jitter = Math.sin(tVirtual * 0.002 + phaseOffset) * 3;
  const d = targetY - (paddle.y + PH / 2) + jitter;
  const maxStep = Math.max(aiSpd, 4.2);
  paddle.y += Math.sign(d) * Math.min(Math.abs(d), maxStep);
  const lag = targetY - (paddle.y + PH / 2);
  if (Math.abs(lag) > 80) paddle.y += Math.sign(lag) * 2.5;
  paddle.y = Math.max(PAD_MIN, Math.min(PAD_MAX, paddle.y));
}
