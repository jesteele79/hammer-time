import { ROLLING, npcRect, standing } from "../sim/cast";
import { PATIENCE_MAX } from "../sim/damage";
import { overlapsRect } from "../sim/geometry";
import type { Game } from "../sim/game";
import { heatZoneAt } from "../sim/hazards";
import type { CarriedKind } from "../sim/level";
import { CHARGE_MAX, HEAT, SINUS_MAX, STAMINA, lectureReach } from "../sim/moves";
import { PIG } from "../sim/pig";
import { BOSS_NAMES, bossUp } from "../sim/boss";
import { GRADES, HUNGRY, baseReach, hungryHint, type Hungry, type HungryResult } from "../sim/quests/hungry/hungry";
import { FARES, faresHint, groupOf, type Fares, type FaresResult } from "../sim/quests/fares/fares";
import { QUEST_NAMES } from "../sim/quests/quest";
import { statusName } from "../sim/status";
import { tierMet } from "../sim/level";
import type { PickupKind } from "../sim/rewards";
import { RUN } from "../sim/run";

/** What the shell's HUD shows (spec §10). */
export type HudPayload = {
  /** He is in a hall under the chase camera: the pad grows a forward button, the keys read otherwise. */
  hall: boolean;
  /** What the panel's top line reads: the level's name, or in a tall level the floor he is on. */
  venue: string;
  /** The level's name, on its card. */
  name: string;
  world: string;
  /** The line under the level's name on its card, when it has its own. */
  card: string | null;
  /** His status through Act 2 (story spec §8.1): MEMBER to AMBASSADOR; null outside it. */
  status: string | null;
  portrait: string | null;
  heat: number;
  sinus: number;
  sinusMax: number;
  charge: number;
  chargeMax: number;
  patience: number;
  patienceMax: number;
  score: number;
  cans: number;
  lives: number;
  /** Whole seconds on the clock, or null where there is no clock (the stash). */
  time: number | null;
  hurry: boolean;
  /** Whole seconds left of a Buc-ee's boost. */
  star: number;
  hot: boolean;
  /** Heat is slowing him (past half full): the heat bar pulses. */
  slowed: boolean;
  /** The lecture is off its cooldown: the touch pad lights its button (at the banquet, the table's lecture). */
  lecture: boolean;
  /** Doggy bags he carries from the banquet: each catches a hit that would knock him flat. */
  doggy: number;
  /** He has the banquet's belly-flop: his slide knocks staff over. */
  flop: boolean;
  /** "Checkpoint saved" shows for two seconds after a punch clock. */
  saved: boolean;
  /** The most pressing thing to know, one line. */
  hint: string;
  /** The pig's bar (R3 §5.2) while the fight is on: its HP and the bonks and snots it still needs. */
  boss: { name: string; hp: number; max: number; bonks: number; snots: number; need: number } | null;
  /**
   * The banquet (R4 §9) while its card, its round or its tally is up; null in the shift. `reach` is where his dive stops
   * (his tap's, or the charge so far), `reachBase` his tap's; `door` when it was opened from the BUFFET door; `lecture`
   * whole seconds until he can lecture the table again (0: now); `goal` the score that is COMPED and wins the doggy bag.
   */
  quest: BanquetHud | GateHud | null;
  /** Boxes of #15 blades he carries from the gate (R5 §9). */
  boxes: number;
  /** A controller is connected: the hint and the break card name its buttons. */
  pad: boolean;
  /** Staff bonked this run: the shell adds them to the lifetime count (plan decision 4). */
  bonked: number;
  /** The run's id (`Game.runs`): a new one means a new run began, its bonks counted from where it stands. */
  run: number;
};
export type BanquetHud = { id: "hungry"; menu: "banquet" | "lounge"; score: number; time: number; reach: number; reachBase: number; reachMax: number; combo: number; mult: number; chomps: number; door: boolean; lecture: number; goal: number; result: HungryResult | null };
/**
 * Fare Darts (R5 §12) while its card, its round or its tally is up: `left` scalpels still on the tray, `steady` seconds
 * left of the steady hand out of `steadyMax`, `towels` the towel-offs left that refill it, `position` his boarding group
 * ("B13"), `streak` bookings in a row.
 */
