import type { Graphics } from "pixi.js";
import type { Point } from "../sim/rig/skeleton";
import { PALETTE } from "./palette";

/**
 * Snot that lands (owner, 2026-10-18: "it needs to look gross like green snot dripping or hanging from the splattered
 * character or like snot on the floor"): a lumpy glob stuck where it hit someone, with strands that stretch down, let a
 * drip go and start again; and on the floor a flat, glossy splat with droplets round it that spreads out as it lands.
 * In the person's own frame (their drawn figure's px, y down): `r` a glob's size, plain and hot; `reach` how far off the
 * nearest joint one may sit (a face is on the head's); a strand's full lengths, how fast it stretches, the stub it starts
 * again from; four globs a person at most.
 */
export const GOO = {
  max: 4,
  r: 30,
  hotR: 36,
  reach: 60,
  len: [50, 120],
  grow: [30, 55],
  stub: 6,
  /** A strand hangs from the tip of a run of goo this far below the glob's middle, as shares of its size. */
  run: [0.9, 1.6],
  /** A splat on the floor, seen from the side: its depth as a share of its width; drawn this much bigger than where staff slip. */
  flat: 0.3,
  splatDraw: 1.4,
  /** A slimed person with no glob yet gets one on the chest after this long (the hit came while they were off screen). */
  late: 0.3,
  colors: {
    plain: { body: 0x9dbb2c, dark: 0x4f6b12, light: 0xdcef86 },
    // The pepper's: still snot, mustard-green, flecked with chili.
    hot: { body: 0xbcc221, dark: 0x66620e, light: 0xf2f08c },
  },
  chili: 0xe2412a,
} as const;

/** `top`: where it leaves the tip of its run, below the glob's middle; `len` how far it hangs from there. */
export type Strand = { dx: number; top: number; len: number; max: number; grow: number };
/** `ox` is kept in the way they faced when it hit, so it turns with them; `state` draws each new strand's length. */
export type Glob = { joint: string; ox: number; oy: number; r: number; hot: boolean; seed: number; state: number; age: number; strands: Strand[] };

/** The shipped generator (mulberry32) on a state the caller keeps. */
function next(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) >>> 0;
  let t = Math.imul(s ^ (s >>> 15), s | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}
function stream(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    const [v, n] = next(s);
    s = n;
    return v;
  };
}
const lerp = ([a, b]: readonly [number, number], t: number) => a + (b - a) * t;

/** The joints snot sticks to: the head, the chest and the hips, so a hit on a swinging arm sits on the body beside it. */
const STICKS = ["head", "chest", "pelvis"] as const;

/** Sticks a glob where the snot hit `at`: on the nearest of the head, chest and hips, no further off it than `reach`. */
export function stickGlob(joints: Partial<Record<string, Point>>, facing: 1 | -1, at: Point, hot: boolean, seed: number): Glob {
  let joint = "chest";
  let near: Point = { x: 0, y: 0 };
  let best = Infinity;
  for (const name of STICKS) {
    const p = joints[name];
    if (!p) continue;
    const d = Math.hypot(at.x - p.x, at.y - p.y);
    if (d < best) [joint, near, best] = [name, p, d];
  }
  const dx = at.x - near.x;
  const dy = at.y - near.y;
  const k = best > GOO.reach ? GOO.reach / best : 1;
  const r = hot ? GOO.hotR : GOO.r;
  const rand = stream(seed * 7919 + 13);
  const n = rand() < 0.5 ? 2 : 3;
  const strands: Strand[] = [];
  for (let i = 0; i < n; i++)
    strands.push({
      dx: (-0.55 + (1.1 * (i + 0.5)) / n + (rand() - 0.5) * 0.2) * r,
      top: lerp(GOO.run, rand()) * r,
      len: GOO.stub * (0.4 + 0.6 * rand()),
      max: lerp(GOO.len, rand()),
      grow: lerp(GOO.grow, rand()),
    });
  return { joint, ox: dx * k * facing, oy: dy * k, r, hot, seed, state: seed * 31 + 7, age: 0, strands };
}

/** Where a glob sits on someone posed with these joints, facing this way. */
export function globPoint(g: Glob, joints: Partial<Record<string, Point>>, facing: 1 | -1): Point {
  const j = joints[g.joint] ?? { x: 0, y: 0 };
  return { x: j.x + g.ox * facing, y: j.y + g.oy };
}

