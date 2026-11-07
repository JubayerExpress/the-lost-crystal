/* Pen Clash Arena — v7 "Burnished"
 * One consolidated engine replacing the earlier patch layers (index inline script,
 * enhancements, arena-v3/v5/v6, game-shell, premium-home).
 * Save keys are unchanged, so existing coins, unlocks and profiles carry over.
 */
'use strict';
(() => {
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randn = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ======================================================================
 * DATA
 * ==================================================================== */
// a = accuracy (aim guide length + steadier aim), p = power (launch speed),
// d = defense (mass: resists knockback, but slides shorter on its own shot).
const PENS = [
  { name: 'Matador',     mat: 'clear',  body: '#cfe1f5', tint: '#2f73d6', cap: '#1e56b0', ink: '#1a3f8f', grip: null,      a: 52, p: 50, d: 49, cost: 0,
    trait: 'All-rounder', desc: 'The clear-barrel classroom classic. Nothing fancy, nothing missing.' },
  { name: 'Econo',       mat: 'opaque', body: '#f1f3f6', tint: '#f1f3f6', cap: '#e0384f', ink: '#c42a3f', grip: '#e0384f', a: 50, p: 52, d: 50, cost: 0,
    trait: 'All-rounder', desc: 'White body, red cap, a little extra punch off the flick.' },
  { name: 'Good Luck',   mat: 'opaque', body: '#27b896', tint: '#27b896', cap: '#0f5c4a', ink: '#0c3d33', grip: null,      a: 49, p: 49, d: 53, cost: 0,
    trait: 'All-rounder', desc: 'Slightly heavier. Hard to shove off the edge.' },
  { name: 'Turbo Gel',   mat: 'clear',  body: '#e4d5ff', tint: '#8b5cf6', cap: '#4c1d95', ink: '#6d28d9', grip: '#5b21b6', a: 78, p: 58, d: 42, cost: 120, fr: .86,
    trait: 'Glider', desc: 'Light and slick. Long, accurate shots, but it gets bullied in a crowd.' },
  { name: 'Steel Strike', mat: 'metal', body: '#b9c4cf', tint: '#9aa7b4', cap: '#5b6876', ink: '#222', grip: '#2b313a',  a: 46, p: 80, d: 84, cost: 260, fr: 1.14,
    trait: 'Tank', desc: 'Solid steel. Hits like a truck and barely moves when hit, but it stops short.' },
  { name: 'Golden Ace',  mat: 'metal',  body: '#e8c26a', tint: '#d4a43f', cap: '#8a5a12', ink: '#222', grip: '#1d1d22',  a: 70, p: 70, d: 64, cost: 500,
    trait: 'Champion', desc: 'Strong at everything, best at nothing. The trophy pen.' },
];
const SURFACES = [
  { name: 'Classroom desk', kind: 'wood',    light: '#b87a48', dark: '#7a4a2c', ink: true },
  { name: 'Honey oak',      kind: 'wood',    light: '#dcae72', dark: '#a87644' },
  { name: 'Dark walnut',    kind: 'wood',    light: '#7a5640', dark: '#3a2a20' },
  { name: 'Rosewood',       kind: 'wood',    light: '#a35c55', dark: '#5e3038' },
  { name: 'Midnight carbon', kind: 'carbon', light: '#3a4658', dark: '#141b26' },
  { name: 'Circuit board',  kind: 'circuit', light: '#1f4a45', dark: '#0f2526' },
  { name: 'Black marble',   kind: 'marble',  light: '#4a4e5a', dark: '#1b1d24' },
  { name: 'Premium maple',  kind: 'wood',    light: '#e6c08e', dark: '#b88a5a', fine: true },
];
const SHAPES = [
  { id: 'rounded', name: 'Desk',    note: 'Wide, forgiving corners' },
  { id: 'octagon', name: 'Octagon', note: 'Corners cut short' },
  { id: 'oval',    name: 'Oval',    note: 'No corners to hide in' },
];
const SEAT_COLORS = ['#9ff0c9', '#ff8a7a', '#f5c451', '#7cc4ff', '#c4a2ff'];
const AVATARS = ['😎', '🐯', '🦁', '🤖', '🐉', '🦊', '👑', '🔥', '🦄', '🐼', '⚡', '👾'];
const DIFF = {
  easy:   { name: 'Easy',   noise: .2,  pick: .55, think: 900 },
  normal: { name: 'Normal', noise: .095, pick: .25, think: 750 },
  hard:   { name: 'Hard',   noise: .035, pick: 0,   think: 600 },
};
const BOT_NAMES = ['Bot Rafi', 'Bot Mitu', 'Bot Shuvo', 'Bot Nila'];

/* ======================================================================
 * STORAGE (keys kept from earlier versions)
 * ==================================================================== */
const ls = {
  raw(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
  json(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  put(k, v) { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); return true; } catch (e) { return false; } },
};
const save = Object.assign({ coins: 0, xp: 0, wins: 0, unlocked: [0, 1, 2], selected: 0, wood: 0 }, ls.json('penclash-save', {}) || {});
save.unlocked = [...new Set([0, 1, 2, ...(save.unlocked || [])])].filter(i => i < PENS.length);
if (!save.unlocked.includes(save.selected)) save.selected = 0;
if (!(save.wood >= 0 && save.wood < SURFACES.length)) save.wood = 0;
const persist = () => ls.put('penclash-save', save);

let shapeId = ls.raw('penclash-shape', 'rounded');
if (!SHAPES.some(s => s.id === shapeId)) shapeId = 'rounded';

const defaultProfile = i => ({ name: i === 0 ? 'Player One' : `Player ${i + 1}`, avatar: AVATARS[i], photo: '', matches: 0, wins: 0, rounds: 0, knockouts: 0, streak: 0, best: 0, pen: i % 3 });
const profiles = Array.from({ length: 5 }, (_, i) => defaultProfile(i));
{ const d = ls.json('penclash-profiles-v3', null); if (Array.isArray(d)) d.slice(0, 5).forEach((p, i) => Object.assign(profiles[i], p)); }
const persistProfiles = () => { if (!ls.put('penclash-profiles-v3', profiles)) toast('Storage is full. Try a smaller photo.'); };

const settings = Object.assign({ volume: 80, shake: true, saver: false, difficulty: 'normal', count: 2 }, ls.json('penclash-settings-v7', {}) || {});
settings.sound = ls.raw('penclash-sound', 'on') !== 'off';
const persistSettings = () => { ls.put('penclash-settings-v7', { volume: settings.volume, shake: settings.shake, saver: settings.saver, difficulty: settings.difficulty, count: settings.count }); ls.put('penclash-sound', settings.sound ? 'on' : 'off'); };

const level = () => 1 + Math.floor(save.xp / 100);

/* ======================================================================
 * TABLE GEOMETRY (world units, table centred on origin)
 * ==================================================================== */
function makeTable(shape, landscape) {
  const w = landscape ? 1000 : 660, h = landscape ? 660 : 1000;
  return { shape, w, h, landscape, R: Math.min(w, h) * .15, cut: Math.min(w, h) * .27 };
}
function inside(t, x, y, g = 0) {
  const hw = t.w / 2 + g, hh = t.h / 2 + g;
  if (t.shape === 'oval') return (x / hw) ** 2 + (y / hh) ** 2 <= 1;
  if (Math.abs(x) > hw || Math.abs(y) > hh) return false;
  if (t.shape === 'octagon') { const c = t.cut + g * (2 - Math.SQRT2); return Math.abs(x) + Math.abs(y) <= hw + hh - c; }
  const r = Math.max(1, t.R + g), px = clamp(Math.abs(x), 0, hw - r), py = clamp(Math.abs(y), 0, hh - r);
  return (Math.abs(x) - px) ** 2 + (Math.abs(y) - py) ** 2 <= r * r || Math.abs(x) <= hw - r || Math.abs(y) <= hh - r;
}
// 0 at centre, 1 at the edge (approximate, used by bot scoring)
function edgeness(t, x, y) {
  const hw = t.w / 2, hh = t.h / 2;
  if (t.shape === 'oval') return Math.hypot(x / hw, y / hh);
  let e = Math.max(Math.abs(x) / hw, Math.abs(y) / hh);
  if (t.shape === 'octagon') e = Math.max(e, (Math.abs(x) + Math.abs(y)) / (hw + hh - t.cut));
  return e;
}
function tracePath(ctx, t, g = 0) {
  const hw = t.w / 2 + g, hh = t.h / 2 + g;
  ctx.beginPath();
  if (t.shape === 'oval') ctx.ellipse(0, 0, hw, hh, 0, 0, TAU);
  else if (t.shape === 'octagon') {
    const c = t.cut + g * (2 - Math.SQRT2);
    ctx.moveTo(-hw + c, -hh); ctx.lineTo(hw - c, -hh); ctx.lineTo(hw, -hh + c); ctx.lineTo(hw, hh - c);
    ctx.lineTo(hw - c, hh); ctx.lineTo(-hw + c, hh); ctx.lineTo(-hw, hh - c); ctx.lineTo(-hw, -hh + c); ctx.closePath();
  } else ctx.roundRect(-hw, -hh, hw * 2, hh * 2, Math.max(1, t.R + g));
}
function spawnSpots(t, n) {
  if (n === 2) return t.landscape ? [[-t.w * .3, 0, 0], [t.w * .3, 0, Math.PI]] : [[0, t.h * .3, -Math.PI / 2], [0, -t.h * .3, Math.PI / 2]];
  const out = [], start = t.landscape ? Math.PI : Math.PI / 2;
  for (let i = 0; i < n; i++) {
    const ang = start + i * TAU / n, k = t.shape === 'oval' ? .56 : .6;
    const x = Math.cos(ang) * t.w / 2 * k, y = Math.sin(ang) * t.h / 2 * k;
    out.push([x, y, Math.atan2(-y, -x) + Math.PI / 2]); // lie across the radius, like players do
  }
  return out;
}

/* ======================================================================
 * PHYSICS — pens are capsules with real rotation
 * ==================================================================== */
const HL = 50, PR = 8.5;              // half-length of collision segment, radius
const MU = 640, VISC = .55;           // sliding friction (u/s²), viscous drag (1/s)
const AMU = 15, AVISC = 2.2;          // angular friction
const REST = .72, TFRIC = .18;        // restitution, tangential friction
const STEP = 1 / 120;

function makeBody(seat, pen, x, y, a) {
  const P = PENS[pen], m = .75 + P.d / 100;
  return { seat, pen, x, y, a, vx: 0, vy: 0, w: 0, m, I: m * (2 * HL) ** 2 / 12, fr: P.fr || 1, alive: true, fall: 0, drift: 0, driftT: 0, trail: [] };
}
function cloneWorld(W) { return { t: W.t, shooter: W.shooter, bodies: W.bodies.map(b => ({ ...b, trail: [] })) }; }
function launchSpeed(pen, power) { return (230 + 960 * power) * (.82 + PENS[pen].p / 260); }
function launch(b, dirAngle, power, drift) {
  const v = launchSpeed(b.pen, power);
  b.vx = Math.cos(dirAngle) * v; b.vy = Math.sin(dirAngle) * v;
  // Flicking across the barrel spins the pen; flicking along it sends it straight.
  b.w += Math.sin(dirAngle - b.a) * Math.cos(dirAngle - b.a) * 7 * power + drift * 2.2;
  b.drift = drift; b.driftT = drift ? 1.5 : 0;
}
function seg(b) { const c = Math.cos(b.a) * HL, s = Math.sin(b.a) * HL; return [b.x - c, b.y - s, b.x + c, b.y + s]; }
function closest(p1x, p1y, q1x, q1y, p2x, p2y, q2x, q2y) {
  const d1x = q1x - p1x, d1y = q1y - p1y, d2x = q2x - p2x, d2y = q2y - p2y, rx = p1x - p2x, ry = p1y - p2y;
  const a = d1x * d1x + d1y * d1y, e = d2x * d2x + d2y * d2y, f = d2x * rx + d2y * ry, c = d1x * rx + d1y * ry, b = d1x * d2x + d1y * d2y;
  const den = a * e - b * b; let s = den > 1e-9 ? clamp((b * f - c * e) / den, 0, 1) : 0, t = (b * s + f) / e;
  if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
  return [p1x + d1x * s, p1y + d1y * s, p2x + d2x * t, p2y + d2y * t];
}
function stepWorld(W, dt, ev) {
  const B = W.bodies;
  for (const b of B) {
    if (b.fall > 0) { b.fall += dt * 2.2; b.x += b.vx * dt * .6; b.y += b.vy * dt * .6; b.a += b.w * dt; continue; }
    if (!b.alive) continue;
    let sp = Math.hypot(b.vx, b.vy);
    if (b.driftT > 0 && sp > 40) {
      const s = b.drift * 1.05 * dt * Math.min(1, b.driftT / .5), c = Math.cos(s), n = Math.sin(s);
      const vx = b.vx; b.vx = vx * c - b.vy * n; b.vy = vx * n + b.vy * c; b.driftT -= dt;
    }
    b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
    if (sp > 0) { const ns = Math.max(0, sp - MU * b.fr * dt) * (1 - VISC * dt); b.vx *= ns / sp; b.vy *= ns / sp; }
    const aw = Math.abs(b.w); if (aw > 0) b.w *= Math.max(0, aw - AMU * dt) * (1 - AVISC * dt) / aw;
  }
  for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
    const A = B[i], C = B[j]; if (!A.alive || !C.alive) continue;
    if ((A.x - C.x) ** 2 + (A.y - C.y) ** 2 > (2 * HL + 2 * PR) ** 2) continue;
    const s1 = seg(A), s2 = seg(C), [ax, ay, cx, cy] = closest(...s1, ...s2);
    let nx = ax - cx, ny = ay - cy, d = Math.hypot(nx, ny);
    if (d >= 2 * PR) continue;
    if (d < 1e-6) { nx = A.x - C.x; ny = A.y - C.y; d = Math.hypot(nx, ny) || 1; }
    nx /= d; ny /= d;
    const px = (ax + cx) / 2, py = (ay + cy) / 2;
    const rAx = px - A.x, rAy = py - A.y, rCx = px - C.x, rCy = py - C.y;
    const rvx = (A.vx - A.w * rAy) - (C.vx - C.w * rCy), rvy = (A.vy + A.w * rAx) - (C.vy + C.w * rCx);
    const vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      const rAn = rAx * ny - rAy * nx, rCn = rCx * ny - rCy * nx;
      const k = 1 / A.m + 1 / C.m + rAn * rAn / A.I + rCn * rCn / C.I;
      let bonus = 1; if (W.shooter === A.seat || W.shooter === C.seat) bonus = 1 + (PENS[(W.shooter === A.seat ? A : C).pen].p - 50) / 300;
      const jn = -(1 + REST) * vn / k * bonus;
      A.vx += jn * nx / A.m; A.vy += jn * ny / A.m; A.w += rAn * jn / A.I;
      C.vx -= jn * nx / C.m; C.vy -= jn * ny / C.m; C.w -= rCn * jn / C.I;
      const tx = -ny, ty = nx, vt = rvx * tx + rvy * ty, rAt = rAx * ty - rAy * tx, rCt = rCx * ty - rCy * tx;
      const kt = 1 / A.m + 1 / C.m + rAt * rAt / A.I + rCt * rCt / C.I;
      const jt = clamp(-vt / kt, -TFRIC * jn, TFRIC * jn);
      A.vx += jt * tx / A.m; A.vy += jt * ty / A.m; A.w += rAt * jt / A.I;
      C.vx -= jt * tx / C.m; C.vy -= jt * ty / C.m; C.w -= rCt * jt / C.I;
      A.w = clamp(A.w, -28, 28); C.w = clamp(C.w, -28, 28);
      if (ev && jn > 25) ev.push({ type: 'hit', x: px, y: py, j: jn, a: A, b: C });
    }
    const pen = 2 * PR - d, mt = A.m + C.m;
    A.x += nx * pen * C.m / mt; A.y += ny * pen * C.m / mt; C.x -= nx * pen * A.m / mt; C.y -= ny * pen * A.m / mt;
  }
  for (const b of B) if (b.alive && !inside(W.t, b.x, b.y)) { b.alive = false; b.fall = .001; b.driftT = 0; if (ev) ev.push({ type: 'ko', body: b }); }
}
const isResting = W => W.bodies.every(b => (!b.alive && (b.fall === 0 || b.fall >= 1)) || (b.alive && Math.hypot(b.vx, b.vy) < 5 && Math.abs(b.w) < .25));

