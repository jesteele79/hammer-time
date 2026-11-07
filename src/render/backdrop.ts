import { Assets, BlurFilter, Container, Graphics, Rectangle, Sprite, Texture, TilingSprite } from "pixi.js";
import { ART_BASE, type Rect, type Registry, type Wall } from "../art/registry";
import type { Level } from "../sim/level";
import type { FloorSegment } from "../sim/types";
import { FLOOR } from "./ink";
import { PALETTE, shadowOf, highlightOf, tones } from "./palette";
import { PARALLAX, type Scene } from "./scene";

/** Where the floor meets the wall in the lobby's far plate, in plate px. */
const FAR_FLOOR_LINE = 700;
const FAR_SCALE = 1.4;
/** The venue sorts behind everything that moves: Hammer, the carts and the snot. */
export const SCENERY_Z = -1e6;
const MID_OUTLINE = 3;

function gradientTexture(stops: [number, string][], vertical = true): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = vertical ? 2 : 256;
  canvas.height = vertical ? 256 : 2;
  const ctx = canvas.getContext("2d")!;
  const g = vertical ? ctx.createLinearGradient(0, 0, 0, 256) : ctx.createLinearGradient(0, 0, 256, 0);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return Texture.from(canvas);
}

/** The far plane's walls are drawn at most at this scale, at least at WALL_MIN; the mid plane's pieces at MID_SCALE, the fore plane's at full size. */
export const WALL_SCALE = 1.4;
const WALL_MIN = 0.9;
export const MID_SCALE = 0.6;
/** How fast the painted planes follow the ground he stands on, per second. */
const GROUND_EASE = 4;
/** Half the widest view the camera shows (21:9 at zoom 0.88), so the far plane never runs out at a level's ends. */
export const VIEW_HALF = 1400;
/** The fore pieces: darker, a little blurred, and set this far in front of the floor line. */
const FORE = { tint: 0xb3b3b3, blur: 2, down: 60, faded: 0.2, ease: 6 } as const;
const WALL_TINT = "#c4b9ad";
/** The solid ground under a painted venue's floors, so no wall's painted floor shows beneath the game's. */
const GROUND = "#1d1714";
const MID_TINT = "#b8ad9f";

/** Every texture, or null if any fails to load: the caller draws what stands in for them. */
async function loadAll(urls: string[]): Promise<Texture[] | null> {
  try {
    return await Promise.all(urls.map((u) => Assets.load<Texture>(u)));
  } catch (err) {
    console.warn(`backdrop: ${urls.join(", ")} did not load, a stand-in is drawn (${(err as Error).message})`);
    return null;
  }
}

/**
 * A venue's walls in order, or null. A row is all or nothing: a venue with any wall missing draws its photo, never a partial
 * row. A layout (3-2, 3-4) draws the walls it has, a flat stand-in in a missing one's place: null there.
 */
export function wallsFor(level: Pick<Level, "backdrop">, registry: Pick<Registry, "walls">): (Wall | null)[] | null {
  const names = level.backdrop?.walls ?? [];
  if (!names.length) return null;
  const walls = names.map((n) => registry.walls?.[n] ?? null);
  if (walls.every(Boolean)) return walls;
  return level.backdrop?.layout && walls.some(Boolean) ? walls : null;
}
/** What a missing wall of a layout measures: the painted walls' 1536 by 1024, the floor three-quarters down. */
const FLAT: Wall = { file: "", width: 1536, height: 1024, floor: 768, top: "#c9b79a", bottom: "#8f857a" };

/**
 * One scale per venue: its walls side by side span its length in the far plane, so each stands behind its own stretch
 * in walking order (the dining room's wall behind the dining room); a short arena keeps WALL_MIN and centres them.
 */
export function wallScale(walls: Pick<Wall, "width">[], level: Pick<Level, "bounds"> & Partial<Pick<Level, "backdrop">>): number {
  if (level.backdrop?.far) return level.backdrop.far.scale;
  const total = walls.reduce((a, w) => a + w.width, 0);
  return Math.min(WALL_SCALE, Math.max(WALL_MIN, (level.bounds.w * PARALLAX.far) / total));
}

/** How far a venue's far plane scrolls per world px of camera travel. */
export const farPan = (level: Partial<Pick<Level, "backdrop">>): number => level.backdrop?.far?.pan ?? PARALLAX.far;

