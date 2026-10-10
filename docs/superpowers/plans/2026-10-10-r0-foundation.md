# R0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the rebuild's foundation: a PixiJS 8 renderer with layers, camera, lighting, particles and real text; the art pipeline that turns the owner's green-screen plates into registered, hash-guarded game parts; a pure-TypeScript sim with Hammer's ground movement; a paper-doll rig driven by clips; and a lobby look scene at `/?next=1` whose look board the owner signs off before R1.

**Architecture:** `src/sim` (no DOM, fixed 120 Hz step, snapshots) and `src/render` (Pixi, interpolates snapshots) meet only through plain data. Hammer is drawn from part textures sliced from the owner's A-pose bodies plus the owner's head plates, positioned by forward kinematics over a skeleton and pose clips in `src/sim/rig`. Art tooling is Node + `sharp` scripts that write to `public/art/` and record source hashes in `art/manifest.json`.

**Tech Stack:** TypeScript, pixi.js 8.22, pixi-filters 6.1, sharp 0.35, TanStack Start (client-only renderer), node:test with `scripts/game-test-loader.mjs`, Playwright with installed Chrome.

**Spec:** `docs/superpowers/specs/2026-10-10-hammer-time-rebuild-design.md` (§2–§6, §8.1, §9, §14, §15, §16 R0).

## Global Constraints

- Hard limits (spec §2): the head plate is never edited, tinted, filtered or masked and nothing is drawn over the face box; the Affliction body is the base; owner files under `art/reference/` and `art/incoming/` are never modified (hash-guarded by `art/manifest.json`); no `.env`, no auth, keep `public/__grok/`, `server/`, `PreviewHostBridge`.
- Never stage `package-lock.json` or `src/routeTree.gen.ts`. `git add` explicit paths only. Commit with `git -c user.name=jesteele79 -c user.email=272086921+jesteele79@users.noreply.github.com commit -F .git/CLAUDE_MSG`, message ending `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- The old game (`/`, `src/game`, `npm run test:game` 72 checks) keeps passing untouched; the new build lives at `/?next=1`.
- Ports: dev on 8090, preview on 8091; 8080/8081 belong to another tool.
- Style rules for anything drawn in code (spec §3): 4 px `#101010` outlines at 340 px character height, three tones per fill, no gradients inside shapes.
- Numbers from spec §9 are the starting values and live in `src/sim/constants.ts`; the feel pass that tunes them is R1, not R0.

## Rulings (spec conflicts resolved here)

1. **Route.** The spec names `/next`; a new route file would regenerate the owner's `src/routeTree.gen.ts`. The new build is served by the existing `/` route behind the search param `next=1`, validated with TanStack's `validateSearch` so SSR and the client agree. Same purpose, no touch of the owner's file.
2. **Hammer's body.** The spec gives every slot a code-drawn default. The owner's four bodies are committed and hash-guarded, so Hammer's body parts come from them and there is no vector Hammer body; the code-drawn default rule applies to the cast, the pig and props (R2+). If a body plate is missing the game shows the Affliction parts.
3. **Sim scope in R0.** The spec's R0 line "the old rules ported to `src/sim`" is read as: the stepping loop, input, physics against floor segments and platforms, and Hammer's ground movement. Enemies, items, quests and the rest of the old rules port in R2/R3 with the venues that need them. The old engine stays the shipped game until R3.
4. **Fonts.** Google Fonts `Barlow Condensed` 700/800 and `Inter` 400/600 are added to the root route's stylesheet link (an edit to `src/routes/__root.tsx`'s `head`, not a new route). Pixi `BitmapFont.install` builds bitmap fonts from them after `document.fonts.load`.
5. **Head scale.** Spec §6.1 says 0.28 of HERO_HEIGHT. The owner's bodies carry a 0.17 H head. R0's look board shows 0.22, 0.26 and 0.30; `HEAD_SCALE` is a constant the owner's choice sets in R1.
6. **Gamepad.** R0 reads the keyboard only; the Gamepad API lands with the input rework in R1.
7. **Expression plates register on their own.** Each plate is keyed and cropped separately and carries its own neck anchor, crown and face box, so the renderer anchors every plate by its neck. `alignTo` is a sanity gate (silhouette overlap with the neutral plate at the shared neck anchor, threshold 0.85 because an open mouth changes the outline), not a placement step.

## Review Focus

1. **A screen that is not 16:9** (a 4:3 window, a tall phone, a 21:9 monitor): Hammer stays the same fraction of the screen height and nothing letterboxes. Pinned in Task 6's camera test.
2. **No WebGPU** (an older browser or a blocked adapter): the app falls back to WebGL without an error and without a blank frame. Pinned in Task 1's browser check (forced `preference: "webgl"` via `?gl=1`).
3. **The owner adds or regenerates a plate** with a slightly different framing: the cut tool realigns it or refuses with a message that names the plate and the overlap score; it never silently misplaces a face. Pinned in Task 2.
4. **An expression plate or body plate is absent** (a fresh checkout before art arrives): the game runs with the neutral plate and the Affliction parts and logs one warning. Pinned in Task 6.
5. **Holding a direction while landing from a jump onto a platform edge**: he lands and keeps running without a snag; releasing both directions at speed stops him within 0.2 s without a skid through a pit. Pinned in Task 5.

---

## File Structure

- `src/routes/__root.tsx` (modify): fonts link.
- `src/routes/index.tsx` (modify): `validateSearch` for `next`; renders `<NextGame />` or `<KilnHop />`.
- `src/components/next-game.tsx` (create): client-only mount of the renderer; the dev probe.
- `src/render/app.ts` (create): Pixi application, DPR, resize, quality tiers.
- `src/render/scene.ts`: layer stack and camera.
- `src/render/character.ts`: draws a rig instance from parts.
- `src/render/lighting.ts`, `particles.ts`, `text.ts`, `backdrop.ts`, `palette.ts`.
- `src/render/look.ts`: the lobby look scene (ground, backdrop, lights, Hammer, controls).
- `src/sim/constants.ts`, `input.ts`, `physics.ts`, `hero.ts`, `world.ts`, `types.ts`.
- `src/sim/rig/skeleton.ts`, `pose.ts`, `clips.ts`, `fk.ts`, `face.ts`.
- `src/art/registry.ts` (create): slot names, `public/art/registry.json` loader, head anchors.
- `scripts/art-cut.mjs`, `scripts/art-sync.mjs`, `scripts/ink.mjs`, `scripts/art-check.mjs` (create), `art/cuts/hammer-body.json` (create), `art/manifest.json` (create).
- `scripts/sim.check.mjs`, `scripts/rig.check.mjs`, `scripts/art.check.mjs` (create; run by `npm run test:next`).
- `scripts/next-browser.check.mjs`, `scripts/look-boards.mjs` (create).
- `package.json` (modify): scripts only.
- `README.md` (modify).

---

### Task 1: The `/?next=1` build boots PixiJS

**Files:** Modify `src/routes/__root.tsx`, `src/routes/index.tsx`, `package.json`; create `src/components/next-game.tsx`, `src/render/app.ts`, `scripts/next-browser.check.mjs`.

**Interfaces:**
- Produces: `createRenderApp(host: HTMLElement, opts: { preference?: "webgpu" | "webgl" }): Promise<RenderApp>` where `RenderApp = { app: Application; quality: Quality; setQuality(q): void; destroy(): void; frameMs: number; rendererType: "webgpu" | "webgl" }`; `type Quality = "ultra" | "high" | "medium" | "low"`; `window.__next = { renderer, quality, frameMs, fps }`.

