import { heroFace } from "../hero";
import { clearOfFace } from "../layout";
import { drawPerson } from "../people";
import { CHUTE, FOODS, TABLE, type Food } from "./food";
import { HAND0, PLANE_Y, PLATE_X, type HungryQuest, type Rival } from "./hungry";
import type { QuestContext } from "./quest";

type Crop = readonly [number, number, number, number];
const ART: Record<Rival["kind"] | "server", { key: string; crop: Crop; left: boolean }> = {
  student: { key: "student", crop: [5, 5, 408, 758], left: true },
  bellhop: { key: "hotelStaff", crop: [6, 4, 600, 759], left: true },
  nurse: { key: "nurse", crop: [0, 0, 345, 720], left: false },
  server: { key: "server", crop: [5, 5, 379, 758], left: true },
};
const PHOTO: Partial<Record<Food["kind"], { key: string; crop: Crop }>> = {
  coke: { key: "coke", crop: [0, 4, 972, 1450] },
  nuts: { key: "nuts", crop: [0, 23, 1222, 1263] },
  buccees: { key: "buccees", crop: [33, 34, 1020, 1378] },
};

/** One plate of food standing on the cloth at (f.x, f.y): photo pickups, or a procedural plate. */
export function drawFood(
  ctx: CanvasRenderingContext2D,
  f: Food,
  images: Record<string, HTMLImageElement>,
) {
  const spec = FOODS[f.kind];
  const photo = PHOTO[f.kind],
    img = photo && images[photo.key];
  ctx.save();
  ctx.translate(f.x, f.y);
  if (img && img.complete && img.naturalWidth) {
    const h = f.size,
      w = (photo.crop[2] / photo.crop[3]) * h;
    ctx.drawImage(img, ...photo.crop, -w / 2, -h, w, h);
  } else if (f.kind === "hotsauce") {
    ctx.fillStyle = spec.color;
    ctx.fillRect(-2.5, -10, 5, 10);
    ctx.fillRect(-1, -12, 2, 2);
    ctx.fillStyle = "#f5e6c8";
    ctx.fillRect(-2.5, -7, 5, 3);
  } else if (f.kind === "togo") {
    ctx.fillStyle = spec.color;
    ctx.fillRect(-6, -8, 12, 8);
    ctx.fillStyle = "#c8281e";
    ctx.fillRect(-6, -9, 12, 2);
  } else if (f.kind === "check") {
    ctx.fillStyle = spec.color;
    ctx.fillRect(-6, -3, 12, 3);
    ctx.fillStyle = "#d9b45a";
    ctx.fillRect(-4, -2.2, 8, 0.8);
  } else {
    ctx.fillStyle = "#f7f4ee";
    ctx.beginPath();
    ctx.ellipse(0, -1, 7, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.ellipse(0, -4.5, 5, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(-1.5, -6, 1.8, 1, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = "800 3.2px 'Segoe UI',sans-serif";
  ctx.textAlign = "center";
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = "rgba(255,248,232,0.85)";
  ctx.strokeText(spec.label, 0, -f.size - 1);
  ctx.fillStyle = "#1a120c";
  ctx.fillText(spec.label, 0, -f.size - 1);
  ctx.restore();
}

function plateStack(ctx: CanvasRenderingContext2D, x: number, items: readonly Food[]) {
  ctx.fillStyle = "#f7f4ee";
  ctx.beginPath();
  ctx.ellipse(x, TABLE.top - 0.8, 8, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  items.slice(-6).forEach((f, i) => {
    ctx.fillStyle = FOODS[f.kind].color;
    ctx.fillRect(x - 5, TABLE.top - 3 - i * 2.2, 10, 2);
  });
  if (items.length > 6) {
    ctx.font = "700 3px 'Segoe UI',sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff6d8";
    ctx.fillText(`+${items.length - 6}`, x, TABLE.top - 18);
  }
}

function bubble(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  face: ReturnType<typeof heroFace>,
) {
  ctx.save();
  ctx.font = "600 3.6px 'Segoe UI',sans-serif";
  const w = ctx.measureText(text).width + 8,
    h = 8;
  const box = clearOfFace({ x: x - w / 2, y: y - h, w, h }, face, { w: 384, h: 216 });
  ctx.fillStyle = "rgba(9,17,24,0.92)";
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, w, h, 2);
  ctx.fill();
  ctx.fillStyle = "#f4f0e7";
  ctx.textAlign = "center";
  ctx.fillText(text, box.x + w / 2, box.y + 5.6);
  ctx.restore();
}

/** The banquet: backdrop, server and rivals behind a dressed table, the food, then Hammer in front. */
export function drawHungry(
  ctx: CanvasRenderingContext2D,
  q: HungryQuest,
  c: QuestContext,
  clock: number,
) {
  const img = c.images;
  // Ballroom dressing over the venue photo: side curtains, a swagged valance, a banner.
  ctx.fillStyle = "rgba(24,10,14,0.35)";
  ctx.fillRect(0, 0, 384, 216);
  for (const side of [0, 1]) {
    const g = ctx.createLinearGradient(side ? 384 : 0, 0, side ? 340 : 44, 0);
    g.addColorStop(0, "#3e0f17");
    g.addColorStop(1, "rgba(94,27,36,0)");
    ctx.fillStyle = g;
    ctx.fillRect(side ? 336 : 0, 0, 48, 192);
  }
  ctx.fillStyle = "#5e1b24";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(384, 0);
  ctx.lineTo(384, 10);
  for (let x = 384; x >= 0; x -= 32) ctx.quadraticCurveTo(x - 16, 22, x - 32, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#d9b45a";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(384, 10);
  for (let x = 384; x >= 0; x -= 32) ctx.quadraticCurveTo(x - 16, 22, x - 32, 10);
  ctx.stroke();
  ctx.fillStyle = "#2a1d14";
  ctx.fillRect(96, 26, 192, 13);
  ctx.font = "800 6px 'Segoe UI',sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#e8c060";
  ctx.fillText("GRAND BALLROOM · ALL YOU CAN EAT", 192, 34.5);
  // The chute: a steel hopper over the middle of the table.
  ctx.fillStyle = "#8d9aa3";
  ctx.fillRect(CHUTE.x - 1, 39, 2, 1);
  ctx.beginPath();
  ctx.moveTo(CHUTE.x - 22, 40);
  ctx.lineTo(CHUTE.x + 22, 40);
  ctx.lineTo(CHUTE.x + 8, CHUTE.y + 2);
  ctx.lineTo(CHUTE.x - 8, CHUTE.y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#c9d3d8";
  ctx.fillRect(CHUTE.x - 22, 40, 44, 2);
  // Hotel carpet.
  ctx.fillStyle = "#3a1218";
  ctx.fillRect(0, 192, 384, 24);
  ctx.fillStyle = "rgba(217,180,90,0.16)";
  for (let y = 196; y < 216; y += 8)
    for (let x = (y / 8) % 2 ? 8 : 0; x < 384; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x + 3, y);
      ctx.lineTo(x, y + 3);
      ctx.lineTo(x - 3, y);
      ctx.fill();
    }
  // Server and rivals stand behind the table; the cloth hides their legs.
  const s = q.server;
  if (s.away <= 0) {
    const a = ART.server;
    drawPerson(ctx, img[a.key], a.crop, s.x, 192, s.dir, a.left, clock, false, 0.9);
    ctx.fillStyle = "#c9d3d8";
    ctx.beginPath();
    ctx.ellipse(s.x + s.dir * 6, 160, 7, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const r of q.rivals) {
    const a = ART[r.kind];
    const leanBy =
      r.lean > 0 ? Math.sin((r.lean / 0.2) * Math.PI) * Math.sign(r.leanX - r.x) * 8 : 0;
    drawPerson(
      ctx,
      img[a.key],
      a.crop,
      r.x + leanBy,
      192,
      -1,
      a.left,
      r.stun > 0 ? 0 : clock + r.x,
      false,
      0.85,
    );
    if (r.stun > 0) {
      ctx.fillStyle = "#ffe598";
      for (let i = 0; i < 3; i++) {
        const t = clock * 4 + (i * Math.PI * 2) / 3;
        ctx.fillRect(r.x + Math.cos(t) * 6, 150 + Math.sin(t) * 2, 1.4, 1.4);
      }
    } else if (r.anger > 0) {
      ctx.fillStyle = "#e2302a";
      ctx.font = "900 6px 'Segoe UI',sans-serif";
      ctx.fillText("!".repeat(Math.min(3, r.anger)), r.x, 150);
    }
  }
  // The table: a dressed top and skirt, legs below.
  ctx.fillStyle = "#4a3020";
  for (const x of [TABLE.left + 6, (TABLE.left + TABLE.right) / 2, TABLE.right - 8])
    ctx.fillRect(x, TABLE.top + TABLE.thick, 3, 192 - TABLE.top - TABLE.thick);
  ctx.fillStyle = "#f4efe4";
  ctx.fillRect(TABLE.left, TABLE.top, TABLE.right - TABLE.left, TABLE.thick);
  ctx.fillStyle = "rgba(160,140,120,0.35)";
  for (let x = TABLE.left + 10; x < TABLE.right; x += 18)
    ctx.fillRect(x, TABLE.top + 3, 1, TABLE.thick - 3);
  ctx.fillStyle = "#d8cdb8";
  ctx.fillRect(TABLE.left, TABLE.top, TABLE.right - TABLE.left, 1.2);
  ctx.fillStyle = "#d9b45a";
  ctx.fillRect(TABLE.left, TABLE.top + TABLE.thick - 2, TABLE.right - TABLE.left, 1);
  ctx.fillStyle = "#f4efe4";
  ctx.beginPath();
  ctx.moveTo(TABLE.left, TABLE.top + TABLE.thick);
  for (let x = TABLE.left; x < TABLE.right; x += 12)
    ctx.quadraticCurveTo(
      x + 6,
      TABLE.top + TABLE.thick + 3,
      Math.min(TABLE.right, x + 12),
      TABLE.top + TABLE.thick,
    );
  ctx.closePath();
  ctx.fill();
  // Plates, suitcases, food, the cart.
  plateStack(ctx, PLATE_X, q.plate);
  for (const r of q.rivals) plateStack(ctx, r.x, r.plate);
  for (const sc of q.suitcases) {
    ctx.fillStyle = "#6b4428";
    ctx.beginPath();
    ctx.roundRect(sc.x0, TABLE.top - 12, sc.x1 - sc.x0, 12, 1.5);
    ctx.fill();
    ctx.fillStyle = "#2a1d14";
    ctx.fillRect(sc.x0 + 5, TABLE.top - 14, sc.x1 - sc.x0 - 10, 2);
  }
  for (const f of q.food) drawFood(ctx, f, img);
  if (q.cart) {
    ctx.save();
    ctx.translate(q.cart.x, 192);
    if (q.cart.spilled) ctx.rotate(-0.25);
    ctx.fillStyle = "#9aa6ad";
    ctx.fillRect(-14, -22, 30, 16);
    ctx.fillStyle = "#3c464c";
    ctx.beginPath();
    ctx.arc(-9, -3, 3, 0, Math.PI * 2);
    ctx.arc(11, -3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // The reach marker while charging.
  const L = q.lunge;
  if (L && L.phase === "charge") {
    const end = HAND0 + L.reach;
    ctx.strokeStyle = "rgba(232,192,96,0.8)";
    ctx.setLineDash([2, 2]);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(HAND0, TABLE.top - 1);
    ctx.lineTo(end, TABLE.top - 1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#e8c060";
    ctx.beginPath();
    ctx.moveTo(end - 3, TABLE.top - 7);
    ctx.lineTo(end + 3, TABLE.top - 7);
    ctx.lineTo(end, TABLE.top - 2);
    ctx.fill();
  }
  // Paper planes.
  for (const p of q.planes) {
    if ((p.wait ?? 0) > 0) continue;
    ctx.fillStyle = "#eef2ef";
    ctx.beginPath();
    ctx.moveTo(p.x - 5, PLANE_Y);
    ctx.lineTo(p.x + 5, PLANE_Y - 2.5);
    ctx.lineTo(p.x + 3, PLANE_Y + 2);
    ctx.closePath();
    ctx.fill();
  }
  // Hammer, then crumbs on his shirt below the chin.
  const pose = q.pose();
  c.drawHero(ctx, pose, 0);
  const face = heroFace(pose);
  if (q.crumbs > 0) {
    ctx.fillStyle = "#c9a26a";
    for (let i = 0; i < 6; i++) {
      const t = (1 - q.crumbs / 0.6 + i * 0.13) % 1;
      ctx.fillRect(face.x + (i % 3) * 1.4 - 1, face.y + face.h + 2 + t * 8, 0.9, 0.9);
    }
  }
  // NPC speech, kept off his face.
  if (s.away <= 0 && s.lineT > 0) bubble(ctx, s.line, s.x, 146, face);
  for (const r of q.rivals) if (r.lineT > 0) bubble(ctx, r.line, r.x, 146, face);
  if (q.combo >= 5) {
    ctx.font = "900 6px 'Arial Black','Segoe UI',sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#f7c948";
    ctx.fillText(`x${q.combo >= 10 ? 3 : 2}`, PLATE_X, TABLE.top - 26);
  }
}
