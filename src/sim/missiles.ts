export type MissileKind = "plane" | "coffee";
/** Something thrown at him: `phase` seeds a plane's wobble, `from` is the thrower. */
export type Missile = { id: number; kind: MissileKind; x: number; y: number; vx: number; vy: number; spin: number; life: number; phase: number; from: number };
