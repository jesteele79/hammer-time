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
    { id: "mclub", kind: "quest", quest: "lounge", x: 8800, y: -520, label: "M CLUB", tier: 6, opens: "Platinum members only" },
    { id: "staff", kind: "stash", x: 9700, y: 0, label: "STAFF ONLY" },
  ],
  // The floor road's cart and the wing's: the bellhops work the same stretches by night; the spare at the entrance is put away.
  carts: [3150, 7900, 12050],
  // The night crew (story spec §8.1): the auditor by the desk with his reply-all, three bellhops each carrying a keycard, the
  // guard on the mezzanine, two servers clearing the conference wing with ice water, and no students.
  cast: [
    { id: "auditor", person: "office-1", x: 1400, y: 0, x0: 900, x1: 1450, recolor: "#6b4f3a", trick: "replyAll" },
    { id: "bellhop-night-1", person: "bellhop-1", x: 3300, y: 0, cart: 3150, carry: "keycard" },
    { id: "bellhop-night-2", person: "bellhop-2", x: 8050, y: 0, cart: 7900, carry: "keycard" },
    { id: "bellhop-night-3", person: "bellhop-1", x: 12200, y: 0, cart: 12050, carry: "keycard", recolor: "#4a2f6b", size: 1.03 },
    { id: "guard", person: "guard-1", x: 8600, y: -520, x0: 7600, x1: 9600 },
    { id: "server-night-1", person: "server-1", x: 13100, y: 0, x0: 12800, x1: 13400, trick: "water" },
    { id: "server-night-2", person: "server-2", x: 14300, y: 0, x0: 14000, x1: 14700, trick: "water", recolor: "#7a1f2b" },
  ],
};