/** A new glob on someone; past the most they carry, the oldest dries off. */
export function addGlob(list: Glob[], g: Glob): void {
  list.push(g);
  while (list.length > GOO.max) list.shift();
}

/**
 * Its strands stretch; one at its full length lets its drip go and starts again short, a new length drawn. `room` is how
 * far below the glob the floor is: a strand that reaches it lies there and never drips through. Returns the drips, from
 * the glob's middle.
 */
export function stepGlob(g: Glob, dt: number, room = Infinity): Point[] {
  g.age += dt;
  const out: Point[] = [];
  for (const s of g.strands) {
    const top = s.top;
    const floor = Math.max(0, room - top);
    s.len = Math.min(s.len + s.grow * dt, s.max, floor);
    if (s.len < s.max - 1e-9 || s.max > floor) continue;
    out.push({ x: s.dx, y: top + s.len });
    const [a, n1] = next(g.state);
    const [b, n2] = next(n1);
    g.state = n2;
    s.len = GOO.stub;
    s.max = lerp(GOO.len, a);
    s.grow = lerp(GOO.grow, b);
  }
  return out;
}

/** A glob's outline about its middle: lobes in and out round it, its lower half sagging, the same every frame for its seed. */
export function globOutline(r: number, seed: number, n = 10): Point[] {
  const rand = stream(seed * 104729 + 3);
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + (rand() - 0.5) * 0.4) / n) * Math.PI * 2;
    const k = i % 2 === 0 ? 1.05 + 0.2 * rand() : 0.68 + 0.14 * rand();
    const y = Math.sin(a) * r * k;
    out.push({ x: Math.cos(a) * r * k, y: y > 0 ? y * 1.3 : y });
  }
  return out;
}

/** The smaller gobs sprayed round a glob as it hit, about its middle, the same every frame for its seed. */
export function globSpatter(r: number, seed: number): (Point & { r: number })[] {
  const rand = stream(seed * 6151 + 29);
  const n = 3 + Math.floor(rand() * 3);
  const out: (Point & { r: number })[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + rand() * 0.7) / n) * Math.PI * 2;
    const d = r * (1.2 + rand() * 1.1);
    out.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: r * (0.14 + rand() * 0.26) });
  }
  return out;
}

/**
 * Snot on the floor about the floor line, for its seed: the lumpy rim of its skirt, the splash fingers thrown out of it
 * (`a` their way round, `len` how far, `w` how thick at the root), droplets all round, and the mound of goo in its
 * middle (`x` its middle, `w` its width, `h` how high it stands).
 */
export function splatShape(
  w: number,
  seed: number,
): { rim: Point[]; fingers: { a: number; len: number; w: number }[]; drops: (Point & { r: number })[]; mound: { x: number; w: number; h: number } } {
  const rand = stream(seed * 7907 + 11);
  const n = 12;
  const rx = w / 2;
  const ry = rx * GOO.flat;
  const rim: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + (rand() - 0.5) * 0.3) / n) * Math.PI * 2;
    const k = i % 2 === 0 ? 1 + 0.15 * rand() : 0.66 + 0.12 * rand();
    rim.push({ x: Math.cos(a) * rx * k, y: Math.sin(a) * ry * k });
  }
  const fingers: { a: number; len: number; w: number }[] = [];
  const nf = 3 + Math.floor(rand() * 4);
  for (let i = 0; i < nf; i++) fingers.push({ a: ((i + 0.2 + rand() * 0.6) / nf) * Math.PI * 2, len: rx * (1.1 + rand() * 0.35), w: rx * (0.26 + rand() * 0.1) });
  const drops: (Point & { r: number })[] = [];
  const nd = 3 + Math.floor(rand() * 4);
  for (let i = 0; i < nd; i++) {
    // Round it in turn, so they land on both sides.
    const a = ((i + 0.15 + rand() * 0.7) / nd) * Math.PI * 2;
    const d = 1.25 + 0.45 * rand();
    drops.push({ x: Math.cos(a) * rx * d, y: Math.sin(a) * ry * d, r: 3 + 4 * rand() });
  }
  return { rim, fingers, drops, mound: { x: (rand() - 0.5) * rx * 0.3, w: w * (0.45 + rand() * 0.15), h: w * (0.13 + rand() * 0.05) } };
}

