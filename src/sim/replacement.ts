import type { GameEvent } from "./events";
import { overlapsRect, sweptHeadHits } from "./geometry";
import type { HeatZone } from "./hazards";
import { BURST_R, MALLET_R } from "./hits";
import type { BossSpec } from "./level";
import type { Snot } from "./snot";
import { BOSS_ID } from "./supervisor";
import type { HeroState, Point, Rect, Stage } from "./types";
import { KID_COMEBACKS, KID_LINES } from "../game/lines";

export type ReplacementState = "wait" | "edge" | "jab" | "swing" | "dark" | "film" | "hop" | "frozen" | "run" | "hide" | "out" | "open" | "hurt" | "down";
/** The drone camera of round two: on its orbit, hovering beside him, diving at where he stood, or down. `t` its state's clock. */
export type Drone = { x: number; y: number; state: "circle" | "hover" | "dive" | "down"; t: number; phase: number; tx: number; ty: number };
/** A hop between rows (or down off one): from, to, how far through, and what he does on landing. */
export type Hop = { x0: number; y0: number; x1: number; y1: number; t: number; then: ReplacementState; len: number };
/**
 * The replacement (story spec §11.1, the 2026-11-06 note): the kid in the quarter-zip, fifteen hits on one bar over three
 * rounds. `beam` the ring light's lit wedge on the floor: its middle `x`, the side `dir` of it he keeps to (away from Hammer),
 * the way `v` it sweeps, and `dark` the seconds he has left standing in the dark after the stand is turned. `stand` the ring
 * light's stand and its cooldown. `drone` round two's camera, `droneT` the wait for the next off the pad; `screen` round three's
 * video; `resT` the wait for the next resident, `nutsT` for the next nuts off the catering table. `firstHurt` once Hammer's
 * first hurt of the fight has played its recording; `said` his lines and Hammer's comebacks so far.
 */
export type Replacement = {
  kind: "replacement";
  x: number;
  y: number;
  vx: number;
  facing: 1 | -1;
  w: number;
  h: number;
  state: ReplacementState;
  hp: number;
  max: number;
  round: 1 | 2 | 3;
  timer: number;
  hurtT: number;
  awake: boolean;
  arena: [number, number];
  beam: { x: number; dir: 1 | -1; v: 1 | -1; dark: number };
  stand: { x: number; cd: number };
  drone: Drone | null;
  droneT: number;
  screen: { playing: boolean; cracks: 0 | 1 | 2 | 3 };
  resT: number;
  nutsT: number;
  firstHurt: boolean;
  said: string[];
  hop: Hop | null;
  /** Frozen with the birds round his head (the IFU's), not the lecture's stillness. */
  birds: boolean;
};

/**
 * His numbers. The beam: where it sweeps, how fast, how wide its wedge, its heat a second, how far a bonk on the stand turns
 * it, how long he stands in the dark, how soon the stand takes another bonk. The selfie stick on the briefcase's timing. The
 * rows he films from (their middles, their top), his place behind the lectern and where he staggers out to.
 */
export const REPLACEMENT = {
  hp: 15,
  rounds: { two: 10, three: 5 },
  notice: 900,
  w: 100,
  h: 330,
  beam: { x0: 2000, x1: 3200, speed: 160, w: 400, heat: 30, turn: 800, dark: 1.5, standCd: 2 },
  stick: { reach: 300, windup: 0.4, swing: 0.3, rest: 1.2 },
  walk: 220,
  hop: { px: 500, t: 0.35, near: 300, up: 160 },
  residents: { atOnce: 4, every: 3 },
  drone: { every: 6, hover: 0.5, dive: 700, r: 60, points: 300, relaunch: 10, side: 240, orbit: { cx: 1800, cy: -600, rx: 1300, ry: 250, period: 8 }, pad: { x: 3400, y: -60 } },
  freeze: 2.2,
  ifuFreeze: 1.5,
  screen: { x0: 2700, x1: 3400, cracks: 3, out: 2, heat: 30, rows: [2000, 2800], reach: 500 },
  nuts: 6,
  hurt: 0.5,
  stagger: 60,
  points: 5000,
  over: 4,
  stand: { x: 3250 },
  rows: { xs: [1050, 1550, 2050, 2550], y: -150 },
  hide: { x: 3100, out: 2860 },
} as const;
/** How far from the beam's middle he stands: just out of its light. */
export const EDGE = REPLACEMENT.beam.w / 2 + 60;

