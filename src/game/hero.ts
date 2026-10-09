import {
  HERO_HEIGHT,
  HERO_CROUCH_VISUAL_HEIGHT,
  hammerPose,
  malletInArtwork,
  type Point,
} from "./combat";

export type HeroAssets = {
  idle: HTMLImageElement;
  body: HTMLImageElement;
  upper: HTMLImageElement;
  fore: HTMLImageElement;
  reach: HTMLImageElement;
  hand: HTMLImageElement;
  towel: HTMLImageElement;
};
export type HeroPose = {
  x: number;
  foot: number;
  facing: number;
  phase: number;
  moving: boolean;
  air: boolean;
  landing: number;
  swing: number;
  mega: number;
  wipe: number;
  snot: number;
  heat: number;
  hurt: number;
  star: number;
  reduced: boolean;
  clock: number;
  crouch?: boolean;
};

export function heroLift(p: Pick<HeroPose, "moving" | "phase" | "reduced">) {
  return p.moving && !p.reduced ? Math.abs(Math.sin(p.phase * Math.PI * 2)) * 0.85 : 0;
}

export function artworkToWorld(p: HeroPose, point: Point): Point {
  const s = HERO_HEIGHT / 1371;
  return {
    x: p.x + p.facing * (-456 * s * 0.42 + point.x * s),
    y: p.foot - (p.crouch ? HERO_CROUCH_VISUAL_HEIGHT : HERO_HEIGHT) - heroLift(p) + point.y * s,
  };
}

export function heroMallet(p: HeroPose) {
  const progress = p.mega > 0 ? 1 - p.mega / 0.62 : p.swing > 0 ? 1 - p.swing / 0.42 : 1;
  const pose = p.swing > 0 || p.mega > 0 ? hammerPose(progress) : { s: 0, e: 0 };
  return artworkToWorld(p, malletInArtwork(pose.s, pose.e));
}

function polygon(ctx: CanvasRenderingContext2D, points: number[][]) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

