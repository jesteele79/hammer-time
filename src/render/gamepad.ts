import type { Action } from "../sim/input";

/** A controller this frame: whether one is connected, the actions it holds, and Start. */
export type Pad = { connected: boolean; held: Set<Action>; start: boolean };
export const NO_PAD: Pad = { connected: false, held: new Set(), start: false };

/** The standard mapping's buttons (A, B, X, Y, the bumpers, the triggers, the d-pad) and the actions they are. */
const BUTTONS: [number, Action][] = [
  [0, "jump"],
  [1, "fire"],
  [2, "hammer"],
  [3, "box"],
  [4, "towel"],
  [5, "run"],
  [6, "lecture"],
  [7, "super"],
  [12, "up"],
  [13, "down"],
  [14, "left"],
  [15, "right"],
];
const START = 9;
/** How far up the left stick counts as up: further than its other ways, as it jumps in a 2D level. */
const STICK_UP = 0.6;

/** One pad's state as actions: its buttons by the standard mapping, the left stick past `deadzone` as left, right and down. */
export function mapPad(buttons: readonly { pressed: boolean }[], axes: readonly number[], deadzone = 0.35): Omit<Pad, "connected"> {
  const held = new Set<Action>();
  for (const [i, a] of BUTTONS) if (buttons[i]?.pressed) held.add(a);
  const [x = 0, y = 0] = axes;
  if (x <= -deadzone) held.add("left");
  if (x >= deadzone) held.add("right");
  if (y >= deadzone) held.add("down");
  if (y <= -Math.max(deadzone, STICK_UP)) held.add("up");
  return { held, start: !!buttons[START]?.pressed };
}

/** The first connected controller with the standard mapping, read now; none, or no Gamepad API, reads as no pad. */
export function readPad(deadzone = 0.35): Pad {
  const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = [...pads].find((p) => p?.connected && p.mapping === "standard");
  return pad ? { connected: true, ...mapPad(pad.buttons, pad.axes, deadzone) } : NO_PAD;
}