export const createReplacement = (b: BossSpec): Replacement => ({
  kind: "replacement",
  x: b.x,
  y: b.y ?? 0,
  vx: 0,
  facing: -1,
  w: REPLACEMENT.w,
  h: REPLACEMENT.h,
  state: "wait",
  hp: REPLACEMENT.hp,
  max: REPLACEMENT.hp,
  round: 1,
  timer: 0,
  hurtT: 0,
  awake: false,
  arena: b.arena,
  beam: { x: REPLACEMENT.beam.x1, dir: 1, v: -1, dark: 0 },
  stand: { x: REPLACEMENT.stand.x, cd: 0 },
  drone: null,
  droneT: 0,
  screen: { playing: false, cracks: 0 },
  resT: 0,
  nutsT: REPLACEMENT.nuts,
  firstHurt: false,
  said: [],
  hop: null,
  birds: false,
});

export const replacementRect = (r: Replacement): Rect => ({ x: r.x - r.w / 2, y: r.y - r.h, w: r.w, h: r.h });
export const droneRect = (d: Pick<Drone, "x" | "y">): Rect => ({ x: d.x - REPLACEMENT.drone.r, y: d.y - REPLACEMENT.drone.r, w: 2 * REPLACEMENT.drone.r, h: 2 * REPLACEMENT.drone.r });

/** The beam's light on the floor as a heat zone: lit while it shines (round one), its middle `x` and its width. */
export const beamZone = (r: Pick<Replacement, "beam">): HeatZone => ({ x0: r.beam.x - REPLACEMENT.beam.w / 2, x1: r.beam.x + REPLACEMENT.beam.w / 2, y: 0, rate: REPLACEMENT.beam.heat, kind: "beam" });
/** The ring light shines on the floor in round one only, once he is awake. */
export const beamOn = (r: Pick<Replacement, "awake" | "round" | "state">): boolean => r.awake && r.round === 1 && r.state !== "down";
/** The stand's reach for the mallet: the pole and the ring at its top. */
export const standRect = (r: Pick<Replacement, "stand">): Rect => ({ x: r.stand.x - 40, y: -420, w: 80, h: 420 });
/** The screen's glow heats the front rows and the floor before them while the video plays (round three). */
export const screenHeats = (r: Pick<Replacement, "screen" | "state">, h: Pick<HeroState, "x" | "y" | "onGround">): boolean =>
  r.screen.playing &&
  r.state !== "down" &&
  h.onGround &&
  h.x >= REPLACEMENT.screen.rows[0] &&
  h.x <= REPLACEMENT.screen.rows[1] &&
  (Math.abs(h.y) < 4 || Math.abs(h.y - REPLACEMENT.rows.y) < 4);

/** Where he goes once a stagger or a freeze is over: his round's own state. */
const settled = (r: Replacement): ReplacementState => (r.round === 1 ? "edge" : r.round === 2 ? "film" : r.screen.cracks < REPLACEMENT.screen.cracks ? "run" : "open");

/** A hop cut short lands him where it was going. */
function land(r: Replacement) {
  if (!r.hop) return;
  r.x = r.hop.x1;
  r.y = r.hop.y1;
  r.hop = null;
}

/**
 * A hit on him, from anywhere: none while he runs, hides, staggers or is down, nor before he is up. Each one staggers him back
 * 60 px for half a second; Hammer has his say on a round's first. At none he is down, "They need to get fired" plays and two
 * residents carry him out. The rounds turn on his step, whatever landed the hit.
 */
export function hitReplacement(r: Replacement, by: "bonk" | "snot", events: GameEvent[]): boolean {
  if (!r.awake || r.state === "hide" || r.state === "run" || r.state === "hurt" || r.state === "down") return false;
  land(r);
  r.hp = Math.max(0, r.hp - 1);
  events.push({ type: "bossHit", by, x: r.x, y: r.y - r.h * 0.6, hp: r.hp });
  const comeback = r.round === 2 ? KID_COMEBACKS.two : r.round === 3 ? KID_COMEBACKS.three : null;
  if (comeback && !r.said.includes(comeback)) {
    r.said.push(comeback);
    events.push({ type: "think", text: comeback, seconds: 1.8 });
  }
  if (r.hp === 0) {
    r.state = "down";
    r.timer = 0;
    r.vx = 0;
    r.y = 0;
    if (r.drone) r.drone.state = "down";
    events.push({ type: "bossDown", x: r.x, y: r.y - r.h, points: REPLACEMENT.points });
    events.push({ type: "voiceLine", id: "fired" });
    events.push({ type: "carryOut", x: r.x, y: r.y });
    return true;
  }
  r.state = "hurt";
  r.timer = REPLACEMENT.hurt;
  r.hurtT = REPLACEMENT.hurt;
  r.vx = 0;
  r.x = Math.max(r.arena[0], Math.min(r.arena[1], r.x - r.facing * REPLACEMENT.stagger));
  return true;
}