/** The ground at x: the lowest floor there (a belt or a stair over the floor is not the ground), or null over a pit. */
export function groundAt(floor: readonly Pick<FloorSegment, "x0" | "x1" | "y0" | "y1">[], x: number): number | null {
  let ground: number | null = null;
  for (const f of floor) {
    if (x < f.x0 || x > f.x1) continue;
    const y = f.y0 + ((f.y1 - f.y0) * (x - f.x0)) / (f.x1 - f.x0 || 1);
    ground = ground === null ? y : Math.max(ground, y);
  }
  return ground;
}

/** Where each wall stands in the far plane: side by side at `scale`, the row centred on `center`, the first and last walls repeated outward until `extent` is covered. */
export function layWalls(walls: Pick<Wall, "width">[], scale: number, center: number, extent: [number, number]): { index: number; x: number }[] {
  const widths = walls.map((w) => w.width * scale);
  const total = widths.reduce((a, b) => a + b, 0);
  const out: { index: number; x: number }[] = [];
  let x = center - total / 2;
  walls.forEach((_, i) => {
    out.push({ index: i, x });
    x += widths[i];
  });
  for (let right = x; right < extent[1]; right += widths[walls.length - 1]) out.push({ index: walls.length - 1, x: right });
  for (let left = center - total / 2; left > extent[0]; ) {
    left -= widths[0];
    out.unshift({ index: 0, x: left });
  }
  return out;
}

/**
 * A tall level's walls, a floor at a time (the tower): each row's floor line on its landing, the wall scaled so its top row
 * meets the landing above, alternating walls up the floors and across the row; one row past the top floor for the ceiling.
 * The highest floor comes first: a lower floor's wall, drawn over it, covers the carpet painted under the one above.
 */
export function stackWalls(level: Pick<Level, "bounds" | "floors">, walls: Pick<Wall, "width" | "height" | "floor">[], pan: number, half: number): { floor: number; y: number; scale: number; columns: { index: number; x: number }[] }[] {
  const every = level.floors?.every ?? 540;
  const b = level.bounds;
  const top = Math.ceil(-b.y / every);
  const from = b.x * pan - half;
  const to = (b.x + b.w) * pan + half;
  const rows = [];
  for (let k = top; k >= 1; k--) {
    const columns: { index: number; x: number }[] = [];
    let x = from - walls[0].width * (every / walls[0].floor);
    let c = 0;
    while (x < to) {
      const index = (k + c) % walls.length === 0 ? 1 % walls.length : 0;
      columns.push({ index, x });
      x += walls[index].width * (every / walls[index].floor);
      c++;
    }
    rows.push({ floor: k, y: -every * (k - 1), scale: every / walls[columns[0].index].floor, columns });
  }
  return rows;
}

/**
 * A level's walls by its explicit layout (3-2): each at its `x` and floor `y`, and how much of it shows above that floor:
 * as painted, or up to the floor of a wall stacked over it.
 */
export function placementsOf(backdrop: NonNullable<Level["backdrop"]>, walls: (Wall | null)[]): { wall: Wall; index: number; x: number; y: number; above: number; flat: boolean }[] {
  const scale = backdrop.far?.scale ?? 1;
  const names = backdrop.walls;
  const layout = backdrop.layout ?? [];
  return layout.map((p) => {
    const index = names.indexOf(p.wall);
    const wall = walls[index] ?? FLAT;
    const y = p.y ?? 0;
    const over = layout.filter((o) => o.x === p.x && (o.y ?? 0) < y).map((o) => y - (o.y ?? 0));
    return { wall, index, x: p.x, y, above: over.length ? Math.min(...over) : wall.floor * scale, flat: !walls[index] };
  });
}

export type Backdrop = {
  setVisible(on: boolean): void;
  update(face: Rect | null, dt: number, ground: number | null): void;
  /** What the coaches' windows look out on. */
  countryside: Countryside | null;
};

/** The wall a room shows: its own by name, or the list's by order. */
export function roomWallOf(level: Partial<Pick<Level, "rooms" | "backdrop">>, i: number, registry: Pick<Registry, "walls">): Wall | null {
  const room = level.rooms?.[i];
  const name = room && (room.wall ?? level.backdrop?.walls[i]);
  return (name && registry.walls?.[name]) || null;
}