- [ ] **Step 1: Write the failing browser check** (`scripts/next-browser.check.mjs`):

```js
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { checkedUrl } from "./browser-guard.mjs";

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8090/");
const out = resolve("artifacts");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_SMOKE_CHANNEL || "chrome",
  headless: true,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"],
});
const errors = [];
const verdict = { ok: false, renderer: null, fallback: null, fps: 0, content: false };
let page;
const hasContent = async () =>
  page.evaluate(() => {
    const c = document.querySelector("canvas");
    const probe = document.createElement("canvas");
    probe.width = 64;
    probe.height = 36;
    const g = probe.getContext("2d");
    g.drawImage(c, 0, 0, 64, 36);
    const d = g.getImageData(0, 0, 64, 36).data;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 4) seen.add((d[i] >> 4) * 4096 + (d[i + 1] >> 4) * 256 + (d[i + 2] >> 4));
    return seen.size > 12;
  });
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${base}?next=1`);
  await page.waitForFunction(() => window.__next?.renderer, {}, { timeout: 20000 });
  verdict.renderer = await page.evaluate(() => window.__next.renderer);
  await page.waitForTimeout(1500);
  verdict.content = await hasContent();
  assert.ok(verdict.content, "the canvas shows content");
  verdict.fps = await page.evaluate(() => window.__next.fps);
  assert.ok(verdict.fps >= 30, `fps ${verdict.fps}`);
  await page.screenshot({ path: resolve(out, "next-boot.png") });
  await page.goto(`${base}?next=1&gl=1`);
  await page.waitForFunction(() => window.__next?.renderer, {}, { timeout: 20000 });
  verdict.fallback = await page.evaluate(() => window.__next.renderer);
  assert.equal(verdict.fallback, "webgl", "forced WebGL still boots");
  await page.waitForTimeout(800);
  assert.ok(await hasContent(), "WebGL frame shows content");
  assert.deepEqual(errors, []);
  verdict.ok = true;
  writeFileSync(resolve(out, "next-check.json"), JSON.stringify({ ...verdict, errors }, null, 2));
  console.log(`PASS: /?next=1 boots on ${verdict.renderer}, falls back to webgl, draws, ${verdict.fps} fps, no errors.`);
} catch (err) {
  console.error("Next check failure", errors, await page?.locator("body").innerText());
  await page?.screenshot({ path: resolve(out, "next-failure.png") });
  throw err;
} finally {
  await browser.close();
}
```

- [ ] **Step 2: Run, expect FAIL** (`$env:BROWSER_SMOKE_CHANNEL='chrome'; node scripts/next-browser.check.mjs http://127.0.0.1:8090/`): times out waiting for `__next`.

- [ ] **Step 3: Route and shell.** `__root.tsx` stylesheet link becomes
`https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Source+Sans+3:wght@500;600&family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;600&display=swap`.
`index.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { KilnHop } from "@/components/kiln-hop";
import { NextGame } from "@/components/next-game";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: search.next === "1" || search.next === 1,
    gl: search.gl === "1" || search.gl === 1,
  }),
  component: Home,
});

function Home() {
  const { next, gl } = Route.useSearch();
  return next ? <NextGame forceWebgl={gl} /> : <KilnHop />;
}
```

`src/components/next-game.tsx`:

```tsx
import { useEffect, useRef } from "react";

/** The rebuild's canvas. Pixi is browser-only, so everything loads after mount. */
export function NextGame({ forceWebgl = false }: { forceWebgl?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const { createRenderApp } = await import("@/render/app");
      const { startLook } = await import("@/render/look");
      if (cancelled || !host.current) return;
      const render = await createRenderApp(host.current, { preference: forceWebgl ? "webgl" : "webgpu" });
      if (cancelled) return render.destroy();
      const look = startLook(render);
      dispose = () => {
        look.stop();
        render.destroy();
      };
    })();
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [forceWebgl]);
  return <div ref={host} className="next-stage" style={{ position: "fixed", inset: 0, background: "#0d1118" }} />;
}
```

(`startLook` is a stub in this task: it draws a filled rectangle and a moving circle so the content probe passes; Task 6 replaces it.)

- [ ] **Step 4: `src/render/app.ts`:**

```ts
import { Application, RendererType, Ticker } from "pixi.js";

export type Quality = "ultra" | "high" | "medium" | "low";
export type RenderApp = {
  app: Application;
  quality: Quality;
  rendererType: "webgpu" | "webgl";
  frameMs: number;
  fps: number;
  setQuality(q: Quality): void;
  onQuality: (q: Quality) => void;
  destroy(): void;
};

const ORDER: Quality[] = ["ultra", "high", "medium", "low"];
const DPR: Record<Quality, number> = { ultra: 2, high: 2, medium: 1, low: 1 };

declare global {
  interface Window {
    __next?: { renderer: string; quality: Quality; frameMs: number; fps: number };
  }
}

/** Boots Pixi on the host, watches frame time, and steps the quality down when it slips. */
export async function createRenderApp(
  host: HTMLElement,
  opts: { preference?: "webgpu" | "webgl" } = {},
): Promise<RenderApp> {
  const app = new Application();
  let quality: Quality = readForcedQuality() ?? "ultra";
  await app.init({
    preference: opts.preference ?? "webgpu",
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, DPR[quality]),
    resizeTo: host,
    background: "#0d1118",
    powerPreference: "high-performance",
  });
  host.appendChild(app.canvas);
  const rendererType = app.renderer.type === RendererType.WEBGPU ? "webgpu" : "webgl";
  const out: RenderApp = {
    app,
    quality,
    rendererType,
    frameMs: 0,
    fps: 0,
    onQuality: () => {},
    setQuality(q) {
      quality = out.quality = q;
      app.renderer.resolution = Math.min(window.devicePixelRatio || 1, DPR[q]);
      app.renderer.resize(host.clientWidth, host.clientHeight);
      out.onQuality(q);
    },
    destroy() {
      app.ticker.remove(watch);
      app.destroy(true, { children: true, texture: true });
      delete window.__next;
    },
  };
  // Frame-time watch: a 1 s average over 15 ms steps the tier down once, never up.
  let acc = 0,
    n = 0,
    settle = 2;
  const watch = (t: Ticker) => {
    acc += t.deltaMS;
    n++;
    if (acc < 1000) return;
    out.frameMs = acc / n;
    out.fps = Math.round(1000 / out.frameMs);
    if (settle > 0) settle--;
    else if (out.frameMs > 15 && !readForcedQuality()) {
      const i = ORDER.indexOf(quality);
      if (i < ORDER.length - 1) out.setQuality(ORDER[i + 1]);
    }
    window.__next = { renderer: rendererType, quality: out.quality, frameMs: out.frameMs, fps: out.fps };
    acc = 0;
    n = 0;
  };
  app.ticker.add(watch);
  window.__next = { renderer: rendererType, quality, frameMs: 0, fps: 0 };
  return out;
}

function readForcedQuality(): Quality | null {
  try {
    const q = localStorage.getItem("hammer-time-quality") as Quality | null;
    return q && ORDER.includes(q) ? q : null;
  } catch {
    return null;
  }
}
```

`RendererType` is exported from `pixi.js` (`lib/rendering/renderers/types.d.ts`).

- [ ] **Step 5: `src/render/look.ts` stub:**

