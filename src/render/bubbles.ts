import { BitmapText, Container, Graphics } from "pixi.js";
import type { Point, Rect } from "../sim/types";
import { PALETTE } from "./palette";
import { overlaps } from "./words";

const EDGE = 16;
/** The shipped layout's offsets (src/game/thought.ts) at the new scale: above and behind his crown. */
const BEHIND = 68;
const ABOVE = 40;
const GAP = 20;
const TEXT = { size: 26, wrap: 400, padX: 26, padY: 18 } as const;
const PAPER = 0xfbf7ee;
const SPOKEN = 0xc44838;
const THOUGHT = 0x1a1a1a;
const INK = PALETTE.outline;
const FADE = 0.2;

/**
 * Where a bubble goes (spec §5.7): above and behind his head; beside his face, behind him, when
 * that would cover it; below his chin as the last resort. The two puffs trail from the back of
 * his crown, or from under his chin when the bubble went below.
 */
export function bubbleLayout(size: { w: number; h: number }, crown: Point, facing: 1 | -1, face: Rect, view: Rect) {
  const fitX = (x: number) => Math.min(Math.max(x, view.x + EDGE), view.x + view.w - size.w - EDGE);
  const fitY = (y: number) => Math.min(Math.max(y, view.y + EDGE), view.y + view.h - size.h - EDGE);
  let box: Rect = { x: fitX(crown.x - facing * BEHIND - size.w / 2), y: fitY(crown.y - ABOVE - size.h), ...size };
  if (overlaps(box, face, 2)) box = { ...box, x: fitX(facing > 0 ? face.x - GAP - size.w : face.x + face.w + GAP) };
  if (overlaps(box, face, 2)) box = { ...box, y: fitY(face.y + face.h + GAP) };
  const below = box.y > face.y;
  const from = below
    ? { x: face.x + face.w / 2 - facing * (face.w / 2 + 14), y: face.y + face.h + 10 }
    : { x: crown.x - facing * 30, y: crown.y - 6 };
  const to = { x: Math.min(Math.max(from.x, box.x + 20), box.x + box.w - 20), y: below ? box.y : box.y + box.h };
  const puffs = [
    { t: 0.35, r: 9 },
    { t: 0.7, r: 14 },
  ].map(({ t, r }) => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, r }));
  return { box, puffs };
}

/** Hammer's thoughts (clouds) and the caption of a recording he speaks (a box), one at a time. */
export class Bubbles {
  private readonly root = new Container({ label: "bubbles" });
  private readonly shape = new Graphics();
  private readonly words: BitmapText;
  private life = 0;
  private spoken = false;
  private current: string | null = null;

  constructor(layer: Container) {
    this.words = new BitmapText({
      text: "",
      style: { fontFamily: "ui", fontSize: TEXT.size, wordWrap: true, wordWrapWidth: TEXT.wrap, align: "center" },
    });
    this.root.addChild(this.shape, this.words);
    this.root.zIndex = 50;
    this.root.visible = false;
    layer.addChild(this.root);
  }

  get text(): string | null {
    return this.current;
  }

  think(text: string, seconds: number): void {
    this.show(text, seconds, false);
  }

  say(text: string, seconds: number): void {
    this.show(text, seconds, true);
  }

  private show(text: string, seconds: number, spoken: boolean) {
    this.current = text;
    this.spoken = spoken;
    this.life = seconds;
    this.words.text = text;
    this.words.tint = spoken ? SPOKEN : THOUGHT;
  }

  update(dt: number, at: { crown: Point; face: Rect; facing: 1 | -1; view: Rect }): void {
    this.life = Math.max(0, this.life - dt);
    if (this.life <= 0) this.current = null;
    this.root.visible = this.current !== null;
    if (!this.current) return;
    const size = { w: this.words.width + 2 * TEXT.padX, h: this.words.height + 2 * TEXT.padY };
    const { box, puffs } = bubbleLayout(size, at.crown, at.facing, at.face, at.view);
    const g = this.shape.clear();
    if (this.spoken) {
      g.roundRect(box.x, box.y, box.w, box.h, 14).fill(PAPER).stroke({ width: 4, color: INK });
    } else {
      // Four lobes across the box, then the box's middle filled over their inner edges.
      const r = box.h * 0.42;
      for (let i = 0; i < 4; i++) g.ellipse(box.x + box.w * (0.16 + 0.226 * i), box.y + box.h * (i % 2 ? 0.58 : 0.42), box.w * 0.2, r);
      g.fill(PAPER).stroke({ width: 4, color: INK });
      g.roundRect(box.x + box.w * 0.08, box.y + box.h * 0.18, box.w * 0.84, box.h * 0.64, 12).fill(PAPER);
      for (const p of puffs) g.circle(p.x, p.y, p.r).fill(PAPER).stroke({ width: 3, color: INK });
    }
    this.words.position.set(box.x + TEXT.padX, box.y + TEXT.padY);
    this.root.alpha = Math.min(1, this.life / FADE);
  }
}
