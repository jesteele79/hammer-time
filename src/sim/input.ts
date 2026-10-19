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
  | "lecture" | "box";

export const ACTIONS: Action[] = ["left", "right", "jump", "run", "down", "fire", "towel", "hammer", "super", "lecture", "box"];

/** `held` is the state this step; `pressed` is true only on the step an action went down. */
export type Input = { held: Record<Action, boolean>; pressed: Record<Action, boolean> };

const none = () => Object.fromEntries(ACTIONS.map((a) => [a, false])) as Record<Action, boolean>;

export function emptyInput(): Input {
  return { held: none(), pressed: none() };
}

/** KeyboardEvent.code to action, the same keys the first build taught. */
export const KEY_BINDINGS: Record<string, Action> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Space: "jump",
  KeyW: "jump",
  KeyZ: "jump",
  ArrowUp: "jump",
  ShiftLeft: "run",
  ShiftRight: "run",
  KeyJ: "run",
  ArrowDown: "down",
  KeyS: "down",
  KeyH: "hammer",
  KeyX: "hammer",
  KeyF: "fire",
  KeyC: "fire",
  KeyK: "fire",
  KeyT: "towel",
  KeyQ: "super",
  KeyE: "lecture",
  KeyL: "lecture",
  KeyB: "box",
};

/** The input for one step from the keys and the touch buttons down now, and the actions held last step. */
export function inputFrom(
  down: ReadonlySet<string>,
  touched: ReadonlySet<Action>,
  prevHeld: Record<Action, boolean>,
  bindings: Record<string, Action> = KEY_BINDINGS,
): Input {
  const held = none();
  for (const code of down) {
    const action = bindings[code];
    if (action) held[action] = true;
  }
  for (const a of touched) held[a] = true;
  const pressed = none();
  for (const a of ACTIONS) pressed[a] = held[a] && !prevHeld[a];
  return { held, pressed };
}

/** The input for one step from the keys down now and the actions held last step. */
export function inputFromKeys(
  down: ReadonlySet<string>,
  prevHeld: Record<Action, boolean>,
  bindings: Record<string, Action> = KEY_BINDINGS,
): Input {
  return inputFrom(down, new Set(), prevHeld, bindings);
}