```ts
import { Graphics } from "pixi.js";
import type { RenderApp } from "./app";

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
```

The `test:next` script is added in Task 2 and extended as Tasks 4 and 5 add their check files.

- [ ] **Step 6: Run, expect PASS** (dev server on 8090 running): the check prints PASS with `webgpu` and the forced `webgl`. If Chrome headless has no WebGPU adapter, the first boot reports `webgl`; the check still passes (renderer is reported, not asserted), and the report notes it. Also `npx tsc --noEmit`, `npx eslint src scripts`, `npm run test:game` (72 still pass), and the old `game-browser-check.mjs` still passes (the `/` route unchanged).

- [ ] **Step 7: Commit** `src/routes/__root.tsx src/routes/index.tsx src/components/next-game.tsx src/render/app.ts src/render/look.ts scripts/next-browser.check.mjs package.json` — "Boot the rebuild's PixiJS renderer behind /?next=1".

---

### Task 2: Art tooling: cut, register, guard, ink

**Files:** Create `scripts/art-cut.mjs`, `scripts/art-sync.mjs`, `scripts/ink.mjs`, `scripts/art.check.mjs`, `art/manifest.json`, `src/art/registry.ts`; modify `package.json`.

**Interfaces:**
- Produces (library exports from `scripts/art-cut.mjs`): `keyOut(input: Buffer): Promise<Keyed>` with `Keyed = { png: Buffer; width; height; bbox: {x0,y0,x1,y1}; offset: Point }` (RGBA with green keyed, cropped to bbox + 8 px; `offset` is the crop's top-left in the source image), `registerHead(png: Buffer, kind: "profile" | "three-quarter"): Promise<HeadReg>` with `HeadReg = { width, height, neck: Point, crown: Point, face: Rect }`, `alignTo(reference: Buffer, candidate: Buffer): Promise<{ dx, dy, scale, overlap }>`.
- `public/art/registry.json`: `{ version: 1, hammer: { heads: Record<Expression, { file, width, height, neck, crown, face }>, bodies: Record<Costume, { parts: Record<PartName, { file, width, height, pivot: Point, tip: Point }> }>, props: Record<string, { file, width, height }> }, backdrops: Record<string, { far?: string }> }`.
- `art/manifest.json`: `{ files: Record<relativePath, sha256> }` for `art/reference/*`, `art/incoming/**/*.png`, `public/absolute-bullshit.mp3`, `public/damage-voice.wav`, `public/voice/*.wav`.
- `src/art/registry.ts`: `loadRegistry(): Promise<Registry>`, the `Registry` type above, `HEAD_FACE_PROFILE` default box.

- [ ] **Step 1: Failing tests** (`scripts/art.check.mjs`):

```js
import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { keyOut, registerHead, alignTo } from "./art-cut.mjs";

/** A green canvas with a filled dark circle and a black 'neck' stub at the bottom. */
async function plate(dx = 0, dy = 0, scale = 1) {
  const r = 100 * scale;
  const svg = `<svg width="400" height="400"><rect width="400" height="400" fill="#00ff00"/>
    <circle cx="${200 + dx}" cy="${180 + dy}" r="${r}" fill="#b5642a" stroke="#101010" stroke-width="6"/>
    <rect x="${180 + dx}" y="${270 + dy}" width="40" height="60" fill="#b5642a" stroke="#101010" stroke-width="6"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

test("keying removes the green, keeps outlines and crops to the subject with a margin", async () => {
  const { png, bbox, width, height } = await keyOut(await plate());
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 4);
  const at = (x, y) => data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4);
  assert.equal(at(0, 0)[3], 0, "corner is transparent");
  const cx = Math.round(width / 2), cy = Math.round(height / 2);
  assert.equal(at(cx, cy)[3], 255, "the subject is opaque");
  assert.ok(bbox.x1 - bbox.x0 > 200 && bbox.x1 - bbox.x0 < 240, `bbox width ${bbox.x1 - bbox.x0}`);
  assert.ok(Math.abs(width - (bbox.x1 - bbox.x0 + 16)) <= 1, "8 px margin each side");
  let greenish = 0;
  for (let i = 0; i < data.length; i += 4)
    if (data[i + 3] > 0 && data[i + 1] > 180 && data[i] < 100 && data[i + 2] < 100) greenish++;
  assert.equal(greenish, 0, "no green left in opaque pixels");
});

test("a head plate registers its neck, crown and face box", async () => {
  const { png } = await keyOut(await plate());
  const reg = await registerHead(png, "profile");
  assert.ok(Math.abs(reg.crown.y - 8) <= 2, `crown at the top: ${reg.crown.y}`);
  assert.ok(reg.neck.y > reg.height - 12, `neck at the bottom: ${reg.neck.y} of ${reg.height}`);
  assert.ok(reg.face.y >= reg.crown.y && reg.face.y + reg.face.h <= reg.neck.y, "face box inside the plate");
});

test("a shifted copy of a plate passes the alignment gate; a different silhouette is refused", async () => {
  // keyOut crops each plate to its own subject, so a shift in the source leaves no offset.
  const neutral = (await keyOut(await plate())).png;
  const shifted = (await keyOut(await plate(9, -6))).png;
  const a = await alignTo(neutral, shifted);
  assert.ok(a.overlap > 0.92, `overlap ${a.overlap}`);
  assert.ok(Math.abs(a.dx) <= 2 && Math.abs(a.dy) <= 2, `residual offset ${a.dx},${a.dy}`);
  const other = (await keyOut(await plate(0, 0, 0.6))).png;
  const b = await alignTo(neutral, other);
  assert.ok(b.overlap < 0.85, "a different silhouette does not pass");
});

test("every owner file still matches art/manifest.json", () => {
  const manifest = JSON.parse(readFileSync("art/manifest.json", "utf8"));
  const files = Object.entries(manifest.files);
  assert.ok(files.length >= 24, `manifest lists ${files.length} files`);
  for (const [file, sha] of files) {
    assert.ok(existsSync(file), `${file} exists`);
    assert.equal(createHash("sha256").update(readFileSync(file)).digest("hex"), sha, `${file} unchanged`);
  }
});
```

- [ ] **Step 2: Run, expect FAIL** (`npm run test:next` after adding the script line `"test:next": "node --loader ./scripts/game-test-loader.mjs --test scripts/art.check.mjs"`): module missing.

- [ ] **Step 3: `scripts/art-cut.mjs`:**

```js
// Owner green-screen plates in, registered transparent parts out. Never edits the inputs.
import sharp from "sharp";

const MARGIN = 8;
/** Chroma key: hue 90-150, saturation above 0.45, with a soft 10-unit ramp so edges antialias. */
function alphaOf(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const sat = max ? (max - min) / max : 0;
  if (max !== g || sat < 0.35) return 255;
  const hue = ((60 * ((b - r) / (max - min || 1)) + 120) + 360) % 360;
  const inHue = hue >= 90 && hue <= 150;
  if (!inHue) return 255;
  const k = Math.min(1, Math.max(0, (sat - 0.45) / 0.1)); // 0.45..0.55 ramps
  return Math.round(255 * (1 - k));
}

