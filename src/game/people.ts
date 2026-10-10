import { ENEMY_HEIGHT } from "./combat";
import { VIEW_W } from "./constants";

/** A photographed person standing at (x, feet): soft shadow, a walking bob, or flat out when stunned. */
export function drawPerson(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  crop: readonly [number, number, number, number],
  x: number,
  feet: number,
  facing: number,
  leftFacing: boolean,
  clock: number,
  stunned: boolean,
  scale = 1,
) {
  if (!image || !image.complete || !image.naturalWidth || x < -55 || x > VIEW_W + 55) return;
  const h = ENEMY_HEIGHT * scale,
    w = (crop[2] / crop[3]) * h;
  ctx.save();
  ctx.translate(x, feet);
  ctx.fillStyle = "rgba(10,16,18,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 8 * scale, 1.6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(leftFacing ? (facing > 0 ? -1 : 1) : facing < 0 ? -1 : 1, 1);
  if (stunned) {
    const length = 34 * scale,
      thickness = (crop[2] / crop[3]) * length;
    ctx.translate(0, -thickness / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(image, ...crop, -thickness / 2, -length / 2, thickness, length);
  } else {
    const step = Math.sin(clock * 9);
    ctx.rotate(step * 0.02);
    ctx.drawImage(image, ...crop, -w * 0.42, -h - Math.abs(step) * 0.6 * scale, w, h);
  }
  ctx.restore();
}
