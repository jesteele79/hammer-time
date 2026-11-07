import { TITANIUM } from "./titanium";
import { REPLACEMENT } from "./replacement";
import { CHARGE_MAX, isIdleAct } from "./moves";
import { flies } from "./missiles";
import { ROLLING, hittable, npcRect, standing } from "./cast";
import { attacking } from "./cast-behavior";
import { overlapsRect } from "./geometry";
import { STEP } from "./constants";
import { emptyInput, type Input } from "./input";
import { stageOf, type Level } from "./level";
import { rowX } from "./levels/flight";
import { lectureReach } from "./moves";
import { floorAt } from "./physics";
import { zoneOn } from "./hazards";
import { PIG } from "./pig";
import type { HeroState } from "./types";
import type { World } from "./world";

/** How far ahead the scripted player looks for a gap, a wall or the landing. */
const LOOK = { gap: 220, wall: 260, landing: 200, pass: 300 } as const;
/** How far ahead it sees trouble: staff to bonk, a cart to jump, a plane to swat. */
const FIGHT = { staff: 420, cart: 520, plane: 300 } as const;
/** How far left of the pig's nearest reach he waits (his right edge just clear of it), and the reach of his swing and his snot. */
const PIG_FIGHT = { wait: 110, bonk: 200, snot: 900 } as const;

/**
 * A scripted player for the traversal test: run right, hop gaps and walls, slide the passes, and
 * at the stairs either hop onto the landing (the balcony route) or run on under it (the floor).
 * With a world it also fights what is in front of it.
 */
export function drive(level: Level, h: HeroState, route: "floor" | "balcony" | "climb" | "hall" | "flight" | "paris" | "train" | "basel" | "lab" | "replacement", world?: World): Input {
  const i = emptyInput();
  if (route === "climb") return climb(level, h, i, world);
  if (route === "hall") return hallway(level, h, i, world);
  if (route === "flight") return flying(level, h, i, world);
  if (route === "paris") return strolling(level, h, i, world);
  if (route === "train") return riding(level, h, i, world);
  if (route === "basel") return touring(level, h, i, world);
  if (route === "lab") return rounding(level, h, i, world);
  if (route === "replacement") return training(h, i, world);
  i.held.right = i.held.run = true;
  if (world && fightPig(world, h, i)) return i;
  if (world && fightTitanium(world, h, i)) return i;
  const stage = stageOf(level);
  const gap = h.onGround && floorAt(stage, h.x + LOOK.gap, h.y - 60) === null;
  const wall = level.solids.some((s) => s.x - h.x > 0 && s.x - h.x < LOOK.wall && s.y < h.y - 10 && s.y + s.h > h.y - 290);
  const landing =
    route === "balcony" && h.y === 0 && level.platforms.some((p) => (p.kind === "landing" || p.kind === "tray") && p.x0 - h.x > 0 && p.x0 - h.x < LOOK.landing);
  const pass = level.passes.some((p) => p.x - h.x > -p.w && p.x - h.x < LOOK.pass);
  if (world) fight(world, h, i);
  if (pass) i.held.down = true;
  if ((wall || gap || landing || i.pressed.jump) && h.onGround && !pass) i.held.jump = i.pressed.jump = true;
  else if (!h.onGround) i.held.jump = true;
  return i;
}

/** How near her the climber swings, and how close a cart on the flight comes before he jumps it. */
const BOSS_FIGHT = { bonk: 170, stand: 30, cart: 280 } as const;
/** How far ahead the climber sees a chute's gap, a cart or a wet floor, and how near the wall a flight's foot lies. */
const CLIMB = { gap: 45, cart: 240, slip: 90, foot: 245, towel: 85 } as const;

/**
 * The climber: across each landing to the wall, up the flight rising back over it. On an odd floor the flight's foot is by
 * the right wall, on an even one by the left; between floors he is on a flight, and carries on up. He jumps the chutes, the
 * carts and the wet floors in his way, and fights what is in front of him.
 */