/** The room's freeze on him (the lecture's, or the IFU's with the birds): still and hittable, then his round again. */
export function freezeReplacement(r: Replacement, seconds: number, birds: boolean, events: GameEvent[]): boolean {
  if (!r.awake || r.state === "hide" || r.state === "hurt" || r.state === "down") return false;
  land(r);
  r.state = "frozen";
  r.timer = seconds;
  r.vx = 0;
  r.birds = birds;
  events.push({ type: "bossFreeze", birds, seconds, x: r.x, y: r.y - r.h });
  return true;
}

export type ReplacementWorld = { hero: HeroState; stage: Stage; swing: Point[]; hits: number[]; time: number; snot: Snot[] };

const inFront = (r: Replacement, h: HeroState, reach: number) => (h.x - r.x) * r.facing >= -20 && Math.abs(h.x - r.x) <= reach && Math.abs(h.y - r.y) < r.h;
const faceHim = (r: Replacement, h: HeroState) => {
  r.facing = h.x >= r.x ? 1 : -1;
};
const clampArena = (r: Replacement, x: number) => Math.max(r.arena[0], Math.min(r.arena[1], x));

/** The beam's sweep: across the front of the room and back, at its own pace. */
function sweep(r: Replacement, dt: number) {
  const b = REPLACEMENT.beam;
  r.beam.x += r.beam.v * b.speed * dt;
  if (r.beam.x >= b.x1) {
    r.beam.x = b.x1;
    r.beam.v = -1;
  } else if (r.beam.x <= b.x0) {
    r.beam.x = b.x0;
    r.beam.v = 1;
  }
}

/**
 * A bonk on the stand turns the light a quarter turn: its wedge jumps the turn's length toward the end of its sweep with more
 * room (so it always moves well away), and sweeps on that way; he is left standing in the dark, on whichever side of it he is.
 */
function turnBeam(r: Replacement, events: GameEvent[]) {
  const b = REPLACEMENT.beam;
  const way: 1 | -1 = r.beam.x - b.x0 > b.x1 - r.beam.x ? -1 : 1;
  r.beam.x = Math.max(b.x0, Math.min(b.x1, r.beam.x + way * b.turn));
  r.beam.v = way;
  r.beam.dir = r.x >= r.beam.x ? 1 : -1;
  r.beam.dark = b.dark;
  r.stand.cd = b.standCd;
  r.state = "dark";
  r.timer = b.dark;
  r.vx = 0;
  events.push({ type: "beamTurn", x: r.beam.x });
}

/**
 * Round one: the beam sweeps; he keeps to its far edge from Hammer (crossing through its light, hurrying, once Hammer is past
 * him) and jabs with the selfie stick when Hammer is in reach; between jabs he rests. In the dark he stands, hittable.
 */
