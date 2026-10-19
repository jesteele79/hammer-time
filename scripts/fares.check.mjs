import test from "node:test";
import assert from "node:assert/strict";
import { STEP } from "../src/sim/constants.ts";
import { MAP, CITY_CODES, cityAt, polygon, TAGS, endIn9, fareFor, classOf, pointsFor } from "../src/sim/quests/fares/board.ts";

const NONE = { left: false, right: false, jump: false, run: false, down: false, fire: false, towel: false, hammer: false, super: false, lecture: false, box: false };
const input = (held = {}, pressed = {}) => ({ held: { ...NONE, ...held }, pressed: { ...NONE, ...pressed } });
const of = (evs, type) => evs.filter((e) => e.type === type);
const near = (a, b, what, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} not ${b}`);
void STEP;
void input;
void of;

test("the map: 23 cities in a 1080 by 600 rectangle, San Antonio at (493.6, 481.8), the cartoon US's 30 points", () => {
  assert.deepEqual([MAP.w, MAP.h, CITY_CODES.length, polygon().length], [1080, 600, 23, 30]);
  near(cityAt("SAT").x, 493.56, "SAT x");
  near(cityAt("SAT").y, 481.8, "SAT y");
  for (const c of CITY_CODES) assert.ok(cityAt(c).x > 0 && cityAt(c).x < MAP.w && cityAt(c).y > 0 && cityAt(c).y < MAP.h, c);
});

test("fares by the design's formula: Austin, Houston, Dallas and New Orleans Wanna Get Away, Seattle and Boston Business Select; a flash sale halves", () => {
  assert.deepEqual(["AUS", "HOU", "DAL", "MSY", "OKC", "PHX", "DEN", "SLC", "BWI", "BOS", "SEA"].map((c) => fareFor(c, false)), [49, 59, 79, 79, 109, 119, 159, 179, 189, 229, 249]);
  assert.deepEqual(["AUS", "DAL", "OKC", "SLC", "BOS", "SEA"].map((c) => fareFor(c, true)), [49, 49, 59, 99, 119, 129]);
  for (const c of CITY_CODES.filter((c) => c !== "SAT"))
    for (const flash of [false, true]) {
      const f = fareFor(c, flash);
      assert.ok(f >= 49 && f <= 249 && f % 10 === 9, `${c} ${flash}: ${f}`);
    }
  assert.deepEqual(CITY_CODES.filter((c) => c !== "SAT" && classOf(fareFor(c, false)) === "wga"), ["DAL", "HOU", "AUS", "MSY"]);
  assert.deepEqual(CITY_CODES.filter((c) => classOf(fareFor(c, false)) === "business"), ["SEA", "BOS"]);
  assert.deepEqual([endIn9(48), endIn9(49), endIn9(54), endIn9(140), endIn9(221)], [49, 49, 59, 149, 229]);
});

test("classes, tags and points: $49 pays 402 and $79 pays 342 Wanna Get Away; Anytime 150; Business Select 60", () => {
  assert.deepEqual([classOf(99), classOf(100), classOf(199), classOf(200)], ["wga", "anytime", "anytime", "business"]);
  assert.deepEqual([pointsFor("wga", 49), pointsFor("wga", 79), pointsFor("anytime", 149), pointsFor("business", 229)], [402, 342, 150, 60]);
  assert.deepEqual([TAGS.wga.w, TAGS.wga.h, TAGS.anytime.w, TAGS.anytime.h, TAGS.business.w, TAGS.business.h], [90, 50, 120, 60, 150, 70]);
});
