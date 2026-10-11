import { Container, Graphics } from "pixi.js";
import { CHARGE_MAX, SINUS_MAX } from "../sim/moves";
import { PALETTE } from "./palette";
import { label } from "./text";

const INK = PALETTE.outline;
const X = 24;
const BAR_X = 110;
const HEAT_W = 220;
const HEAT_H = 14;
const PIP = 18;
const SEG = 12;
const ROWS = { heat: 62, snot: 92, smash: 122, hint: 148 } as const;
const GOLD = "#e9b866";

/** HEAT, SNOT and SMASH under the look test's title, with the key hint. */
export class Meters {
  readonly container = new Container({ label: "meters" });
  private readonly heat = new Graphics();
  private readonly snot = new Graphics();
  private readonly smash = new Graphics();
  private last = "";

  constructor(layer: Container) {
    for (const [text, y] of [
      ["HEAT", ROWS.heat],
      ["SNOT", ROWS.snot],
      ["SMASH", ROWS.smash],
    ] as const) {
      const t = label(text, "ui", 18);
      t.position.set(X, y - 3);
      this.container.addChild(t);
    }
    const hint = label("H SWING · F SNOT · E LECTURE · T TOWEL · Q SMASH · G PRACTICE HIT", "ui", 16);
    hint.position.set(X, ROWS.hint);
    hint.alpha = 0.8;
    this.container.addChild(this.heat, this.snot, this.smash, hint);
    layer.addChild(this.container);
  }

  set(heat: number, sinus: number, charge: number): void {
    const full = charge >= CHARGE_MAX;
    const pulse = full ? 0.75 + 0.25 * Math.sin(performance.now() / 120) : 1;
    const key = `${heat.toFixed(1)}|${sinus.toFixed(2)}|${charge}|${full ? pulse.toFixed(2) : ""}`;
    if (key === this.last) return;
    this.last = key;

    const h = Math.min(100, Math.max(0, heat));
    const color = h < 45 ? "#6db4f0" : h < 80 ? "#f0a33c" : "#e0482f";
    this.heat
      .clear()
      .rect(BAR_X, ROWS.heat, HEAT_W, HEAT_H)
      .fill({ color: "#000000", alpha: 0.45 })
      .rect(BAR_X, ROWS.heat, (HEAT_W * h) / 100, HEAT_H)
      .fill(color)
      .rect(BAR_X, ROWS.heat, HEAT_W, HEAT_H)
      .stroke({ width: 3, color: INK });

    this.snot.clear();
    for (let i = 0; i < SINUS_MAX; i++) {
      const cx = BAR_X + PIP / 2 + i * (PIP + 8);
      const cy = ROWS.snot + PIP / 2 - 2;
      const fill = Math.min(1, Math.max(0, sinus - i));
      this.snot.circle(cx, cy, PIP / 2).fill({ color: "#000000", alpha: 0.45 });
      if (fill >= 1) this.snot.circle(cx, cy, PIP / 2).fill("#9cc24a");
      else if (fill > 0)
        this.snot
          .moveTo(cx, cy)
          .arc(cx, cy, PIP / 2, -Math.PI / 2, -Math.PI / 2 + fill * Math.PI * 2)
          .closePath()
          .fill("#9cc24a");
      this.snot.circle(cx, cy, PIP / 2).stroke({ width: 3, color: INK });
    }

    this.smash.clear();
    for (let i = 0; i < CHARGE_MAX; i++) {
      const x = BAR_X + i * (SEG + 5);
      const lit = i < charge;
      this.smash
        .rect(x, ROWS.smash, SEG, SEG)
        .fill(lit ? { color: full ? GOLD : PALETTE.brass, alpha: full ? pulse : 1 } : { color: "#000000", alpha: 0.45 })
        .rect(x, ROWS.smash, SEG, SEG)
        .stroke({ width: 2, color: INK });
    }
  }
}