export async function keyOut(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const out = Buffer.from(data);
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const a = alphaOf(out[i], out[i + 1], out[i + 2]);
      out[i + 3] = a;
      if (a > 0) {
        // Despill: pull green down to the mean of red and blue on the edge ramp.
        if (a < 255 || out[i + 1] > Math.max(out[i], out[i + 2]) + 40) out[i + 1] = Math.round((out[i] + out[i + 2]) / 2);
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  if (x1 < 0) throw new Error("keyOut: no subject found");
  const left = Math.max(0, x0 - MARGIN), top = Math.max(0, y0 - MARGIN);
  const cw = Math.min(W, x1 + 1 + MARGIN) - left, ch = Math.min(H, y1 + 1 + MARGIN) - top;
  const png = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left, top, width: cw, height: ch })
    .png()
    .toBuffer();
  return {
    png,
    width: cw,
    height: ch,
    bbox: { x0: x0 - left, y0: y0 - top, x1: x1 + 1 - left, y1: y1 + 1 - top },
    offset: { x: left, y: top },
  };
}

async function alphaMask(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const m = new Uint8Array(info.width * info.height);
  for (let i = 0; i < m.length; i++) m[i] = data[i * 4 + 3] > 127 ? 1 : 0;
  return { m, w: info.width, h: info.height };
}

/**
 * Head anchors in plate pixels. The neck is the center of the lowest opaque row;
 * the crown the topmost opaque pixel; the face box spans from 36% to 82% of the
 * plate height and, for a left-facing profile, from the leftmost opaque pixel to
 * 48% of the width (nose tip to the cheek in front of the ear). Three-quarter
 * plates use 30%..78% high and 10%..70% wide.
 */
export async function registerHead(png, kind) {
  const { m, w, h } = await alphaMask(png);
  let top = -1, bottom = -1, leftMost = w;
  const rowSpan = (y) => {
    let a = -1, b = -1;
    for (let x = 0; x < w; x++) if (m[y * w + x]) { if (a < 0) a = x; b = x; }
    return a < 0 ? null : [a, b];
  };
  for (let y = 0; y < h; y++) {
    const s = rowSpan(y);
    if (!s) continue;
    if (top < 0) top = y;
    bottom = y;
    if (s[0] < leftMost) leftMost = s[0];
  }
  const neckSpan = rowSpan(bottom);
  const topSpan = rowSpan(top);
  const face = kind === "profile"
    ? { x: leftMost, y: Math.round(h * 0.36), w: Math.round(w * 0.48) - leftMost, h: Math.round(h * 0.46) }
    : { x: Math.round(w * 0.1), y: Math.round(h * 0.3), w: Math.round(w * 0.6), h: Math.round(h * 0.48) };
  return {
    width: w, height: h,
    neck: { x: Math.round((neckSpan[0] + neckSpan[1]) / 2), y: bottom },
    crown: { x: Math.round((topSpan[0] + topSpan[1]) / 2), y: top },
    face,
  };
}

/** Best translation (±24 px) and scale (±4%) of the candidate silhouette onto the reference's. */
export async function alignTo(reference, candidate) {
  const ref = await alphaMask(reference);
  const base = await sharp(candidate).ensureAlpha();
  let best = { dx: 0, dy: 0, scale: 1, overlap: 0 };
  for (const scale of [0.96, 0.98, 1, 1.02, 1.04]) {
    const meta = await base.metadata();
    const rw = Math.round(meta.width * scale), rh = Math.round(meta.height * scale);
    const resized = await base.clone().resize(rw, rh).png().toBuffer();
    const cand = await alphaMask(resized);
    for (let dy = -24; dy <= 24; dy += 3)
      for (let dx = -24; dx <= 24; dx += 3) {
        let inter = 0, union = 0;
        for (let y = 0; y < ref.h; y++) {
          const cy = y + dy;
          if (cy < 0 || cy >= cand.h) { for (let x = 0; x < ref.w; x++) union += ref.m[y * ref.w + x]; continue; }
          for (let x = 0; x < ref.w; x++) {
            const cx = x + dx;
            const a = ref.m[y * ref.w + x];
            const b = cx >= 0 && cx < cand.w ? cand.m[cy * cand.w + cx] : 0;
            inter += a & b;
            union += a | b;
          }
        }
        const overlap = union ? inter / union : 0;
        if (overlap > best.overlap) best = { dx, dy, scale, overlap };
      }
  }
  return best;
}
```

(The exhaustive overlap search on 1086 by 1448 plates is slow; `alignTo` first downsamples both masks by 4 with `sharp().resize()` and scales the offsets back. Write that in: the test's small plates pass either way.)

- [ ] **Step 4: `scripts/art-sync.mjs`** (the CLI): reads `art/incoming/hammer/head-profile*.png` and `head-three-quarter.png`, keys them, registers the neutral profile, registers each expression plate on its own and runs `alignTo` against the neutral plate as a gate (refusing under 0.85 with the message `head-profile-<name>.png: outline overlap 0.71, expected ≥ 0.85; regenerate it on the neutral plate's framing`), writes `public/art/hammer/head-<name>.png` with its own anchors in the registry, keys `mallet.png`, `towel.png`, `wristwatch.png` to `public/art/hammer/`, slices bodies (Task 3), and writes `public/art/registry.json`. It also updates `art/manifest.json`: for each source file, if absent add its SHA-256; if present and different, exit 1 with `art/incoming/hammer/x.png changed since it was recorded; owner files are never edited. Restore it, or delete its manifest entry on purpose.` Add `"art:sync": "node scripts/art-sync.mjs"` to `package.json`.

- [ ] **Step 5: `scripts/ink.mjs`:** `node scripts/ink.mjs public/hotel-corridor.webp public/art/backdrops/lobby-far.png`: with sharp, `median(5)`, then a 12-level posterize per channel (`raw` pass: `v = Math.round(v / 23.2) * 23.2`), Sobel edge magnitude on the luminance (`sharp().greyscale().convolve` with the two kernels into two buffers, magnitude combined in JS), edges above 0.3 painted `#101010` dilated to 3 px, then `modulate({ saturation: 0.8 })` and `linear(0.9, 25)` to lift blacks. Output 1920 px wide.

- [ ] **Step 6: `art/manifest.json`** is produced by `node scripts/art-sync.mjs` on first run; commit it. **Step 7:** `src/art/registry.ts` loads `/art/registry.json` with `fetch` and exports its type plus `HEAD_FACE_PROFILE` (the fallback box used if a plate lacks one).

- [ ] **Step 8: Run, expect PASS** (`npm run test:next`); then run `npm run art:sync` and look at `public/art/hammer/*.png` in a contact sheet: alpha edges clean, no green fringe, the six head plates share a canvas. **Step 9: Commit** `scripts/art-cut.mjs scripts/art-sync.mjs scripts/ink.mjs scripts/art.check.mjs art/manifest.json src/art/registry.ts public/art package.json` — "Add the art pipeline: key, register, align, guard and ink".

---

### Task 3: Slice the owner's bodies into rig parts

**Files:** Create `art/cuts/hammer-body.json`; modify `scripts/art-cut.mjs` (add `sliceBody`), `scripts/art-sync.mjs`, `scripts/art.check.mjs`.

**Interfaces:**
- Produces: `sliceBody(keyed: Keyed, cuts: BodyCuts): Promise<Record<PartName, { png: Buffer; width; height; pivot: Point; tip: Point }>>` (polygons are in source-image pixels; the tool subtracts `keyed.offset`); `PartName = "torso" | "hips" | "upperArmNear" | "forearmNear" | "upperArmFar" | "forearmFar" | "thighNear" | "shinNear" | "thighFar" | "shinFar"`; `BodyCuts = { parts: Record<PartName, { polygon: Point[]; pivot: Point; tip: Point; fillFrom?: Point }> }` in source-image pixels of the keyed, cropped body (all four bodies share framing within 4 px, verified in the delivery check).

