// Plays ten seeded practice rounds for each scripted player and prints their medians and the grade scale they ask for (R4 §6).
// Usage: node --loader ./scripts/game-test-loader.mjs scripts/banquet-tune.mjs
import { idlePlayer, steadyPlayer, sharpPlayer, playRound, suggestScale } from "../src/sim/quests/hungry/drive.ts";

const seeds = Array.from({ length: 10 }, (_, i) => i + 1);
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const scores = (make) => seeds.map((s) => playRound(s, make()).score);
const idle = scores(() => idlePlayer);
const steady = scores(steadyPlayer);
const sharp = scores(sharpPlayer);
console.log(JSON.stringify({ idle: median(idle), steady: { median: median(steady), all: steady }, sharp: { median: median(sharp), all: sharp }, scale: suggestScale(median(steady), median(sharp)) }, null, 2));