/** Only runtime clipping/transforms: the approved face and shirt source pixels are untouched. */
export function drawHero(ctx: CanvasRenderingContext2D, a: HeroAssets, p: HeroPose, cam = 0) {
  const scale = HERO_HEIGHT / 1371;
  const active = p.swing > 0 || p.mega > 0;
  const progress = p.mega > 0 ? 1 - p.mega / 0.62 : 1 - p.swing / 0.42;
  const angle = active
    ? hammerPose(progress)
    : p.crouch
      ? { s: -0.7, e: -0.55 }
      : { s: p.moving && !p.reduced ? Math.sin(p.phase * Math.PI * 2) * 0.12 : 0, e: 0 };
  ctx.save();
  ctx.translate(p.x - cam, p.foot);
  ctx.fillStyle = "rgba(5,10,15,0.32)";
  ctx.beginPath();
  ctx.ellipse(0, 0, p.air ? 5 : 8, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  if (p.star > 0) {
    ctx.strokeStyle = "rgba(255,213,83,0.85)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.ellipse(0, -HERO_HEIGHT / 2, 14, 25, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const t = p.clock * 3 + (i * Math.PI * 2) / 5;
      ctx.fillStyle = "#ffe598";
      ctx.beginPath();
      ctx.arc(Math.cos(t) * 12, -22 + Math.sin(t) * 22, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.scale(p.facing, 1);
  ctx.translate(
    -456 * scale * 0.42,
    -(p.crouch ? HERO_CROUCH_VISUAL_HEIGHT : HERO_HEIGHT) - heroLift(p),
  );
  ctx.scale(scale, scale);

  const stride = p.moving && !p.reduced ? Math.sin(p.phase * Math.PI * 2) : 0;
  const leg = (rear: boolean) => {
    ctx.save();
    if (p.crouch) ctx.translate(0, -180);
    const hipX = rear ? 210 : 143;
    const thigh = p.crouch ? -1.36 : p.air ? (rear ? 0.12 : -0.32) : stride * (rear ? -0.24 : 0.24);
    ctx.translate(hipX, 935);
    ctx.rotate(thigh);
    ctx.translate(-hipX, -935);
    ctx.save();
    polygon(ctx, [
      [80, 920],
      [241, 932],
      [199, 1085],
      [177, 1120],
      [83, 1120],
      [72, 1080],
    ]);
    ctx.clip();
    ctx.drawImage(a.idle, 0, 0);
    ctx.restore();
    const knee = p.crouch ? 2.72 : p.air ? 0.45 : Math.max(0, stride * (rear ? -1 : 1)) * 0.28;
    ctx.translate(143, 1098);
    ctx.rotate(knee);
    ctx.translate(-143, -1098);
    ctx.save();
    polygon(ctx, [
      [85, 1080],
      [190, 1080],
      [150, 1248],
      [76, 1255],
    ]);
    ctx.clip();
    ctx.drawImage(a.idle, 0, 0);
    ctx.restore();
    // Different original shoe crops keep the layered feet readable.
    if (!p.crouch) {
      if (rear) ctx.drawImage(a.idle, 130, 1175, 215, 121, 81, 1200, 215, 121);
      else ctx.drawImage(a.idle, 43, 1225, 258, 146, 43, 1225, 258, 146);
    }
    ctx.restore();
    if (p.crouch) ctx.drawImage(a.idle, 43, 1225, 258, 146, rear ? 116 : 180, 771, 185, 106);
  };
  leg(true);
  leg(false);

  // The earlier rig removed shorts with a rough mallet mask. Rebuild only the
  // shorts from clean denim samples in the original, never the face/shirt.
  ctx.save();
  polygon(
    ctx,
    p.crouch
      ? [
          [58, 711],
          [300, 728],
          [315, 811],
          [237, 840],
          [145, 843],
          [73, 827],
        ]
      : [
          [58, 711],
          [300, 728],
          [283, 920],
          [243, 934],
          [145, 946],
          [73, 934],
        ],
  );
  ctx.clip();
  ctx.drawImage(a.idle, 220, 742, 60, 75, 57, 711, 260, p.crouch ? 134 : 236);
  ctx.strokeStyle = "#b0bfd4";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(170, 727);
  ctx.lineTo(145, p.crouch ? 840 : 916);
  ctx.stroke();
  ctx.strokeStyle = "#263a58";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(72, p.crouch ? 820 : 919);
  ctx.lineTo(144, p.crouch ? 839 : 925);
  ctx.lineTo(243, p.crouch ? 836 : 930);
  ctx.lineTo(282, p.crouch ? 815 : 913);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  polygon(ctx, [
    [55, 451],
    [98, 454],
    [149, 544],
    [163, 675],
    [164, 715],
    [59, 701],
    [52, 632],
    [65, 570],
  ]);
  ctx.clip();
  ctx.drawImage(a.idle, 170, 500, 80, 160, 52, 448, 115, 279);
  ctx.restore();
  ctx.drawImage(a.body, 0, 0, 456, 727, 0, 0, 456, 727);

  // Swing arm and mallet use exactly the angles used by heroMallet().
  ctx.save();
  ctx.translate(102.9, 468.4);
  ctx.rotate(angle.s);
  ctx.translate(-102.9, -468.4);
  ctx.drawImage(a.upper, 0, 0);
  ctx.translate(113.4, 642.1);
  ctx.rotate(angle.e);
  ctx.translate(-113.4, -642.1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 456, 1371);
  ctx.rect(292, 714, 48, 150);
  ctx.clip("evenodd");
  ctx.drawImage(a.fore, 0, 0);
  ctx.restore();
  ctx.restore();

  let hand = { x: 300, y: 760 };
  let reach = 0;
  let towel = 0;
  let scrub = 0;
  if (p.wipe > 0) {
    const u = 1 - p.wipe / 0.95;
    const t = u < 0.28 ? u / 0.28 : u > 0.78 ? (1 - u) / 0.22 : 1;
    reach = Math.max(0, Math.min(1, t * t * (3 - 2 * t)));
    scrub = u >= 0.28 && u <= 0.78 ? Math.sin(((u - 0.28) / 0.5) * Math.PI * 3) : 0;
    hand = { x: 300 + (344 + scrub * 64 - 300) * reach, y: 760 + (112 - 760) * reach };
    towel = reach;
  } else if (p.snot > 0) {
    const u = 1 - p.snot / 0.45;
    reach = u < 0.36 ? u / 0.36 : u > 0.72 ? (1 - u) / 0.28 : 1;
    reach = Math.max(0, Math.min(1, reach));
    hand = { x: 300 + 52 * reach, y: 760 - 586 * reach };
  }
  if (reach > 0.01) {
    const sx = 218,
      sy = 475;
    const dx = hand.x - sx,
      dy = hand.y - sy;
    const dist = Math.max(12, Math.min(409, Math.hypot(dx, dy)));
    const first = Math.atan2(dy, dx) - Math.acos((200 ** 2 + dist ** 2 - 210 ** 2) / (400 * dist));
    const second = Math.PI - Math.acos((200 ** 2 + 210 ** 2 - dist ** 2) / (2 * 200 * 210));
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(first - Math.PI / 2);
    ctx.drawImage(a.reach, -36, -14, 72, 224);
    ctx.translate(0, 200);
    ctx.rotate(second);
    ctx.drawImage(a.reach, -32, -14, 64, 224);
    ctx.restore();
  }
  if (towel > 0.01 && a.towel.complete && a.towel.naturalWidth) {
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.rotate(-0.1 + scrub * 0.16);
    const h = 240,
      w = (h * 662) / 1480;
    ctx.drawImage(a.towel, 189, 29, 662, 1480, -w * 0.5, -42, w, h);
    ctx.restore();
  }
  // Independent free hand comes from the original locked still.
  if (a.hand.complete && a.hand.naturalWidth)
    ctx.drawImage(a.hand, 275, 729, 50, 62, hand.x - 25, hand.y - 31, 50, 62);

  if (p.heat > 45 && p.wipe <= 0) {
    ctx.fillStyle = "rgba(214,231,236,0.65)";
    for (let i = 0; i < 3; i++) {
      const drop = (p.clock * 100 + i * 35) % 105;
      ctx.beginPath();
      ctx.ellipse(238 + i * 20, 65 + drop, 4, 9, -0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