function stepOne(r: Replacement, w: ReplacementWorld, dt: number, events: GameEvent[]) {
  const h = w.hero;
  const s = REPLACEMENT.stick;
  if (r.state === "dark") {
    r.beam.dark = Math.max(0, r.beam.dark - dt);
    faceHim(r, h);
    if (r.timer <= 0) r.state = "edge";
    return;
  }
  if (r.state === "jab") {
    if (r.timer > 0) return;
    r.state = "swing";
    r.timer = s.swing;
    events.push({ type: "castAttack", id: BOSS_ID, role: "office", x: r.x, y: r.y - r.h * 0.5 });
    if (inFront(r, h, s.reach) && h.invuln <= 0 && h.move?.kind !== "tumble") w.hits.push(r.x === h.x ? r.x + r.facing : r.x);
    return;
  }
  if (r.state === "swing") {
    if (r.timer > 0) return;
    r.state = "edge";
    r.timer = s.rest;
    return;
  }
  // Keeping to the far edge: Hammer past his spot sends him round to the other side of the light.
  if ((h.x - r.beam.x) * r.beam.dir > EDGE) r.beam.dir = r.beam.dir === 1 ? -1 : 1;
  const want = clampArena(r, r.beam.x + EDGE * r.beam.dir);
  const most = REPLACEMENT.walk * 2 * dt;
  const step = Math.max(-most, Math.min(most, want - r.x));
  r.vx = step / dt;
  r.x += step;
  faceHim(r, h);
  if (r.timer > 0) return;
  if (Math.abs(h.x - r.x) <= s.reach && Math.abs(h.y - r.y) < r.h) {
    r.state = "jab";
    r.timer = s.windup;
    r.vx = 0;
    events.push({ type: "bossWindup", x: r.x, y: r.y - r.h });
  }
}

/** A hop to (`x`, `y`) in the hop's time, landing in `then`. */
function hopTo(r: Replacement, x: number, y: number, then: ReplacementState) {
  const x1 = clampArena(r, x);
  // A row's hop takes its time; a longer one (over him, to the far row) as long as it needs at a hop's pace.
  r.hop = { x0: r.x, y0: r.y, x1, y1: y, t: 0, then, len: REPLACEMENT.hop.t * Math.max(1, Math.abs(x1 - r.x) / REPLACEMENT.hop.px) };
  r.state = "hop";
  r.vx = 0;
}

/** The hop's arc: the straight line between its ends, lifted at its middle. */
function stepHop(r: Replacement, dt: number) {
  const p = r.hop;
  if (!p) {
    r.state = settled(r);
    return;
  }
  p.t = Math.min(1, p.t + dt / p.len);
  r.vx = (p.x1 - p.x0) / p.len;
  r.x = p.x0 + (p.x1 - p.x0) * p.t;
  r.y = p.y0 + (p.y1 - p.y0) * p.t - REPLACEMENT.hop.up * 4 * p.t * (1 - p.t);
  if (p.t < 1) return;
  r.state = p.then;
  r.vx = 0;
  r.hop = null;
}

/** His lines by turns, one as each hop begins. */
function sayNext(r: Replacement, events: GameEvent[]) {
  const said = r.said.filter((s) => (KID_LINES as readonly string[]).includes(s)).length;
  const text = KID_LINES[said % KID_LINES.length];
  r.said.push(text);
  events.push({ type: "bossSay", text, seconds: 1.8 });
}

/**
 * Round two (and three's open): filming where he stands, facing him; once Hammer is within reach he hops onto the next seat row
 * away from him, or over him to the farthest when there is none that way.
 */
function stepFilm(r: Replacement, w: ReplacementWorld, events: GameEvent[]) {
  const h = w.hero;
  const rows = REPLACEMENT.rows;
  faceHim(r, h);
  if (Math.abs(h.x - r.x) > REPLACEMENT.hop.near) return;
  const away: 1 | -1 = r.x >= h.x ? 1 : -1;
  const next = rows.xs.filter((x) => (x - r.x) * away > 2).sort((a, b) => Math.abs(a - r.x) - Math.abs(b - r.x))[0];
  const far = [...rows.xs].sort((a, b) => Math.abs(b - h.x) - Math.abs(a - h.x))[0];
  sayNext(r, events);
  hopTo(r, next ?? far, rows.y, r.state);
}

/** Round three: down off the row, to the lectern at a walk, and behind it; the video starts as he gets there. */
function stepRun(r: Replacement, dt: number, events: GameEvent[]) {
  if (r.y < -1) {
    hopTo(r, r.x, 0, "run");
    return;
  }
  const want = REPLACEMENT.hide.x;
  const most = REPLACEMENT.walk * dt;
  const step = Math.max(-most, Math.min(most, want - r.x));
  r.vx = step / dt;
  r.x += step;
  r.facing = step < 0 ? -1 : step > 0 ? 1 : r.facing;
  if (Math.abs(want - r.x) > 1) return;
  r.state = "hide";
  r.vx = 0;
  r.facing = -1;
  if (!r.screen.playing && r.screen.cracks < REPLACEMENT.screen.cracks) {
    r.screen.playing = true;
    events.push({ type: "screenPlay", x: (REPLACEMENT.screen.x0 + REPLACEMENT.screen.x1) / 2 });
  }
}