export type GateHud = { id: "fares"; score: number; left: number; steady: number; steadyMax: number; towels: number; position: string; streak: number; door: boolean; result: FaresResult | null };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** What the banquet's belly-flop is and how to do it, until he has done one (owner, 2026-10-18). */
export const FLOP_HINT = "Belly-flop · run, then ↓ · it knocks staff over";
/** Until he has lobbed his first box of #15 blades (R5 §9). */
export const BOX_HINT = "Boxes of #15 blades · B lobs one · it freezes staff";
/** A tally's "New best": a score above the best kept before the round, never a tie with it. */
export const isNewBest = (score: number, before: number) => score > before;

/** A staffer this near on his level who still carries a prize names it in the hint (owner, 2026-10-18). */
const CARRY_HINT = { x: 700, y: 300 } as const;
const CARRIED_NAME: Record<CarriedKind, string> = { can: "Coke Zero", nuts: "mixed nuts", bucees: "Buc-ee's", keycard: "a keycard" };

/** The shipped game's hint (its engine's hint(), gone since R4), first match wins, without the cast's lines. */
const HALL_FIRST_HINT = 900;
export function hintOf(game: Game): string {
  const h = game.world.hero;
  const d = game.door;
  if (d) {
    if (d.kind === "stash") return `↓ ${d.label} · the stash`;
    if (d.kind === "return") return "↓ at the cart · back to the lobby";
    if (!tierMet(d, game.run.keycards)) return `${d.label} · ${d.opens ?? "closed"}`;
    if (d.locked && game.world.boss && game.world.boss.state !== "down") return `${d.label} · Housekeeping has the key`;
    if (d.kind === "exit" && d.down) return `↓ ${d.label} · up to the fourteenth floor`;
    if (d.kind === "exit") return `${d.label} · walk in to finish your shift`;
    if (d.kind === "gate") return `${d.label} · walk in to board`;
    if (d.kind === "quest") return game.run.spent.includes(d.id) ? `${d.label} · thank you, come again` : `↓ ${d.label} · ${QUEST_NAMES[d.quest ?? "hungry"]}`;
    return `${d.label} · ${d.opens ?? "closed"}`;
  }
  if (h.crouch) return "Stay low · release ↓ when clear to stand";
  const pig = game.world.pig;
  if (pig?.state === "defeated") return "The chain is off · walk into CLOCK OUT";
  if (pig && pig.state !== "asleep") return "Pig fight · 3 bonks + 3 snots minimum · pepper refills on the left";
  if (game.level.id === "stash") {
    const cleanedOut = game.pickups.every((p) => p.taken) && game.crates.every((c) => c.used || c.broken);
    return cleanedOut ? "Staff stash · cleaned out · ↓ at the cart to go back" : "Staff stash · ↓ at the cart to go back";
  }
  if (game.world.boss?.kind === "titanium") return "Lifetime Titanium guy · bonk him · jump what he throws · H bats an apple back";
  if (game.world.boss?.kind === "purser" && bossUp(game.world.boss)) return "The purser · A or D out of the aisle while she pushes · bonk her between pushes";
  if (bossUp(game.world.boss)) return "Housekeeping · jump her carts or slide under · bonk her when she waits";
  const zone = heatZoneAt(game.world.stage, h);
  if (zone?.kind === "flattop") return "Flat-top · it heats you fast · step off it";
  if (zone?.kind === "freezer") return "Walk-in freezer · cooling off";
  // The cast's threats, in the shipped hint's order: paper, a runaway cart, students to lecture, puddles, staff to bonk.
  const w = game.world;
  const near = (x: number, r: number) => Math.abs(x - h.x) < r;
  const missile = w.missiles.find((m) => near(m.x, 600));
  if (missile) return `${missile.kind === "coaster" ? "Coaster" : "Paper"} incoming · duck, jump or swat with H`;
  if (w.targets.some((t) => near(t.x, 900) && Math.abs(t.vx) >= ROLLING && (h.x - t.x) * t.vx > 0)) return "Runaway cart · jump it, or bonk it back";
  const reach = lectureReach(h);
  const pupil = h.lectureCd <= 0 ? w.cast.find((n) => n.alive && n.role === "student" && n.act !== "schooled" && overlapsRect(reach, npcRect(n))) : undefined;
  if (pupil) return pupil.job === "bartender" ? "E lectures them · a schooled bartender stops throwing coasters" : "E lectures them · schooled students stop throwing paper";
  if (w.puddles.length && w.cast.some((n) => n.alive && n.role !== "student" && standing(n) && near(n.x, 900))) return "Staff slip on puddles · stomp or bonk them while they are down";
  if (w.cast.some((n) => n.alive && n.role !== "student" && (n.act === "windup" || n.act === "attack") && near(n.x, 900))) return "H swings the mallet · hit them with the head";
  if (game.world.swingDoors.some((d) => Math.abs(d.x - h.x) < 500 && Math.abs(d.y - h.y) < 60)) return "Swinging door · stand clear when it bangs, or bonk it back";
  if (game.run.star > 0) return "Buc-ee's boost · nothing can touch you";
  if (h.boiled) return "Too hot to run · T to towel off";
  if (h.heat >= HEAT.tired) return "Overheated · T to towel off";
  if (h.flop && !game.run.flopped) return FLOP_HINT;
  if (h.boxes > 0 && !game.run.lobbed) return BOX_HINT;
  if (h.charge >= CHARGE_MAX) return "Super smash ready · Q";
  
  if (game.level.hall?.lanes) {
    if ((game.world.flight?.sign ?? 0) > 0) return "The seatbelt sign · bags are coming · A or D out of their lane";
    if (game.world.flight?.cart.live) return "The drinks cart · A or D out of the aisle";
    return h.x < HALL_FIRST_HINT ? "W runs · A D a lane · S ducks a seat · Space jumps the legs" : "H bonks the queue · a jump bumps the bin at row 10";
  }
  if (game.level.hall) {
    if (game.level.keyDoor && h.x >= game.level.keyDoor.x - 400) return "H on the door · the key won't open it";
    return h.x < HALL_FIRST_HINT ? "W forward · A D sidestep" : "S back · Space jumps a cart · a turning handle swings its door out";
  }
  const lesson = game.level.lessons?.find((l) => h.x >= l.x0 && h.x < l.x1 && !game.run.learned.includes(l.move));
  if (lesson) return lesson.text;
  if (h.x < (game.level.hints?.early ?? 0)) return "F snot rocket · jump into the ! crate for hot pepper";
  // A prize to fight for, once the threats, his own state and the first lesson have had their say.
  const carrier = w.cast.find((n) => n.alive && n.carry && !n.out && near(n.x, CARRY_HINT.x) && Math.abs(n.y - h.y) < CARRY_HINT.y);
  if (carrier?.carry) return `Carrying ${CARRIED_NAME[carrier.carry]} · knock them out and it drops`;
  if (game.level.floors) return "Keep climbing · jump the carts and the chutes";
  // The drop works only on the balcony itself; on the landing and the stairs he is still on his way up.
  const onBalcony = game.level.platforms.some((p) => p.kind === "balcony" && h.x >= p.x0 && h.x <= p.x1 && Math.abs(h.y - p.y) < 2);
  if (onBalcony) return "Up on the mezzanine · ↓ + jump drops you back down";
  const climbing =
    game.level.platforms.some((p) => p.kind === "landing" && h.x >= p.x0 - 40 && h.x <= p.x1 + 40 && h.y <= p.y + 2) ||
    game.level.floor.some((f) => f.kind === "stairs" && h.x >= f.x0 && h.x <= f.x1);
  if (climbing) return "Up to the mezzanine · keep climbing";
  return h.hot ? "Hot snot pierces · nuts charge Q super smash" : "Find a ! crate for hot pepper";
}

