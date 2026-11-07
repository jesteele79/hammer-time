import type { CastSpawn, Level } from "../level";

/** The four barriers' spans: the crowd stands two behind each. */
const BARRIERS: [number, number][] = [
  [1200, 1500],
  [2400, 2700],
  [8200, 8500],
  [9600, 9900],
  [12600, 12900],
];
const BLEACHERS: [number, number][] = [
  [3400, 4600],
  [7000, 7800],
  [13300, 14100],
];
/** The crowd in summer colors, each a mask its painting already has. */
const FANS: [CastSpawn["person"], string | undefined][] = [
  ["office-1", "#c8d8b0"],
  ["student-1", "#c9a227"],
  ["lunch-1", undefined],
  ["prof-1", undefined],
  ["server-1", "#3b4a6b"],
  ["cook-1", "#4e5f6e"],
  ["student-2", "#2a8c8a"],
  ["office-2", "#d9c7b8"],
  ["busser-1", undefined],
  ["bellhop-2", "#4a5a3a"],
];
const crowd: CastSpawn[] = BARRIERS.flatMap(([x0, x1], b) =>
  [x0 + 70, x1 - 70].map((x, k) => {
    const [person, recolor] = FANS[b * 2 + k];
    return { id: `fan-${b * 2 + k + 1}`, person, x, y: 0, facing: (k === 0 ? 1 : -1) as 1 | -1, trick: "cheer" as const, ...(recolor ? { recolor } : {}) };
  }),
);

/**
 * 3-4, Basel in Tattoo week (story spec §10.1): from his hotel by the Kaserne along the Rhine, over the Mittlere Brücke into
 * the old town, to the office's door past the Münster; four errands at their counters, the door shut until they are done.
 * The ramp at the Marktplatz rises to the left, the way the bikes ride it: walked up from the old town's side, its face
 * jumped from the bridge's.
 */
export const BASEL: Level = {
  id: "basel",
  name: "Basel, Tattoo week",
  world: "3-4",
  length: 16000,
  spawn: { x: 150, y: 0 },
  time: 420,
  music: "basel",
  card: "14 July. 18:10. Four errands and a meeting.",
  dusk: true,
  floor: [
    { x0: 0, x1: 16000, y0: 0, y1: 0, kind: "stone" },
    { x0: 10600, x1: 10700, y0: -220, y1: -220, kind: "ramp" },
    { x0: 10700, x1: 11000, y0: -220, y1: 0, kind: "ramp" },
  ],
  platforms: [
    ...BARRIERS.map(([x0, x1]) => ({ x0, x1, y: -120, kind: "barrier" as const })),
    // Each bleacher's two lower tiers step up to its top, which stands over the pipes.
    ...BLEACHERS.flatMap(([x0, x1]) => [
      { x0: x0 - 300, x1: x0 - 150, y: -180, kind: "tier" as const },
      { x0: x0 - 150, x1: x0, y: -350, kind: "tier" as const },
      { x0, x1, y: -520, kind: "bleacher" as const },
    ]),
    { x0: 4800, x1: 5200, y: -300, kind: "tent" },
    { x0: 12200, x1: 12500, y: -300, kind: "tent" },
  ],
  solids: [
    { x: -40, y: -1400, w: 40, h: 1400 },
    // The ramp's high end: a face to jump, not to walk under.
    { x: 10580, y: -220, w: 20, h: 220 },
    { x: 16000, y: -1400, w: 60, h: 1400 },
  ],
  passes: [],
  bounds: { x: -400, y: -1400, w: 16800, h: 2000 },
  movers: [
    { id: "bike-1", x: 15800, y: 0, x0: 15800, x1: 2600, w: 200, h: 110, speed: 900, loop: -1, every: 11, first: 6, jump: { x: 11000, d: 700, h: 320 } },
    { id: "bike-2", x: 15800, y: 0, x0: 15800, x1: 2600, w: 200, h: 110, speed: 900, loop: -1, every: 11, first: 6.5, jump: { x: 11000, d: 700, h: 320 } },
  ],
  crates: [
    { id: "tent-1", kind: "can", x: 5000, y: -300, look: "cabinet" },
    { id: "tent-2", kind: "can", x: 12350, y: -300, look: "cabinet" },
  ],
  checkpoints: [
    { id: "bridge", x: 5600, y: 0 },
    { id: "marktplatz", x: 11000, y: 0 },
  ],
  errands: [
    { id: "bank", x: 7900, line: "Francs. Not euros. Not dollars. FRANCS." },
    { id: "printer", x: 9800, line: "Forty copies. Stapled." },
    { id: "pharmacy", x: 11500, line: "It's a TUESDAY." },
    { id: "courier", x: 14800, line: "That's a $400 demo unit." },
  ],
  doors: [{ id: "office", kind: "exit", x: 15700, y: 0, label: "BASEL OFFICE", errands: true }],
  signs: [
    { x: 7900, y: -300, label: "BANK" },
    { x: 9800, y: -300, label: "COPY" },
    { x: 11500, y: -300, label: "APOTHEKE" },
    { x: 14800, y: -300, label: "KURIER" },
  ],
  furniture: [],
  carts: [],
  lights: [],
  camera: { zones: [] },
  rewards: { count: 8, bucees: 1, nuts: 2 },
  routes: [{ id: "street", x0: 800, x1: 15000, y0: -80, y1: 0 }],
  home: { x: 900, cx: 1400 },
  thoughts: [
    { x: 1000, text: "Don't these people work?" },
    { x: 3000, text: "It's a TUESDAY." },
    { x: 6800, text: "Who approved this?" },
    { x: 10300, text: "That's not a schedule. That's a parade." },
  ],
  // The bands cross him at every errand; the drum corps plays in front of the Rathaus, near enough the Marktplatz's barrier.
  parade: {
    bands: [
      { id: "band-1", from: 1000, x: 3200, x1: 400, color: "#2f4f7f" },
      { id: "band-2", from: 6600, x: 8800, x1: 6000, color: "#7a1f2b" },
      { id: "band-3", from: 10400, x: 12400, x1: 9800, color: "#2f4f7f" },
      { id: "band-4", from: 13200, x: 15400, x1: 12800, color: "#7a1f2b" },
    ],
    corps: { x: 12400, reach: 600 },
  },
  cast: [
    // The drill team on the bridge, rifles at the shoulder; drummers out of the ranks at the ramp's foot.
    { id: "drill-1", person: "drill", x: 4200, y: 0, x0: 3900, x1: 4500 },
    { id: "drill-2", person: "drill", x: 5300, y: 0, x0: 5000, x1: 5600 },
    { id: "drill-3", person: "drill", x: 6400, y: 0, x0: 6100, x1: 6700 },
    ...[11050, 11150, 11250, 11350].map((x, k) => ({ id: `drummer-${k + 1}`, person: "drummer" as const, x, y: 0, x0: x - 150, x1: x + 150 })),
    // The four counters' people, behind them: the bank, the copy shop, the pharmacy, the courier.
    { id: "teller-bank", person: "office-2", x: 7900, y: 0, recolor: "#5b6b84", trick: "seated" },
    { id: "teller-copy", person: "server-2", x: 9800, y: 0, trick: "seated" },
    { id: "teller-apotheke", person: "nurse", x: 11500, y: 0, trick: "seated" },
    { id: "teller-kurier", person: "busser-1", x: 14800, y: 0, trick: "seated" },
    ...crowd,
  ],
};
