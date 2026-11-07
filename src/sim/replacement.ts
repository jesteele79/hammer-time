import type { GameEvent } from "./events";
import { sweptHeadHits } from "./geometry";
import type { HeatZone } from "./hazards";
import { BURST_R, MALLET_R } from "./hits";
import type { BossSpec } from "./level";
import { BOSS_ID } from "./supervisor";
import type { HeroState, Point, Rect, Stage } from "./types";

export type ReplacementState = "wait" | "edge" | "jab" | "swing" | "dark" | "film" | "hop" | "frozen" | "run" | "hide" | "out" | "open" | "hurt" | "down";
/** The drone camera of round two: on its orbit, hovering over him, diving at where he stood, or down. */
export type Drone = { x: number; y: number; state: "circle" | "hover" | "dive" | "down"; t: number; phase: number; tx: number; ty: number };
/**
 * The replacement (story spec §11.1, the 2026-11-06 note): the kid in the quarter-zip, fifteen hits on one bar over three
 * rounds. `beam` the ring light's lit wedge on the floor: its middle `x`, the side `dir` of it he keeps to (away from Hammer),
 * the way `v` it sweeps, and `dark` the seconds he has left standing in the dark after the stand is turned. `stand` the ring
 * light's stand and its cooldown. `firstHurt` once Hammer's first hurt of the fight has played its recording.
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
};

/**
 * His numbers. The beam: where it sweeps, how fast, how wide its wedge, its heat a second, how far a bonk on the stand turns
 * it, how long he stands in the dark, how soon the stand takes another bonk. The selfie stick on the briefcase's timing.
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
  hop: { px: 500, t: 0.35, near: 300 },
  residents: { atOnce: 4, every: 3 },
  drone: { every: 6, hover: 0.5, dive: 700, r: 60, points: 300, relaunch: 10, orbit: { cx: 1800, cy: -600, rx: 1300, ry: 250, period: 8 } },
  freeze: 2.2,
  ifuFreeze: 1.5,
  screen: { x0: 2700, x1: 3400, cracks: 3, out: 2, heat: 30, rows: [2000, 2800] },
  nuts: 6,
  hurt: 0.5,
  stagger: 60,
  points: 5000,
  over: 4,
  stand: { x: 3250 },
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
});

export const replacementRect = (r: Replacement): Rect => ({ x: r.x - r.w / 2, y: r.y - r.h, w: r.w, h: r.h });

/** The beam's light on the floor as a heat zone: lit while it shines (round one), its middle `x` and its width. */
export const beamZone = (r: Pick<Replacement, "beam">): HeatZone => ({ x0: r.beam.x - REPLACEMENT.beam.w / 2, x1: r.beam.x + REPLACEMENT.beam.w / 2, y: 0, rate: REPLACEMENT.beam.heat, kind: "beam" });
/** The ring light shines on the floor in round one only, once he is awake. */
export const beamOn = (r: Pick<Replacement, "awake" | "round" | "state">): boolean => r.awake && r.round === 1 && r.state !== "down";
/** The stand's reach for the mallet: the pole and the ring at its top. */
export const standRect = (r: Pick<Replacement, "stand">): Rect => ({ x: r.stand.x - 40, y: -420, w: 80, h: 420 });

/**
 * A hit on him, from anywhere: none while he runs, hides, staggers or is down, nor before he is up. Each one staggers him back
 * 60 px for half a second; at ten round two begins, at five round three, at none he is down and "They need to get fired" plays.
 */
export function hitReplacement(r: Replacement, by: "bonk" | "snot", events: GameEvent[]): boolean {
  if (!r.awake || r.state === "hide" || r.state === "run" || r.state === "hurt" || r.state === "down") return false;
  r.hp = Math.max(0, r.hp - 1);
  events.push({ type: "bossHit", by, x: r.x, y: r.y - r.h * 0.6, hp: r.hp });
  if (r.hp === 0) {
    r.state = "down";
    r.timer = 0;
    r.vx = 0;
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
  if (r.hp === REPLACEMENT.rounds.two) {
    r.round = 2;
    events.push({ type: "bossPhase", phase: 2, room: 0 });
    events.push({ type: "bossSay", text: "Like and subscribe.", seconds: 2 });
  } else if (r.hp === REPLACEMENT.rounds.three) {
    r.round = 3;
    events.push({ type: "bossPhase", phase: 3, room: 0 });
    r.state = "run";
  }
  return true;
}

export type ReplacementWorld = { hero: HeroState; stage: Stage; swing: Point[]; hits: number[]; time: number };

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

/** His step: waking as Hammer comes near, the mallet, the smash and the stand, then his round. */
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
  if (beamOn(r)) sweep(r, dt);
  if (r.round === 1 && r.stand.cd <= 0) {
    const st = standRect(r);
    if (w.swing.some((p) => p.x >= st.x && p.x <= st.x + st.w && p.y >= st.y && p.y <= st.y + st.h)) turnBeam(r, events);
  }
  if (r.state === "hurt") {
    if (r.timer > 0) return;
    r.state = "edge";
    r.timer = 0;
    return;
  }
  stepOne(r, w, dt, events);
}
