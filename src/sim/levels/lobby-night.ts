import type { Level } from "../level";
import { LOBBY } from "./lobby";

/**
 * 2-1, the lobby at 11:40 pm (story spec §8.1): the lobby's walls, furniture and routes relit, the night crew in place of
 * the day shift. The doors and the people are the night's own.
 */
export const LOBBY_NIGHT: Level = {
  ...LOBBY,
  id: "lobby-night",
  name: "The lobby, 11:40 pm",
  world: "2-1",
  music: "lobby",
  ambient: "night",
  card: "Front desk has you as MEMBER. System error.",
  thoughts: [{ x: 1100, text: "TITANIUM. Look again." }],
  doors: [],
  cast: [],
};