function climb(level: Level, h: HeroState, i: Input, world?: World): Input {
  const every = level.floors?.every ?? 540;
  const k = Math.floor(-h.y / every + 0.001) + 1;
  const landing = Math.abs(h.y + (k - 1) * every) < 1.5;
  const odd = k % 2 === 1;
  const b = level.bounds;
  const toFoot = odd ? 1 : -1;
  // On a landing, to the flight's foot by the wall; past it, or on the flight, up it.
  const past = odd ? h.x >= b.x + b.w - CLIMB.foot : h.x <= b.x + CLIMB.foot;
  const lastFloor = !level.floor.some((f) => f.kind === "stairs" && Math.min(f.y0, f.y1) < h.y - 1);
  const dir: 1 | -1 = lastFloor ? (Math.sign((level.doors[0]?.x ?? h.x) - h.x) as 1 | -1) || 1 : ((landing && !past ? toFoot : -toFoot) as 1 | -1);
  i.held.run = true;
  i.held[dir > 0 ? "right" : "left"] = true;
  if (world) fight(world, h, i);
  const ahead = (x: number, within: number) => (x - h.x) * dir > 0 && Math.abs(x - h.x) < within;
  // The supervisor: up the flight between her carts, and at the top beside her bonk her when she waits.
  const boss = world?.boss;
  if (boss && boss.state !== "down" && boss.awake && Math.abs(h.y - boss.y) < 100 && Math.abs(boss.x - h.x) < 500) {
    // Past her, on the side her carts never roll, and facing her.
    const spot = boss.x - BOSS_FIGHT.bonk;
    i.held.left = i.held.right = i.held.run = false;
    if (h.x > spot + BOSS_FIGHT.stand) i.held.left = true;
    else if (h.x < spot - BOSS_FIGHT.stand) i.held.right = true;
    else if (h.facing < 0) i.held.right = true;
    else if (!h.move && boss.state === "waiting") i.held.hammer = i.pressed.hammer = true;
    return i;
  }
  const gap = level.chutes?.some((c) => Math.abs(c.y - h.y) < 10 && (dir > 0 ? c.x - h.x > -20 && c.x - h.x < CLIMB.gap : h.x - (c.x + c.w) > -20 && h.x - (c.x + c.w) < CLIMB.gap));
  const slip = level.slips?.some((s) => Math.abs(s.y - h.y) < 10 && ahead(s.x, CLIMB.slip));
  const cart = world?.movers.some((m) => (m.onSlope ? m.dir > 0 && Math.abs(m.y - h.y) < 200 && ahead(m.x, BOSS_FIGHT.cart) : Math.abs(m.y - h.y) < 10 && ahead(m.x, CLIMB.cart + m.w / 2)));
  if ((gap || slip || cart || i.pressed.jump) && h.onGround) i.held.jump = i.pressed.jump = true;
  else if (!h.onGround) i.held.jump = true;
  // Too hot to clear a gap at a walk: a towel on a clear stretch.
  else if (h.onGround && !h.move && h.heat >= CLIMB.towel) i.held.towel = i.pressed.towel = true;
  return i;
}

/** How the hall's player looks ahead: how near a cart it jumps, how near a door it sidesteps, how near someone it swings. */
const HALL_DRIVE = { cart: 150, door: 170, staff: 300, lane: 0.6, puddle: 110, key: 110 } as const;

/**
 * The hall's player: W down the middle, a jump over a cart coming across in front of it or the puddle, a sidestep to the
 * far side of a door that is opening, a swing at whoever stands in its lane, and at the end the mallet on 1417's reader.
 */
function hallway(level: Level, h: HeroState, i: Input, world?: World): Input {
  const key = level.keyDoor;
  if (key && h.x >= key.x - HALL_DRIVE.key) {
    if (!h.move) i.held.hammer = i.pressed.hammer = true;
    return i;
  }
  i.held.up = true;
  if (!world) return i;
  const ahead = (x: number, within: number) => x - h.x > -30 && x - h.x < within;
  // A door opening ahead: over to the far side until it is passed; back to the middle otherwise.
  const door = world.hallDoors.find((d) => d.phase !== "shut" && ahead(d.z * 100, HALL_DRIVE.door));
  const wanted = door ? -door.side * 0.8 : 0;
  if (h.lx < wanted - 0.1) i.held.right = true;
  else if (h.lx > wanted + 0.1) i.held.left = true;
  const cart = world.hallCarts.some((c) => c.live && ahead(c.z * 100, HALL_DRIVE.cart) && Math.abs(c.lx - h.lx) < 1.2);
  const wet = level.puddle && ahead(level.puddle.z0 * 100, HALL_DRIVE.puddle);
  if ((cart || wet) && h.onGround) i.held.jump = i.pressed.jump = true;
  else if (!h.onGround) i.held.jump = true;
  const staff = world.cast.some((n) => n.alive && hittable(n) && ahead(n.x, HALL_DRIVE.staff) && Math.abs(n.lx - h.lx) <= HALL_DRIVE.lane);
  if (staff && !h.move) i.held.hammer = i.pressed.hammer = true;
  return i;
}