/** How far a splat has spread `age` seconds after it landed: out past its size, then back. */
export function splatGrow(age: number): number {
  if (age < 0.09) return 0.35 + (1.08 - 0.35) * (age / 0.09);
  if (age < 0.2) return 1.08 - (0.08 * (age - 0.09)) / 0.11;
  return 1;
}

const INK = PALETTE.outline;

/** A closed blob through `pts`: curves through the midpoints, each point pulling it out or in. */
function blob(g: Graphics, pts: Point[]): Graphics {
  const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const first = mid(pts[pts.length - 1], pts[0]);
  g.moveTo(first.x, first.y);
  pts.forEach((p, i) => {
    const m = mid(p, pts[(i + 1) % pts.length]);
    g.quadraticCurveTo(p.x, p.y, m.x, m.y);
  });
  return g.closePath();
}

/** A glob, its runs and the strands off them at `at` in `g`'s frame; `floor` is the y a strand stops at and pools on. */
export function drawGlob(g: Graphics, glob: Glob, at: Point, floor = Infinity): void {
  const c = glob.hot ? GOO.colors.hot : GOO.colors.plain;
  const r = glob.r;
  const gobs = globSpatter(r, glob.seed).map((p, i) => ({ x: at.x + p.x, y: at.y + p.y, r: p.r, i }));
  // A string sagging from the glob to the lowest gob beside it, swaying.
  const low = gobs.reduce((a, b) => (b.y > a.y ? b : a));
  const from = { x: at.x + Math.sign(low.x - at.x || 1) * r * 0.6, y: at.y + r * 0.4 };
  const sag = Math.max(from.y, low.y) + r * 0.9 + Math.sin(glob.age * 1.8) * r * 0.15;
  g.moveTo(from.x, from.y).quadraticCurveTo((from.x + low.x) / 2, sag, low.x, low.y).stroke({ width: 4.5, color: INK, alpha: 0.5 });
  g.moveTo(from.x, from.y).quadraticCurveTo((from.x + low.x) / 2, sag, low.x, low.y).stroke({ width: 3, color: c.body, alpha: 0.95 });
  // Each strand: its run of goo down off the glob's lower edge, thick and rounded, then the strand off its tip, pinched
  // thin above its drip.
  glob.strands.forEach((s, i) => {
    const x0 = at.x + s.dx;
    const w0 = r * 0.36;
    const tip = Math.min(at.y + s.top, floor);
    g.roundRect(x0 - w0 / 2, at.y, w0, tip - at.y, w0 / 2)
      .fill({ color: c.body, alpha: 0.88 })
      .stroke({ width: 2, color: INK, alpha: 0.55 });
    g.roundRect(x0 - w0 * 0.22, at.y + r * 0.2, w0 * 0.16, Math.max(0, tip - at.y - r * 0.35), w0 * 0.08).fill({ color: 0xffffff, alpha: 0.45 });
    if (tip >= floor - 0.5) return;
    const x1 = x0 + Math.sin(glob.age * 2.2 + i * 1.7) * 4 * (s.len / s.max);
    const y1 = Math.min(tip + s.len, floor);
    const w1 = w0 * 0.6;
    g.moveTo(x0 - w1 / 2, tip - 2)
      .quadraticCurveTo(x0 - w1 * 0.1, tip + (y1 - tip) * 0.45, x1 - 1.3, y1)
      .lineTo(x1 + 1.3, y1)
      .quadraticCurveTo(x0 + w1 * 0.1, tip + (y1 - tip) * 0.45, x0 + w1 / 2, tip - 2)
      .closePath()
      .fill({ color: c.body, alpha: 0.9 });
    if (y1 >= floor - 0.5) {
      g.ellipse(x1, floor, 8 + s.len / 6, 3).fill({ color: c.body, alpha: 0.9 });
      return;
    }
    // The drip about to go: a teardrop, narrow where the strand holds it.
    const bulb = 4 + s.len / 14;
    g.moveTo(x1 - 1.3, y1)
      .quadraticCurveTo(x1 - bulb * 1.15, y1 + bulb * 1.5, x1, y1 + bulb * 2.1)
      .quadraticCurveTo(x1 + bulb * 1.15, y1 + bulb * 1.5, x1 + 1.3, y1)
      .closePath()
      .fill({ color: c.body, alpha: 0.95 })
      .stroke({ width: 1.8, color: INK, alpha: 0.65 });
    g.ellipse(x1 - bulb * 0.3, y1 + bulb * 1.2, bulb * 0.22, bulb * 0.35).fill({ color: 0xffffff, alpha: 0.8 });
  });
  // The glob: see-through slime with a darker rim to its thickness, a lighter middle, bubbles and a wet shine.
  const pts = globOutline(r, glob.seed, 12).map((p) => ({ x: at.x + p.x, y: at.y + p.y }));
  blob(g, pts).fill({ color: c.dark, alpha: 0.8 }).stroke({ width: 2.5, color: INK, alpha: 0.8 });
  blob(
    g,
    pts.map((p) => ({ x: at.x + (p.x - at.x) * 0.8, y: at.y + (p.y - at.y) * 0.8 - 1.5 })),
  ).fill({ color: c.body, alpha: 0.82 });
  blob(
    g,
    pts.map((p) => ({ x: at.x - r * 0.1 + (p.x - at.x) * 0.45, y: at.y - r * 0.12 + (p.y - at.y) * 0.4 })),
  ).fill({ color: c.light, alpha: 0.5 });
  for (const b of gobs) {
    // Round, a little squashed: lobed at this size they read as leaves.
    g.ellipse(b.x, b.y, b.r, b.r * (0.78 + 0.12 * (b.i % 2))).fill({ color: c.body, alpha: 0.92 }).stroke({ width: 1.8, color: INK, alpha: 0.7 });
    g.circle(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.28).fill({ color: 0xffffff, alpha: 0.7 });
  }
  g.circle(at.x + r * 0.38, at.y + r * 0.2, r * 0.13).stroke({ width: 1.6, color: 0xffffff, alpha: 0.75 });
  g.circle(at.x + r * 0.1, at.y + r * 0.5, r * 0.08).stroke({ width: 1.3, color: 0xffffff, alpha: 0.65 });
  g.circle(at.x - r * 0.32, at.y + r * 0.28, r * 0.06).stroke({ width: 1.2, color: 0xffffff, alpha: 0.6 });
  if (glob.hot) chili(g, at, r * 0.6, r * 0.5, glob.seed);
  g.ellipse(at.x - r * 0.34, at.y - r * 0.42, r * 0.34, r * 0.14).fill({ color: 0xffffff, alpha: 0.85 });
  g.ellipse(at.x + r * 0.28, at.y - r * 0.5, r * 0.08, r * 0.05).fill({ color: 0xffffff, alpha: 0.75 });
}