/** What's out of the window at a place on the train: fields before the tunnel, hills after. */
/** `passed`: the tunnel already gone through this life, so stepping back out of its mouth keeps the hills. */
export const countrysidePhase = (level: Pick<Level, "tunnel">, x: number, passed = false): "fields" | "hills" => (level.tunnel && (passed || x >= level.tunnel.x) ? "hills" : "fields");

/** The coaches' panes in the world: a wall's own px, scaled to its room. */
export function countryWindows(level: Partial<Pick<Level, "rooms" | "backdrop">>, registry: Pick<Registry, "walls">): Rect[] {
  return (level.rooms ?? []).flatMap((r, i) => {
    const w = roomWallOf(level, i, registry);
    if (!w?.windows) return [];
    const k = (r.x1 - r.x0) / w.width;
    return w.windows.map(([x, y, wide, high]) => ({ x: r.x0 + x * k, y: (y - w.floor) * k, w: wide * k, h: high * k }));
  });
}

const COUNTRY = { scroll: 1.5, drift: 120, dark: 3, hedge: 170, tree: 110, column: 12, far: 0.4 } as const;

/**
 * The countryside in the coaches' windows, drawn over each flat pane and clipped by hand to it: green fields and hedges, then
 * after the tunnel blue-grey hills; it runs by at the train's speed and past the camera; black for the tunnel's three seconds.
 */
export class Countryside {
  readonly g = new Graphics();
  private drift = 0;
  private dark = 0;

  constructor(
    private readonly level: Pick<Level, "tunnel">,
    private readonly rects: Rect[],
  ) {}

  private passed = false;

  enterTunnel(): void {
    this.dark = COUNTRY.dark;
    this.passed = true;
  }

  /** A life begins again: the tunnel is ahead of him once more if he stands before it. */
  reset(): void {
    this.passed = false;
    this.dark = 0;
  }

  /** The panes on screen now, for the browser check. */
  showing(cameraX: number, half: number): Rect[] {
    return this.rects.filter((r) => r.x + r.w > cameraX - half && r.x < cameraX + half);
  }

  sync(cameraX: number, half: number, heroX: number, dt: number): void {
    this.dark = Math.max(0, this.dark - dt);
    this.drift += COUNTRY.drift * dt;
    const g = this.g.clear();
    const shift = cameraX * COUNTRY.scroll + this.drift;
    if (countrysidePhase(this.level, heroX) === "hills") this.passed = true;
    const fields = countrysidePhase(this.level, heroX, this.passed) === "fields";
    for (const r of this.showing(cameraX, half)) {
      if (this.dark > 0) g.rect(r.x, r.y, r.w, r.h).fill("#0b0c10");
      else if (fields) this.fields(g, r, shift);
      else this.hills(g, r, shift);
    }
  }

  private fields(g: Graphics, r: Rect, shift: number) {
    const at = (share: number) => r.y + r.h * share;
    g.rect(r.x, r.y, r.w, r.h).fill("#c9e0ea");
    g.rect(r.x, at(0.52), r.w, r.h * 0.1).fill("#9dbb86");
    g.rect(r.x, at(0.62), r.w, r.h * 0.38).fill("#7ca65a");
    g.rect(r.x, at(0.76), r.w, r.h * 0.09).fill("#8fb765");
    const across = (every: number, speed: number, wide: number, y0: number, y1: number, color: string) => {
      const s = shift * speed;
      for (let x = Math.floor((r.x + s - wide) / every) * every - s; x < r.x + r.w; x += every) {
        const a = Math.max(x, r.x);
        const b = Math.min(x + wide, r.x + r.w);
        if (b > a) g.rect(a, at(y0), b - a, r.h * (y1 - y0)).fill(color);
      }
    };
    across(COUNTRY.tree, COUNTRY.far, 16, 0.38, 0.54, "#3f6b3a");
    across(COUNTRY.hedge, 1, 26, 0.58, 0.68, "#4f7a3f");
  }

  private hills(g: Graphics, r: Rect, shift: number) {
    g.rect(r.x, r.y, r.w, r.h).fill("#c3cfdb");
    for (let x = r.x; x < r.x + r.w; x += COUNTRY.column) {
      const u = x + shift * COUNTRY.far;
      const top = 0.34 + 0.1 * Math.sin(u / 70) + 0.05 * Math.sin(u / 23);
      g.rect(x, r.y + r.h * top, Math.min(COUNTRY.column, r.x + r.w - x), r.h * (0.72 - top)).fill("#7d90a8");
    }
    g.rect(r.x, r.y + r.h * 0.72, r.w, r.h * 0.28).fill("#6f8f6a");
  }
}

