import { TITANIUM } from "./titanium";
import { ROLLING, hittable, npcRect, standing } from "./cast";
import { attacking } from "./cast-behavior";
import { overlapsRect } from "./geometry";
import { emptyInput, type Input } from "./input";
import { stageOf, type Level } from "./level";
import { lectureReach } from "./moves";
import { floorAt } from "./physics";
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
export function drive(level: Level, h: HeroState, route: "floor" | "balcony" | "climb" | "hall", world?: World): Input {
  const i = emptyInput();
  if (route === "climb") return climb(level, h, i, world);
  if (route === "hall") return hallway(level, h, i, world);
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
    (n) => n.alive && n.role !== "student" && hittable(n) && (attacking(n, h) || n.act === "windup" || standing(n)) && ahead(n.x, FIGHT.staff) && level(n.x, n.y),
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
