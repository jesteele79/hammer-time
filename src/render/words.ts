import { Container, Graphics, type BitmapText } from "pixi.js";
import { out } from "../sim/rig/pose";
import type { Point, Rect } from "../sim/types";
import { label } from "./text";

/** A small and a big word's type size, world px: the shipped words' share of his height. */
export const WORD_SIZE = { small: 40, big: 64 } as const;
const POP = 1.25;
const POP_T = 0.14;
const TILT = (6 * Math.PI) / 180;
const LIFE = { small: 0.7, big: 1 } as const;
const FADE_T = 0.25;
const RISE = 30;
const MAX_WORDS = 8;
const OUTLINE = 4;
const INK = 0x101010;
const STAR = { small: 0xffe14a, big: 0xff5a36 } as const;
const TEXT = { small: 0xd63a2a, big: 0xffe14a } as const;

export const overlaps = (a: Rect, b: Rect, pad = 0) =>
  a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** The burst behind a word: 18 points, long and short in turn, before the pop and the tilt. */
export function wordStar(textWidth: number, big: boolean): Point[] {
  const size = big ? WORD_SIZE.big : WORD_SIZE.small;
  const rx = textWidth / 2 + size * 0.9;
  const ry = size * 1.15;
  return Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const k = i % 2 ? 0.78 : 1.08;
    return { x: Math.cos(a) * rx * k, y: Math.sin(a) * ry * k };
  });
}

/** A word's burst centred at (x, y), at its biggest pop and either tilt, outline included. */
export function wordBox(x: number, y: number, width: number, big: boolean): Rect {
  let x0 = 0;
  let x1 = 0;
  let y0 = 0;
  let y1 = 0;
  for (const rot of [-TILT, 0, TILT])
    for (const p of wordStar(width, big)) {
      const px = (p.x * Math.cos(rot) - p.y * Math.sin(rot)) * POP;
      const py = (p.x * Math.sin(rot) + p.y * Math.cos(rot)) * POP;
      x0 = Math.min(x0, px);
      x1 = Math.max(x1, px);
      y0 = Math.min(y0, py);
      y1 = Math.max(y1, py);
    }
  return { x: x + x0 - OUTLINE, y: y + y0 - OUTLINE, w: x1 - x0 + 2 * OUTLINE, h: y1 - y0 + 2 * OUTLINE };
}

/**
 * Kept in view, then the least slide along one axis that clears the face (the
 * shipped rule), so the clamp can't push a word back onto him. When nothing in
 * view clears the face the box comes back still on it, and the caller hides it.
 */
export function placeWord(box: Rect, face: Rect, view: Rect, pad = 2): Rect {
  const fit = (r: Rect): Rect => ({
    ...r,
    x: clamp(r.x, view.x, view.x + view.w - r.w),
    y: clamp(r.y, view.y, view.y + view.h - r.h),
  });
  const start = fit(box);
  if (!overlaps(start, face, pad)) return start;
  const cost = (r: Rect) => Math.hypot(r.x - box.x, r.y - box.y);
  const moves = [
    { ...start, x: face.x - pad - start.w },
    { ...start, x: face.x + face.w + pad },
    { ...start, y: face.y - pad - start.h },
    { ...start, y: face.y + face.h + pad },
  ]
    .map(fit)
    .filter((r) => !overlaps(r, face, pad))
    .sort((a, b) => cost(a) - cost(b));
  return moves[0] ?? start;
}

type Live = {
  root: Container;
  body: Container;
  text: BitmapText;
  x: number;
  y: number;
  width: number;
  big: boolean;
  age: number;
  life: number;
};

/** Comic words: popped in, tilted, risen and faded, and never over his face. */
export class Words {
  private readonly layer = new Container({ label: "words" });
  private readonly live: Live[] = [];
  private tilt = 1;

  constructor(parent: Container) {
    this.layer.zIndex = 10;
    parent.addChild(this.layer);
  }

  get count() {
    return this.live.length;
  }

  say(text: string, x: number, y: number, big: boolean, face: Rect, view: Rect): void {
    if (this.live.length >= MAX_WORDS) this.live.shift()?.root.destroy({ children: true });
    const kind = big ? "big" : "small";
    const t = label(text, "comic", WORD_SIZE[kind]);
    t.anchor.set(0.5);
    t.tint = TEXT[kind];
    const star = new Graphics()
      .poly(wordStar(t.width, big))
      .fill(STAR[kind])
      .stroke({ width: OUTLINE, color: INK, join: "round" });
    const body = new Container();
    body.addChild(star, t);
    this.tilt = -this.tilt;
    body.rotation = this.tilt * TILT;
    const root = new Container();
    root.addChild(body);
    this.layer.addChild(root);
    const word: Live = { root, body, text: t, x, y, width: t.width, big, age: 0, life: LIFE[kind] };
    this.live.push(word);
    this.place(word, face, view);
  }

  /** Every live word is placed again against the face where it is now. */
  update(dt: number, face: Rect, view: Rect): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const w = this.live[i];
      w.age += dt;
      if (w.age >= w.life) {
        w.root.destroy({ children: true });
        this.live.splice(i, 1);
        continue;
      }
      this.place(w, face, view);
    }
  }

  private place(w: Live, face: Rect, view: Rect) {
    const fade = Math.min(1, Math.max(0, (w.age - (w.life - FADE_T)) / FADE_T));
    const y = w.y - RISE * fade;
    const box = wordBox(w.x, y, w.width, w.big);
    const at = placeWord(box, face, view);
    w.root.position.set(w.x + at.x - box.x, y + at.y - box.y);
    w.body.scale.set(POP - (POP - 1) * out(Math.min(1, w.age / POP_T)));
    w.root.alpha = 1 - fade;
    w.root.visible = !overlaps(at, face);
  }
}