/** How the Parisian day goes, in px: how near the desk he answers, the lift, a scooter, the waiter, the door. */
const STROLL = { desk: 200, lift: 16, jump: 240, top: -520, door: 30 } as const;
/**
 * The walker: ...Bonjour. at the desk, on through the gate to the lift, crouched up it, along the floor and down the back
 * stair, over the waiter and the scooters, and ↓ at the brasserie's door.
 */
function strolling(level: Level, h: HeroState, i: Input, w?: World): Input {
  const b = level.bonjour;
  const door = level.doors[0];
  i.held.right = i.held.run = true;
  if (!w || !b || !door) return i;
  if (!w.bonjourDone) {
    if (h.x >= b.x - STROLL.desk) {
      i.held.right = i.held.run = false;
      if (!h.move && h.onGround) i.held.lecture = i.pressed.lecture = true;
    }
    return i;
  }
  const lift = w.movers.find((m) => m.ride);
  if (lift && h.y > STROLL.top && h.x < b.wall.x + 900) {
    i.held.right = i.held.run = false;
    if (h.x < lift.x - STROLL.lift) i.held.right = true;
    else if (h.x > lift.x + STROLL.lift) i.held.left = true;
    else i.held.down = true;
    return i;
  }
  if (h.x >= door.x - STROLL.door && Math.abs(h.y - door.y) < 10) {
    i.held.right = i.held.run = false;
    if (h.onGround && !h.move) i.held.down = true;
    return i;
  }
  fight(w, h, i);
  const scooter = w.movers.some((m) => m.loop && m.live && m.x - h.x > -40 && m.x - h.x < STROLL.jump + 300);
  const waiter = w.cast.some((n) => n.trick === "tray" && n.alive && !n.out && n.x - h.x > 0 && n.x - h.x < STROLL.jump);
  if ((scooter || waiter || i.pressed.jump) && h.onGround) i.held.jump = i.pressed.jump = true;
  else if (!h.onGround) i.held.jump = true;
  return i;
}

/** How the walker looks ahead in Basel, in px: a bike coming, where he stops running for a counter, how near it he stands, and walks back from; how near a band's rank he ducks under its hole. */
const TOUR = { bike: 250, slow: 360, stand: 40, back: 55, band: 260 } as const;
/**
 * The walker: down the street to each errand in turn, still at its counter until it is done, over the bikes and the ramp's
 * face, the mallet at whoever is in his way, and in at the office door once the four are done.
 */
function touring(level: Level, h: HeroState, i: Input, w?: World): Input {
  i.held.right = i.held.run = true;
  if (!w) return i;
  const todo = (level.errands ?? []).find((e) => !w.errands.includes(e.id));
  if (todo) {
    const gap = todo.x - h.x;
    if (gap < TOUR.slow) i.held.run = false;
    if (Math.abs(gap) <= TOUR.stand) i.held.right = false;
    else if (gap < -TOUR.back) {
      i.held.right = false;
      i.held.left = true;
    }
  }
  // A pair of bikes: one jump clears both if it goes when the first is this near.
  const bike = w.movers.some((m) => m.loop && m.live && m.x - h.x > -40 && m.x - h.x < TOUR.bike && m.y > (m.base ?? 0) - 40);
  if (bike && h.onGround) {
    i.held.jump = i.pressed.jump = true;
    return i;
  }
  if (!h.onGround) i.held.jump = true;
  // A band marching at him: down, under its hole, until it has gone over.
  const band = w.parade?.bands.some((b) => b.state === "march" && b.x - h.x > -120 && b.x - h.x < TOUR.band);
  if (band && h.onGround) {
    i.held.down = true;
    i.held.run = false;
    return i;
  }
  if (fightMajor(w, h, i)) return i;
  const still = !i.held.right && !i.held.left;
  if (!still) fight(w, h, i);
  const wall = level.solids.some((s) => s.x - h.x > 0 && s.x - h.x < LOOK.wall && s.y < h.y - 10 && s.y + s.h > h.y - 290);
  if (((wall && !still) || i.pressed.jump) && h.onGround) i.held.jump = i.pressed.jump = true;
  else if (!h.onGround) i.held.jump = true;
  return i;
}

/** Where the walker stands to the drum major: off him, out from under the mace's landing, in the mallet's reach. */
const MAJOR_FIGHT = { stand: 150, near: 20 } as const;
/**
 * The drum major: a mallet's reach off him, clear of where the mace comes down, the mallet while it is up; under the ranks
 * as the street's bands. True while the fight has him.
 */
