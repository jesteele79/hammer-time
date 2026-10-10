import { Graphics } from "pixi.js";
import type { RenderApp } from "./app";

/** Placeholder until the lobby look scene lands: a fill and a moving disc. */
export function startLook(render: RenderApp) {
  const g = new Graphics();
  render.app.stage.addChild(g);
  let t = 0;
  const tick = () => {
    t += render.app.ticker.deltaMS / 1000;
    const { width, height } = render.app.screen;
    g.clear()
      .rect(0, 0, width, height)
      .fill("#1b2838")
      .circle(width / 2 + Math.sin(t) * 200, height / 2, 60)
      .fill("#e8b459");
  };
  render.app.ticker.add(tick);
  return { stop: () => render.app.ticker.remove(tick) };
}