/* ======================================================================
 * BOT BRAIN — simulates candidate shots and picks a good one
 * ==================================================================== */
function planShot(W, seat, diffKey, quick) {
  const D = DIFF[diffKey] || DIFF.normal, me = W.bodies.find(b => b.seat === seat), t = W.t;
  const foes = W.bodies.filter(b => b.alive && b.seat !== seat);
  const cands = [];
  const offsets = quick ? [-.08, 0, .08] : [-.14, -.07, 0, .07, .14];
  const powers = quick ? [.6, .85] : [.5, .7, .88, 1];
  const drifts = diffKey === 'hard' && !quick ? [0, -1, 1] : [0];
  for (const f of foes) for (const o of offsets) for (const pw of powers) for (const dr of drifts) {
    const base = Math.atan2(f.y - me.y, f.x - me.x);
    cands.push({ ang: base + o - dr * .32 * (pw > .8 ? .8 : 1), pw, dr });
  }
  for (const c of cands) {
    const S = cloneWorld(W); S.shooter = seat; const sm = S.bodies.find(b => b.seat === seat);
    launch(sm, c.ang, c.pw, c.dr);
    for (let i = 0; i < 260; i++) { stepWorld(S, 1 / 50, null); if (i > 20 && i % 10 === 0 && isResting(S)) break; }
    let score = 0;
    for (const b of S.bodies) {
      if (b.seat === seat) score += b.alive ? -Math.max(0, edgeness(t, b.x, b.y) - .55) * 90 : -260;
      else if (W.bodies.find(o => o.seat === b.seat).alive) score += b.alive ? edgeness(t, b.x, b.y) * 22 : 120;
    }
    c.score = score + rand(0, 4);
  }
  cands.sort((a, b) => b.score - a.score);
  const pick = cands[Math.min(cands.length - 1, Math.floor(Math.random() * cands.length * D.pick))] || cands[0];
  const acc = PENS[me.pen].a;
  return { ang: pick.ang + randn() * D.noise * (1.35 - acc / 100), pw: clamp(pick.pw + randn() * D.noise * .6, .3, 1), dr: pick.dr };
}

/* ======================================================================
 * AUDIO — procedural, no files
 * ==================================================================== */