- [ ] **Step 1: Failing test** (append to `scripts/art.check.mjs`):

```js
import { sliceBody } from "./art-cut.mjs";
test("a body slices into ten opaque parts with pivots inside them", async () => {
  const cuts = JSON.parse(readFileSync("art/cuts/hammer-body.json", "utf8"));
  const keyed = await keyOut(readFileSync("art/incoming/hammer/body-affliction.png"));
  const parts = await sliceBody(keyed, cuts);
  const names = ["torso", "hips", "upperArmNear", "forearmNear", "upperArmFar", "forearmFar", "thighNear", "shinNear", "thighFar", "shinFar"];
  assert.deepEqual(Object.keys(parts).sort(), names.sort());
  for (const name of names) {
    const p = parts[name];
    const { data, info } = await sharp(p.png).raw().toBuffer({ resolveWithObject: true });
    let opaque = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 127) opaque++;
    assert.ok(opaque > 0.08 * info.width * info.height, `${name} has substance`);
    assert.ok(p.pivot.x >= 0 && p.pivot.x <= p.width && p.pivot.y >= 0 && p.pivot.y <= p.height, `${name} pivot inside`);
  }
});
```

- [ ] **Step 2: Run, expect FAIL** (`sliceBody` not exported).

- [ ] **Step 3: Measure and write `art/cuts/hammer-body.json`.** The keyed Affliction body is about 540 by 1400 px (source rows: head 20–300, shoulders 300–400, arms 400–880 at the left, torso 300–880, shorts 860–1060, legs 1060–1410). Render an overlay to measure: `node scripts/art-sync.mjs --overlay` writes `artifacts/body-cuts.png` with each polygon drawn in a color over the keyed body. Start from these polygons (source pixels, before the crop margin; the tool adds the margin offset), then adjust on the overlay until each follows the painted seams:

```json
{
  "parts": {
    "torso":        { "polygon": [[300,300],[560,300],[600,420],[600,880],[330,880],[300,420]], "pivot": [460,300], "tip": [460,880], "fillFrom": [520,700] },
    "hips":         { "polygon": [[320,850],[620,850],[640,1060],[320,1060]], "pivot": [470,860], "tip": [470,1060], "fillFrom": [500,950] },
    "upperArmNear": { "polygon": [[380,390],[470,400],[400,640],[300,620]], "pivot": [430,400], "tip": [350,630] },
    "forearmNear":  { "polygon": [[300,610],[400,640],[300,900],[190,870]], "pivot": [350,630], "tip": [230,885] },
    "upperArmFar":  { "polygon": [[420,400],[500,410],[450,640],[380,630]], "pivot": [460,405], "tip": [415,635] },
    "forearmFar":   { "polygon": [[380,630],[450,640],[360,890],[270,870]], "pivot": [415,635], "tip": [300,880] },
    "thighNear":    { "polygon": [[330,1000],[520,1000],[520,1200],[330,1200]], "pivot": [425,1010], "tip": [425,1195] },
    "shinNear":     { "polygon": [[320,1180],[520,1180],[520,1420],[300,1420]], "pivot": [425,1195], "tip": [410,1400] },
    "thighFar":     { "polygon": [[470,1000],[700,1000],[700,1200],[470,1200]], "pivot": [585,1010], "tip": [585,1195] },
    "shinFar":      { "polygon": [[460,1180],[740,1180],[750,1420],[460,1420]], "pivot": [585,1195], "tip": [600,1400] }
  }
}
```