function fightMajor(w: World, h: HeroState, i: Input): boolean {
  const m = w.boss;
  if (m?.kind !== "major" || !m.awake || m.state === "down" || m.state === "handover") return false;
  i.held.run = false;
  i.held.right = i.held.left = false;
  const want = m.x - MAJOR_FIGHT.stand;
  if (h.x < want - MAJOR_FIGHT.near) i.held.right = true;
  else if (h.x > want + MAJOR_FIGHT.near) i.held.left = true;
  else if (h.facing < 0) i.held.right = true;
  if (m.state === "throw" && !h.move && h.onGround && h.facing > 0 && Math.abs(h.x - want) <= MAJOR_FIGHT.near * 2) i.held.hammer = i.pressed.hammer = true;
  return true;
}

/** How the trainee looks ahead in the office, in px: a gurney or an IV pole coming, the autoclave's vent, a sharps bin. */
const ROUND = { mover: 240, vent: 260, bin: 160 } as const;
/**
 * The trainee: down the corridor to the double doors, over the gurneys and the IV poles, waiting out the autoclave's vent,
 * off the counters with their bins, the mallet at whoever is in his way.
 */
function rounding(level: Level, h: HeroState, i: Input, w?: World): Input {
  i.held.right = i.held.run = true;
  if (!w) return i;
  const vent = level.heat?.find((z) => z.cycle && z.x0 - h.x > -20 && z.x0 - h.x < ROUND.vent);
  if (vent && h.onGround && h.x < vent.x0 && zoneOn(vent, w.time + 0.6)) {
    i.held.right = i.held.run = false;
    return i;
  }
  fight(w, h, i);
  const mover = w.movers.some((m) => !m.loop && !m.ride && Math.abs(m.x - h.x) < ROUND.mover + m.w / 2 && (m.x - h.x) * 1 > -m.w / 2 && Math.abs(m.y - h.y) < 40 && h.y > m.top.y + 8);
  const wall = level.solids.some((s) => s.x - h.x > 0 && s.x - h.x < LOOK.wall && s.y < h.y - 10 && s.y + s.h > h.y - 290);
  const crate = level.crates.some((c) => c.x - h.x > 0 && c.x - h.x < LOOK.wall && Math.abs(c.y - h.y) < 10);
  if ((mover || wall || crate || i.pressed.jump) && h.onGround) i.held.jump = i.pressed.jump = true;
  else if (!h.onGround) i.held.jump = true;
  // Off a counter before its bin.
  if (h.y < -60 && level.sharps?.some((s) => s.x - h.x > 0 && s.x - h.x < ROUND.bin)) i.held.down = true;
  return i;
}

/**
 * Where the trainer stands to the ring light's stand (its far side, out of the light's reach), how near the kid he swings, how
 * near a spot counts as there, how near the stand the light must have swung before he turns it (the kid then near him in the
 * dark), and how far inside the stick's reach he steps to draw its jab.
 */
const TRAIN_FIGHT = { stand: 170, bonk: 120, near: 20, beam: 2950, bait: 20 } as const;
/** In a move that keys cannot cut short: an idle act (the watch, the tap) gives way to anything. */
const busy = (h: HeroState) => !!h.move && !isIdleAct(h.move);
/** The training room: in from the doors until the kid is up, then the fight. */
function training(h: HeroState, i: Input, w?: World): Input {
  if (w && fightReplacement(w, h, i)) return i;
  i.held.right = i.held.run = true;
  return i;
}
/**
 * The replacement, round one: past the kid in the stick's rest (stepping into its reach to draw the jab, out again as it comes),
 * to the stand's far side, a bonk on it once the light has swung near, at the kid while he stands in the dark, and back out.
 * True while the fight has him.
 */
function fightReplacement(w: World, h: HeroState, i: Input): boolean {
  const r = w.boss;
  if (r?.kind !== "replacement" || !r.awake || r.state === "down") return false;
  i.held.left = i.held.right = i.held.run = false;
  /** To `x` at a run; true once there. */
  const go = (x: number) => {
    if (Math.abs(h.x - x) <= TRAIN_FIGHT.near) return true;
    i.held[h.x < x ? "right" : "left"] = true;
    i.held.run = true;
    return false;
  };
  const swingAt = (side: 1 | -1, ready: boolean) => {
    if (h.facing !== side) i.held[side > 0 ? "right" : "left"] = true;
    else if (ready && !busy(h) && h.onGround) i.held.hammer = i.pressed.hammer = true;
  };
  if (r.round !== 1) return lateRounds(w, h, i, go, swingAt);
  const far = r.stand.x + TRAIN_FIGHT.stand;
  if (r.state === "dark") {
    const side: 1 | -1 = h.x < r.x ? 1 : -1;
    if (go(r.x - side * TRAIN_FIGHT.bonk)) swingAt(side, true);
    return true;
  }
  if (r.state === "hurt") {
    go(far);
    return true;
  }
  if (h.x < r.x + 60) {
    const gap = r.x - h.x;
    const s = REPLACEMENT.stick;
    if (r.state === "jab" || r.state === "swing") {
      if (gap < s.reach + 60) i.held.left = true;
      return true;
    }
    if (r.timer > 0.4) {
      i.held.right = i.held.run = true;
      return true;
    }
    if (gap > s.reach - TRAIN_FIGHT.bait) i.held.right = true;
    return true;
  }
  if (go(far)) swingAt(-1, r.stand.cd <= 0 && r.beam.x >= TRAIN_FIGHT.beam);
  return true;
}