const Sfx = (() => {
  let ac = null, master = null, noise = null, slideGain = null;
  function init() {
    if (!settings.sound) return false;
    try {
      if (!ac) {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.connect(ac.destination);
        noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource(); src.buffer = noise; src.loop = true;
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = .7;
        slideGain = ac.createGain(); slideGain.gain.value = 0;
        src.connect(bp); bp.connect(slideGain); slideGain.connect(master); src.start();
      }
      master.gain.value = settings.volume / 100 * .5;
      if (ac.state === 'suspended') ac.resume();
      return true;
    } catch (e) { return false; }
  }
  const ok = () => settings.sound && ac && ac.state === 'running';
  function tone(f, dur, type = 'sine', vol = .2, delay = 0, f2) {
    if (!ok()) return; const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .03);
  }
  function burst(freq, q, dur, vol, delay = 0, type = 'bandpass') {
    if (!ok()) return; const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }
  return {
    init,
    setVolume() { if (master) master.gain.value = settings.volume / 100 * .5; },
    click() { burst(3200, 3, .03, .25); },
    flick(p) { burst(2400, 1.2, .05, .5 + p * .3); tone(180, .09, 'triangle', .25, 0, 70); burst(900, .8, .12 + p * .1, .12, .01); },
    hit(j, metal) {
      const v = clamp(j / 900, .08, 1);
      burst(metal ? 3600 : 2100, metal ? 6 : 2.5, .05, .7 * v);
      tone(metal ? 1900 : 520, metal ? .32 : .07, 'sine', .22 * v, 0, metal ? 1750 : 300);
      if (metal) tone(3100, .2, 'sine', .08 * v);
      tone(120, .12, 'sine', .3 * v, 0, 55);
    },
    ko() { burst(500, .7, .35, .35, 0, 'lowpass'); tone(260, .4, 'triangle', .2, .02, 60); },
    point() { tone(660, .12, 'triangle', .18); tone(990, .2, 'triangle', .16, .1); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .26, 'triangle', .17, i * .11)); tone(1318, .6, 'sine', .1, .45); },
    lose() { [392, 330, 262].forEach((f, i) => tone(f, .22, 'triangle', .13, i * .14)); },
    unlock() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, .18, 'sine', .14, i * .07)); },
    slide(speed) { if (slideGain && ok()) slideGain.gain.setTargetAtTime(clamp(speed / 2600, 0, .22), ac.currentTime, .05); },
  };
})();

/* ======================================================================
 * RENDERING
 * ==================================================================== */
