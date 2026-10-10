import type { Point } from "./combat";

export type Rect = { x: number; y: number; w: number; h: number };
type View = { w: number; h: number };

const EDGE = 2;
const overlaps = (a: Rect, b: Rect, pad: number) =>
  a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

/**
 * Above and behind the head, clamped to the view. When an edge would push the
 * cloud onto the face it moves fully behind the face, then below it.
 */
export function thoughtLayout(
  size: { w: number; h: number },
  crown: Point,
  facing: 1 | -1,
  face: Rect,
  view: View,
) {
  const fitX = (x: number) => Math.min(Math.max(x, EDGE), view.w - size.w - EDGE);
  const fitY = (y: number) => Math.min(Math.max(y, EDGE), view.h - size.h - EDGE);
  const ax = crown.x - facing * 10,
    ay = crown.y - 18;
  let cloud: Rect = { x: fitX(ax - size.w / 2), y: fitY(ay - size.h), ...size };
  if (overlaps(cloud, face, 2))
    cloud = { ...cloud, x: fitX(facing > 0 ? face.x - 4 - size.w : face.x + face.w + 4) };
  if (overlaps(cloud, face, 2)) cloud = { ...cloud, y: fitY(face.y + face.h + 4) };
  const below = cloud.y > face.y;
  // A cloud pushed below the face trails from under the chin, so no puff crosses the face.
  const from = below
    ? { x: face.x + face.w / 2 - facing * (face.w / 2 + 3), y: face.y + face.h + 2 }
    : { x: crown.x - facing * 6, y: crown.y + 1 };
  const to = {
    x: Math.min(Math.max(from.x, cloud.x + 4), cloud.x + cloud.w - 4),
    y: below ? cloud.y : cloud.y + cloud.h,
  };
  const puffs = [
    { t: 0.35, r: 1.1 },
    { t: 0.7, r: 1.7 },
  ].map(({ t, r }) => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, r }));
  return { cloud, puffs };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? line + " " + word : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  lines.push(line);
  return lines;
}

/** Hammer thinking out loud: a cloud of four ellipses trailing two puffs toward the back of his head. */
export function drawThought(
  ctx: CanvasRenderingContext2D,
  text: string,
  crown: Point,
  facing: 1 | -1,
  face: Rect,
  view: View,
) {
  ctx.save();
  ctx.font = "italic 600 4px 'Segoe UI',sans-serif";
  const lines = wrap(ctx, text, 76);
  const size = {
    w: Math.max(...lines.map((l) => ctx.measureText(l).width)) + 14,
    h: lines.length * 5 + 9,
  };
  const { cloud, puffs } = thoughtLayout(size, crown, facing, face, view);
  const { x, y, w, h } = cloud;
  const lobes = [
    [x + w * 0.3, y + h * 0.5, w * 0.32, h * 0.5],
    [x + w * 0.5, y + h * 0.42, w * 0.3, h * 0.48],
    [x + w * 0.7, y + h * 0.5, w * 0.32, h * 0.5],
    [x + w * 0.5, y + h * 0.62, w * 0.42, h * 0.4],
  ];
  const shapes = () => {
    ctx.beginPath();
    for (const [cx, cy, rx, ry] of lobes) {
      ctx.moveTo(cx + rx, cy);
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    }
    for (const c of puffs) {
      ctx.moveTo(c.x + c.r, c.y);
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    }
  };
  // Stroke every lobe, then fill over the inner strokes: only the outline of the union stays.
  ctx.strokeStyle = "#1a120c";
  ctx.lineWidth = 1.2;
  shapes();
  ctx.stroke();
  ctx.fillStyle = "#fbf7ee";
  shapes();
  ctx.fill();
  ctx.fillStyle = "#2a1c12";
  ctx.textAlign = "center";
  lines.forEach((part, i) => ctx.fillText(part, x + w / 2, y + 8 + i * 5));
  ctx.restore();
}