/** What a pickup just did, for the hint line (owner, 2026-10-12: each power-up has one clear job). */
export function pickupNote(kind: PickupKind, h: { charge: number }): string {
  if (kind === "keycard") return "+1 keycard";
  if (kind === "can") return "Coke Zero · cooled down";
  if (kind === "bucees") return `Buc-ee's · shield for ${RUN.star} seconds`;
  if (kind === "pepper") return "Pepper · extra hit and hot snot";
  if (h.charge >= CHARGE_MAX) return "Mixed nuts · Super Smash ready · Q";
  return `Mixed nuts · smash ${Math.min(2, Math.floor(h.charge / RUN.nutCharge))} of 3`;
}

/** `note` is a pickup's line, shown in place of the hint while it lasts. */
export function hudOf(game: Game, portrait: string | null, saved = false, note: string | null = null): HudPayload {
  const h = game.world.hero;
  const pig = game.world.pig;
  const clocked = game.level.time > 0;
  const time = clocked ? Math.ceil(game.run.time) : null;
  const q = game.quest;
  const quest = q ? (q.id === "hungry" ? banquetHud(q, !!game.questDoor) : gateHud(q, !!game.questDoor)) : null;
  return {
    venue: game.level.floors ? `Floor ${1 + Math.round(-h.y / game.level.floors.every)}` : game.level.name,
    name: game.level.name,
    world: game.level.world,
    card: game.level.card ?? null,
    status: game.shift[game.venue]?.world.startsWith("2-") ? statusName(game.run.keycards) : null,
    portrait,
    heat: clamp(h.heat, 0, 100),
    sinus: clamp(h.sinus, 0, SINUS_MAX),
    sinusMax: SINUS_MAX,
    charge: clamp(h.charge, 0, CHARGE_MAX),
    chargeMax: CHARGE_MAX,
    patience: clamp(h.patience, 0, PATIENCE_MAX),
    patienceMax: PATIENCE_MAX,
    score: game.run.score,
    cans: game.run.cans,
    lives: game.run.lives,
    time,
    hurry: clocked && game.run.time < RUN.hurry,
    star: Math.ceil(game.run.star),
    hot: h.hot,
    slowed: h.heat > STAMINA.from,
    lecture: q ? q.id !== "hungry" || (q.hammer.lectureCd <= 0 && q.hammer.lecture <= 0) : h.lectureCd <= 0,
    doggy: h.doggy,
    flop: h.flop,
    saved,
    hall: !!game.level.hall,
    hint: q ? (q.id === "hungry" ? hungryHint(q) : faresHint(q)) : (note ?? hintOf(game)),
    boss:
      pig && pig.state !== "asleep" && pig.state !== "defeated"
        ? { name: "The Pink Menace", hp: pig.hp, max: pig.max, bonks: pig.bonks, snots: pig.snots, need: PIG.need }
        : bossUp(game.world.boss)
          ? { name: BOSS_NAMES[game.world.boss!.kind], hp: game.world.boss!.hp, max: game.world.boss!.max, bonks: 0, snots: 0, need: 0 }
          : null,
    quest,
    boxes: h.boxes,
    pad: false,
    bonked: game.run.bonked,
    run: game.runs,
  };
}