/**
 * A level's planes behind and in front of the play: the sky; its painted walls side by side (or its inked photo while
 * any wall is missing); its painted mid pieces against them (or the code-drawn columns and palms); its fore pieces,
 * darkened and blurred, fading while his head is behind one. The stash has its block wall. The painted walls and pieces
 * stand on the ground he stands on, rising with him up the library steps and onto the dock; each wall's painted floor
 * carries on below it in its bottom row's color, and solid ground fills in under the game's floors.
 */
export async function loadBackdrop(scene: Scene, level: Level, registry: Registry): Promise<Backdrop> {
  const planes = { sky: new Container(), far: new Container(), mid: new Container(), fore: new Container() };
  // Hidden until its venue is shown: one loading in the background must not show its walls over the venue he is in.
  for (const c of Object.values(planes)) c.visible = false;
  scene.layers.sky.addChild(planes.sky);
  scene.layers.far.addChild(planes.far);
  scene.layers.mid.addChild(planes.mid);
  scene.layers.fore.addChild(planes.fore);
  // A night level's planes are dark from the start: its walls, its pieces and its sky (story spec §8.1).
  const night = level.ambient === "night";
  const wallTint = night ? PALETTE.nightWall : WALL_TINT;
  const midTint = night ? PALETTE.nightMid : MID_TINT;
  const foreTint = night ? PALETTE.nightFore : FORE.tint;
  const skyStops = night ? PALETTE.nightSky : ["#1c1512", "#3a2a22", "#5b4536"];
  const sky = new Sprite(gradientTexture([
    [0, skyStops[0]],
    [0.6, skyStops[1]],
    [1, skyStops[2]],
  ]));
  sky.width = 4096;
  sky.height = 2304;
  planes.sky.addChild(sky);

  const b = level.bounds;
  // The painted walls and pieces, each in a layer that stands on the ground.
  const grounded = { far: new Container(), mid: new Container(), fore: new Container() };
  planes.far.addChild(grounded.far);
  planes.mid.addChild(grounded.mid);
  planes.fore.addChild(grounded.fore);
  let groundY: number | null = null;
  const listed = wallsFor(level, registry);
  const walls = listed?.every(Boolean) ? (listed as Wall[]) : null;
  let countryside: Countryside | null = null;
  // A wall that does not load leaves the venue its photo, never a gap in the row.
  const textures = walls && (await loadAll(walls.map((w) => ART_BASE + w.file)));
  // A layout's walls each on its own: one missing or failing to load draws flat in its place.
  const laid = level.backdrop?.layout && listed ? await Promise.all(listed.map(async (w) => (w ? ((await loadAll([ART_BASE + w.file]))?.[0] ?? null) : null))) : null;
  if (level.backdrop?.layout && listed && laid) {
    const scale = level.backdrop.far?.scale ?? 1;
    // The topmost first, so a wall stacked under it covers what it painted below its own floor.
    for (const p of placementsOf(level.backdrop, listed).sort((a, b) => a.y - b.y)) {
      const w = p.wall;
      const tex = laid[p.index];
      if (p.flat || !tex) {
        const g = flatWall(p.x, p.y, w.width * scale, p.above);
        g.tint = wallTint;
        grounded.far.addChild(g);
        continue;
      }
      const cut = w.floor - p.above / scale;
      const s = new Sprite(cut > 0 ? new Texture({ source: tex.source, frame: new Rectangle(0, cut, w.width, w.height - cut) }) : tex);
      s.position.set(p.x, p.y - p.above);
      s.scale.set(scale);
      s.tint = wallTint;
      const above = new Graphics().rect(p.x, -4000, w.width * scale, 4000 + p.y - p.above).fill(w.top);
      const below = new Graphics().rect(p.x, p.y + (w.height - w.floor) * scale - 2, w.width * scale, 4000).fill(w.bottom ?? w.top);
      above.tint = below.tint = wallTint;
      // A floor's stacked over this one: nothing of this wall carries on up.
      if (p.above === w.floor * scale) grounded.far.addChild(above);
      grounded.far.addChild(below, s);
    }
    planes.mid.addChild(new Graphics().rect(-20000, FLOOR.depth, 60000, 6000).fill(GROUND));
  } else if (level.backdrop?.rooms && level.rooms && walls && textures) {
    // One wall a room, its width the room's, so its painted furniture stands where the room's platforms are.
    const rooms = level.rooms;
    rooms.forEach((r, i) => {
      // A room's own wall by name, or the list's by order.
      const at = r.wall ? level.backdrop!.walls.indexOf(r.wall) : i;
      const w = walls[at];
      const k = (r.x1 - r.x0) / w.width;
      const top = -w.floor * k;
      // Its top row carries on up, so the balcony's strip of wall never stops in mid air; its floor carries on down and past the rooms' ends.
      // On the train only the roof is up there.
      const above = level.coaches ? new Graphics().rect(0, 0, w.width, 1).fill(w.top) : new Sprite(new Texture({ source: textures[at].source, frame: new Rectangle(0, 0, w.width, 1) }));
      above.position.set(r.x0, -4000);
      above.scale.set(k, 4000 + top);
      const below = new Graphics().rect(r.x0, top + w.height * k - 2, r.x1 - r.x0, 4000);
      if (i === 0) below.rect(r.x0 - 800, 0, 800, 4000);
      if (i === rooms.length - 1) below.rect(r.x1, 0, 800, 4000);
      below.fill(w.bottom ?? w.top);
      const s = new Sprite(textures[at]);
      s.position.set(r.x0, top);
      s.scale.set(k);
      // Indoors the lamps add to the painting, so it takes the walls' tint; on the balcony only what is painted lights it.
      if (r.id !== "balcony") above.tint = below.tint = s.tint = wallTint;
      grounded.far.addChild(above, below, s);
    });
    if (level.coaches) {
      countryside = new Countryside(level, countryWindows(level, registry));
      grounded.far.addChild(countryside.g);
    }
  } else if (level.backdrop?.rooms) {
    planes.far.addChild(blockWall(level.length * 3));
  } else if (level.backdrop?.stack && walls && textures) {
    for (const row of stackWalls(level, walls, farPan(level), VIEW_HALF))
      for (const { index, x } of row.columns) {
        const w = walls[index];
        const k = (level.floors?.every ?? 540) / w.floor;
        const s = new Sprite(textures[index]);
        s.position.set(x, row.y - w.floor * k);
        s.scale.set(k);
        s.tint = wallTint;
        grounded.far.addChild(s);
      }
    planes.mid.addChild(new Graphics().rect(-20000, FLOOR.depth, 60000, 6000).fill(GROUND));
  } else if (level.backdrop?.stack) {
    // The walls not painted yet: plain block a floor at a time.
    planes.far.addChild(blockWall(level.length * 3, b.y, b.y + b.h));
  } else if (walls && textures) {
    const scale = wallScale(walls, level);
    const pan = farPan(level);
    const extent: [number, number] = [b.x * pan - VIEW_HALF, (b.x + b.w) * pan + VIEW_HALF];
    for (const { index, x } of layWalls(walls, scale, (b.x + b.w / 2) * pan, extent)) {
      const w = walls[index];
      const top = -w.floor * scale;
      // The wall carries on above the painting in its top row's color.
      const above = new Graphics().rect(x, -4000, w.width * scale, 4000 + top).fill(w.top);
      const below = new Graphics().rect(x, top + w.height * scale - 2, w.width * scale, 4000).fill(w.bottom ?? w.top);
      if (night) above.tint = below.tint = wallTint;
      grounded.far.addChild(above, below);
      const s = new Sprite(textures[index]);
      s.position.set(x, top);
      s.scale.set(scale);
      s.tint = wallTint;
      grounded.far.addChild(s);
    }
    // In the mid plane, so it stands in front of the walls; it runs level, so the plane's slower pan never shows.
    planes.mid.addChild(new Graphics().rect(-20000, FLOOR.depth, 60000, 6000).fill(GROUND));
  } else {
    const far = registry.backdrops[level.id]?.far;
    const texture = far ? (await loadAll([ART_BASE + far]))?.[0] : null;
    if (texture) {
      const tile = new TilingSprite({ texture, width: texture.width * 3, height: texture.height });
      tile.scale.set(FAR_SCALE);
      tile.position.set(-1500, -FAR_FLOOR_LINE * FAR_SCALE);
      tile.tint = wallTint;
      planes.far.addChild(tile);
    }
  }
  if (level.id === "stash") planes.far.addChild(blockWall(level.length));
  // SAT's walls are still to be painted: a drawn terminal wall stands in until they are.
  if (level.id === "sat" && !(walls && textures)) planes.far.addChild(terminalWall(level.length * farPan(level)));
  const piece = async (name: string): Promise<Sprite | null> => {
    const p = registry.pieces?.[name];
    const texture = p ? (await loadAll([ART_BASE + p.file]))?.[0] : null;
    if (!p || !texture) return null;
    const s = new Sprite(texture);
    s.anchor.set(p.base.x / p.width, p.base.y / p.height);
    return s;
  };
  let mids = 0;
  for (const m of level.backdrop?.mid ?? []) {
    const s = await piece(m.name);
    if (!s) continue;
    s.position.set(m.x * PARALLAX.mid, 0);
    s.scale.set(MID_SCALE);
    s.tint = midTint;
    grounded.mid.addChild(s);
    mids++;
  }
  if (!mids && level.id !== "stash" && !level.backdrop?.stack && !level.backdrop?.rooms && !level.backdrop?.layout && !level.hall) planes.mid.addChild(drawMid(level.length));
  const fores: Sprite[] = [];
  for (const f of level.backdrop?.fore ?? []) {
    const s = await piece(f.name);
    if (!s) continue;
    s.position.set(f.x * PARALLAX.fore, FORE.down);
    s.scale.set(f.scale ?? 1);
    s.tint = foreTint;
    s.filters = [new BlurFilter({ strength: FORE.blur })];
    grounded.fore.addChild(s);
    fores.push(s);
  }
  return {
    countryside,
    setVisible(on) {
      for (const c of Object.values(planes)) c.visible = on;
      if (on) scene.farPan = farPan(level);
    },
    update(face, dt, ground) {
      // Walls placed by a layout stand where the sim's floors are, whichever floor he is on.
      if (ground !== null && !level.backdrop?.layout) {
        groundY = groundY === null ? ground : groundY + (ground - groundY) * Math.min(1, GROUND_EASE * dt);
        for (const c of Object.values(grounded)) c.y = groundY;
      }
      for (const s of fores) {
        const r = s.getBounds();
        const behind = !!face && r.x < face.x + face.w && r.x + r.width > face.x && r.y < face.y + face.h && r.y + r.height > face.y;
        s.alpha += ((behind ? FORE.faded : 1) - s.alpha) * Math.min(1, FORE.ease * dt);
      }
    },
  };
}