- [ ] **Step 4: `sliceBody`** in `art-cut.mjs`: for each part, rasterize its polygon as a mask (scanline fill), AND it with the alpha, and cut. Overlaps are handled in two ways: a pixel claimed by two polygons goes to the part drawn later in the draw order (`forearmNear` over `upperArmNear` over `torso`, near leg over hips over far leg); and where a part was occluded in the painting (the torso behind the near arm, the far leg behind the near leg) the hole is filled: for pixels inside the part's polygon that are transparent *because the painted subject there belongs to another part*, paint the part's `fillFrom` color (sampled from the source at that point, which must be the part's base fill) and, along the polygon edge that faces the occluder, a 4 px `#101010` line so the part keeps an outline when uncovered. Each part is cropped with an 8 px margin; `pivot` and `tip` are returned in the cropped part's coordinates. Parts are written to `public/art/hammer/<costume>-<part>.png` and listed in the registry with pivots and tips. `art-sync.mjs --overlay` draws the polygons and pivots on the keyed body for the owner and the executor to check.

- [ ] **Step 5: Run, expect PASS.** Then look at `artifacts/body-cuts.png` and a sheet of the ten parts for all four costumes; adjust polygons until seams follow the painting (knees at the shorts hem, elbows at the sleeve line). **Step 6: Commit** `art/cuts/hammer-body.json scripts/art-cut.mjs scripts/art-sync.mjs scripts/art.check.mjs public/art art/manifest.json` — "Slice the owner's bodies into rig parts".

---

### Task 4: The rig: skeleton, poses, clips, forward kinematics, face clearance

**Files:** Create `src/sim/rig/skeleton.ts`, `pose.ts`, `clips.ts`, `fk.ts`, `face.ts`, `scripts/rig.check.mjs`; modify `package.json` (`test:next` adds `scripts/rig.check.mjs`).

**Interfaces:**
- Produces: `HERO_HEIGHT = 340`; `JOINTS` (spec §6.2 table) as `Record<JointName, { parent: JointName | null; rest: Point; length?: number }>`; `type Pose = { rot: Partial<Record<JointName, number>>; root: Point; lean: number; squash: { x: number; y: number }; headTilt: number }`; `REST_POSE`; `track(keys, u)` (moved from the old rig); `CLIPS: Record<ClipName, (u: number, ctx: ClipCtx) => Pose>` for `idle | walk | run | jump | fall | land | crouch | slide`; `blend(a: Pose, b: Pose, t: number): Pose`; `solve(pose: Pose, facing: 1 | -1, headScale: number): Solved` where `Solved = { parts: Record<PartName | "head" | "mallet", { x, y, rotation, scaleX, scaleY, z }>; joints: Record<JointName, Point>; faceBox: Rect; crown: Point }` in world px relative to the feet point; `faceClear(solved): { ok: boolean; offender?: string }`.

- [ ] **Step 1: Failing tests** (`scripts/rig.check.mjs`):

```js
import test from "node:test";
import assert from "node:assert/strict";
import { HERO_HEIGHT, JOINTS, REST_POSE } from "../src/sim/rig/skeleton.ts";
import { CLIPS, blend } from "../src/sim/rig/clips.ts";
import { solve } from "../src/sim/rig/fk.ts";
import { faceClear } from "../src/sim/rig/face.ts";

const ctx = { t: 0, speed: 0, vy: 0, facing: 1 };

test("the rest pose stands 340 px tall with the feet on the floor and the head on the neck", () => {
  const s = solve(REST_POSE, 1, 0.26);
  const feetY = Math.max(s.joints.ankleNear.y, s.joints.ankleFar.y);
  assert.ok(Math.abs(feetY) < 1, `feet at y=0: ${feetY}`);
  assert.ok(Math.abs(s.crown.y + HERO_HEIGHT) < 6, `crown at -340: ${s.crown.y}`);
  assert.ok(Math.abs(s.parts.head.x - s.joints.neck.x) < 12 && s.parts.head.y <= s.joints.neck.y);
});

test("walk and run clips cycle the legs and keep the head within 8 degrees of level", () => {
  for (const name of ["walk", "run"]) {
    let maxTilt = 0, swing = 0;
    for (let i = 0; i <= 60; i++) {
      const p = CLIPS[name](i / 60, { ...ctx, speed: name === "run" ? 640 : 400 });
      const s = solve(p, 1, 0.26);
      maxTilt = Math.max(maxTilt, Math.abs(s.parts.head.rotation));
      swing = Math.max(swing, Math.abs(s.joints.ankleNear.x - s.joints.ankleFar.x));
    }
    assert.ok(maxTilt <= (8 * Math.PI) / 180, `${name} head tilt ${maxTilt}`);
    assert.ok(swing > 60, `${name} stride ${swing}`);
  }
});

test("blending two poses at 0 and 1 returns each pose; at 0.5 the midpoint", () => {
  const a = CLIPS.idle(0, ctx), b = CLIPS.crouch(1, ctx);
  assert.deepEqual(blend(a, b, 0), a);
  assert.deepEqual(blend(a, b, 1), b);
  const m = blend(a, b, 0.5);
  assert.ok(Math.abs(m.lean - (a.lean + b.lean) / 2) < 1e-9);
});

test("no sampled frame of any clip puts a limb or the mallet over the face", () => {
  for (const [name, clip] of Object.entries(CLIPS))
    for (let i = 0; i <= 400; i++)
      for (const facing of [1, -1]) {
        const s = solve(clip(i / 400, { ...ctx, facing, speed: 500 }), facing, 0.3);
        const r = faceClear(s);
        assert.ok(r.ok, `${name} u=${i / 400} facing ${facing}: ${r.offender} crosses the face`);
      }
});

test("facing left mirrors the solved rig exactly", () => {
  const p = CLIPS.run(0.3, { ...ctx, speed: 640 });
  const r = solve(p, 1, 0.26), l = solve(p, -1, 0.26);
  assert.ok(Math.abs(r.joints.wristNear.x + l.joints.wristNear.x) < 1e-6);
  assert.ok(Math.abs(r.joints.wristNear.y - l.joints.wristNear.y) < 1e-6);
});
```

- [ ] **Step 2: Run, expect FAIL** (modules missing).

- [ ] **Step 3: Implement.** `skeleton.ts`: the §6.2 table as data, lengths derived from rest positions; `JointName` includes `root, pelvis, chest, neck, head, shoulderNear, elbowNear, wristNear, handNear, shoulderFar, elbowFar, wristFar, handFar, hipNear, kneeNear, ankleNear, toeNear, hipFar, kneeFar, ankleFar, toeFar, grip, malletHead`. `pose.ts`: `Pose`, `REST_POSE` (all rotations 0, root {0,0}, lean 0, squash {1,1}, headTilt 0), `blend` (linear on every number, rotations through the shortest arc), `track` (copied from the old rig with its eases). `clips.ts`: each clip returns a `Pose`; `walk`: legs swing ±22 degrees at the hip with a knee bend of 0–38 degrees on the swing leg, arms counter-swing ±14, root bob 6 px (twice per cycle), lean 3; `run`: hips ±34, knees 0–62, arms ±26, bob 10, lean 9, a short flight phase where both feet leave (root +14 px at u 0.2 and 0.7); `jump`: arms back, knees tucked 30, stretch 1.06/0.95; `fall`: arms up 20, legs slightly spread; `land`: squash 0.92/1.08 easing out over u; `crouch`: hips 70, knees 110, chest lean 20, root −110 px; `slide`: lean 50, legs forward, root −120; `idle`: breathing via squash ±0.015 on the chest region (applied as a whole-body `squash.y` of ±0.008 in R0). `fk.ts`: walk the joint tree from `root` applying parent rotation and position (standard 2D FK), apply `lean` at the pelvis, `squash` about the feet point, `headTilt` at the neck minus the accumulated rotation so the head stays level (clamp the result to ±8 degrees), mirror x for `facing = -1`, place the head sprite so the plate's neck anchor (from the registry; the solver takes the anchor offsets as constants from `src/art/registry.ts`'s defaults) sits on the neck joint, scale the plate so its height equals `headScale * HERO_HEIGHT`, and compute `faceBox` from the plate's registered face rect under the same transform. `face.ts`: probes along each limb segment (upper arm, forearm, thigh, shin for both sides, the mallet handle and head) at 11 samples with the capsule radii from spec §6.2 lengths (arm 24 px, leg 30 px, handle 14, head 36), against the face box: `faceClear` returns the first offender. Part placement for the renderer: each part's sprite origin is its pivot, rotation is the joint's world rotation, `z` from the draw order (far arm 0, far leg 1, torso 2, hips 3, near leg 4, near arm 5, mallet 6, head 7).

- [ ] **Step 4: Run, expect PASS.** If the face test fails on `run` (arms swing up), lower the arm swing or raise the shoulder rest until it passes; never move the face box. **Step 5: Commit** `src/sim/rig scripts/rig.check.mjs package.json` — "Add the paper-doll skeleton, clips and forward kinematics with face clearance".

---

### Task 5: The sim: input, physics, Hammer's ground movement

**Files:** Create `src/sim/constants.ts`, `types.ts`, `input.ts`, `physics.ts`, `hero.ts`, `world.ts`, `scripts/sim.check.mjs`; modify `package.json` (`test:next` adds it).

**Interfaces:**
- Produces: constants from spec §9 (`GRAVITY_UP 3300`, `GRAVITY_DOWN 4600`, `APEX_FLOAT 0.5`, `JUMP_V0 1520`, `JUMP_CUT 620`, `WALK 400`, `RUN 640`, `ACCEL_GROUND 4400`, `ACCEL_AIR 2600`, `FRICTION 5600`, `COYOTE 0.1`, `BUFFER 0.12`, `SLIDE_START 800`, `SLIDE_END 480`, `CROUCH_WALK 240`, `HERO_W 110`, `HERO_H 300`, `HERO_CROUCH_H 200`, `STEP = 1/120`); `type Action = "left" | "right" | "jump" | "run" | "down" | "fire" | "towel" | "hammer" | "super" | "lecture"`; `Input = { held: Record<Action, boolean>; pressed: Record<Action, boolean> }`; `FloorSegment = { x0, x1, y0, y1 }`, `Platform = { x0, x1, y }`, `Pass = Rect`, `Solid = Rect`; `Stage = { floor: FloorSegment[]; platforms: Platform[]; solids: Solid[]; passes: Pass[]; bounds: Rect }`; `HeroState = { x, y, w, h, vx, vy, facing, onGround, crouch, slideT, coyote, buffer, state: "idle" | "walk" | "run" | "jump" | "fall" | "land" | "crouch" | "slide"; stateT: number; animT: number }` (`x, y` is the feet point; `w, h` the collider); `World = { stage, hero, time; step(input: Input): void; snapshot(): Snapshot }`, `Snapshot = { time: number; hero: HeroState }`, `createWorld(stage: Stage, spawn: Point): World`.

