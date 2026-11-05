import type { CastAct, CastRole } from "../../sim/cast";
import type { Crate } from "../../sim/crates";
import type { CastPerson } from "../../sim/level";
import type { Pickup } from "../../sim/rewards";
import { BACK_SECONDS, type BackClipName } from "../../sim/rig/back-clips";
import { moveU } from "../../sim/moves";
import type { HeroState, Snapshot } from "../../sim/types";

/**
 * What the 3D hall shows on a frame, in meters, built from the world: `lx` across the hall (+ the walker's right), `z` down
 * it (0 at the stairwell door), `y` up. Pure, with no three.js in it, so the node checks can read it.
 */
export type HallState = {
  hero: { lx: number; z: number; y: number };
  cast: { id: string; num: number; person: CastPerson; role: CastRole; lx: number; z: number; y: number; clip: string; u: number; speed: number; spin: number; hits: number; sit: boolean }[];
  missiles: { kind: string; lx: number; z: number; y: number }[];
  pickups: { id: number; kind: string; lx: number; z: number; y: number; taken: boolean }[];
  carts: { lx: number; z: number; dir: 1 | -1 }[];
  doors: { z: number; side: 1 | -1; open: number }[];
  puddle: { z0: number; z1: number; lx0: number; lx1: number } | null;
  /** The boss down a hall, facing him; the drinks cart or hers; the curtain pulled back; the seatbelt sign lit; the bin at its row. */
  boss: { lx: number; z: number; y: number; person: CastPerson; clip: CastAct; u: number; flinch: boolean } | null;
  cart: { lx: number; z: number; live: boolean } | null;
  curtain: boolean;
  sign: boolean;
  bin: { z: number; used: boolean } | null;
};

/** How fast before his back shows the run, in px a second. */
const RUN_FROM = 560;
/** The sim's world is in px, 100 to the meter. */
export const PX_PER_METER = 100;
export const toMeters = (px: number) => px / PX_PER_METER;

const mix = (a: number, b: number, k: number) => a + (b - a) * k;

/** How far she stands aside once she has pulled the curtain back. */
const PURSER_ASIDE = 1.1;
/** Where the purser's cart rests, in front of her. */
function bossView(cur: Snapshot): Pick<HallState, "boss" | "cart" | "curtain"> {
  const p = cur.boss;
  const f = cur.flight;
  if (p?.kind !== "purser") return { boss: null, cart: f?.cart.live ? { lx: 0, z: f.cart.z, live: true } : f ? { lx: 0, z: f.cart.z, live: false } : null, curtain: false };
  const down = p.state === "down";
  const clip: CastAct = p.state === "push" ? "attack" : p.state === "hurt" ? "bumped" : "idle";
  const flown = f?.cart.live && !p.cart.live;
  return {
    boss: { lx: down ? PURSER_ASIDE : p.lx, z: toMeters(p.x), y: 0, person: "purser", clip, u: p.timer, flinch: p.flinch > 0 },
    cart: flown && f ? { lx: 0, z: f.cart.z, live: true } : down ? null : { lx: 0, z: p.cart.z, live: p.cart.live },
    curtain: down,
  };
}

/**
 * The world's frame in the hall's meters, between the last two steps. `lift`: how much of his height over the floor the set
 * shows; `crates`: the level's, for the bin that opens by a bump.
 */
export function hallStateOf(prev: Snapshot, cur: Snapshot, alpha: number, pickups: readonly Pickup[], puddle: HallState["puddle"], opts: { lift?: number; crates?: readonly Crate[] } = {}): HallState {
  const h = cur.hero;
  const was = prev.hero;
  const lastCast = new Map(prev.cast.map((n) => [n.id, n]));
  const bin = opts.crates?.find((c) => c.look === "bin");
  return {
    ...bossView(cur),
    sign: (cur.flight?.sign ?? 0) > 0,
    bin: bin ? { z: toMeters(bin.x), used: bin.used } : null,
    hero: { lx: mix(was.lx, h.lx, alpha), z: toMeters(mix(was.x, h.x, alpha)), y: Math.max(0, -toMeters(mix(was.y, h.y, alpha))) * (opts.lift ?? 1) },
    cast: cur.cast
      .filter((n) => n.alive && n.act !== "hide")
      .map((n) => {
        const o = lastCast.get(n.id) ?? n;
        return { id: n.spawn, num: n.id, person: n.person, role: n.role, lx: mix(o.lx, n.lx, alpha), z: toMeters(mix(o.x, n.x, alpha)), y: Math.max(0, -toMeters(mix(o.y, n.y, alpha))), clip: n.act, u: n.actT, speed: Math.abs(n.vx), spin: n.spin, hits: n.hits, sit: n.sit };
      }),
    missiles: cur.missiles.filter((m) => m.life > 0).map((m) => ({ kind: m.kind, lx: m.lx ?? 0, z: toMeters(m.x), y: -toMeters(m.y) })),
    pickups: pickups.map((p) => ({ id: p.id, kind: p.kind, lx: p.lx ?? 0, z: toMeters(p.x), y: -toMeters(p.y), taken: p.taken })),
    carts: [
      ...cur.hallCarts.filter((c) => c.live).map((c) => ({ lx: c.lx, z: c.z, dir: c.dir })),
      ...cur.targets.map((t) => ({ lx: t.lx ?? 0, z: toMeters(t.x), dir: (t.vx > 0 ? 1 : -1) as 1 | -1 })),
    ],
    doors: cur.hallDoors.map((d) => ({ z: d.z, side: d.side, open: d.open })),
    puddle,
  };
}

/** Which of his back's clips this frame shows, and how far through it; null while he does what his back cannot show. `pace`: the level's, his run being that much slower. */
export function backClipOf(h: HeroState, phase: number, pace = 1): { clip: BackClipName; u: number } | null {
  const m = h.move;
  if (m?.kind === "swing") return { clip: "swing", u: moveU(m) };
  if (m || h.hurtT > 0 || h.stunT > 0) return null;
  if (!h.onGround) return { clip: "jump", u: Math.min(1, Math.max(0, 0.5 + h.vy / 3200)) };
  if (h.crouch) return { clip: "crouch", u: phase % 1 };
  const speed = Math.abs(h.vx);
  if (speed > RUN_FROM * pace) return { clip: "run", u: phase % 1 };
  if (speed > 40) return { clip: "walk", u: phase % 1 };
  return { clip: "idle", u: (phase * BACK_SECONDS.walk) / BACK_SECONDS.idle };
}

/** How fast his back's cycle runs at his speed, cycles a second. */
export const backCycle = (h: Pick<HeroState, "vx">, pace = 1): number => (Math.abs(h.vx) > RUN_FROM * pace ? 1 / BACK_SECONDS.run : 1 / BACK_SECONDS.walk);