/** A full smash near the screen while it plays: a crack; he staggers out from behind the lectern, or with the third it goes dark and he has nowhere to hide. */
function crackScreen(r: Replacement, events: GameEvent[]) {
  const s = REPLACEMENT.screen;
  r.screen.cracks = Math.min(s.cracks, r.screen.cracks + 1) as 0 | 1 | 2 | 3;
  events.push({ type: "screenCrack", n: r.screen.cracks, x: (s.x0 + s.x1) / 2 });
  land(r);
  r.y = 0;
  if (r.screen.cracks >= s.cracks) {
    r.screen.playing = false;
    events.push({ type: "screenDark", x: (s.x0 + s.x1) / 2 });
    r.state = "open";
    r.timer = 0;
    return;
  }
  r.state = "out";
  r.timer = s.out;
  r.x = REPLACEMENT.hide.out;
  r.facing = -1;
}

/** Round two's camera: its orbit round the hall, then over to him, a half-second's hover beside him, the dive at where he stood. A snot brings it down. */
function stepDrone(r: Replacement, w: ReplacementWorld, dt: number, events: GameEvent[]) {
  const D = REPLACEMENT.drone;
  const h = w.hero;
  const d = r.drone;
  if (!d || d.state === "down") {
    if (r.round !== 2) return;
    r.droneT -= dt;
    if (r.droneT > 0 && d) return;
    // A new one lifts off the pad.
    r.drone = { x: D.pad.x, y: D.pad.y, state: "circle", t: D.every, phase: 0, tx: 0, ty: 0 };
    return;
  }
  for (const s of w.snot) {
    if (s.life <= 0 || !sweptHeadHits({ x: s.x - s.vx * dt, y: s.y - s.vy * dt }, s, 14, droneRect(d))) continue;
    s.life = 0;
    d.state = "down";
    r.droneT = D.relaunch;
    events.push({ type: "droneDown", x: d.x, y: d.y, points: D.points });
    events.push({ type: "think", text: "FOOTAGE.", seconds: 1.8 });
    return;
  }
  const toward = (x: number, y: number) => {
    const dx = x - d.x;
    const dy = y - d.y;
    const len = Math.hypot(dx, dy);
    const most = D.dive * dt;
    if (len <= most) {
      d.x = x;
      d.y = y;
      return true;
    }
    d.x += (dx / len) * most;
    d.y += (dy / len) * most;
    return false;
  };
  if (d.state === "circle") {
    d.phase = (d.phase + dt / D.orbit.period) % 1;
    toward(D.orbit.cx + D.orbit.rx * Math.cos(2 * Math.PI * d.phase), D.orbit.cy + D.orbit.ry * Math.sin(2 * Math.PI * d.phase));
    d.t -= dt;
    if (d.t > 0) return;
    d.state = "hover";
    d.t = D.hover;
    d.tx = 0;
    return;
  }
  // Beside him at his nose's height, on the side it came from: a snot straight out reaches it.
  const side = d.x >= h.x ? 1 : -1;
  if (d.state === "hover") {
    const there = toward(h.x + side * D.side, h.y - h.h * 0.85);
    if (!there) return;
    if (d.tx === 0) {
      d.tx = 1;
      events.push({ type: "droneHover", x: d.x, y: d.y });
    }
    d.t -= dt;
    if (d.t > 0) return;
    d.state = "dive";
    d.tx = h.x;
    d.ty = h.y - h.h / 2;
    events.push({ type: "droneDive", x: d.x, y: d.y });
    return;
  }
  const arrived = toward(d.tx, d.ty);
  const body = { x: h.x - h.w / 2 - D.r, y: h.y - h.h - D.r, w: h.w + 2 * D.r, h: h.h + 2 * D.r };
  const hit = overlapsRect(droneRect({ x: d.x, y: d.y }), body) && Math.hypot(d.x - h.x, d.y - (h.y - h.h / 2)) <= h.h / 2 + D.r;
  if (hit && h.invuln <= 0 && h.move?.kind !== "tumble") w.hits.push(d.x === h.x ? d.x + 1 : d.x);
  if (!arrived && !hit) return;
  d.state = "circle";
  d.t = D.every;
}

