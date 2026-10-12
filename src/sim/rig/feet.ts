import type { HeadPlate } from "../../art/registry";
import { solve } from "./fk";
import { groundShift, type Ground } from "./ground";
import { legTo } from "./ik";
import type { Pose } from "./pose";
import type { JointName, Point } from "./skeleton";

/** The floor's y (world px, y down) at `dx` from the feet point, relative to the floor under it; null over a gap. */
export type FloorProbe = (dx: number) => number | null;

/** A sole this close to its floor line (px) is standing on it. */
const PLANTED = 4;
/** A floor further than this above or below a foot (px) is a step or a drop, not the slope under it. */
const REACH = 48;
/** Points along a placed sole checked against the floor, so a sole across a kink never cuts into it. */
const SOLE_SAMPLES = 5;
const DEG = 180 / Math.PI;

type Leg = "near" | "far";
const PARTS: Record<Leg, Record<"hip" | "knee" | "ankle" | "heel" | "toe", JointName>> = {
  near: { hip: "hipNear", knee: "kneeNear", ankle: "ankleNear", heel: "heelNear", toe: "toeNear" },
  far: { hip: "hipFar", knee: "kneeFar", ankle: "ankleFar", heel: "heelFar", toe: "toeFar" },
};

/**
 * Stands the feet on the floor under them (spec §6.3): each standing sole turns to lie along the
 * floor from under its heel to under its toe, about the point it stands on, and is lifted clear
 * wherever that line would cut into the floor (a ramp's top); the body drops by the most any
 * standing ankle needs, so the legs only ever bend. A foot over a gap or past a step is left as
 * the clip has it. On flat floor the pose comes back unchanged.
 */
export function plantFeet(
  pose: Pose,
  facing: 1 | -1,
  headScale: number,
  plate: HeadPlate | undefined,
  mode: Ground,
  floor: FloorProbe,
): { pose: Pose; dy: number; gap: number } {
  // `gap`: how far (px) the legs left a placed foot from where the floor puts it.
  const s0 = solve(pose, facing, headScale, plate);
  const dy0 = groundShift(s0, mode);
  if (mode !== "planted" && mode !== "push") return { pose, dy: dy0, gap: 0 };
  const j = s0.joints;
  const lift = s0.farFloor * s0.scale * s0.squash.y;
  const at = (n: JointName): Point => ({ x: j[n].x, y: j[n].y + dy0 });
  const feet = (["near", "far"] as Leg[]).flatMap((leg) => {
    const n = PARTS[leg];
    const line = leg === "far" ? -lift : 0;
    const heel = at(n.heel);
    const toe = at(n.toe);
    const onHeel = heel.y >= toe.y;
    const pivot = onHeel ? heel : toe;
    const d = floor(pivot.x);
    const fh = floor(heel.x);
    const ft = floor(toe.x);
    if (d === null || fh === null || ft === null || [d, fh, ft].some((v) => Math.abs(v) > REACH)) return [];
    // The floor's own angle under the sole, whichever way he faces.
    const theta = Math.atan((ft - fh) / (toe.x - heel.x));
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    // A standing foot keeps its own height off the floor (a clip may lift it a hair) and rides the floor.
    const to = { x: pivot.x, y: pivot.y + d };
    // The foot turns to the slope about the point it stands on.
    const place = (q: Point): Point => ({
      x: to.x + c * (q.x - pivot.x) - s * (q.y - pivot.y),
      y: to.y + s * (q.x - pivot.x) + c * (q.y - pivot.y),
    });
    const heelTo = place(heel);
    const toeTo = place(toe);
    let rise = 0;
    for (let k = 0; k < SOLE_SAMPLES; k++) {
      const t = k / (SOLE_SAMPLES - 1);
      const q = { x: heelTo.x + (toeTo.x - heelTo.x) * t, y: heelTo.y + (toeTo.y - heelTo.y) * t };
      const fq = floor(q.x);
      if (fq !== null) rise = Math.max(rise, q.y - (line + fq));
    }
    const up = (q: Point): Point => ({ x: q.x, y: q.y - rise });
    const ankleTo = up(place(at(n.ankle)));
    return [{ leg, line, heel, toe, fh, ft, pivot, onHeel, d, theta, ankleTo, toeTo: up(toeTo), pivotTo: up(to), need: ankleTo.y - at(n.ankle).y, standing: pivot.y >= line - PLANTED }];
  });
  const standing = feet.filter((f) => f.standing);
  // The body drops by what the most demanding standing ankle needs, so every leg only bends.
  const shift = standing.length ? Math.max(...standing.map((f) => f.need)) : 0;
  // A lifted foot is placed too wherever the drop would sink its heel or toe into the slope.
  const moved = feet.filter((f) => f.standing || f.heel.y + shift > f.line + f.fh || f.toe.y + shift > f.line + f.ft);
  if (moved.every((f) => Math.abs(f.need - shift) < 1e-9 && Math.abs(f.d) < 1e-9 && Math.abs(f.theta) < 1e-9)) return { pose, dy: dy0 + shift, gap: 0 };

  const out = structuredClone(pose);
  const rest = (p: Point): Point => ({
    x: p.x / (s0.scale * facing * s0.squash.x) - pose.root.x,
    y: -p.y / (s0.scale * s0.squash.y) - pose.root.y,
  });
  // Back to the solve's frame: the whole body is drawn `dy0 + shift` lower.
  const back = (q: Point): Point => rest({ x: q.x, y: q.y - dy0 - shift });
  for (const f of moved) {
    const n = PARTS[f.leg];
    const ankle = back(f.ankleTo);
    const toe = back(f.toeTo);
    const hip = rest(j[n.hip]);
    const knee = rest(j[n.knee]);
    const was = rest(j[n.ankle]);
    // Keep the knee on the side it already bends to.
    const cross = (was.x - hip.x) * (knee.y - hip.y) - (was.y - hip.y) * (knee.x - hip.x);
    const r = legTo(f.leg, ankle, Math.atan2(toe.y - ankle.y, toe.x - ankle.x) * DEG, cross >= 0 ? 1 : -1);
    out.rot[n.hip] = r.hip;
    out.rot[n.knee] = r.knee;
    out.rot[n.ankle] = r.ankle;
  }
  const s1 = solve(out, facing, headScale, plate);
  const dy = dy0 + shift;
  let gap = 0;
  for (const f of moved) {
    const n = PARTS[f.leg];
    const q = s1.joints[f.onHeel ? n.heel : n.toe];
    gap = Math.max(gap, Math.hypot(q.x - f.pivotTo.x, q.y + dy - f.pivotTo.y));
  }
  return { pose: out, dy, gap };
}