/** The pepper's chili flecks in hot snot, scattered over `rx` by `ry` about `at`, the same every frame for its seed. */
function chili(g: Graphics, at: Point, rx: number, ry: number, seed: number): void {
  const rand = stream(seed * 3571 + 5);
  for (let i = 0; i < 5; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand());
    g.ellipse(at.x + Math.cos(a) * rx * d, at.y + Math.sin(a) * ry * d, 2.6, 1.8).fill({ color: GOO.chili, alpha: 0.9 });
  }
}

/** Snot on the floor about `g`'s origin (the floor line): fingers, skirt, droplets, the mound with its shine, strings as it lands. */
export function drawSplat(g: Graphics, w: number, seed: number, hot: boolean, age: number): void {
  const c = hot ? GOO.colors.hot : GOO.colors.plain;
  const k = splatGrow(age);
  const s = splatShape(w, seed);
  const flat = (x: number, y: number) => ({ x: x * k, y: y * GOO.flat * k });
  // Splash fingers: fat where they leave the skirt, pinched, then a round drop at the end. Seen from the side they lie
  // flat, but not so flat they turn to pins.
  const SIDE = 0.65;
  for (const f of s.fingers) {
    const ux = Math.cos(f.a);
    const uy = Math.sin(f.a);
    const root = flat(ux * w * 0.3, uy * w * 0.3);
    const neck = flat(ux * f.len * 0.8, uy * f.len * 0.8);
    const tip = flat(ux * f.len, uy * f.len);
    const half = (f.w / 2) * k;
    const nx = -uy * half;
    const ny = ux * half * SIDE;
    g.moveTo(root.x + nx, root.y + ny)
      .quadraticCurveTo(neck.x + nx * 0.25, neck.y + ny * 0.25, tip.x, tip.y)
      .quadraticCurveTo(neck.x - nx * 0.25, neck.y - ny * 0.25, root.x - nx, root.y - ny)
      .closePath()
      .fill({ color: c.body, alpha: 0.93 })
      .stroke({ width: 1.8, color: INK, alpha: 0.6 });
    g.ellipse(tip.x, tip.y, half * 0.9, half * 0.9 * SIDE).fill(c.body).stroke({ width: 1.8, color: INK, alpha: 0.65 });
    g.ellipse(tip.x - half * 0.3, tip.y - half * 0.2, half * 0.28, half * 0.18).fill({ color: 0xffffff, alpha: 0.6 });
  }
  const rim = s.rim.map((p) => ({ x: p.x * k, y: p.y * k }));
  blob(
    g,
    rim.map((p) => ({ x: p.x, y: p.y + 3 })),
  ).fill({ color: c.dark, alpha: 0.9 });
  blob(g, rim).fill({ color: c.body, alpha: 0.93 }).stroke({ width: 2.5, color: INK, alpha: 0.8 });
  for (const d of s.drops) {
    g.ellipse(d.x * k, d.y * k, d.r, d.r * 0.75).fill(c.body).stroke({ width: 1.5, color: INK, alpha: 0.7 });
    g.circle(d.x * k - d.r * 0.3, d.y * k - d.r * 0.25, d.r * 0.3).fill({ color: 0xffffff, alpha: 0.7 });
  }
  // The mound: the snot piled where it hit, standing up off the skirt.
  const m = s.mound;
  const mx = m.x * k;
  const mw = (m.w / 2) * k;
  const mh = m.h * Math.min(1, k);
  g.moveTo(mx - mw, 0)
    .bezierCurveTo(mx - mw * 0.9, -mh * 1.1, mx + mw * 0.7, -mh * 1.25, mx + mw, 0)
    .quadraticCurveTo(mx, mh * 0.35, mx - mw, 0)
    .closePath()
    .fill({ color: c.body, alpha: 0.97 })
    .stroke({ width: 2.5, color: INK, alpha: 0.8 });
  g.ellipse(mx + mw * 0.1, -mh * 0.25, mw * 0.6, mh * 0.35).fill({ color: c.light, alpha: 0.45 });
  if (hot) chili(g, { x: mx, y: -mh * 0.4 }, mw * 0.75, mh * 0.45, seed);
  g.ellipse(mx - mw * 0.35, -mh * 0.62, mw * 0.3, mh * 0.16).fill({ color: 0xffffff, alpha: 0.85 });
  g.circle(mx + mw * 0.45, -mh * 0.3, 2.6).stroke({ width: 1.3, color: 0xffffff, alpha: 0.7 });
  g.circle(-w * 0.32 * k, w * 0.04, 2.4).stroke({ width: 1.2, color: 0xffffff, alpha: 0.65 });
  g.ellipse(w * 0.22 * k, -w * 0.02, w * 0.06 * k, 2).fill({ color: 0xffffff, alpha: 0.7 });
  // Strings pulled up off it as it lands, stretching and snapping back.
  const STRINGS = 0.45;
  if (age < STRINGS) {
    const up = Math.sin((Math.PI * age) / STRINGS) * w * 0.4;
    for (const f of [-0.24, 0.2]) {
      const x = mx + f * w * k;
      g.moveTo(x - 5, -mh * 0.4)
        .quadraticCurveTo(x - 1, -mh - up * 0.5, x - 1.2, -mh - up)
        .lineTo(x + 1.2, -mh - up)
        .quadraticCurveTo(x + 1, -mh - up * 0.5, x + 5, -mh * 0.4)
        .closePath()
        .fill({ color: c.body, alpha: 0.92 });
      g.circle(x, -mh - up, 3 + up / 14).fill(c.body).stroke({ width: 1.3, color: INK, alpha: 0.6 });
    }
  }
}