const SPR = 4; // sprite px per world unit
const penSprites = [], shadowSprite = document.createElement('canvas');
function shade(hex, amt) { // amt -1..1
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round(lerp(r, t, p)); g = Math.round(lerp(g, t, p)); b = Math.round(lerp(b, t, p));
  return `rgb(${r},${g},${b})`;
}
// Cylinder shading across the barrel: light comes from the upper-left lamp.
function cyl(ctx, y0, y1, base, metal) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  if (metal) {
    g.addColorStop(0, shade(base, -.55)); g.addColorStop(.12, shade(base, .1)); g.addColorStop(.26, shade(base, .78));
    g.addColorStop(.36, shade(base, .2)); g.addColorStop(.6, shade(base, -.12)); g.addColorStop(.82, shade(base, .25)); g.addColorStop(1, shade(base, -.6));
  } else {
    g.addColorStop(0, shade(base, -.5)); g.addColorStop(.18, shade(base, .05)); g.addColorStop(.3, shade(base, .55));
    g.addColorStop(.42, shade(base, .08)); g.addColorStop(.8, shade(base, -.18)); g.addColorStop(1, shade(base, -.55));
  }
  return g;
}
function drawPenModel(ctx, P) {
  const metal = P.mat === 'metal', clear = P.mat === 'clear';
  const R = 8.2;
  // Barrel
  ctx.save();
  ctx.beginPath(); ctx.moveTo(-40, -R); ctx.lineTo(30, -R + .9); ctx.lineTo(30, R - .9); ctx.lineTo(-40, R); ctx.closePath();
  if (clear) {
    ctx.fillStyle = cyl(ctx, -R, R, P.tint, false); ctx.globalAlpha = .38; ctx.fill(); ctx.globalAlpha = 1;
    ctx.save(); ctx.clip();
    // ink refill visible through the barrel
    ctx.fillStyle = cyl(ctx, -2.2, 2.2, '#e9eef5', false); ctx.fillRect(-40, -2.2, 72, 4.4);
    ctx.fillStyle = P.ink; ctx.globalAlpha = .85; ctx.fillRect(-6, -1.5, 38, 3); ctx.globalAlpha = 1;
    // hexagonal facet lines
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = .5;
    for (const y of [-4.6, 4.6]) { ctx.beginPath(); ctx.moveTo(-40, y); ctx.lineTo(30, y * .92); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = cyl(ctx, -R, R, P.body, false); ctx.globalAlpha = .3; ctx.fill(); ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = cyl(ctx, -R, R, P.body, metal); ctx.fill();
    if (metal) { // brushed texture
      ctx.save(); ctx.clip(); ctx.globalAlpha = .1;
      for (let i = 0; i < 40; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#000'; ctx.fillRect(-40, -R + Math.random() * R * 2, 70, .25); }
      ctx.restore();
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = .5; ctx.stroke();
  // specular streak
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-36, -R * .52, 60, 1.1);
  ctx.restore();
  // Grip
  if (P.grip) {
    ctx.save();
    ctx.beginPath(); ctx.roundRect(10, -R + .4, 24, (R - .4) * 2, 2);
    ctx.fillStyle = cyl(ctx, -R, R, P.grip, false); ctx.fill(); ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = .7;
    for (let x = 12; x < 34; x += 2.2) { ctx.beginPath(); ctx.moveTo(x, -R); ctx.lineTo(x, R); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(10, -R * .6, 24, 1.2);
    ctx.restore();
  }
  // Front cone
  ctx.beginPath(); ctx.moveTo(30, -R + .9); ctx.quadraticCurveTo(42, -6, 50, -2.6); ctx.lineTo(50, 2.6); ctx.quadraticCurveTo(42, 6, 30, R - .9); ctx.closePath();
  ctx.fillStyle = cyl(ctx, -R, R, metal ? P.body : P.cap, metal); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = .5; ctx.stroke();
  // Chrome tip + ballpoint
  ctx.beginPath(); ctx.moveTo(50, -2.6); ctx.lineTo(57, -1.3); ctx.lineTo(57, 1.3); ctx.lineTo(50, 2.6); ctx.closePath();
  ctx.fillStyle = cyl(ctx, -2.6, 2.6, '#c9d2dc', true); ctx.fill();
  ctx.beginPath(); ctx.arc(57.6, 0, 1.1, 0, TAU); ctx.fillStyle = '#20242c'; ctx.fill();
  // Back cap / end plug
  ctx.beginPath(); ctx.moveTo(-40, -R - .6); ctx.lineTo(-56, -R + .4); ctx.quadraticCurveTo(-60, 0, -56, R - .4); ctx.lineTo(-40, R + .6); ctx.closePath();
  ctx.fillStyle = cyl(ctx, -R - .6, R + .6, P.cap, metal); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = .5; ctx.stroke();
  // seam ring
  ctx.fillStyle = cyl(ctx, -R, R, metal ? '#e7ecf2' : shade(P.cap, -.2), true); ctx.fillRect(-41.5, -R - .6, 2.4, (R + .6) * 2);
  // Pocket clip, seen from above: a metal strip lying along the cap
  ctx.beginPath(); ctx.roundRect(-55, -2.5, 34, 5, 2.5);
  ctx.fillStyle = cyl(ctx, -2.5, 2.5, metal ? '#f0f3f7' : '#d8dee6', true); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = .5; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-22.5, 0, 2.6, 3, 0, 0, TAU); ctx.fillStyle = cyl(ctx, -3, 3, '#eef2f6', true); ctx.fill(); ctx.stroke();
  // Brand stamp
  ctx.save(); ctx.font = '800 4.4px Manrope, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = metal ? 'rgba(20,24,30,.55)' : clear ? 'rgba(255,255,255,.8)' : 'rgba(0,0,0,.42)';
  ctx.fillText(P.name.toUpperCase(), -8, 4.6); ctx.restore();
}
function buildSprites() {
  PENS.forEach((P, i) => {
    const c = penSprites[i] || (penSprites[i] = document.createElement('canvas'));
    c.width = 124 * SPR; c.height = 26 * SPR;
    const x = c.getContext('2d'); x.setTransform(SPR, 0, 0, SPR, 62 * SPR, 13 * SPR); drawPenModel(x, P);
  });
  shadowSprite.width = 160 * SPR / 2; shadowSprite.height = 60 * SPR / 2;
  const s = shadowSprite.getContext('2d'), k = SPR / 2;
  s.setTransform(k, 0, 0, k, 80 * k, 30 * k);
  s.shadowColor = 'rgba(0,0,0,1)'; s.shadowBlur = 9 * k; s.fillStyle = 'rgba(0,0,0,.95)';
  s.beginPath(); s.roundRect(-58, -7, 116, 14, 7); s.fill();
}

// Deterministic randomness keeps a table's grain the same every frame.
function prng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

function paintSurface(ctx, t, S) {
  const r = prng(1234 + SURFACES.indexOf(S) * 77), hw = t.w / 2, hh = t.h / 2, long = Math.max(t.w, t.h);
  const along = t.w >= t.h; // grain runs along the long side
  ctx.save(); tracePath(ctx, t); ctx.clip();
  const g = ctx.createLinearGradient(-hw, -hh, hw, hh); g.addColorStop(0, S.light); g.addColorStop(.55, S.dark); g.addColorStop(1, shade(S.light, -.1));
  ctx.fillStyle = g; ctx.fillRect(-hw - 2, -hh - 2, t.w + 4, t.h + 4);
  if (along === false) { ctx.rotate(Math.PI / 2); }
  const LW = along ? hw : hh, LH = along ? hh : hw;
  if (S.kind === 'wood') {
    const planks = S.fine ? 1 : 4, ph = (LH * 2) / planks;
    for (let p = 0; p < planks; p++) {
      const y0 = -LH + p * ph, tone = (r() - .5) * .14;
      ctx.fillStyle = tone > 0 ? `rgba(255,240,220,${tone})` : `rgba(30,15,5,${-tone})`; ctx.fillRect(-LW, y0, LW * 2, ph);
      const lines = S.fine ? 120 : 34;
      for (let i = 0; i < lines; i++) {
        const y = y0 + r() * ph, amp = rand(2, 9) * (S.fine ? .4 : 1), ph2 = r() * 6;
        ctx.beginPath(); ctx.moveTo(-LW, y);
        for (let x = -LW; x <= LW; x += 40) ctx.lineTo(x, y + Math.sin(x / 140 + ph2) * amp + Math.sin(x / 37 + ph2 * 2) * amp * .25);
        ctx.strokeStyle = r() > .5 ? `rgba(40,18,6,${.05 + r() * .12})` : `rgba(255,230,190,${.03 + r() * .06})`;
        ctx.lineWidth = .6 + r() * 2.4; ctx.stroke();
      }
      if (!S.fine && r() > .4) { // knot
        const kx = rand(-LW * .8, LW * .8), ky = y0 + ph * rand(.3, .7);
        for (let k = 6; k > 0; k--) { ctx.beginPath(); ctx.ellipse(kx, ky, k * 5, k * 1.8, 0, 0, TAU); ctx.strokeStyle = `rgba(40,16,4,${.07 + k * .015})`; ctx.lineWidth = 1.2; ctx.stroke(); }
      }
      if (p > 0) { ctx.fillStyle = 'rgba(20,8,2,.38)'; ctx.fillRect(-LW, y0 - 1, LW * 2, 2); ctx.fillStyle = 'rgba(255,230,200,.08)'; ctx.fillRect(-LW, y0 + 1, LW * 2, 1); }
    }
  } else if (S.kind === 'carbon') {
    const pc = document.createElement('canvas'); pc.width = pc.height = 16; const p = pc.getContext('2d');
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const gg = p.createLinearGradient(i * 8, j * 8, i * 8 + ((i + j) % 2 ? 8 : 0), j * 8 + ((i + j) % 2 ? 0 : 8));
      gg.addColorStop(0, 'rgba(255,255,255,.09)'); gg.addColorStop(1, 'rgba(0,0,0,.25)'); p.fillStyle = gg; p.fillRect(i * 8, j * 8, 8, 8);
    }
    ctx.fillStyle = ctx.createPattern(pc, 'repeat'); ctx.fillRect(-LW, -LH, LW * 2, LH * 2);
  } else if (S.kind === 'circuit') {
    ctx.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      let x = rand(-LW, LW), y = rand(-LH, LH); ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) { if (r() > .5) x += rand(-160, 160); else y += rand(-110, 110); ctx.lineTo(x, y); }
      ctx.strokeStyle = `rgba(150,230,200,${.06 + r() * .08})`; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fillStyle = 'rgba(214,186,110,.32)'; ctx.fill();
    }
    ctx.fillStyle = 'rgba(214,186,110,.2)';
    for (let i = 0; i < 18; i++) { const x = rand(-LW, LW), y = rand(-LH, LH); ctx.fillRect(x, y, 28, 14); }
  } else if (S.kind === 'marble') {
    for (let i = 0; i < 14; i++) {
      let x = rand(-LW, LW), y = -LH - 20; ctx.beginPath(); ctx.moveTo(x, y);
      while (y < LH + 20) { const nx = x + rand(-90, 90), ny = y + rand(40, 120); ctx.quadraticCurveTo(x + rand(-60, 60), (y + ny) / 2, nx, ny); x = nx; y = ny; }
      const wv = r(); ctx.strokeStyle = `rgba(230,232,240,${.05 + wv * .12})`; ctx.lineWidth = .6 + wv * 3; ctx.stroke();
      ctx.strokeStyle = 'rgba(230,232,240,.035)'; ctx.lineWidth = 9 + wv * 10; ctx.stroke();
    }
  }
  if (S.ink) { // classroom character: an ink blot and compass scratches
    ctx.fillStyle = 'rgba(25,30,80,.28)'; const bx = LW * .55, by = -LH * .5;
    ctx.beginPath(); for (let k = 0; k < 14; k++) { const a = k / 14 * TAU, rr = 15 + r() * 9; ctx.lineTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr * .8); } ctx.fill();
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(bx + rand(-34, 34), by + rand(-28, 28), rand(1.5, 4), 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,235,210,.12)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(-LW * .5, LH * .42, 46, .4, 4.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-LW * .62, LH * .3); ctx.lineTo(-LW * .38, LH * .55); ctx.stroke();
  }
  ctx.restore();
  // Lamp light + edge vignette + varnish sheen
  ctx.save(); tracePath(ctx, t); ctx.clip();
  const lamp = ctx.createRadialGradient(-hw * .3, -hh * .45, 10, -hw * .1, -hh * .1, long * .85);
  lamp.addColorStop(0, 'rgba(255,248,230,.16)'); lamp.addColorStop(.5, 'rgba(255,248,230,0)'); lamp.addColorStop(1, 'rgba(0,0,0,.34)');
  ctx.fillStyle = lamp; ctx.fillRect(-hw, -hh, t.w, t.h);
  const sheen = ctx.createLinearGradient(-hw, -hh, hw * .2, hh);
  sheen.addColorStop(.25, 'rgba(255,255,255,0)'); sheen.addColorStop(.4, 'rgba(255,255,255,.05)'); sheen.addColorStop(.55, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen; ctx.fillRect(-hw, -hh, t.w, t.h);
  ctx.restore();
}
function paintTable(ctx, t, S) {
  const RIM = 18;
  // Shadow on the floor
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 34;
  tracePath(ctx, t, RIM); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  // Rim (the table's edge band), lit from above
  tracePath(ctx, t, RIM);
  const rg = ctx.createLinearGradient(0, -t.h / 2 - RIM, 0, t.h / 2 + RIM);
  const edge = S.kind === 'wood' ? S.dark : S.kind === 'marble' ? '#2a2d36' : '#20262f';
  rg.addColorStop(0, shade(edge, .22)); rg.addColorStop(.5, shade(edge, -.15)); rg.addColorStop(1, shade(edge, -.5));
  ctx.fillStyle = rg; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2; ctx.stroke();
  tracePath(ctx, t, RIM - 3); ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1.5; ctx.stroke();
  paintSurface(ctx, t, S);
  // Bevel where surface meets rim
  tracePath(ctx, t, 1.5); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 3; ctx.stroke();
  tracePath(ctx, t, -1.5); ctx.strokeStyle = 'rgba(255,245,225,.16)'; ctx.lineWidth = 1.2; ctx.stroke();
}
function paintFloor(ctx, W, H) {
  const g = ctx.createRadialGradient(W * .45, H * .35, 20, W * .5, H * .5, Math.max(W, H) * .8);
  g.addColorStop(0, '#1c2a3d'); g.addColorStop(1, '#0a121d'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

class View {
  constructor(canvas, { margin = 44, demo = false } = {}) {
    this.c = canvas; this.ctx = canvas.getContext('2d'); this.margin = margin; this.demo = demo;
    this.layer = document.createElement('canvas'); this.dpr = 1; this.scale = 1; this.cw = 0; this.ch = 0; this.key = '';
    this.parts = []; this.rings = []; this.texts = []; this.shake = 0;
  }
  fit(t) { // returns true if size changed
    const r = this.c.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return false;
    this.dpr = Math.min(window.devicePixelRatio || 1, settings.saver ? 1.25 : 2);
    const cw = Math.round(r.width * this.dpr), ch = Math.round(r.height * this.dpr);
    const key = [cw, ch, t.shape, t.w, save.wood].join('|');
    if (key === this.key) return false;
    this.key = key; this.c.width = this.cw = cw; this.c.height = this.ch = ch;
    const m = (Math.min(cw, ch) / this.dpr < 480 ? this.margin * .6 : this.margin) + 14;
    this.scale = Math.min(cw / (t.w + m * 2), ch / (t.h + m * 2));
    this.layer.width = cw; this.layer.height = ch;
    const L = this.layer.getContext('2d');
    paintFloor(L, cw, ch);
    L.setTransform(this.scale, 0, 0, this.scale, cw / 2, ch / 2);
    paintTable(L, t, SURFACES[save.wood]);
    return true;
  }
  toWorld(px, py) { const r = this.c.getBoundingClientRect(); return [((px - r.left) * this.dpr - this.cw / 2) / this.scale, ((py - r.top) * this.dpr - this.ch / 2) / this.scale]; }
  cssToWorld(d) { return d * this.dpr / this.scale; }
  burst(x, y, n, color, sp = 260, life = .55) {
    n = Math.round(n * (settings.saver ? .45 : 1));
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = sp * (.25 + Math.random()); this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (.5 + Math.random() * .7), max: life, r: 1.2 + Math.random() * 2.6, color }); }
  }
  ring(x, y, color = 'rgba(255,244,210,.9)', max = 70) { this.rings.push({ x, y, r: 6, life: 1, max, color }); }
  text(x, y, s, color = '#fff', size = 26) { this.texts.push({ x, y, s, color, size, life: 1 }); }
  bump(n) { if (settings.shake) this.shake = Math.min(16, Math.max(this.shake, n)); }
  draw(W, dt, extra) {
    const ctx = this.ctx, k = this.scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    let sx = 0, sy = 0;
    if (this.shake > .2) { sx = rand(-this.shake, this.shake) * this.dpr; sy = rand(-this.shake, this.shake) * this.dpr; this.shake *= Math.pow(.02, dt); } else this.shake = 0;
    ctx.fillStyle = '#0a121d'; ctx.fillRect(0, 0, this.cw, this.ch);
    ctx.drawImage(this.layer, sx, sy);
    ctx.setTransform(k, 0, 0, k, this.cw / 2 + sx, this.ch / 2 + sy);
    if (extra && extra.under) extra.under(ctx);
    const bodies = W.bodies.filter(b => b.alive || (b.fall > 0 && b.fall < 1));
    // motion trails
    for (const b of bodies) {
      const sp = Math.hypot(b.vx, b.vy);
      if (b.alive && sp > 120) { b.trail.push([b.x, b.y]); if (b.trail.length > 14) b.trail.shift(); } else if (b.trail.length) b.trail.shift();
      if (b.trail.length > 2) {
        ctx.lineCap = 'round';
        for (let i = 1; i < b.trail.length; i++) {
          const f = i / b.trail.length; ctx.strokeStyle = `rgba(255,255,255,${f * .12})`; ctx.lineWidth = PR * 2 * f;
          ctx.beginPath(); ctx.moveTo(...b.trail[i - 1]); ctx.lineTo(...b.trail[i]); ctx.stroke();
        }
      }
    }
    // shadows then pens
    for (const b of bodies) {
      const f = b.fall > 0 ? b.fall : 0, sc = 1 - f * .35, lift = Math.min(1, Math.hypot(b.vx, b.vy) / 900) * 3;
      ctx.save(); ctx.translate(b.x + 5 + lift + f * 30, b.y + 9 + lift + f * 40); ctx.rotate(b.a); ctx.scale(sc, sc);
      ctx.globalAlpha = (.55 - f * .5); ctx.drawImage(shadowSprite, -80, -30, 160, 60); ctx.restore();
    }
    for (const b of bodies) {
      const f = b.fall > 0 ? b.fall : 0, sc = 1 - f * .35;
      if (extra && extra.ring) extra.ring(ctx, b);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a); ctx.scale(sc, sc);
      ctx.globalAlpha = 1 - f * .9; ctx.drawImage(penSprites[b.pen], -62, -13, 124, 26);
      if (f > 0) { ctx.globalAlpha = f * .7; ctx.fillStyle = '#000'; ctx.fillRect(-60, -9, 118, 18); }
      ctx.restore();
    }
    if (extra && extra.over) extra.over(ctx);
    // particles
    for (const p of this.parts) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(.05, dt); p.vy *= Math.pow(.05, dt); p.life -= dt;
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const r of this.rings) {
      r.life -= dt * 2.6; r.r = lerp(r.max, 6, r.life);
      ctx.globalAlpha = clamp(r.life, 0, 1) * .8; ctx.strokeStyle = r.color; ctx.lineWidth = 1 + r.life * 4; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
    }
    this.rings = this.rings.filter(r => r.life > 0);
    for (const t of this.texts) {
      t.life -= dt * .9; t.y -= dt * 40;
      const s = t.size / Math.max(.6, k * 1.6) * 1.2;
      ctx.globalAlpha = clamp(t.life * 2, 0, 1); ctx.font = `800 ${s}px Unbounded, Manrope, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = s * .22; ctx.strokeStyle = 'rgba(10,18,29,.85)'; ctx.strokeText(t.s, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.s, t.x, t.y);
    }
    this.texts = this.texts.filter(t => t.life > 0);
    ctx.globalAlpha = 1;
  }
}

/* ======================================================================
 * UI HELPERS
 * ==================================================================== */
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400); }
function avatarHTML(p) { return p.photo ? `<img src="${p.photo}" alt="">` : `<span>${p.avatar}</span>`; }
function penThumb(i, w = 240, h = 60, angle = -.12) {
  const c = document.createElement('canvas'), d = Math.min(2, window.devicePixelRatio || 1); c.width = w * d; c.height = h * d; c.style.width = '100%'; c.style.aspectRatio = `${w}/${h}`;
  const x = c.getContext('2d'); x.setTransform(d, 0, 0, d, w / 2, h / 2); x.rotate(angle); const s = w / 140;
  x.globalAlpha = .45; x.drawImage(shadowSprite, -80 * s + 4, -30 * s + 7, 160 * s, 60 * s); x.globalAlpha = 1;
  x.drawImage(penSprites[i], -62 * s, -13 * s, 124 * s, 26 * s); return c;
}
function tableThumb(surfaceIdx, shape, w = 200, h = 130) {
  const c = document.createElement('canvas'), d = Math.min(2, window.devicePixelRatio || 1); c.width = w * d; c.height = h * d;
  const x = c.getContext('2d'); const t = makeTable(shape, true); const k = Math.min(w / (t.w + 80), h / (t.h + 80)) * d;
  x.setTransform(k, 0, 0, k, w * d / 2, h * d / 2); paintTable(x, t, SURFACES[surfaceIdx]); return c;
}
function updateHeader() {
  $('#coinCount').textContent = save.coins.toLocaleString();
  $('#levelNum').textContent = level();
  const frac = (save.xp % 100) / 100, C = 2 * Math.PI * 16;
  $('#xpRing').style.strokeDasharray = `${C * frac} ${C}`;
  $('#meAvatar').innerHTML = avatarHTML(profiles[0]);
}

/* ======================================================================
 * NAVIGATION
 * ==================================================================== */
let screen = 'home';
function go(id) {
  if (screen === 'play' && id !== 'play') game.leave();
  screen = id; document.body.dataset.screen = id;
  $$('.screen').forEach(s => { s.hidden = s.dataset.screen !== id; });
  $('#backBtn').hidden = id === 'home';
  document.title = id === 'home' ? 'Pen Clash Arena — the classroom pen fight, rebuilt' : `Pen Clash Arena — ${id[0].toUpperCase() + id.slice(1)}`;
  window.scrollTo(0, 0);
  if (id === 'home') demo.start(); else demo.stop();
  if (id === 'arsenal') renderArsenal();
  if (id === 'profile') renderProfile();
  if (id === 'settings') renderSettings();
  if (id === 'setup') renderSetup();
}
$('#backBtn').onclick = () => { Sfx.click(); go(screen === 'play' ? 'setup' : 'home'); };
$('#brandBtn').onclick = () => go('home');
$('#meBtn').onclick = () => go('profile');
$$('[data-go]').forEach(b => b.onclick = () => { Sfx.init(); Sfx.click(); go(b.dataset.go); });
document.addEventListener('pointerdown', () => Sfx.init(), { once: true });

/* ======================================================================
 * SETUP SCREEN
 * ==================================================================== */
let pendingMode = 'bot';
$('#playBot').onclick = () => { Sfx.init(); Sfx.click(); pendingMode = 'bot'; go('setup'); };
$('#playFriends').onclick = () => { Sfx.init(); Sfx.click(); pendingMode = 'local'; go('setup'); };
function segmented(el, items, current, onPick) {
  el.innerHTML = items.map(([v, label]) => `<button role="radio" aria-checked="${v == current}" class="${v == current ? 'on' : ''}" data-v="${v}">${label}</button>`).join('');
  el.querySelectorAll('button').forEach(b => b.onclick = () => { Sfx.click(); onPick(b.dataset.v); });
}
function shapePicker(el, big) {
  el.innerHTML = '';
  SHAPES.forEach(s => {
    const b = document.createElement('button'); b.className = 'shape' + (s.id === shapeId ? ' on' : ''); b.setAttribute('aria-pressed', s.id === shapeId);
    b.appendChild(tableThumb(save.wood, s.id, big ? 220 : 150, big ? 140 : 96));
    b.insertAdjacentHTML('beforeend', `<span><b>${s.name}</b>${big ? `<small>${s.note}</small>` : ''}</span>`);
    b.onclick = () => { Sfx.click(); shapeId = s.id; ls.put('penclash-shape', shapeId); $$('.shape-row').forEach(r => shapePicker(r, r.classList.contains('big'))); };
    el.appendChild(b);
  });
}
function renderSetup() {
  const bot = pendingMode === 'bot';
  $('#setupTitle').textContent = bot ? 'Play vs bots' : 'Play with friends';
  $('#setupLede').textContent = bot ? 'Knock every bot off the table. Last pen standing scores a point.' : 'Pass one phone or laptop around. Each player flicks on their turn.';
  $('#diffField').hidden = !bot;
  segmented($('#countSeg'), [[2, '2'], [3, '3'], [4, '4'], [5, '5']], settings.count, v => { settings.count = +v; persistSettings(); renderSetup(); });
  segmented($('#diffSeg'), Object.entries(DIFF).map(([k, d]) => [k, d.name]), settings.difficulty, v => { settings.difficulty = v; persistSettings(); renderSetup(); });
  shapePicker($('#setupShapes'), false);
  $('#seatsLabel').textContent = bot ? 'Your pen' : 'Players';
  const seats = $('#seats'); seats.innerHTML = '';
  const n = bot ? 1 : settings.count;
  for (let i = 0; i < n; i++) {
    const p = profiles[i], penIdx = bot ? save.selected : (save.unlocked.includes(p.pen) ? p.pen : i % 3);
    const row = document.createElement('div'); row.className = 'seat'; row.style.setProperty('--seat', SEAT_COLORS[i]);
    row.innerHTML = `<span class="seat-av">${avatarHTML(p)}</span><span class="seat-name"><b>${esc(p.name)}</b><small>${PENS[penIdx].name} · ${PENS[penIdx].trait}</small></span>`;
    const thumb = penThumb(penIdx, 150, 34, 0); thumb.className = 'seat-pen'; row.appendChild(thumb);
    const btn = document.createElement('button'); btn.className = 'ghost small'; btn.textContent = 'Change';
    btn.onclick = () => {
      Sfx.click();
      if (bot) { go('arsenal'); return; }
      const list = save.unlocked.slice().sort((a, b) => a - b); const next = list[(list.indexOf(penIdx) + 1) % list.length];
      p.pen = next; persistProfiles(); renderSetup();
    };
    row.appendChild(btn);
    if (!bot) { const ed = document.createElement('button'); ed.className = 'ghost small'; ed.textContent = 'Edit'; ed.onclick = () => openEditor(i); row.appendChild(ed); }
    seats.appendChild(row);
  }
  $('#startSub').textContent = bot ? `${settings.count - 1} ${settings.count > 2 ? 'bots' : 'bot'} · ${DIFF[settings.difficulty].name} · first to five` : `${settings.count} players · first to five`;
}
$('#startMatch').onclick = () => { Sfx.init(); Sfx.click(); game.start(pendingMode); };

/* ======================================================================
 * ARSENAL
 * ==================================================================== */
$$('.tabs button').forEach(b => b.onclick = () => {
  Sfx.click(); $$('.tabs button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
  $$('.tab-panel').forEach(p => p.hidden = p.dataset.panel !== b.dataset.tab);
});
function statBar(label, v) { return `<div class="sbar s-${label.toLowerCase()}"><span>${label}</span><i><b style="width:${v}%"></b></i><em>${v}</em></div>`; }
function renderArsenal() {
  const grid = $('#penGrid'); grid.innerHTML = '';
  PENS.forEach((P, i) => {
    const own = save.unlocked.includes(i), on = save.selected === i;
    const card = document.createElement('article'); card.className = 'pen-card' + (on ? ' on' : '') + (own ? '' : ' locked');
    const art = document.createElement('div'); art.className = 'pen-art'; art.appendChild(penThumb(i, 280, 64, -.1));
    card.appendChild(art);
    card.insertAdjacentHTML('beforeend', `<div class="pen-info"><div class="pen-title"><h3>${P.name}</h3><span class="trait">${P.trait}</span></div><p>${P.desc}</p>${statBar('Accuracy', P.a)}${statBar('Power', P.p)}${statBar('Defense', P.d)}</div>`);
    const btn = document.createElement('button');
    if (on) { btn.className = 'ghost small'; btn.textContent = 'Equipped'; btn.disabled = true; }
    else if (own) { btn.className = 'cta small'; btn.innerHTML = '<span class="cta-text"><b>Equip</b></span>'; btn.onclick = () => { Sfx.click(); save.selected = i; persist(); renderArsenal(); toast(`${P.name} equipped`); }; }
    else {
      const short = P.cost - save.coins; btn.className = 'cta small buy' + (short > 0 ? ' poor' : '');
      btn.innerHTML = `<span class="cta-text"><b><span class="coin"></span>${P.cost}</b><small>${short > 0 ? `${short} more needed` : 'Unlock'}</small></span>`;
      btn.onclick = () => {
        if (save.coins < P.cost) { toast(`Win ${P.cost - save.coins} more coins to unlock ${P.name}`); return; }
        save.coins -= P.cost; save.unlocked.push(i); save.selected = i; persist(); Sfx.unlock(); updateHeader(); renderArsenal();
        toast(`${P.name} unlocked and equipped`); grid.children[i].classList.add('just');
      };
    }
    card.querySelector('.pen-info').appendChild(btn);
    grid.appendChild(card);
  });
  shapePicker($('#arsenalShapes'), true);
  const sg = $('#surfaceGrid'); sg.innerHTML = '';
  SURFACES.forEach((S, i) => {
    const b = document.createElement('button'); b.className = 'surface' + (save.wood === i ? ' on' : ''); b.setAttribute('aria-pressed', save.wood === i);
    b.appendChild(tableThumb(i, 'rounded', 200, 120)); b.insertAdjacentHTML('beforeend', `<span>${S.name}</span>`);
    b.onclick = () => { Sfx.click(); save.wood = i; persist(); renderArsenal(); };
    sg.appendChild(b);
  });
}

/* ======================================================================
 * PROFILE + EDITOR
 * ==================================================================== */
function renderProfile() {
  const p = profiles[0];
  $('#pAvatar').innerHTML = avatarHTML(p); $('#pName').textContent = p.name;
  $('#pLevel').textContent = `Level ${level()}`; $('#pXp').style.width = (save.xp % 100) + '%'; $('#pXpText').textContent = `${save.xp % 100} / 100 XP`;
  const rate = p.matches ? Math.round(p.wins / p.matches * 100) + '%' : '—';
  const stats = [['Matches', p.matches], ['Wins', p.wins], ['Win rate', rate], ['Rounds won', p.rounds], ['Knockouts', p.knockouts], ['Best streak', p.best], ['Current streak', p.streak], ['Pens owned', `${save.unlocked.length}/${PENS.length}`]];
  $('#statGrid').innerHTML = stats.map(([l, v]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
}
let edIdx = 0, edAvatar = '', edPhoto = '';
function openEditor(i = 0) {
  Sfx.click();
  $('#editSlot').innerHTML = profiles.map((p, k) => `<option value="${k}">Seat ${k + 1} — ${esc(p.name)}</option>`).join('');
  $('#editSlot').value = i; pickEditor(i); $('#editOverlay').hidden = false; $('#editName').focus();
}
function pickEditor(i) { edIdx = i; const p = profiles[i]; edAvatar = p.avatar; edPhoto = p.photo; $('#editName').value = p.name; drawAvatars(); }
function drawAvatars() {
  $('#avatarGrid').innerHTML = AVATARS.map(a => `<button class="${!edPhoto && edAvatar === a ? 'on' : ''}" data-a="${a}" aria-label="Avatar ${a}">${a}</button>`).join('') + (edPhoto ? `<button class="on photo"><img src="${edPhoto}" alt="Your photo"></button>` : '');
  $$('#avatarGrid [data-a]').forEach(b => b.onclick = () => { edAvatar = b.dataset.a; edPhoto = ''; drawAvatars(); });
}
$('#editProfile').onclick = () => openEditor(0);
$('#editSlot').onchange = e => pickEditor(+e.target.value);
$('#editCancel').onclick = () => { $('#editOverlay').hidden = true; };
$('#editOverlay').addEventListener('click', e => { if (e.target.id === 'editOverlay') $('#editOverlay').hidden = true; });
$('#editSave').onclick = () => {
  const p = profiles[edIdx]; p.name = $('#editName').value.trim().replace(/[<>]/g, '').slice(0, 16) || `Player ${edIdx + 1}`;
  p.avatar = edAvatar; p.photo = edPhoto; persistProfiles(); $('#editOverlay').hidden = true;
  updateHeader(); if (screen === 'profile') renderProfile(); if (screen === 'setup') renderSetup(); toast(`Saved ${p.name}`);
};
$('#editPhoto').onchange = async e => {
  const file = e.target.files && e.target.files[0]; e.target.value = ''; if (!file) return;
  if (!file.type.startsWith('image/')) { toast('Choose an image file'); return; }
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
    const c = document.createElement('canvas'); c.width = c.height = 128; const s = Math.min(img.width, img.height);
    c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 128, 128);
    edPhoto = c.toDataURL('image/jpeg', .72); URL.revokeObjectURL(url); drawAvatars();
  } catch (err) { toast("That image couldn't be read. Try a JPG or PNG."); }
};
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('#editOverlay').hidden) $('#editOverlay').hidden = true;
  else if (screen === 'play') game.togglePause();
});

/* ======================================================================
 * SETTINGS
 * ==================================================================== */
function renderSettings() {
  $('#sSound').checked = settings.sound; $('#sVolume').value = settings.volume; $('#sShake').checked = settings.shake; $('#sSaver').checked = settings.saver;
  $('#resetBtn').textContent = 'Reset'; $('#resetBtn').dataset.armed = '';
}
$('#sSound').onchange = e => { settings.sound = e.target.checked; persistSettings(); if (settings.sound) { Sfx.init(); Sfx.click(); } };
$('#sVolume').oninput = e => { settings.volume = +e.target.value; persistSettings(); Sfx.setVolume(); };
$('#sVolume').onchange = () => Sfx.click();
$('#sShake').onchange = e => { settings.shake = e.target.checked; persistSettings(); };
$('#sSaver').onchange = e => { settings.saver = e.target.checked; persistSettings(); };
$('#resetBtn').onclick = e => {
  const b = e.currentTarget;
  if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again to confirm'; return; }
  Object.assign(save, { coins: 0, xp: 0, wins: 0, unlocked: [0, 1, 2], selected: 0, wood: 0 }); persist();
  profiles.forEach((p, i) => Object.assign(p, defaultProfile(i))); persistProfiles();
  updateHeader(); renderSettings(); toast('Progress reset');
};

/* ======================================================================
 * HOME DEMO — a live bot match playing on the home screen
 * ==================================================================== */
const demo = (() => {
  const view = new View($('#demoCanvas'), { margin: 30, demo: true });
  let W = null, running = false, raf = 0, last = 0, wait = 1, acc = 0, idx = 0;
  function reset() {
    const r = view.c.getBoundingClientRect(), t = makeTable('rounded', r.width >= r.height * .9);
    const n = 3, spots = spawnSpots(t, n);
    W = { t, shooter: -1, bodies: spots.map(([x, y, a], i) => makeBody(i, [0, 4, 3, 5, 1, 2][(i + idx) % 6], x, y, a)) };
    idx++; wait = 1.1; view.key = '';
  }
  function frame(now) {
    if (!running) return;
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
    if (!W) reset();
    view.fit(W.t);
    acc += dt; while (acc >= STEP) { const ev = []; stepWorld(W, STEP, ev); for (const e of ev) { if (e.type === 'hit') { view.burst(e.x, e.y, Math.min(16, e.j / 50), '#fff1c4', 220); view.ring(e.x, e.y); } else view.burst(e.body.x, e.body.y, 14, PENS[e.body.pen].tint, 300); } acc -= STEP; }
    if (isResting(W)) {
      wait -= dt;
      if (wait <= 0) {
        const alive = W.bodies.filter(b => b.alive);
        if (alive.length <= 1) reset();
        else {
          const s = alive[Math.floor(Math.random() * alive.length)];
          const plan = planShot(W, s.seat, 'normal', true); W.shooter = s.seat; launch(s, plan.ang, plan.pw * .9, Math.random() < .3 ? (Math.random() < .5 ? -1 : 1) : 0);
          wait = 1.4;
        }
      }
    }
    view.draw(W, dt);
    raf = requestAnimationFrame(frame);
  }
  return {
    start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    refit() { if (W) { const r = view.c.getBoundingClientRect(); const land = r.width >= r.height * .9; if (land !== W.t.landscape) reset(); view.key = ''; } },
  };
})();

/* ======================================================================
 * THE MATCH
 * ==================================================================== */
const game = (() => {
  const view = new View($('#gameCanvas'), { margin: 46 });
  const canvas = view.c;
  let mode = 'bot', players = [], W = null, turn = 0, roundNo = 1, phase = 'idle', paused = false;
  let drag = null, shotType = 0, botAim = null, botTimer = 0, shotTime = 0, raf = 0, last = 0, acc = 0, slowmo = 0, kosThisShot = [], running = false, matchEarn = null;

  function setCallout(html, ms = 1200, cls = '') {
    const c = $('#callout'); c.className = 'callout ' + cls; c.innerHTML = html; void c.offsetWidth; c.classList.add('show');
    clearTimeout(c._t); if (ms) c._t = setTimeout(() => c.classList.remove('show'), ms);
  }
  function landscapeFor() { const r = $('#stage').getBoundingClientRect(); return r.width >= r.height * .95; }
  function start(m) {
    mode = m; Sfx.init();
    const n = settings.count;
    players = Array.from({ length: n }, (_, i) => {
      const human = mode === 'local' || i === 0;
      const prof = human ? profiles[i] : null;
      let pen = human ? (mode === 'bot' ? save.selected : (save.unlocked.includes(prof.pen) ? prof.pen : i % 3)) : [0, 1, 2][(save.selected + i) % 3];
      return { seat: i, human, name: human ? prof.name : BOT_NAMES[(i - 1) % BOT_NAMES.length], prof, pen, points: 0, kos: 0, color: SEAT_COLORS[i] };
    });
    roundNo = 1; matchEarn = null; paused = false; $('.play').dataset.n = n;
    $('#pauseOverlay').hidden = true; $('#resultOverlay').hidden = true;
    go('play');
    requestAnimationFrame(() => { newRound(); loop(); });
  }
  function newRound() {
    const t = makeTable(shapeId, landscapeFor()), spots = spawnSpots(t, players.length);
    W = { t, shooter: -1, bodies: players.map((p, i) => makeBody(i, p.pen, ...spots[i])) };
    view.key = ''; view.fit(t); view.parts.length = 0; view.texts.length = 0;
    turn = (roundNo - 1) % players.length; phase = 'intro'; slowmo = 0;
    renderScores(); $('#roundTag').textContent = `Round ${roundNo}`;
    setCallout(`<small>Round ${roundNo}</small><b>${roundNo === 1 ? 'Clash!' : 'Go again'}</b>`, 1000);
    setTimeout(() => { if (phase === 'intro') beginTurn(); }, 900);
  }
  function current() { return players[turn]; }
  function body(seat) { return W.bodies[seat]; }
  function beginTurn() {
    phase = 'aim'; drag = null; botAim = null; setShot(0);
    const p = current(); renderScores();
    $('#turnDot').style.background = p.color;
    if (p.human) {
      $('#turnText').innerHTML = mode === 'bot' ? 'Your turn <span class="muted">— drag back anywhere, release to flick</span>' : `${esc(p.name)}'s turn <span class="muted">— drag back, release to flick</span>`;
      $('#shots').classList.remove('off');
    } else {
      $('#turnText').innerHTML = `${esc(p.name)} is aiming…`; $('#shots').classList.add('off');
      clearTimeout(botTimer);
      botTimer = setTimeout(() => {
        if (phase !== 'aim' || paused) return;
        const plan = planShot(W, p.seat, settings.difficulty, false);
        botAim = { ...plan, t: 0 };
      }, DIFF[settings.difficulty].think);
    }
  }
  function setShot(v) { shotType = v; $$('#shots button').forEach(b => { const on = +b.dataset.shot === v; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); }
  $$('#shots button').forEach(b => b.onclick = () => { if (phase === 'aim' && current().human) { Sfx.click(); setShot(+b.dataset.shot); } });

  function fire(seat, ang, pw, dr) {
    const b = body(seat), P = PENS[b.pen];
    if (players[seat].human) ang += randn() * (1 - P.a / 100) * .05; // small human wobble, steadier with accuracy
    W.shooter = seat; launch(b, ang, pw, dr);
    phase = 'moving'; shotTime = 0; kosThisShot = []; drag = null; botAim = null;
    Sfx.flick(pw); view.burst(b.x - Math.cos(ang) * 40, b.y - Math.sin(ang) * 40, 8 + pw * 10, 'rgba(255,240,200,.9)', 160, .35); view.bump(2 + pw * 3);
    $('#shots').classList.add('off');
    $('#turnText').innerHTML = `${esc(players[seat].name)} ${dr ? (dr < 0 ? 'curves left' : 'curves right') : 'flicks'}`;
  }
  function handleEvents(ev) {
    for (const e of ev) {
      if (e.type === 'hit') {
        const metal = PENS[e.a.pen].mat === 'metal' || PENS[e.b.pen].mat === 'metal';
        Sfx.hit(e.j, metal);
        view.burst(e.x, e.y, clamp(e.j / 40, 4, 26), metal ? '#e8f1ff' : '#fff1c4', 160 + e.j * .25);
        if (e.j > 260) view.ring(e.x, e.y, 'rgba(255,244,210,.9)', 50 + e.j / 12);
        view.bump(clamp(e.j / 120, 1, 10));
        if (e.j > 900) view.text(e.x, e.y - 28, 'Smash!', '#ffe08a', 24);
      } else if (e.type === 'ko') {
        const b = e.body, P = PENS[b.pen];
        Sfx.ko(); view.burst(b.x, b.y, 26, P.tint, 340, .8); view.ring(b.x, b.y, players[b.seat].color, 110); view.bump(9);
        const by = W.shooter, self = by === b.seat;
        view.text(clamp(b.x, -W.t.w / 2 + 80, W.t.w / 2 - 80), clamp(b.y, -W.t.h / 2 + 60, W.t.h / 2 - 60), self ? 'Self-KO' : 'Knockout', self ? '#ff9b8f' : '#ffffff', 30);
        if (!self && by >= 0) players[by].kos++;
        kosThisShot.push(b.seat);
        if (W.bodies.filter(x => x.alive).length <= 1) slowmo = 1.1; // final knockout plays in slow motion
      }
    }
  }
  function endShot() {
    const alive = W.bodies.filter(b => b.alive);
    if (alive.length <= 1) { endRound(alive[0]); return; }
    let n = turn; do { n = (n + 1) % players.length; } while (!W.bodies[n].alive);
    turn = n; beginTurn();
  }
  function endRound(winnerBody) {
    phase = 'roundEnd'; renderScores();
    if (!winnerBody) { setCallout('<small>Double knockout</small><b>No point</b>', 1500); setTimeout(() => { if (running) newRound(); }, 1600); return; }
    const p = players[winnerBody.seat]; p.points++;
    if (p.human) { p.prof.rounds++; }
    Sfx.point(); renderScores(true, winnerBody.seat);
    if (p.points >= 5) { setTimeout(() => endMatch(p), 900); setCallout(`<small>${esc(p.name)}</small><b>Match point taken</b>`, 900, 'win'); return; }
    setCallout(`<small>${esc(p.name)} scores</small><b>${p.points} – 5</b>`, 1400, 'win');
    roundNo++; setTimeout(() => { if (running && phase === 'roundEnd') newRound(); }, 1700);
  }
  function endMatch(winner) {
    phase = 'over';
    const youWin = mode === 'bot' ? winner.seat === 0 : true;
    const before = level();
    let coins = 0, xp = 0;
    if (mode === 'bot') {
      const base = { easy: 70, normal: 95, hard: 130 }[settings.difficulty];
      coins = (youWin ? base : 15) + players[0].kos * 5; xp = youWin ? 70 : 20;
      if (youWin) save.wins++;
    } else { coins = 40; xp = 30; }
    save.coins += coins; save.xp += xp; persist();
    players.forEach(p => {
      if (!p.human) return; const pr = p.prof; pr.matches++; pr.knockouts += p.kos;
      if (p === winner) { pr.wins++; pr.streak++; pr.best = Math.max(pr.best, pr.streak); } else pr.streak = 0;
    });
    persistProfiles(); updateHeader();
    youWin && mode === 'bot' || mode === 'local' ? Sfx.win() : Sfx.lose();
    $('#resultCrest').innerHTML = avatarHTML(winner.prof || { avatar: '🤖' }); $('#resultCrest').style.setProperty('--seat', winner.color);
    $('#resultTitle').textContent = mode === 'bot' ? (youWin ? 'You win the match' : `${winner.name} wins`) : `${winner.name} wins`;
    $('#resultSub').textContent = mode === 'bot' ? (youWin ? 'Five points. The table is yours.' : 'Close one. Run it back?') : 'First to five. Good game, everyone.';
    const order = players.slice().sort((a, b) => b.points - a.points || b.kos - a.kos);
    $('#standings').innerHTML = order.map(p => `<li style="--seat:${p.color}"><span class="st-dot"></span><b>${esc(p.name)}</b><span class="muted">${p.kos} KO</span><em>${p.points}</em></li>`).join('');
    const lvUp = level() > before;
    $('#rewards').innerHTML = `<span><span class="coin"></span>+${coins} coins</span><span>+${xp} XP</span>${lvUp ? `<span class="lv">Level ${level()} reached</span>` : ''}`;
    setTimeout(() => { $('#resultOverlay').hidden = false; if (youWin) confetti(); }, 300);
  }
  function confetti() {
    const cols = ['#9ff0c9', '#f5c451', '#ff8a7a', '#7cc4ff', '#ffffff'];
    for (let i = 0; i < (settings.saver ? 50 : 120); i++) view.parts.push({ x: rand(-W.t.w / 2, W.t.w / 2), y: rand(-W.t.h / 2 - 80, -W.t.h / 2), vx: rand(-60, 60), vy: rand(150, 420), life: rand(1.4, 2.6), max: 1, r: rand(2, 5), color: cols[i % 5] });
  }
  function renderScores(pop, popSeat) {
    $('#scores').innerHTML = players.map((p, i) => {
      const out = W && !W.bodies[i].alive, on = i === turn && (phase === 'aim' || phase === 'moving');
      return `<div class="chip${on ? ' on' : ''}${out ? ' out' : ''}${pop && popSeat === i ? ' pop' : ''}" style="--seat:${p.color}"><span class="chip-av">${avatarHTML(p.prof || { avatar: '🤖' })}</span><span class="chip-body"><b>${esc(p.name)}</b><span class="pips">${[0, 1, 2, 3, 4].map(k => `<i class="${k < p.points ? 'f' : ''}"></i>`).join('')}</span></span></div>`;
    }).join('');
  }

  // -------- input
  canvas.addEventListener('pointerdown', e => {
    if (paused || phase !== 'aim' || !current().human) return;
    Sfx.init(); drag = { sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, id: e.pointerId };
    canvas.setPointerCapture(e.pointerId); e.preventDefault();
  });
  canvas.addEventListener('pointermove', e => { if (drag && e.pointerId === drag.id) { drag.x = e.clientX; drag.y = e.clientY; } });
  const release = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const a = aimFromDrag(); drag = null;
    if (a && a.pw >= .08) fire(turn, a.ang, a.pw, shotType);
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => { drag = null; });
  const maxPull = () => Math.min(170, Math.max(110, Math.min(innerWidth, innerHeight) * .28)); // CSS px for full power
  function aimFromDrag() {
    if (!drag) return null; const dx = drag.sx - drag.x, dy = drag.sy - drag.y, d = Math.hypot(dx, dy);
    if (d < 10) return { ang: 0, pw: 0, d };
    return { ang: Math.atan2(dy, dx), pw: clamp(d / maxPull(), 0, 1), d };
  }
  function predict(b, ang, pw, dr, len) {
    const S = { t: W.t, shooter: -1, bodies: [{ ...b, trail: [], vx: 0, vy: 0, w: 0 }] }, s = S.bodies[0];
    launch(s, ang, pw, dr); const pts = [[s.x, s.y]]; let L = 0;
    for (let i = 0; i < 240 && L < len; i++) { const px = s.x, py = s.y; stepWorld(S, 1 / 60, null); L += Math.hypot(s.x - px, s.y - py); if (i % 2) pts.push([s.x, s.y]); if (!s.alive) { pts.push([s.x, s.y]); break; } }
    return { pts, out: !s.alive };
  }

  // -------- drawing overlays
  const extra = {
    ring(ctx, b) {
      if (!b.alive) return;
      const p = players[b.seat], active = b.seat === turn && phase === 'aim';
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
      ctx.beginPath(); ctx.roundRect(-66, -17, 132, 34, 17);
      if (active) { const k = .55 + Math.sin(performance.now() / 260) * .25; ctx.fillStyle = p.color + '22'; ctx.fill(); ctx.strokeStyle = p.color; ctx.globalAlpha = k; ctx.lineWidth = 2.5; ctx.stroke(); }
      else { ctx.strokeStyle = p.color; ctx.globalAlpha = .5; ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]); ctx.stroke(); }
      ctx.restore();
    },
    over(ctx) {
      // name tags
      const k = view.scale, fs = Math.max(11, 12 * (1 / Math.max(.55, k))) ;
      for (const b of W.bodies) {
        if (!b.alive) continue; const p = players[b.seat];
        ctx.font = `700 ${fs}px Manrope, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const label = p.name, w = ctx.measureText(label).width + fs * 1.6, h = fs * 1.7, y = b.y - Math.abs(Math.sin(b.a)) * 58 - 22 - h / 2;
        ctx.fillStyle = 'rgba(10,18,29,.78)'; ctx.beginPath(); ctx.roundRect(b.x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(b.x - w / 2 + fs * .75, y, fs * .28, 0, TAU); ctx.fill();
        ctx.fillStyle = '#eef3f1'; ctx.fillText(label, b.x + fs * .25, y + .5);
      }
      // aim guide
      let aim = null;
      if (phase === 'aim' && drag) { const a = aimFromDrag(); if (a && a.d >= 10) aim = { ...a, dr: shotType }; }
      if (phase === 'aim' && botAim) { botAim.t = Math.min(1, botAim.t + 1 / 40); aim = { ang: botAim.ang, pw: botAim.pw * easeOut(botAim.t), dr: botAim.dr }; if (botAim.t >= 1 && !botAim.fired) { botAim.fired = true; setTimeout(() => { if (phase === 'aim' && botAim && !paused) fire(turn, botAim.ang, botAim.pw, botAim.dr); }, 260); } }
      if (aim) {
        const b = body(turn), P = PENS[b.pen], p = players[turn];
        const len = 170 + P.a * 3.6;
        const pr = predict(b, aim.ang, Math.max(aim.pw, .05), aim.dr, len * (.45 + aim.pw * .55));
        ctx.fillStyle = pr.out ? '#ff8a7a' : '#ffffff';
        pr.pts.forEach((q, i) => { const f = 1 - i / pr.pts.length; ctx.globalAlpha = f * .85; ctx.beginPath(); ctx.arc(q[0], q[1], 2.2 + f * 2.4, 0, TAU); ctx.fill(); });
        ctx.globalAlpha = 1;
        if (pr.out) { const q = pr.pts[pr.pts.length - 1]; ctx.strokeStyle = '#ff8a7a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q[0] - 8, q[1] - 8); ctx.lineTo(q[0] + 8, q[1] + 8); ctx.moveTo(q[0] + 8, q[1] - 8); ctx.lineTo(q[0] - 8, q[1] + 8); ctx.stroke(); }
        // pull-back band + power arc
        const back = 30 + aim.pw * 90, bx = b.x - Math.cos(aim.ang) * back, by = b.y - Math.sin(aim.ang) * back;
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(bx, by, 9, 0, TAU); ctx.fill();
        ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(b.x, b.y, 78, -Math.PI / 2, Math.PI * 1.5); ctx.stroke();
        const hue = aim.pw > .85 ? '#ff8a7a' : aim.pw > .55 ? '#f5c451' : p.color;
        ctx.strokeStyle = hue; ctx.beginPath(); ctx.arc(b.x, b.y, 78, -Math.PI / 2, -Math.PI / 2 + aim.pw * TAU); ctx.stroke();
        const fs = Math.max(14, 15 / Math.max(.55, view.scale));
        ctx.font = `800 ${fs}px Unbounded, Manrope, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = hue; ctx.fillText(Math.round(aim.pw * 100) + '%', bx - Math.cos(aim.ang) * 26, by - Math.sin(aim.ang) * 26);
      }
    },
  };
  const easeOut = t => 1 - (1 - t) ** 3;

  // -------- loop
  function loop() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function frame(now) {
    if (!running) return;
    let dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
    if (W) {
      view.fit(W.t);
      const land = landscapeFor();
      if (land !== W.t.landscape && phase !== 'moving') rotateTable(land);
      let sim = paused ? 0 : dt;
      if (slowmo > 0) { slowmo -= dt; sim *= .3; }
      acc += sim;
      const ev = [];
      while (acc >= STEP) { stepWorld(W, STEP, ev); acc -= STEP; }
      if (ev.length) handleEvents(ev);
      if (phase === 'moving') {
        shotTime += sim;
        let speed = 0; for (const b of W.bodies) if (b.alive) speed += Math.hypot(b.vx, b.vy);
        Sfx.slide(speed);
        if ((shotTime > .3 && isResting(W)) || shotTime > 9) { for (const b of W.bodies) { b.vx = b.vy = b.w = 0; } Sfx.slide(0); endShot(); }
      }
      view.draw(W, paused ? 0 : dt, extra);
    }
    raf = requestAnimationFrame(frame);
  }
  function rotateTable(land) {
    const t = makeTable(shapeId, land);
    for (const b of W.bodies) { const x = b.x; b.x = b.y * (t.w / W.t.h); b.y = x * (t.h / W.t.w); b.a = Math.PI / 2 - b.a; }
    W.t = t; view.key = '';
  }
  function togglePause(force) {
    if (phase === 'over') return;
    paused = force !== undefined ? force : !paused;
    $('#pauseOverlay').hidden = !paused; $('#soundQuick').textContent = `Sound: ${settings.sound ? 'on' : 'off'}`;
    if (paused) { drag = null; Sfx.slide(0); }
    else if (phase === 'aim' && !current().human && !botAim) beginTurn();
  }
  $('#pauseBtn').onclick = () => { Sfx.click(); togglePause(true); };
  $('#resumeBtn').onclick = () => { Sfx.click(); togglePause(false); };
  $('#restartBtn').onclick = () => { Sfx.click(); start(mode); };
  $('#rematchBtn').onclick = () => { Sfx.click(); start(mode); };
  $('#quitBtn').onclick = () => { Sfx.click(); go('home'); };
  $('#menuBtn').onclick = () => { Sfx.click(); go('home'); };
  $('#soundQuick').onclick = () => { settings.sound = !settings.sound; persistSettings(); if (settings.sound) Sfx.init(); else Sfx.slide(0); $('#soundQuick').textContent = `Sound: ${settings.sound ? 'on' : 'off'}`; };
  document.addEventListener('visibilitychange', () => { if (document.hidden && screen === 'play' && phase !== 'over') togglePause(true); });

  return {
    start, togglePause,
    leave() { running = false; cancelAnimationFrame(raf); clearTimeout(botTimer); paused = false; phase = 'idle'; $('#pauseOverlay').hidden = true; $('#resultOverlay').hidden = true; Sfx.slide(0); },
    refit() { view.key = ''; },
    _debug: () => ({ W, players, phase, turn, fire: (a, p, d) => fire(turn, a, p, d) }),
  };
})();

/* ======================================================================
 * BOOT
 * ==================================================================== */
buildSprites();
updateHeader();
window.addEventListener('resize', () => { demo.refit(); game.refit(); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { buildSprites(); });
go('home');
window.PenClash = { game, PENS, save };
})();