/** A layout's wall not painted yet: a plain facade with a row of windows and a cornice over its floor, the paving below. */
function flatWall(x: number, floor: number, width: number, above: number): Graphics {
  const g = new Graphics();
  const face = tones(FLAT.top);
  const top = floor - above;
  g.rect(x, top - 4000, width, 4000).fill(tones("#e9d7b8").base);
  g.rect(x, top, width, above * 0.12).fill(tones("#8a4b3a").base);
  g.rect(x, top + above * 0.12, width, above * 0.88).fill(face.base);
  g.rect(x, top + above * 0.12, width, 18).fill(face.shadow);
  for (let wx = x + 90; wx < x + width - 120; wx += 190) {
    g.rect(wx, top + above * 0.3, 70, 120).fill(face.shadow);
    g.rect(wx, top + above * 0.62, 70, 120).fill(face.shadow);
  }
  g.rect(x, floor, width, 4000).fill(FLAT.bottom!);
  g.rect(x, top + above * 0.12, 3, above * 0.88).fill({ color: "#000000", alpha: 0.2 });
  return g;
}

/** The stash's back wall: painted block, a pipe run and a strip light, in the far plane. */
function blockWall(length: number, top = -1400, bottom = 0): Graphics {
  const g = new Graphics();
  const block = tones("#5d6460");
  const w = length * PARALLAX.far + 2400;
  g.rect(-1200, top, w, bottom - top).fill(block.base);
  for (let y = top, row = 0; y < bottom; y += 70, row++) {
    g.rect(-1200, y, w, 4).fill(block.shadow);
    for (let x = -1200 + (row % 2) * 70; x < w; x += 140) g.rect(x, y, 4, 70).fill(block.shadow);
  }
  // A sealed concrete floor running back to the wall, under the play floor's front edge.
  g.rect(-1200, 0, w, 900).fill(shadowOf("#4a4b47"));
  for (let x = -1200; x < w; x += 360) g.rect(x, 0, 3, 900).fill({ color: "#000000", alpha: 0.25 });
  g.rect(-1200, -980, w, 26).fill(tones("#8a8f93").base);
  g.rect(-1200, -980, w, 26).stroke({ width: MID_OUTLINE, color: PALETTE.outline, alpha: 0.75 });
  return g;
}