/**
 * The later rounds' numbers: how far off the kid he stands to lecture him (out of his hop's reach), the IFU's throw, how hot
 * before the towel, where he waits by the catering table for its nuts and where he smashes the screen from, and how near a
 * drone counts as in his sights.
 */
const LATE_FIGHT = { lecture: 520, throw: 600, towel: 80, table: 560, screen: 3000, drone: 520, dodge: 260, behind: 140, chart: 420, arcT: 0.155, swat: [170, 240], quiet: 800 } as const;
/**
 * Rounds two and three: the mallet at the kid whenever he stands still for it (frozen, staggered out, or hit-stunned), the
 * lecture from just out of his hop's reach to freeze him, the IFU at him when it is in hand, a snot at the drone as it hovers
 * and a step away from its dive, the charts swatted; in round three, while he hides, nuts off the catering table until the
 * smash is full, then the smash at the screen.
 */
function lateRounds(w: World, h: HeroState, i: Input, go: (x: number) => boolean, swingAt: (side: 1 | -1, ready: boolean) => void): boolean {
  const r = w.boss;
  if (r?.kind !== "replacement") return false;
  const side: 1 | -1 = h.x < r.x ? 1 : -1;
  const d = r.drone;
  if (charts(w, h, i)) return true;
  // The drone: a snot as it hovers in his sights, a step away from where it dives.
  if (d && d.state === "hover" && Math.abs(d.x - h.x) < LATE_FIGHT.drone && Math.abs(d.y - (h.y - h.h * 0.85)) < 40) {
    const at: 1 | -1 = d.x >= h.x ? 1 : -1;
    if (h.facing !== at) i.held[at > 0 ? "right" : "left"] = true;
    else if (!busy(h) && h.sinus >= 1 && h.fireCd <= 0) i.held.fire = i.pressed.fire = true;
    return true;
  }
  if (d && d.state === "dive" && Math.abs(d.tx - h.x) < LATE_FIGHT.dodge) {
    i.held[d.tx <= h.x ? "right" : "left"] = true;
    i.held.run = true;
    return true;
  }
  if (h.onGround && !busy(h) && h.heat >= LATE_FIGHT.towel && !w.missiles.some((m) => Math.abs(m.x - h.x) < LATE_FIGHT.quiet)) {
    i.held.towel = i.pressed.towel = true;
    return true;
  }
  if (r.state === "frozen" || r.state === "out") {
    if (go(r.x - side * TRAIN_FIGHT.bonk)) swingAt(side, true);
    else planes(w, h, i);
    return true;
  }
  if (r.state === "hurt") return true;
  // Round three behind the lectern: the smash once it is full, the table's nuts until then.
  if (r.state === "hide" || r.state === "run") {
    if (h.charge >= CHARGE_MAX) {
      if (go(LATE_FIGHT.screen) && !busy(h) && h.onGround) i.held.super = i.pressed.super = true;
    } else go(LATE_FIGHT.table);
    planes(w, h, i);
    return true;
  }
  // The IFU: picked up when it is near, thrown when he is in its range.
  const ifu = w.ifu;
  if (ifu && (ifu.state === "lectern" || ifu.state === "lying") && Math.abs(ifu.x - h.x) < 300 && h.boxes === 0) {
    go(ifu.x);
    return true;
  }
  if (h.boxes > 0 && h.boxCd <= 0 && !busy(h) && h.onGround && h.facing === side && Math.abs(r.x - h.x) < LATE_FIGHT.throw && Math.abs(r.x - h.x) > REPLACEMENT.hop.near) {
    i.held.box = i.pressed.box = true;
    return true;
  }
  // Just out of his hop's reach, facing him, the lecture as soon as it is ready.
  const gap = Math.abs(r.x - h.x);
  const lined = gap > REPLACEMENT.hop.near + 40 && gap < LATE_FIGHT.lecture + 200;
  if (!lined) go(r.x - side * LATE_FIGHT.lecture);
  else if (h.facing !== side) i.held[side > 0 ? "right" : "left"] = true;
  else if (!busy(h) && h.onGround && h.lectureCd <= 0) i.held.lecture = i.pressed.lecture = true;
  planes(w, h, i);
  return true;
}

