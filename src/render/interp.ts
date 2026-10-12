import type { Snapshot } from "../sim/types";

/** The props, the cast and the missiles between the last two steps, matched by id: what slow motion shows between them. */
export function between(prev: Snapshot, cur: Snapshot, alpha: number): Pick<Snapshot, "targets" | "snot" | "puddles" | "cast" | "missiles"> {
  const at = (a: number, b: number) => a + (b - a) * alpha;
  const carts = new Map(prev.targets.map((t) => [t.id, t]));
  const blobs = new Map(prev.snot.map((b) => [b.id, b]));
  const people = new Map(prev.cast.map((n) => [n.id, n]));
  const thrown = new Map(prev.missiles.map((m) => [m.id, m]));
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
    cast: cur.cast.map((n) => {
      const p = people.get(n.id);
      return p ? { ...n, x: at(p.x, n.x), y: at(p.y, n.y) } : n;
    }),
    missiles: cur.missiles.map((m) => {
      const p = thrown.get(m.id);
      return p ? { ...m, x: at(p.x, m.x), y: at(p.y, m.y) } : m;
    }),
  };
}