function banquetHud(q: Hungry, door: boolean): BanquetHud {
  return {
    id: "hungry",
    menu: q.menu,
    score: Math.max(0, Math.round(q.score.plate + q.score.bonus)),
    time: Math.max(0, Math.ceil(HUNGRY.round - q.time)),
    reach: Math.round(q.hammer.dive?.phase === "coil" ? q.hammer.dive.reach : baseReach(q)),
    reachBase: baseReach(q),
    reachMax: HUNGRY.reach.charged,
    combo: q.score.chain,
    mult: q.score.chain >= HUNGRY.combo.triple ? 3 : q.score.chain >= HUNGRY.combo.double ? 2 : 1,
    chomps: q.score.eaten,
    door,
    lecture: Math.ceil(Math.max(q.hammer.lectureCd, q.hammer.lecture)),
    goal: GRADES[0][0],
    result: q.result,
  };
}

function gateHud(q: Fares, door: boolean): GateHud {
  // The cancelled flight's 200 can take the round below zero; the tally clamps it, and so does the screen.
  return { id: "fares", score: Math.max(0, q.score), left: FARES.throws - q.thrown, steady: q.steady, steadyMax: FARES.steady.budget, towels: q.towels, position: groupOf(q.position), streak: q.streak, door, result: q.result };
}

/** Changes only when the HUD would look different: whole heat points, tenths of a snot charge, whole seconds. */
export const hudKey = (p: HudPayload) =>
  [
    Math.round(p.heat),
    p.sinus.toFixed(1),
    p.charge,
    p.patience,
    p.portrait,
    p.score,
    p.cans,
    p.lives,
    p.time,
    p.star,
    p.hot,
    p.slowed,
    p.lecture,
    p.doggy,
    p.flop,
    p.saved,
    p.hint,
    p.venue,
    p.status,
    p.boss ? [p.boss.hp, p.boss.bonks, p.boss.snots].join(",") : "",
    p.quest?.id === "hungry" ? [p.quest.score, p.quest.time, p.quest.reach, p.quest.reachBase, p.quest.combo, p.quest.chomps, p.quest.lecture, p.quest.result ? 1 : 0].join(",") : "",
    p.quest?.id === "fares" ? [p.quest.score, p.quest.left, p.quest.steady.toFixed(1), p.quest.towels, p.quest.position, p.quest.streak, p.quest.result ? 1 : 0].join(",") : "",
    p.boxes,
    p.pad,
    p.bonked,
    p.run,
  ].join("|");