/** A chart flying at him in front: the mallet sends it back. */
function planes(w: World, h: HeroState, i: Input) {
  if (busy(h) || i.pressed.lecture || i.pressed.box || i.pressed.super) return;
  const ahead = (x: number) => (x - h.x) * h.facing > 0 && Math.abs(x - h.x) < FIGHT.plane;
  if (w.missiles.some((m) => ahead(m.x) && Math.abs(m.y - (h.y - h.h * 0.6)) < 200)) i.held.hammer = i.pressed.hammer = true;
}

/**
 * A chart coming at him first, whatever else is on: turned to and swatted while it is far enough out, jumped when it is too
 * close behind him. True while one has him.
 */
function charts(w: World, h: HeroState, i: Input): boolean {
  // Only one that will be at his body's height when it reaches him: a chart over his head passes him.
  const yAt = (m: World["missiles"][number]) => m.y + m.vy * (Math.max(0, Math.abs(m.x - h.x) - h.w / 2) / Math.max(1, Math.abs(m.vx)));
  const coming = w.missiles.filter((m) => flies(m.kind) && (h.x - m.x) * m.vx > 0 && Math.abs(m.x - h.x) < LATE_FIGHT.chart && yAt(m) > h.y - h.h - 20 && yAt(m) < h.y + 10);
  if (!coming.length) return false;
  const m = coming.sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
  const at: 1 | -1 = m.x >= h.x ? 1 : -1;
  if (busy(h)) return true;
  // Too close behind him to turn for: over it if it comes in low.
  if (at !== h.facing && Math.abs(m.x - h.x) < LATE_FIGHT.behind && m.y > h.y - h.h * 0.45) {
    if (h.onGround) i.held.jump = i.pressed.jump = true;
    return true;
  }
  if (at !== h.facing) {
    i.held[at > 0 ? "right" : "left"] = true;
    return true;
  }
  // The arc meets it about 215 px out a sixth of a second after the press: pressed for where it will be then.
  const closing = Math.abs(m.vx) + Math.max(0, h.vx * at);
  const then = Math.abs(m.x - h.x) - closing * LATE_FIGHT.arcT;
  if (then <= LATE_FIGHT.swat[1] && then >= LATE_FIGHT.swat[0]) i.held.hammer = i.pressed.hammer = true;
  return true;
}

/** How the runner looks ahead, in px: at the barrier, and at a traveler. */
const RIDE = { barrier: 220, crowd: 200, stand: 280, stroller: 230, bike: 200, towel: 75, fight: 520, near: 70, duck: 0.12 } as const;
/**
 * The runner: flat out for the doors, down into a slide under the barrier, over whoever is hurrying his way.
 */
function riding(level: Level, h: HeroState, i: Input, w?: World): Input {
  i.held.right = i.held.run = true;
  if (!w) return i;
  const pass = level.passes.some((p) => p.x - h.x < RIDE.barrier && p.x + p.w - h.x > -60);
  if (pass) {
    i.held.down = true;
    return i;
  }
  if (fightConductor(w, h, i)) return i;
  const ahead = (x: number, within: number) => x - h.x > -30 && x - h.x < within;
  // A bike swinging at head height: under it until well past; a traveler getting up or a kid: the mallet first.
  if (w.movers.some((m) => m.id.startsWith("bike") && Math.abs(m.x - h.x) < RIDE.bike)) {
    i.held.down = true;
    i.held.run = false;
    return i;
  }
  const bonk = w.cast.some((n) => n.alive && !n.out && hittable(n) && (n.trick === "stand" || n.trick === "rush") && ahead(n.x, RIDE.stand));
  if (bonk && !h.move && h.onGround && !h.crouch) i.held.hammer = i.pressed.hammer = true;
  const crowd = w.cast.some((n) => n.alive && n.trick === "shove" && !n.out && n.x - h.x > 0 && n.x - h.x < RIDE.crowd);
  const stroller = w.movers.some((m) => m.id === "stroller" && ahead(m.x, RIDE.stroller));
  if ((crowd || stroller) && h.onGround) i.held.jump = i.pressed.jump = true;
  else if (!h.onGround) i.held.jump = true;
  else if (!h.move && h.heat >= RIDE.towel) i.held.towel = i.pressed.towel = true;
  return i;
}