/** The airport's stand-in wall in the far plane: a ceiling band, a cream wall, a window band onto a blue sky, a terrazzo floor. */
function terminalWall(span: number): Graphics {
  const g = new Graphics();
  const w = span + 2400;
  const wall = tones("#d8d2c4");
  const line = { width: MID_OUTLINE, color: PALETTE.outline, alpha: 0.75 };
  g.rect(-1200, -1600, w, 1600).fill(wall.base);
  g.rect(-1200, -1600, w, 320).fill(wall.shadow);
  for (let x = -1200; x < w; x += 240) g.rect(x, -1290, 120, 14).fill({ color: "#fff6dc", alpha: 0.8 });
  g.rect(-1200, -1050, w, 560).fill("#8fc3e8");
  g.rect(-1200, -700, w, 210).fill("#b7d7ea");
  for (let x = -1200; x < w; x += 300) g.rect(x, -1050, 16, 560).fill(tones("#9aa3ad").shadow);
  g.rect(-1200, -1050, w, 560).stroke(line);
  g.rect(-1200, 0, w, 900).fill(tones("#d6cfbf").shadow);
  g.rect(-1200, -40, w, 40).fill(wall.shadow);
  return g;
}

/** Columns and palms against the wall, in a muted palette with thinner lines, spread over the mid plane's share of the level. */
function drawMid(length: number): Graphics {
  const g = new Graphics();
  const span = length * PARALLAX.mid + 2400;
  const stone = tones("#cfc6b8");
  const line = { width: MID_OUTLINE, color: PALETTE.outline, alpha: 0.75, join: "round" as const };
  for (let x = 1400; x < span; x += 2800) {
    g.rect(x - 45, -980, 90, 980).fill(stone.base);
    g.rect(x + 15, -980, 30, 980).fill(stone.shadow);
    g.rect(x - 45, -980, 12, 980).fill(stone.highlight);
    g.rect(x - 62, -1010, 124, 40).fill(stone.base);
    g.rect(x - 62, -60, 124, 60).fill(stone.base);
    g.rect(x - 45, -980, 90, 980).stroke(line);
    g.rect(x - 62, -1010, 124, 40).stroke(line);
    g.rect(x - 62, -60, 124, 60).stroke(line);
  }
  const brass = tones(PALETTE.brass);
  const leaf = tones(PALETTE.leaf);
  for (let x = 2800; x < span; x += 2800) {
    g.poly([x - 70, -150, x + 70, -150, x + 52, 0, x - 52, 0]).fill(brass.base);
    g.poly([x + 20, -150, x + 70, -150, x + 52, 0, x + 14, 0]).fill(brass.shadow);
    g.rect(x - 78, -170, 156, 24).fill(brass.highlight);
    g.poly([x - 70, -150, x + 70, -150, x + 52, 0, x - 52, 0]).stroke(line);
    g.rect(x - 78, -170, 156, 24).stroke(line);
    g.rect(x - 10, -330, 20, 170).fill(shadowOf("#6b4a2a"));
    g.rect(x - 10, -330, 20, 170).stroke(line);
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.95 + (i / 6) * Math.PI * 0.9;
      const ex = x + Math.cos(a) * 190;
      const ey = -330 + Math.sin(a) * 120 + 60;
      const cx = x + Math.cos(a) * 90;
      const cy = -330 - 90 + Math.sin(a) * 30;
      g.moveTo(x, -330).quadraticCurveTo(cx, cy, ex, ey).stroke({ width: 26, color: PALETTE.outline, alpha: 0.75, cap: "round" });
      g.moveTo(x, -330).quadraticCurveTo(cx, cy, ex, ey).stroke({ width: 18, color: i % 2 ? leaf.base : leaf.shadow, cap: "round" });
      g.moveTo(x, -332).quadraticCurveTo(cx, cy - 4, ex - 10, ey - 6).stroke({ width: 5, color: highlightOf(PALETTE.leaf), cap: "round" });
    }
  }
  return g;
}
