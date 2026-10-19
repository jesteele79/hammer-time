// Fare Darts' difficulty from its scripted rounds (R5 design §3): the masher, the person and the sharp hand over ten
// seeds. Run: node --loader ./scripts/game-test-loader.mjs scripts/fares-tune.mjs
import { masherPlayer, personPlayer, sharpPlayer, playRound } from "../src/sim/quests/fares/drive.ts";
import { FARES } from "../src/sim/quests/fares/fares.ts";

const seeds = [...Array(10).keys()].map((i) => i + 1);
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const masher = seeds.map((s) => playRound(s, masherPlayer).booked);
const person = seeds.map((s) => playRound(s, personPlayer(s)).booked);
const sharp = seeds.map((s) => playRound(s, sharpPlayer()));
console.log(
  JSON.stringify(
    {
      aim: { w: FARES.aim.w, rise: FARES.aim.rise, ratio: FARES.aim.ratio },
      steady: { factor: FARES.steady.factor, budget: FARES.steady.budget },
      masher: { booked: masher, median: median(masher) },
      person: { booked: person, median: median(person) },
      sharp: { preferred: sharp.filter((r) => r.preferred).length, booked: sharp.map((r) => r.booked) },
    },
    null,
    1,
  ),
);