/**
 * The conductor: up to him, clear of the last seat back, whose ceiling would keep him tucked; under his fist as the wind-up
 * ends; the mallet while he staggers. True while the fight has him: nothing else steers.
 */
function fightConductor(w: World, h: HeroState, i: Input): boolean {
  const c = w.boss;
  if (c?.kind !== "conductor" || c.state === "down" || c.state === "retreat" || c.x - h.x > RIDE.fight || c.x - h.x < -60) return false;
  i.held.run = false;
  i.held.right = c.x - h.x > RIDE.near;
  if (c.state === "windup" && c.timer < RIDE.duck) i.held.down = true;
  if (c.state === "stagger" && !h.move && !h.crouch && h.onGround) i.held.hammer = i.pressed.hammer = true;
  return true;
}

/** How the flyer looks ahead, in px: at a cart, a seat or a leg, a bag, and how near someone it swings. */
const FLY = { cart: 280, seat: 150, legs: 100, bag: 240, staff: 240, towel: 75 } as const;
/**
 * The flyer: W down the aisle, into a row lane as a cart comes and back, ↓ under a reclined seat in its lane, a jump over
 * legs, out of a lane a bag is in, the mallet at whoever stands in its way, and at the purser to a row lane while her cart is
 * out and back to bonk her in her rest.
 */
function flying(level: Level, h: HeroState, i: Input, w?: World): Input {
  i.held.up = true;
  const f = w?.flight;
  const spec = level.flight;
  if (!w || !f || !spec) return i;
  const ahead = (x: number, within: number) => x - h.x > -40 && x - h.x < within;
  const seatIn = (lane: number) => spec.recliners.some((r) => r.lane === lane && ahead(rowX(r.row), FLY.seat * 2));
  const boss = w.boss?.kind === "purser" && w.boss.state !== "down" ? w.boss : null;
  const cart = f.cart.live && f.cart.z * 100 - h.x < FLY.cart + 60 && f.cart.z * 100 - h.x > -100;
  const bagIn = (lane: number) => w.missiles.some((m) => m.kind === "bag" && m.lx === level.hall?.lanes?.[lane] && ahead(m.x, FLY.bag));
  // Out of the aisle for a cart or her push, on the side with no seat coming; else the aisle, and out of a bag's way.
  const pushing = !!boss && boss.awake && (boss.state === "push" || boss.timer < 0.4);
  let want = 1;
  if (cart || pushing) want = seatIn(0) ? 2 : 0;
  if (bagIn(want)) want = [want, 0, 1, 2].find((l) => !bagIn(l) && !((cart || pushing) && l === 1)) ?? want;
  // A tap, let go the next step: a key held through a card moves him nowhere until it is let go.
  if (Math.round(w.time / STEP) % 2 === 0 && h.lane !== want) i.held[h.lane < want ? "right" : "left"] = true;
  if (seatIn(h.lane) && spec.recliners.some((r) => r.lane === h.lane && ahead(rowX(r.row), FLY.seat))) {
    i.held.down = true;
    i.held.up = false;
  }
  const legs = h.lane === 1 && spec.legs.some((row) => ahead(rowX(row), FLY.legs));
  if (legs && h.onGround) i.held.jump = i.pressed.jump = true;
  else if (!h.onGround) i.held.jump = true;
  else if (!h.move && h.heat >= FLY.towel && !cart && !boss) i.held.towel = i.pressed.towel = true;
  const staff = w.cast.some((n) => n.alive && hittable(n) && !n.out && ahead(n.x, FLY.staff) && Math.abs(n.lx - h.lx) <= HALL_DRIVE.lane);
  const bonk = boss && boss.state === "rest" && h.lane === 1 && Math.abs(h.lx) < 0.2 && boss.x - h.x < FLY.staff && boss.hurtT <= 0;
  if ((staff || bonk) && !h.move && h.onGround) i.held.hammer = i.pressed.hammer = true;
  return i;
}

/** How the suite's player keeps to him: where it stands, how near it swings, how near a thrown thing it jumps. */
const TI_FIGHT = { stand: 200, clear: 460, swing: 280, missile: 300, bat: 240 } as const;
/**
 * Lifetime Titanium guy: stays a swing away from him, facing him, bonks him when he is not winding up or swinging, jumps what
 * he throws, and on the bed jumps up to him.
 */