- [ ] **Step 1: Failing tests** (`scripts/sim.check.mjs`):

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createWorld } from "../src/sim/world.ts";
import { HERO_H, HERO_CROUCH_H, JUMP_V0, RUN, STEP } from "../src/sim/constants.ts";
import { HERO_HEIGHT } from "../src/sim/rig/skeleton.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const flat = (extra = {}) => ({
  floor: [{ x0: -2000, x1: 20000, y0: 0, y1: 0 }],
  platforms: [], solids: [], passes: [],
  bounds: { x: -2000, y: -3000, w: 22000, h: 4000 },
  ...extra,
});
const run = (w, seconds, held = {}, pressedOnce = {}) => {
  let first = true;
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    w.step(input(held, first ? pressedOnce : {}));
    first = false;
  }
};

test("a jump clears about 1.15 Hammer heights and a cut jump about half", () => {
  const w = createWorld(flat(), { x: 100, y: 0 });
  run(w, 0.05);
  let apex = 0;
  w.step(input({ jump: true }, { jump: true }));
  for (let i = 0; i < 240; i++) { w.step(input({ jump: true })); apex = Math.min(apex, w.hero.y); }
  assert.ok(-apex > 1.05 * HERO_HEIGHT && -apex < 1.25 * HERO_HEIGHT, `apex ${-apex}`);
  const c = createWorld(flat(), { x: 100, y: 0 });
  run(c, 0.05);
  c.step(input({ jump: true }, { jump: true }));
  let cutApex = 0;
  for (let i = 0; i < 240; i++) { c.step(input()); cutApex = Math.min(cutApex, c.hero.y); }
  assert.ok(-cutApex < 0.7 * HERO_HEIGHT, `cut apex ${-cutApex}`);
});

test("running reaches 640 px/s and stops within 0.2 s on release", () => {
  const w = createWorld(flat(), { x: 100, y: 0 });
  run(w, 1.0, { right: true, run: true });
  assert.ok(Math.abs(w.hero.vx - RUN) < 1, `vx ${w.hero.vx}`);
  assert.equal(w.hero.state, "run");
  run(w, 0.2);
  assert.equal(w.hero.vx, 0, "stopped");
  assert.equal(w.hero.facing, 1);
});

test("coyote time and the jump buffer each allow a late or early jump", () => {
  const edge = flat({ floor: [{ x0: -2000, x1: 500, y0: 0, y1: 0 }, { x0: 900, x1: 20000, y0: 0, y1: 0 }] });
  const w = createWorld(edge, { x: 440, y: 0 });
  run(w, 0.05, { right: true, run: true });
  while (w.hero.onGround) w.step(input({ right: true, run: true }));
  run(w, 0.06, { right: true, run: true });
  w.step(input({ right: true, run: true, jump: true }, { jump: true }));
  assert.ok(w.hero.vy < -1000, "coyote jump fired");
  const b = createWorld(flat(), { x: 100, y: -200 });
  b.step(input({}, { jump: true }));
  run(b, 0.08);
  while (!b.hero.onGround) b.step(input());
  b.step(input());
  assert.ok(b.hero.vy < -1000, "buffered jump fired on landing");
});

test("holding a direction while landing on a platform edge keeps him running", () => {
  const st = flat({ platforms: [{ x0: 700, x1: 1400, y: -220 }] });
  const w = createWorld(st, { x: 420, y: 0 });
  run(w, 0.1, { right: true, run: true });
  w.step(input({ right: true, run: true, jump: true }, { jump: true }));
  let landedOn = null;
  for (let i = 0; i < 360; i++) {
    w.step(input({ right: true, run: true, jump: true }));
    if (w.hero.onGround && w.hero.y <= -219 && landedOn === null) landedOn = i;
  }
  assert.ok(landedOn !== null, "landed on the platform");
  assert.ok(w.hero.vx > RUN - 40, `kept running: ${w.hero.vx}`);
  assert.ok(w.hero.x > 1200, `kept going: ${w.hero.x}`);
});

test("down crouches to 200 px, run + down slides under a pass, and he stands only when clear", () => {
  // A low ceiling: solid from far above down to 220 px over the floor.
  const st = flat({ passes: [{ x: 900, y: -1000, w: 500, h: 780 }] });
  const w = createWorld(st, { x: 600, y: 0 });
  run(w, 0.4, { right: true, run: true });
  run(w, 0.05, { right: true, run: true, down: true });
  assert.equal(w.hero.state, "slide");
  assert.equal(w.hero.h, HERO_CROUCH_H);
  run(w, 0.5, { right: true, down: true });
  assert.ok(w.hero.x > 900 && w.hero.x < 1400, `under the pass: ${w.hero.x}`);
  run(w, 0.3, {});
  assert.ok(w.hero.crouch, "stays low under the ceiling with nothing held");
  run(w, 1.5, { right: true });
  assert.equal(w.hero.h, HERO_H);
  assert.equal(w.hero.crouch, false);
});

