const PAL: Record<string, string> = {
  o: "#1a120c",
  s: "#ffd0ae",
  h: "#3a2924",
  l: "#f2c14e",
  g: "#ffe9a0",
  a: "#e07828",
  c: "#3c4658",
  p: "#f4efe2",
  b: "#6b3f24",
  d: "#2c2826",
  m: "#ff7a32",
  u: "#f0b070",
  n: "#d4783c",
  k: "#8a4124",
  w: "#f7f3ea",
  y: "#f6d56a",
  r: "#c44838",
  f: "#6f8a62",
  q: "#c9842e",
  z: "#efe0b0",
  t: "#5a341c",
  i: "#f4f7fb",
  v: "#8fbf3a",
  j: "#4f7a22",
  x: "#c5ced8",
};

function norm(rows: string[], w = 16): string[] {
  return rows.map((r) => {
    if (r.length > w) throw new Error(`sprite row too wide (${r.length}): ${r}`);
    return r.padEnd(w, ".");
  });
}

export function bake(rows: string[], w = 16): HTMLCanvasElement {
  const src = norm(rows, w);
  const h = src.length;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d");
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = src[y][x];
      if (!ch || ch === ".") continue;
      const color = PAL[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

const GUS_IDLE = [
  "....okkkkko.....",
  "...oknnnnnnko...",
  "..oknknnnknko...",
  "..okkkkkkkkko...",
  "..oswwoswwsso...",
  "..osowosowsso...",
  "..onnnnnnnnno...",
  "..oswwwwwwwso...",
  "..osorrrrrsoo...",
  "...osoooooso....",
  "...ordddddro....",
  "..oddddddddo....",
  "...occcccco.....",
  "...occcccco.....",
  "...obbbbbbo.....",
  "....oo..oo......",
];

const GUS_JUMP = [
  "....okkkkko.....",
  "...oknnnnnnko...",
  "..oknknnnknko...",
  "..okkkkkkkkko...",
  "..oswwoswwsso...",
  "..osowosowsso...",
  "..onnnnnnnnno...",
  "..oswwwwwwwso...",
  "..osorrrrrsoo...",
  "...osoooooso....",
  "..ordddddddro...",
  ".oodddddddddo...",
  "...occcccco.....",
  "...occcccco.....",
  "...ob..bbo......",
  "...oo..oo.......",
];

const GUS_SKID = [
  "....okkkkko.....",
  "...oknnnnnnko...",
  "..oknknnnknko...",
  "..okkkkkkkkko...",
  "..oswwoswwsso...",
  "..osowosowsso...",
  "..onnnnnnnnno...",
  "..oswwwwwwwso...",
  "..osorrrrrsoo...",
  "...osoooooso....",
  "...ordddddro....",
  "..oddddddddo....",
  "...occcccco.....",
  "..ooccccccoo....",
  "...obbbbbbo.....",
  "....oooooo......",
];

const RUN_LEGS = [
  ["...ob.bbo.......", "...ob.bbo.......", "...oo.ooo.......", "................"],
  ["...obbbo........", "...obbo.........", "...ooo..........", "................"],
  ["...obb.bo.......", "...obb.bo.......", "...ooo.oo.......", "................"],
  ["....obbbo.......", "....obbo........", "....ooo.........", "................"],
];

const TALL_TOP = [
  "....okkkkko.....",
  "...oknnnnnnko...",
  "..oknknnnknko...",
  "..okkkkkkkkko...",
  "..oswwoswwsso...",
  "..osowosowsso...",
  "..onnnnnnnnno...",
  "..oswwwwwwwso...",
  "..osorrrrrsoo...",
  "...osoooooso....",
  "...ordddddro....",
  "..oddddddddo....",
  "..oddddddddo....",
  "..odlwwldddo....",
  "...odddddo......",
  "...occccco......",
];

const TALL_JUMP_LEGS = [
  "...ob.bo........",
  "...oo.oo........",
  "................",
  "................",
];

function withLegs(top: string[], legs: string[]): string[] {
  return [...top.slice(0, 12), ...legs];
}

export type SpriteBook = {
  wickIdle: HTMLCanvasElement;
  wickJump: HTMLCanvasElement;
  wickSkid: HTMLCanvasElement;
  wickRun: HTMLCanvasElement[];
  tallIdle: HTMLCanvasElement;
  tallJump: HTMLCanvasElement;
  tallRun: HTMLCanvasElement[];
  hammerHold: HTMLCanvasElement;
  hammerHit: HTMLCanvasElement;
  soot: HTMLCanvasElement[];
  sootFlat: HTMLCanvasElement;
  bug: HTMLCanvasElement[];
  shell: HTMLCanvasElement;
  gear: HTMLCanvasElement;
  lamp: HTMLCanvasElement;
  coin: HTMLCanvasElement[];
  nuts: HTMLCanvasElement;
  treat: HTMLCanvasElement;
  ember: HTMLCanvasElement[];
  ground: HTMLCanvasElement;
  groundB: HTMLCanvasElement;
  brick: HTMLCanvasElement;
  question: HTMLCanvasElement[];
  power: HTMLCanvasElement[];
  used: HTMLCanvasElement;
  pipeCapL: HTMLCanvasElement;
  pipeCapR: HTMLCanvasElement;
  pipeL: HTMLCanvasElement;
  pipeR: HTMLCanvasElement;
  ledge: HTMLCanvasElement;
  shrub: HTMLCanvasElement;
  stack: HTMLCanvasElement;
  flag: HTMLCanvasElement;
};

export function loadSprites(): SpriteBook {
  const run = RUN_LEGS.map((legs) => bake(withLegs(GUS_IDLE, legs)));
  const tallRun = RUN_LEGS.map((legs) => bake([...TALL_TOP, ...legs]));
  return {
    wickIdle: bake(GUS_IDLE),
    wickJump: bake(GUS_JUMP),
    wickSkid: bake(GUS_SKID),
    wickRun: run,
    tallIdle: bake([...TALL_TOP, ...RUN_LEGS[1]]),
    tallJump: bake([...TALL_TOP, ...TALL_JUMP_LEGS]),
    tallRun,
    hammerHold: bake(
      [
        "..iiii....",
        "..iwwi....",
        "...bb.....",
        "...bb.....",
        "...bb.....",
        "...bb.....",
        "...oo.....",
        "..........",
      ],
      10,
    ),
    hammerHit: bake(
      [
        "........ii",
        "bbbbbbbwii",
        "bbbbbbbwoi",
        "........ii",
        "..........",
        "..........",
      ],
      10,
    ),
    soot: [
      bake([
        "................",
        "....oddddo......",
        "...odmmmdo......",
        "..odmdddmdo.....",
        "..odoododdo.....",
        "..odddddddo.....",
        "...oddddodo.....",
        "...oddddoo......",
        "....obbooo......",
        "....ob..bo......",
        "....oo..oo......",
        "................",
      ]),
      bake([
        "................",
        "....oddddo......",
        "...odmmmdo......",
        "..odmdddmdo.....",
        "..odoododdo.....",
        "..odddddddo.....",
        "...oddddodo.....",
        "...oddddoo......",
        ".....obbo.......",
        "....ob..bo......",
        "...oo....oo.....",
        "................",
      ]),
    ],
    sootFlat: bake([
      "................",
      "................",
      "................",
      "................",
      "..oddddddddo....",
      "..omddddddmo....",
      "...oooooooo.....",
      "................",
    ]),
    bug: [
      bake([
        "....onnnno......",
        "...onuununo.....",
        "..onuuuuuuno....",
        "..onuuuuuuno....",
        "..oooooooooo....",
        "..owwwwwwwwo....",
        "...obbbbbbo.....",
        "...ob....bo.....",
        "...oo....oo.....",
        "................",
      ]),
      bake([
        "....onnnno......",
        "...onuununo.....",
        "..onuuuuuuno....",
        "..onuuuuuuno....",
        "..oooooooooo....",
        "..owwwwwwwwo....",
        "....obbbbo......",
        "...ob....bo.....",
        "..oo......oo....",
        "................",
      ]),
    ],
    shell: bake([
      "................",
      "....onnnno......",
      "...onuununo.....",
      "..onuuuuuuno....",
      "..onuuuuuuno....",
      "..oooooooooo....",
      "...okkkkkko.....",
      "................",
    ]),
    gear: bake([
      "...oyyyyo...",
      "..oysssssyo.",
      "..oysyysyso.",
      "..oysssssyo.",
      "...oyyyyoo..",
      "....oooo....",
      "............",
      "............",
    ]),
    lamp: bake([
      "....rrrr....",
      "...rrrrrr...",
      "..rrrrrrro..",
      "...rrvvrrro..",
      "....oooo....",
      ".....vv.....",
      "............",
      "............",
    ]),
    coin: [
      bake(["..iiiiii....", ".idddddi....", ".idvvvdi....", ".idddddi....", "..iiiiii....", "............", "............", "............"], 12),
      bake(["....ii......", "....dd......", "....vv......", "....dd......", "....ii......", "............", "............", "............"], 12),
      bake(["..iiiiii....", ".idwdddi....", ".idddvdi....", ".idddddi....", "..iiiiii....", "............", "............", "............"], 12),
      bake(["....ii......", "....dd......", "....wd......", "....dd......", "....ii......", "............", "............", "............"], 12),
    ],
    nuts: bake(["..oooooo....", ".okkkkkko...", ".okykykko...", ".okkkkkko...", "..oooooo....", "............", "............", "............"], 12),
    treat: bake(["..oyyyyo....", ".oyrrryyo...", ".oyyyyyyo...", ".oyyayyyo...", "..oooooo....", "............", "............", "............"], 12),
    ember: [
      bake(["..vvvv..", ".vjvvvvj", "vvvvvvvj", ".vvvvvj.", "..vvvj..", "........"], 8),
      bake(["...vv...", "..vjvv..", ".vvvvvj.", "..vvvj..", "...vj...", "........"], 8),
    ],
    ground: bake([
      "cccccccccccccccc",
      "iiiiiiiiiiiiiiii",
      "xxxxxxxxxxxxxxxx",
      "xxxcxxxxxxxxxcxx",
      "xxxxxxxxxxxxxxxx",
      "xxxxxxxxxxxxxxxx",
      "xcxxxxxxxxxxxcxx",
      "xxxxxxxxxxxxxxxx",
      "xxxxxxxxxxxxxxxx",
      "xxxcxxxxxxxxxcxx",
      "xxxxxxxxxxxxxxxx",
      "xxxxxxxxxxxxxxxx",
      "xcxxxxxxxxxxxcxx",
      "xxxxxxxxxxxxxxxx",
      "xxxxxxxxxxxxxxxx",
      "dddddddddddddddd",
    ]),
    groundB: bake([
      "cccccccccccccccc",
      "iiiiiiiiiiiiiiii",
      "xxxxxxxxxxxxxxxx",
      "cxxxxxxxxxxxcxxx",
      "xxxxxxxxxxxxxxxx",
      "xxxxxxxxxxxxxxxx",
      "xxxcxxxxxxxxxxcx",
      "xxxxxxxxxxxxxxxx",
      "xxxxxxxxxxxxxxxx",
      "cxxxxxxxxxxxcxxx",
      "xxxxxxxxxxxxxxxx",
      "xxxxxxxxxxxxxxxx",
      "xxxcxxxxxxxxxxcx",
      "xxxxxxxxxxxxxxxx",
      "xxxxxxxxxxxxxxxx",
      "dddddddddddddddd",
    ]),
    brick: bake([
      "bbbbbbbbbbbbbbbb",
      "kkkkkkkkkkkkkkkk",
      "iiiiiiiiiiiiiiii",
      "iccccccccccccci",
      "icccccwwcccccci",
      "iiiiiiiiiiiiiiii",
      "iccccccccccccci",
      "icccccwwcccccci",
      "iiiiiiiiiiiiiiii",
      "iccccccccccccci",
      "icccccwwcccccci",
      "iiiiiiiiiiiiiiii",
      "cccccccccccccccc",
      "iiiiiiiiiiiiiiii",
      "icccccwwcccccci",
      "dddddddddddddddd",
    ]),
    question: [
      bake([
        "oooooooooooooooo",
        "oyyyyyyyyyyyyyyo",
        "oylllglllgggllyo",
        "oylggglglglgglyo",
        "oylggglglglgglyo",
        "oylllglllgggllyo",
        "oyyyyyyyyyyyyyyo",
        "oooooooooooooooo",
        "oyyyyyyyyyyyyyyo",
        "oylggggglgggglyo",
        "oylglggglglgglyo",
        "oylggggglgggllyo",
        "oyyyyyyyyyyyyyyo",
        "oooooooooooooooo",
        "oyyyyyyyyyyyyyyo",
        "oooooooooooooooo",
      ]),
      bake([
        "oooooooooooooooo",
        "ollllllllllllllo",
        "olglllglllgggllo",
        "olggglglglgggllo",
        "olggglglglgggllo",
        "olglllglllgggllo",
        "ollllllllllllllo",
        "oooooooooooooooo",
        "ollllllllllllllo",
        "olggggglgggggllo",
        "olglggglglgggllo",
        "olggggglgglllllo",
        "ollllllllllllllo",
        "oooooooooooooooo",
        "ollllllllllllllo",
        "oooooooooooooooo",
      ]),
    ],
    power: [
      bake([
        "oooooooooooooooo",
        "oyyyyyyyyyyyyyyo",
        "oylllglllgggllyo",
        "oylggglglylgglyo",
        "oylggggglgggglyo",
        "oylllglllgggllyo",
        "oyyyyyyyyyyyyyyo",
        "oooooooooooooooo",
        "oyyyyyyyyyyyyyyo",
        "oyggggglggggggyo",
        "oyglggglggglggyo",
        "oyggggglggggglyo",
        "oyyyyyyyyyyyyyyo",
        "oooooooooooooooo",
        "oyyyyyyyyyyyyyyo",
        "oooooooooooooooo",
      ]),
      bake([
        "oooooooooooooooo",
        "ollllllllllllllo",
        "olglllglllgggllo",
        "olggglglylgggllo",
        "olggggglgggggllo",
        "olglllglllgggllo",
        "ollllllllllllllo",
        "oooooooooooooooo",
        "ollllllllllllllo",
        "olggggglgggggglo",
        "olglggglggglgglo",
        "olggggglgggggllo",
        "ollllllllllllllo",
        "oooooooooooooooo",
        "ollllllllllllllo",
        "oooooooooooooooo",
      ]),
    ],
    used: bake([
      "oooooooooooooooo",
      "ozzzzzzzzzzzzzzo",
      "ozkkkzkzkzkzkzzo",
      "ozzkzkzkzkzkzkzo",
      "ozkkkzkzkzkzkzzo",
      "ozzzzzzzzzzzzzzo",
      "oooooooooooooooo",
      "ozzzzzzzzzzzzzzo",
      "ozkzkzkzkzkzkzzo",
      "ozzkzkzkzkzkzkzo",
      "ozkzkzkzkzkzkzzo",
      "ozzzzzzzzzzzzzzo",
      "oooooooooooooooo",
      "ozzzzzzzzzzzzzzo",
      "ozzzzzzzzzzzzzzo",
      "oooooooooooooooo",
    ]),
    pipeCapL: bake([
      "oooooooooooooooo",
      "ouuuuuuuuuuuuuuo",
      "ouunnnnnnnnnnnno",
      "ouunnnnnnnnnnnno",
      "oooooooooooooooo",
      "ouuunnnnnnnnnnno",
      "ouuunnnnnnnnnnno",
      "ouuunnnnnnnnnnno",
      "okuunnnnnnnnnnno",
      "okuunnnnnnnnnnno",
      "okkkkkkkkkkkkkko",
      "okuunnnnnnnnnnno",
      "okuunnnnnnnnnnno",
      "okuunnnnnnnnnnno",
      "okkkkkkkkkkkkkko",
      "oooooooooooooooo",
    ]),
    pipeCapR: bake([
      "oooooooooooooooo",
      "ouuuuuuuuuuuuuuo",
      "onnnnnnnnnnnuuuo",
      "onnnnnnnnnnnuuuo",
      "oooooooooooooooo",
      "onnnnnnnnnnuuuuo",
      "onnnnnnnnnnuuuuo",
      "onnnnnnnnnnuuuuo",
      "onnnnnnnnnnukkko",
      "onnnnnnnnnnukkko",
      "okkkkkkkkkkkkkko",
      "onnnnnnnnnnukkko",
      "onnnnnnnnnnukkko",
      "onnnnnnnnnnukkko",
      "okkkkkkkkkkkkkko",
      "oooooooooooooooo",
    ]),
    pipeL: bake([
      "okkkkkkkkkkkkkko",
      "ouuunnnnnnnnnnno",
      "ouuunnnnnnnnnnno",
      "ouuunnnnnnnnnnno",
      "okkkkkkkkkkkkkko",
      "ouuunnnnnnnnnnno",
      "ouuunnnnnnnnnnno",
      "ouuunnnnnnnnnnno",
      "okkkkkkkkkkkkkko",
      "ouuunnnnnnnnnnno",
      "ouuunnnnnnnnnnno",
      "ouuunnnnnnnnnnno",
      "okkkkkkkkkkkkkko",
      "ouuunnnnnnnnnnno",
      "ouuunnnnnnnnnnno",
      "oooooooooooooooo",
    ]),
    pipeR: bake([
      "okkkkkkkkkkkkkko",
      "onnnnnnnnnnuuuuo",
      "onnnnnnnnnnuuuuo",
      "onnnnnnnnnnuuuuo",
      "okkkkkkkkkkkkkko",
      "onnnnnnnnnnuuuuo",
      "onnnnnnnnnnuuuuo",
      "onnnnnnnnnnuuuuo",
      "okkkkkkkkkkkkkko",
      "onnnnnnnnnnuuuuo",
      "onnnnnnnnnnuuuuo",
      "onnnnnnnnnnuuuuo",
      "okkkkkkkkkkkkkko",
      "onnnnnnnnnnuuuuo",
      "onnnnnnnnnnuuuuo",
      "oooooooooooooooo",
    ]),
    ledge: bake([
      "iiiiiiiiiiiiiiii",
      "cccccccccccccccc",
      "bbbbbbbbbbbbbbbb",
      "kkkkkkkkkkkkkkkk",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ]),
    shrub: bake([
      "......oooo......",
      "....ooffffo.....",
      "...offfffffo....",
      "..offfuffffo....",
      "..offfffffwo....",
      "...offffffo.....",
      "....oooooo......",
      "......tt........",
      "......tt........",
    ]),
    stack: bake([
      "..iiiiiiiiii....",
      "..iwwwwwwwwi....",
      "..iiiiiiiiii....",
      "..iwwwwwwwwi....",
      "..iiiiiiiiii....",
      "..iwwwwwwwwi....",
      "..oooooooooo....",
      ".....cccc.......",
      "....cccccc......",
      "................",
      "................",
      "................",
    ]),
    flag: bake([
      "owwww.......",
      "wvvvwo......",
      "wvvvwo......",
      "owwww.......",
      "............",
    ], 12),
  };
}
