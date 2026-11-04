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
  status: true,
  // The desk's counter, both sofas, the landing, the mezzanine rail, the conference tables and the corridor; the eighth is on the stash's shelf.
  keycards: [
    { x: 1700, y: -250 },
    { x: 3150, y: -180 },
    { x: 4150, y: -180 },
    { x: 6680, y: -190 },
    { x: 8300, y: -590 },
    { x: 12500, y: -230 },
    { x: 15050, y: -70 },
  ],
  doors: [
    { id: "buffet", kind: "closed", x: 4600, y: 0, label: "BUFFET", opens: "Closed for the night" },
    { id: "elevator", kind: "exit", x: 5700, y: 0, label: "ELEVATORS", tier: 8, down: true, opens: "Reserved for Titanium members. Thank you." },
    { id: "stairs", kind: "exit", x: 6400, y: 0, label: "STAIRS", down: true },
    { id: "mclub", kind: "closed", x: 8800, y: -520, label: "M CLUB", opens: "Platinum members only" },
    { id: "staff", kind: "stash", x: 9700, y: 0, label: "STAFF ONLY" },
  ],
  cast: [],
};