test("stepping is deterministic for the same inputs", () => {
  const a = createWorld(flat(), { x: 100, y: 0 }), b = createWorld(flat(), { x: 100, y: 0 });
  const seq = (i) => input({ right: i % 50 < 30, run: true, jump: i % 90 === 0 }, { jump: i % 90 === 0 });
  for (let i = 0; i < 600; i++) { a.step(seq(i)); b.step(seq(i)); }
  assert.deepEqual(a.snapshot(), b.snapshot());
});
```

- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement** `constants.ts` (the table), `physics.ts` (`moveBody(body, stage, dt)`: integrate x then y, resolve against solids (push out), floor segments (feet to the segment's y at x, with slope support `y = y0 + (y1-y0)*(x-x0)/(x1-x0)`), one-way platforms only when moving down and the feet were above last step, passes as ceilings that block standing (`canStand(body, stage)`), bounds), `hero.ts` (the state machine: accel, friction, run cap, jump with coyote/buffer/cut, apex float, crouch/slide with the collider swap keeping the feet fixed, standing only when `canStand`, `facing` from input, `state`/`stateT`/`animT` bookkeeping with `land` lasting 0.09 s), `world.ts` (fixed `STEP`, `snapshot()` returns a plain copy). Keep every function pure over plain objects.

- [ ] **Step 4: Run, expect PASS.** Tune within spec §9 only if a test's band fails (e.g. apex), and note the final numbers in the report. **Step 5: Commit** `src/sim scripts/sim.check.mjs package.json` — "Add the sim: fixed-step world, physics and Hammer's ground movement".

---

### Task 6: The renderer and the lobby look scene

**Files:** Create `src/render/scene.ts`, `character.ts`, `lighting.ts`, `particles.ts`, `text.ts`, `backdrop.ts`, `palette.ts`; replace `src/render/look.ts`; modify `src/components/next-game.tsx`, `scripts/next-browser.check.mjs`.

**Interfaces:**
- Produces: `createScene(render): Scene` with `Scene = { layers: Record<"sky"|"far"|"mid"|"play"|"light"|"fx"|"fore"|"post", Container>; camera: Camera; resize(): void; update(dt): void }`; `Camera = { x, y, zoom, target: Point | null; lookAhead: number; trauma: number; fit(): void }` (fit keeps HERO_HEIGHT at 0.315 of the screen height on any aspect); `createCharacter(registry, costume): Character` with `Character = { container: Container; apply(solved: Solved, expression: Expression, facing): void; shadow: Graphics }`; `createLighting(scene, quality)`; `Particles` with `emit(recipe, x, y, n)`; `installFonts(): Promise<void>` (BitmapFont for both families); `loadBackdrop(scene, venue)`; `startLook(render): { stop(): void }`.

- [ ] **Step 1: Extend the browser check** (failing first): after boot, `await page.keyboard.down("ArrowRight"); await page.waitForTimeout(900);` assert `window.__next.hero.state === "run"` and `window.__next.hero.x` grew; screenshot `next-run.png`; `keyboard.press("Space")`, 250 ms later assert `hero.state` is `jump` or `fall`, screenshot `next-jump.png`; release, wait 1 s, assert `idle`, screenshot `next-idle.png`. Resize to 1000 by 750 and 2560 by 1080: assert `window.__next.heroScreenHeight / innerHeight` within 0.30–0.33 at both (the camera fit). Also assert the registry loaded (`window.__next.art.heads >= 1`) and that with `?next=1&noart=1` (the loader ignores expression and body plates except `head-profile.png` and the Affliction body) the scene still renders and logs exactly one `console.warn` containing `art fallback`.

- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement.**
  - `palette.ts`: skin `#b5642a` / shadow `#8e4a1f` / highlight `#d07f44`, shirt `#111417`, shorts `#2f4a74`, mallet wood `#c9a16a` / `#8c6a3f`, outline `#101010`, lobby ambient `#ffe9c9`.
  - `scene.ts`: the eight layers in order, `play.sortableChildren = true`; the camera from spec §5.4 (spring follow, look-ahead ease, dead zone, trauma shake with rotation, zoom); `fit()` sets `stage.scale` so `HERO_HEIGHT * zoom * scale = 0.315 * screen.height`, centers on the camera, and applies per-layer parallax by offsetting each layer by `(camera.x * (1 - factor))`.
  - `text.ts`: `await document.fonts.load("800 64px 'Barlow Condensed'")` and Inter, then `BitmapFont.install({ name: "display", style: { fontFamily: "Barlow Condensed", fontWeight: "800", fontSize: 64, fill: "#fff" } })` and `"ui"` for Inter 600 at 48; a `label(text, kind)` helper returning a `BitmapText`.
  - `backdrop.ts`: `Assets.load("/art/backdrops/lobby-far.png")` into `far` (tiled twice horizontally, anchored to the floor line), a `sky` fill, a drawn floor in `play` at z −1 (a marble band 0..120 px below the feet line: top face `#d9d2c4`, front face `#b8ad99`, a 4 px outline, glossy highlight stripe) over the stage's floor segments, and two drawn mid pieces (a column, a palm in a brass pot, in the style rules) as placeholders until the owner's `lobby-mid` arrives (slots `backdrops.lobby.mid[]`).
  - `lighting.ts`: four radial lamp sprites along the lobby (`add` blend) on `light`, `AdvancedBloomFilter({ threshold: 0.55, bloomScale: 0.9, brightness: 1 })` on the layer at `ultra`/`high`, a plain additive layer at `medium`, the layer hidden at `low`; the ambient tint on `play` (`container.tint`).
  - `particles.ts`: a pooled `Particle` array drawn as one `Graphics` rebuilt each frame (R0 size: 600), recipes `dust` and `sweat`.
  - `app.ts`: widen the `Window.__next` type with the optional `hero`, `heroScreenHeight` and `art` fields Task 6's probe adds.
  - `character.ts`: one `Container` with a `Sprite` per part from `public/art/hammer/<costume>-<part>.png` (anchor at the pivot), the head `Sprite` from the expression plate (anchor at its neck anchor), a blob shadow `Graphics` under the feet; `apply(solved)` sets each sprite's position/rotation/z from `Solved.parts`, flips with `scale.x = facing`, swaps the head texture on expression change; the far limbs are tinted `#c9c9c9` (parts only, never the head). With `noart` or missing files: fall back to `head-profile.png` and `affliction-*` parts and `console.warn("art fallback: ...")` once.
  - `look.ts`: builds the stage (`createWorld` with the lobby's flat floor from −1000 to 14000, three platforms at −180 (counter), −180, −520 (balcony), a pass at 2200..2700 of height 220), installs fonts, loads the registry, creates the scene, lighting, particles, character; samples the keyboard (arrows/WASD, Space/Z jump, Shift run, Down crouch); runs the sim at 120 Hz from the ticker's `deltaMS` with an accumulator (cap 5 steps), keeps the last two snapshots and interpolates; picks the clip from `hero.state` and `animT`, applies procedural layers (lean from `vx`, landing squash from `stateT`), solves, applies; emits `dust` on landing and every 0.12 s while running; a HUD-free frame with one display label "LOOK TEST · /?next=1" top-left; the dev probe `window.__next.hero = { state, x, vx }`, `heroScreenHeight`, `art = { heads, bodies }`.

- [ ] **Step 4: Run, expect PASS** (`next-browser.check.mjs`). Open the screenshots and look: Hammer walks, runs and jumps in the lobby with his real head; the feet sit on the marble; the far limbs read as behind; the lamps glow. Fix anything that reads wrong before moving on (a part pivot off by a few pixels shows as a gap: adjust `art/cuts/hammer-body.json`, re-run `art:sync`).

- [ ] **Step 5: Commit** `src/render src/components/next-game.tsx scripts/next-browser.check.mjs public/art` — "Render Hammer in the lobby: layers, camera, lighting, particles and the rig".

---

### Task 7: Look boards, docs, full verification

**Files:** Create `scripts/look-boards.mjs`; modify `README.md`, `art/ART-REQUEST.md` (one line: delivered items are marked).

- [ ] **Step 1: `scripts/look-boards.mjs`:** opens `/?next=1&board=1`; the look scene, when `board=1`, exposes `window.__nextBoard.render(spec)` which draws into an offscreen `RenderTexture` and returns a data URL: (a) `hammer-clips.png`: rows `idle, walk, run, jump, fall, land, crouch, slide` × 6 frames at 420 px cell height, facing right, Affliction, neutral head at 0.26; (b) `hammer-heads.png`: the six expressions on the idle pose, three head scales 0.22 / 0.26 / 0.30 as rows; (c) `hammer-costumes.png`: the four costumes idle and mid-run; (d) `lobby-look.png`: three camera positions in the look scene at 1920 by 1080 with lighting and particles. The script saves them under `artifacts/` and prints their paths.

- [ ] **Step 2: README** gains a "The rebuild (`/?next=1`)" section: what it is, how to run it, `npm run test:next`, `npm run art:sync`, the art folders, the look boards, the quality tiers and `hammer-time-quality`.

- [ ] **Step 3: Definition of done:** `npx tsc --noEmit`; `npx eslint src scripts`; `npm run test:game` (72, test 1 untouched) and `npm run test:next`; dev 8090: `next-browser.check.mjs`, `look-boards.mjs`, plus the old `game-browser-check.mjs`, `start-screen.check.mjs`, `browser-smoke.mjs`; `node scripts/with-app-env.mjs vite build`; preview 8091: `next-browser.check.mjs` and `browser-smoke.mjs`; `git status` shows only the owner's two files modified; `git hash-object` of `src/routeTree.gen.ts` unchanged (`dceedffd`), and `package-lock.json` not staged.

- [ ] **Step 4: Commit** `scripts/look-boards.mjs README.md art/ART-REQUEST.md` — "Add the R0 look boards and document the rebuild".

- [ ] **Step 5: Report and stop.** Send the four boards and the three live screenshots; state the renderer type Chrome used, the measured fps at `ultra`, the physics numbers as tuned, every ruling, what looks off, and ask the owner to pick the head scale and sign off the look before R1.
