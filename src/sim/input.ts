export type Action =
  | "left"
  | "right"
  | "jump"
  | "run"
  | "down"
  | "fire"
  | "towel"
  | "hammer"
  | "super"
  | "lecture";

export const ACTIONS: Action[] = ["left", "right", "jump", "run", "down", "fire", "towel", "hammer", "super", "lecture"];

/** `held` is the state this step; `pressed` is true only on the step an action went down. */
export type Input = { held: Record<Action, boolean>; pressed: Record<Action, boolean> };

const none = () => Object.fromEntries(ACTIONS.map((a) => [a, false])) as Record<Action, boolean>;

export function emptyInput(): Input {
  return { held: none(), pressed: none() };
}

/** KeyboardEvent.code to action. */
export const KEY_BINDINGS: Record<string, Action> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Space: "jump",
  KeyW: "jump",
  ArrowUp: "jump",
  ShiftLeft: "run",
  ShiftRight: "run",
  ArrowDown: "down",
  KeyS: "down",
  KeyJ: "hammer",
  KeyX: "hammer",
  KeyK: "fire",
  KeyC: "fire",
  KeyL: "towel",
  KeyV: "towel",
  KeyI: "super",
  KeyU: "lecture",
  KeyE: "lecture",
};

/** The input for one step from the keys down now and the actions held last step. */
export function inputFromKeys(
  down: ReadonlySet<string>,
  prevHeld: Record<Action, boolean>,
  bindings: Record<string, Action> = KEY_BINDINGS,
): Input {
  const held = none();
  for (const code of down) {
    const action = bindings[code];
    if (action) held[action] = true;
  }
  const pressed = none();
  for (const a of ACTIONS) pressed[a] = held[a] && !prevHeld[a];
  return { held, pressed };
}
