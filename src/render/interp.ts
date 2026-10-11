import type { Snapshot } from "../sim/types";

/** The props between the last two steps, matched by id: what slow motion shows between them. */
export function between(prev: Snapshot, cur: Snapshot, alpha: number): Pick<Snapshot, "targets" | "snot" | "puddles"> {
  const at = (a: number, b: number) => a + (b - a) * alpha;
  const carts = new Map(prev.targets.map((t) => [t.id, t]));
  const blobs = new Map(prev.snot.map((b) => [b.id, b]));
  return {
    targets: cur.targets.map((t) => {
      const p = carts.get(t.id);
      return p ? { ...t, x: at(p.x, t.x), y: at(p.y, t.y) } : t;
    }),
    snot: cur.snot.map((b) => {
      const p = blobs.get(b.id);
      return p ? { ...b, x: at(p.x, b.x), y: at(p.y, b.y) } : b;
    }),
    puddles: cur.puddles,
  };
}