function fightTitanium(w: World, h: HeroState, i: Input): boolean {
  const t = w.boss;
  if (t?.kind !== "titanium" || t.state === "pool" || t.state === "down") return false;
  i.held.left = i.held.right = i.held.run = false;
  const gap = t.x - h.x;
  const side = gap >= 0 ? 1 : -1;
  // The briefcase's wind-up: back out of its reach at a run, and in again while he rests.
  const dodge = t.state === "windup" || t.state === "swing";
  const want = dodge ? t.x - side * TI_FIGHT.clear : t.x - side * TI_FIGHT.stand;
  if (Math.abs(h.x - want) > 30) {
    i.held[h.x < want ? "right" : "left"] = true;
    i.held.run = true;
  } else if (h.facing !== side) i.held[side > 0 ? "right" : "left"] = true;
  // A bottle comes in low: over it. An apple comes down on him: the mallet sends it back.
  const bottle = w.missiles.some((m) => m.kind === "bottle" && Math.abs(m.x - h.x) < TI_FIGHT.missile && (h.x - m.x) * m.vx > 0);
  const apple = w.missiles.some((m) => m.kind === "apple" && !m.batted && (m.x - h.x) * side > 0 && Math.abs(m.x - h.x) < TI_FIGHT.bat && m.y > h.y - h.h * 1.4);
  if (bottle && h.onGround) i.held.jump = i.pressed.jump = true;
  else if (!h.onGround) i.held.jump = true;
  if (apple && !h.move && h.facing === side) i.held.hammer = i.pressed.hammer = true;
  // On the bed he can be reached at the bottom of a bounce; from the floor beside it the mallet goes up that far.
  const open = !dodge && (t.phase !== 2 || t.y > TITANIUM.bed.top);
  if (!h.move && open && h.facing === side && Math.abs(gap) < TI_FIGHT.swing) i.held.hammer = i.pressed.hammer = true;
  return true;
}

/**
 * The pig, as the shipped boss check fought it: wait in the corner its charges cannot reach, snot it from there, and
 * bonk it when it stops beside him. True while the fight is on (it steers him; nothing else does).
 */
function fightPig(w: World, h: HeroState, i: Input): boolean {
  const p = w.pig;
  if (!p || p.state === "asleep" || p.state === "defeated") return false;
  i.held.right = i.held.run = false;
  const spot = p.arena[0] + PIG.keepLeft - PIG_FIGHT.wait;
  if (h.x < spot - 20) i.held.right = true;
  else if (h.x > spot + 20) i.held.left = true;
  else if (h.facing < 0) i.held.right = true;
  if (h.move || !h.onGround || h.facing < 0) return true;
  const gap = p.x - p.w / 2 - h.x;
  if (gap < PIG_FIGHT.bonk) i.held.hammer = i.pressed.hammer = true;
  else if (h.sinus >= 1 && gap < PIG_FIGHT.snot) i.held.fire = i.pressed.fire = true;
  return true;
}

/** Fights what is in front of him: a swing at staff or a plane within reach, a jump over a cart rolling at him, a lecture at students. */
function fight(w: World, h: HeroState, i: Input): void {
  if (h.move) return;
  const ahead = (x: number, within: number) => (x - h.x) * h.facing > 0 && Math.abs(x - h.x) < within;
  // On stairs whoever is ahead stands higher or lower the farther away they are.
  const level = (x: number, y: number) => Math.abs(y - h.y) < 80 + Math.abs(x - h.x) * 0.6;
  const staff = w.cast.some(
    (n) => n.alive && n.role !== "student" && n.trick !== "cheer" && hittable(n) && (attacking(n, h) || n.act === "windup" || standing(n)) && ahead(n.x, FIGHT.staff) && level(n.x, n.y),
  );
  const plane = w.missiles.some((m) => ahead(m.x, FIGHT.plane) && Math.abs(m.y - (h.y - h.h * 0.6)) < 200);
  const cart = w.targets.some((t) => ahead(t.x, FIGHT.cart) && Math.abs(t.vx) >= ROLLING && (h.x - t.x) * t.vx > 0 && level(t.x, t.y));
  const students = w.cast.filter((n) => n.alive && n.role === "student" && n.act !== "schooled" && overlapsRect(lectureReach(h), npcRect(n)));
  if (cart && h.onGround) {
    i.pressed.jump = true;
    return;
  }
  if (students.length && h.lectureCd <= 0 && h.onGround) {
    i.held.lecture = i.pressed.lecture = true;
    return;
  }
  if (staff || plane) i.held.hammer = i.pressed.hammer = true;
}
