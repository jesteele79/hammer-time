import type { Level } from "../level";
import { CAMPUS } from "./campus";
import { GIFTSHOP } from "./giftshop";
import { LOBBY } from "./lobby";
import { LOBBY_NIGHT } from "./lobby-night";
import { RESTAURANT } from "./restaurant";
import { SAT } from "./sat";

/** The story's stops that are built, by id: the renderer plays them, the shell lists them on the strip. */
export const STOP_LEVELS: ReadonlyMap<string, Level> = new Map([SAT, LOBBY, RESTAURANT, CAMPUS, GIFTSHOP, LOBBY_NIGHT].map((l) => [l.id, l]));
