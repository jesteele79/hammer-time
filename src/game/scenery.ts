import { GROUND_ROW, TILE, VIEW_W } from "./constants";
import type { Prop, SceneTheme, Sign } from "./levels";

const palettes = {
  hotel: { wood: "#76573e", dark: "#342f2b", trim: "#d2b678", floor: "#73695d" },
  restaurant: { wood: "#657078", dark: "#263238", trim: "#c5cdd0", floor: "#575e62" },
  campus: { wood: "#536773", dark: "#263745", trim: "#b8cbd4", floor: "#69747a" },
};

export function drawFurniture(
  ctx: CanvasRenderingContext2D,
  prop: Prop,
  theme: SceneTheme,
  cam: number,
) {
  const x = prop.x * TILE - cam,
    y = prop.y * TILE,
    w = prop.w * TILE,
    h = prop.h * TILE;
  if (x + w < -20 || x > VIEW_W + 20) return;
  const p = palettes[theme];
  ctx.save();
  if (prop.kind === "shelf") {
    // The top is the one-way landing surface; the braces sit behind the actor.
    ctx.fillStyle = "rgba(20,28,32,0.35)";
    ctx.fillRect(x + 3, y + 6, 2, GROUND_ROW * TILE - y - 6);
    ctx.fillRect(x + w - 5, y + 6, 2, GROUND_ROW * TILE - y - 6);
    ctx.fillStyle = p.dark;
    ctx.fillRect(x, y, w, 16);
    ctx.fillStyle = p.wood;
    ctx.fillRect(x + 1, y + 2, w - 2, 12);
    ctx.fillStyle = p.trim;
    ctx.fillRect(x, y, w, 2);
    for (let i = 0; i < w; i += 14) {
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(x + i + 2, y + 4, 1, 7);
    }
  } else if (prop.kind === "cart") {
    ctx.fillStyle = "#202b33";
    ctx.fillRect(x, y, w, h - 5);
    const steel = ctx.createLinearGradient(x, y, x + w, y + h);
    steel.addColorStop(0, "#c4ced0");
    steel.addColorStop(0.4, "#73868c");
    steel.addColorStop(1, "#34494f");
    ctx.fillStyle = steel;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 8);
    ctx.fillStyle = "#b9a382";
    ctx.fillRect(x + 4, y + 5, w - 8, 15);
    ctx.fillStyle = "#ead190";
    ctx.fillRect(x + 4, y + 5, w - 8, 1);
    ctx.fillStyle = "#162129";
    for (const dx of [5, w - 7]) {
      ctx.beginPath();
      ctx.arc(x + dx, y + h - 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = "600 4px 'Segoe UI',sans-serif";
    ctx.fillStyle = "#192830";
    ctx.fillText("↓ STAFF", x + 5, y + 14);
  } else {
    ctx.fillStyle = "rgba(8,13,17,0.27)";
    ctx.fillRect(x - 2, y + h, w + 4, 3);
    const face = ctx.createLinearGradient(x, y, x, y + h);
    face.addColorStop(0, p.wood);
    face.addColorStop(1, p.dark);
    ctx.fillStyle = face;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(255,246,221,0.09)";
    ctx.lineWidth = 0.6;
    for (let i = 4; i < w; i += 4) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + 4);
      ctx.lineTo(x + i, y + h - 2);
      ctx.stroke();
    }
    ctx.fillStyle = p.trim;
    ctx.fillRect(x - 1, y, w + 2, 3);
    ctx.fillStyle = "rgba(249,251,246,0.4)";
    ctx.fillRect(x, y, w, 0.7);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(x, y + h - 3, w, 3);
    for (let i = 12; i < w; i += 22) {
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(x + i, y + 5, 0.7, h - 9);
      ctx.fillStyle = p.trim;
      ctx.fillRect(x + i + 4, y + 7, 4, 1);
    }
    if (prop.kind === "pass") {
      ctx.fillStyle = "rgba(234,198,127,0.18)";
      ctx.fillRect(x, y + h, w, 3);
      ctx.fillStyle = "#e1bb67";
      for (let i = 2; i < w - 2; i += 10) {
        ctx.beginPath();
        ctx.moveTo(x + i, y + h - 3);
        ctx.lineTo(x + i + 3, y + h - 3);
        ctx.lineTo(x + i + 6, y + h);
        ctx.lineTo(x + i + 3, y + h);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(190,198,199,0.18)";
      ctx.fillRect(x + 1, y + h, 1.5, 32);
      ctx.fillRect(x + w - 2.5, y + h, 1.5, 32);
    }
  }
  ctx.restore();
}

export function drawSign(
  ctx: CanvasRenderingContext2D,
  sign: Sign,
  theme: SceneTheme,
  cam: number,
) {
  const x = sign.x * TILE - cam,
    y = 55;
  if (x < -135 || x > VIEW_W + 20) return;
  ctx.save();
  ctx.font = "600 5px 'Segoe UI', sans-serif";
  const w = Math.max(66, ctx.measureText(sign.label).width + 14);
  ctx.fillStyle = "rgba(8,16,22,0.85)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, 23, 1.5);
  ctx.fill();
  ctx.fillStyle = palettes[theme].trim;
  ctx.fillRect(x, y, 1.5, 23);
  ctx.fillStyle = "#f2ede2";
  ctx.fillText(sign.label, x + 7, y + 9);
  ctx.font = "3.8px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#d1d8d9";
  if (sign.note) ctx.fillText(sign.note, x + 7, y + 17, w - 12);
  ctx.restore();
}

export function drawRoomDecor(
  ctx: CanvasRenderingContext2D,
  x: number,
  floor: number,
  kind: "shrub" | "stack",
  theme: SceneTheme,
) {
  const p = palettes[theme];
  ctx.save();
  if (kind === "shrub") {
    const pot = ctx.createLinearGradient(x, floor - 12, x + 12, floor);
    pot.addColorStop(0, "#a29a86");
    pot.addColorStop(1, "#504c46");
    ctx.fillStyle = pot;
    ctx.beginPath();
    ctx.moveTo(x - 5, floor - 12);
    ctx.lineTo(x + 7, floor - 12);
    ctx.lineTo(x + 5, floor);
    ctx.lineTo(x - 3, floor);
    ctx.fill();
    ctx.strokeStyle = "#526147";
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const dx = Math.sin(i * 2.4) * 8,
        dy = -15 - (i % 3) * 6;
      ctx.beginPath();
      ctx.moveTo(x + 1, floor - 9);
      ctx.quadraticCurveTo(x + dx, floor + dy + 3, x + dx, floor + dy);
      ctx.stroke();
      ctx.fillStyle = i % 2 ? "#586c47" : "#738555";
      ctx.beginPath();
      ctx.ellipse(x + dx, floor + dy, 4, 1.7, dx * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = p.dark;
    ctx.fillRect(x - 5, floor - 26, 16, 26);
    ctx.fillStyle = p.trim;
    ctx.fillRect(x - 6, floor - 27, 18, 2);
    for (let y = 5; y < 23; y += 6) {
      ctx.fillStyle = p.wood;
      ctx.fillRect(x - 3, floor - y - 3, 12, 4);
      ctx.fillStyle = "#d4d0bc";
      ctx.fillRect(x + 2, floor - y - 2, 3, 0.7);
    }
  }
  ctx.restore();
}
