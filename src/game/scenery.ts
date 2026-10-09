import { GROUND_ROW, TILE, VIEW_W, VIEW_H } from "./constants";
import type { Prop, SceneTheme, Sign } from "./levels";

const palettes = {
  hotel: { wood: "#76573e", dark: "#342f2b", trim: "#d2b678", floor: "#73695d" },
  restaurant: { wood: "#657078", dark: "#263238", trim: "#c5cdd0", floor: "#575e62" },
  campus: { wood: "#536773", dark: "#263745", trim: "#b8cbd4", floor: "#69747a" },
};
export type Materials = { wood: HTMLImageElement; steel: HTMLImageElement };
function surface(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  metal = false,
) {
  ctx.fillStyle = metal ? "#6e7b7d" : "#8c6b49";
  ctx.fillRect(x, y, w, h);
  if (image?.complete && image.naturalWidth) ctx.drawImage(image, x, y, w, h);
  const shade = ctx.createLinearGradient(x, y, x, y + h);
  shade.addColorStop(0, metal ? "rgba(246,249,246,.35)" : "rgba(249,215,161,.12)");
  shade.addColorStop(0.18, "rgba(18,27,30,0)");
  shade.addColorStop(1, "rgba(10,17,23,.55)");
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);
}
function bolt(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#182830";
  ctx.beginPath();
  ctx.arc(x, y, 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#b6c1bd";
  ctx.fillRect(x - 0.25, y - 0.5, 0.5, 0.3);
}
export function drawFurniture(
  ctx: CanvasRenderingContext2D,
  prop: Prop,
  theme: SceneTheme,
  cam: number,
  materials?: Materials,
) {
  const x = prop.x * TILE - cam,
    y = prop.y * TILE,
    w = prop.w * TILE,
    h = prop.h * TILE,
    floor = GROUND_ROW * TILE;
  if (x + w < -20 || x > VIEW_W + 20) return;
  const p = palettes[theme],
    metal = theme === "restaurant";
  ctx.save();
  if (prop.kind === "shelf") {
    // A thin, one-way shelf: the visible top is exactly the landing surface.
    for (const dx of [5, w - 7]) {
      surface(ctx, materials?.steel, x + dx, y + 5, 1.7, floor - y - 5, true);
      ctx.fillStyle = "rgba(8,16,22,.3)";
      ctx.fillRect(x + dx + 1.7, y + 7, 1, floor - y - 7);
      ctx.strokeStyle = "#677477";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + dx, y + 5);
      ctx.lineTo(x + dx + 6, y + 5);
      ctx.lineTo(x + dx, y + 13);
      ctx.stroke();
      for (let hole = y + 19; hole < floor - 3; hole += 9) bolt(ctx, x + dx + 0.8, hole);
    }
    ctx.fillStyle = "rgba(4,13,20,.2)";
    ctx.fillRect(x - 1, y + 5, w + 2, 2);
    surface(ctx, materials?.wood, x, y, w, 5);
    ctx.fillStyle = "#ceb994";
    ctx.fillRect(x, y, w, 0.65);
    ctx.fillStyle = "#493d32";
    ctx.fillRect(x, y + 4, w, 1);
    for (const dx of [5, w - 6]) bolt(ctx, x + dx, y + 2.5);
  } else if (prop.kind === "pass") {
    // Suspended service duct; nothing crosses the 32px crouching passage.
    for (const dx of [7, w - 8]) {
      surface(ctx, materials?.steel, x + dx, 60, 1.4, y - 60, true);
      ctx.fillStyle = "#3c4c53";
      ctx.fillRect(x + dx - 2, 60, 5, 2);
    }
    const shadow = ctx.createLinearGradient(x, y + h, x, floor);
    shadow.addColorStop(0, "rgba(4,13,20,.45)");
    shadow.addColorStop(1, "rgba(4,13,20,.12)");
    ctx.fillStyle = shadow;
    ctx.fillRect(x, y + h, w, floor - y - h);
    surface(ctx, materials?.steel, x, y, w, h, true);
    ctx.fillStyle = "#c5ceca";
    ctx.fillRect(x, y, w, 0.8);
    ctx.fillStyle = "rgba(12,27,35,.65)";
    for (let dx = 8; dx < w - 6; dx += 4) ctx.fillRect(x + dx, y + 4, 1.2, 5);
    ctx.fillStyle = "#344750";
    ctx.fillRect(x, y + h - 3, w, 3);
    ctx.fillStyle = "#d9c186";
    ctx.fillRect(x + 1, y + h - 1, w - 2, 0.6);
    for (const dx of [3, w - 3]) {
      bolt(ctx, x + dx, y + 2.5);
      bolt(ctx, x + dx, y + h - 5);
    }
    ctx.fillStyle = "#1a2b34";
    ctx.fillRect(x + w / 2 - 10, y + 10, 20, 4);
    ctx.font = "600 2.8px 'Segoe UI',sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#f3d18a";
    ctx.fillText("DUCK ↓", x + w / 2, y + 13.2);
  } else if (prop.kind === "cart") {
    ctx.fillStyle = "rgba(3,12,18,.3)";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, floor, w * 0.56, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    surface(ctx, materials?.steel, x, y, w, h - 6, true);
    ctx.strokeStyle = "#d3dbd4";
    ctx.lineWidth = 0.7;
    ctx.strokeRect(x + 0.7, y + 0.7, w - 1.4, h - 7.4);
    surface(ctx, materials?.wood, x + 3, y + 5, w - 6, 15);
    ctx.fillStyle = "#18303a";
    ctx.fillRect(x + 5, y + 9, w - 10, 6);
    ctx.fillStyle = "#ead19b";
    ctx.font = "600 3.4px 'Segoe UI',sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("↓ STAFF", x + w / 2, y + 13.6);
    for (const dx of [5, w - 6]) {
      ctx.fillStyle = "#26383f";
      ctx.fillRect(x + dx, y + h - 7, 1.4, 4);
      ctx.fillStyle = "#111c24";
      ctx.beginPath();
      ctx.arc(x + dx + 0.7, y + h - 2.3, 2.3, 0, Math.PI * 2);
      ctx.fill();
      bolt(ctx, x + dx + 0.7, y + h - 2.3);
    }
  } else {
    ctx.fillStyle = "rgba(5,13,18,.3)";
    ctx.fillRect(x - 1, y + h, w + 2, 1.8);
    surface(ctx, metal ? materials?.steel : materials?.wood, x, y, w, h, metal);
    ctx.fillStyle = "rgba(1,9,16,.23)";
    ctx.fillRect(x + w - 3, y, 3, h);
    const units = Math.max(2, Math.round(w / 25)),
      unit = w / units;
    for (let i = 0; i < units; i++) {
      const cx = x + i * unit + 2;
      ctx.strokeStyle = metal ? "rgba(17,36,47,.44)" : "rgba(39,25,14,.55)";
      ctx.lineWidth = 0.7;
      ctx.strokeRect(cx, y + 6, unit - 4, h - 11);
      ctx.fillStyle = metal ? "#c9d2cf" : p.trim;
      ctx.beginPath();
      ctx.roundRect(cx + unit / 2 - 4, y + 10, 6, 1.4, 0.5);
      ctx.fill();
      ctx.fillStyle = "rgba(2,11,16,.28)";
      ctx.fillRect(cx + unit / 2 - 4, y + 11.4, 6, 0.6);
    }
    surface(ctx, materials?.steel, x - 0.8, y, w + 1.6, 3, true);
    ctx.fillStyle = "#e2dfcc";
    ctx.fillRect(x - 0.8, y, w + 1.6, 0.7);
    ctx.fillStyle = "#263b43";
    ctx.fillRect(x + 1, y + h - 3, w - 2, 3);
  }
  ctx.restore();
}
export function drawCrate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  materials?: Materials,
  mark = "",
  spent = false,
) {
  ctx.save();
  ctx.fillStyle = "rgba(2,10,17,.3)";
  ctx.fillRect(x + 0.8, y + 1, 16, 16);
  surface(ctx, materials?.wood, x, y, 16, 16);
  ctx.strokeStyle = "#3f342b";
  ctx.lineWidth = 0.5;
  for (const dy of [5, 10]) {
    ctx.beginPath();
    ctx.moveTo(x + 1, y + dy);
    ctx.lineTo(x + 15, y + dy);
    ctx.stroke();
  }
  ctx.strokeStyle = "#bf9c68";
  ctx.lineWidth = 1.25;
  ctx.strokeRect(x + 0.8, y + 0.8, 14.4, 14.4);
  for (const dx of [2, 14]) for (const dy of [2, 14]) bolt(ctx, x + dx, y + dy);
  if (mark || spent) {
    surface(ctx, materials?.steel, x + 4, y + 3, 8, 10, true);
    ctx.fillStyle = spent ? "#546269" : mark === "!" ? "#f0b65a" : "#aec4cf";
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 4, 6, 7, 0.7);
    ctx.fill();
    ctx.fillStyle = "#152731";
    ctx.textAlign = "center";
    ctx.font = "800 6px 'Segoe UI',sans-serif";
    ctx.fillText(spent ? "–" : mark, x + 8, y + 9.8);
  } else {
    ctx.strokeStyle = "#c4a478";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 13);
    ctx.lineTo(x + 13, y + 2);
    ctx.stroke();
  }
  ctx.restore();
}
export function drawFloorGap(ctx: CanvasRenderingContext2D, x: number, w: number) {
  const y = GROUND_ROW * TILE;
  const depth = ctx.createLinearGradient(x, y, x, VIEW_H);
  depth.addColorStop(0, "#15202a");
  depth.addColorStop(1, "#03090f");
  ctx.fillStyle = depth;
  ctx.fillRect(x, y, w, VIEW_H - y);
  ctx.fillStyle = "#576469";
  ctx.fillRect(x, y, 1.5, VIEW_H - y);
  ctx.fillRect(x + w - 1.5, y, 1.5, VIEW_H - y);
  ctx.fillStyle = "rgba(0,0,0,.38)";
  ctx.fillRect(x + 1.5, y, w - 3, 3);
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
