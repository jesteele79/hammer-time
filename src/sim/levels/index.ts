import type { Level } from "../level";
import { CAMPUS } from "./campus";
import { GIFTSHOP } from "./giftshop";
import { LOBBY } from "./lobby";
import { LOBBY_NIGHT } from "./lobby-night";
import { PARIS } from "./paris";
import { RESTAURANT } from "./restaurant";
import { SAT } from "./sat";
import { FLIGHT } from "./flight";
import { HALLWAY } from "./hallway";
import { SUITE } from "./suite";
import { TOWER } from "./tower";
import { TRAIN } from "./train";
import { BASEL } from "./basel";
import { LAB } from "./lab";

/** The story's stops that are built, by id: the renderer plays them, the shell lists them on the strip. */
export const STOP_LEVELS: ReadonlyMap<string, Level> = new Map([SAT, LOBBY, RESTAURANT, CAMPUS, GIFTSHOP, LOBBY_NIGHT, TOWER, HALLWAY, SUITE, FLIGHT, PARIS, TRAIN, BASEL, LAB].map((l) => [l.id, l]));