/** His step: waking as Hammer comes near, the mallet, the smash and the lecture, the rounds turning, then his round. */
export function stepReplacement(r: Replacement, w: ReplacementWorld, dt: number, events: GameEvent[]): void {
  r.hurtT = Math.max(0, r.hurtT - dt);
  r.stand.cd = Math.max(0, r.stand.cd - dt);
  r.timer -= dt;
  if (r.state === "down") return;
  const h = w.hero;
  if (!r.awake) {
    if (Math.abs(h.x - r.x) > REPLACEMENT.notice) return;
    // He wakes at the beam's far edge from Hammer, the light sweeping at him.
    r.awake = true;
    r.state = "edge";
    r.timer = 0;
    r.beam.dir = h.x < r.x ? 1 : -1;
    r.beam.v = r.beam.dir === 1 ? -1 : 1;
    r.beam.x = Math.max(REPLACEMENT.beam.x0, Math.min(REPLACEMENT.beam.x1, r.x - EDGE * r.beam.dir));
    faceHim(r, h);
  }
  const rect = replacementRect(r);
  const m = h.move;
  if (m?.kind === "swing" && !m.victims.includes(BOSS_ID))
    for (let k = 0; k < w.swing.length; k++) {
      if (!sweptHeadHits(w.swing[Math.max(0, k - 1)], w.swing[k], MALLET_R, rect)) continue;
      if (hitReplacement(r, "bonk", events)) m.victims.push(BOSS_ID);
      break;
    }
  const burst = events.find((e) => e.type === "burst") as Extract<GameEvent, { type: "burst" }> | undefined;
  if (burst && Math.hypot(r.x - burst.x, r.y - r.h / 2 - burst.y) <= BURST_R) hitReplacement(r, "bonk", events);
  if ((r.state as ReplacementState) === "down") return;
  const lecture = events.find((e) => e.type === "lecture") as Extract<GameEvent, { type: "lecture" }> | undefined;
  if (lecture && overlapsRect(lecture.reach, replacementRect(r))) freezeReplacement(r, REPLACEMENT.freeze, false, events);
  // The rounds turn on the hits, whatever landed them.
  if (r.round === 1 && r.hp <= REPLACEMENT.rounds.two) {
    r.round = 2;
    r.drone = { x: REPLACEMENT.drone.orbit.cx + REPLACEMENT.drone.orbit.rx, y: REPLACEMENT.drone.orbit.cy, state: "circle", t: REPLACEMENT.drone.every, phase: 0, tx: 0, ty: 0 };
    r.resT = 0;
    events.push({ type: "bossPhase", phase: 2, room: 0 });
    events.push({ type: "bossSay", text: "Like and subscribe.", seconds: 2 });
  } else if (r.round === 2 && r.hp <= REPLACEMENT.rounds.three) {
    r.round = 3;
    if (r.drone) r.drone.state = "down";
    r.nutsT = REPLACEMENT.nuts;
    land(r);
    r.state = "run";
    r.timer = 0;
    events.push({ type: "bossPhase", phase: 3, room: 0 });
  }
  if (r.round === 1 && r.stand.cd <= 0) {
    const st = standRect(r);
    if (w.swing.some((p) => p.x >= st.x && p.x <= st.x + st.w && p.y >= st.y && p.y <= st.y + st.h)) turnBeam(r, events);
  }
  if (beamOn(r)) sweep(r, dt);
  stepDrone(r, w, dt, events);
  // A crack is the step's whole news: he moves from his next.
  if (r.round === 3 && r.screen.playing && events.some((e) => e.type === "superStart") && Math.abs(h.x - (REPLACEMENT.screen.x0 + REPLACEMENT.screen.x1) / 2) <= REPLACEMENT.screen.reach) {
    crackScreen(r, events);
    return;
  }
  switch (r.state) {
    case "hurt":
    case "frozen":
      if (r.timer > 0) return;
      r.birds = false;
      r.state = settled(r);
      r.timer = 0;
      return;
    case "hop":
      stepHop(r, dt);
      return;
    case "film":
    case "open":
      stepFilm(r, w, events);
      return;
    case "run":
      stepRun(r, dt, events);
      return;
    case "hide":
      r.facing = -1;
      return;
    case "out":
      if (r.timer <= 0) r.state = "run";
      return;
    default:
      stepOne(r, w, dt, events);
  }
}
