import { useEffect, useRef, type PointerEvent } from "react";
import type { Action } from "@/sim/input";

type Button = { action: Action; label: string; glyph: string };

/** The shipped pad's ten buttons: moving on the left, acting on the right. */
const MOVE: Button[] = [
  { action: "run", label: "Run", glyph: "Run" },
  { action: "down", label: "Down", glyph: "↓" },
  { action: "left", label: "Left", glyph: "←" },
  { action: "right", label: "Right", glyph: "→" },
];
const ACT: Button[] = [
  { action: "towel", label: "Towel", glyph: "Towel" },
  { action: "fire", label: "Snot", glyph: "Snot" },
  { action: "lecture", label: "Lecture", glyph: "Lecture" },
  { action: "super", label: "Super", glyph: "Super" },
  { action: "hammer", label: "Hammer", glyph: "Hammer" },
  { action: "jump", label: "Jump", glyph: "Jump" },
];

/** The touch pad (spec §10): pressed while a finger is down, the ready moves lit. */
/** The boxes of #15 blades (R5 §9): a button after Jump only while he has some, the one time the pad has eleven. */
const BOX: Button = { action: "box", label: "Box of blades", glyph: "Box" };

export function NextTouch({
  onPress,
  ready,
  boxes = 0,
}: {
  onPress: (action: Action, down: boolean) => void;
  ready: Partial<Record<Action, boolean>>;
  boxes?: number;
}) {
  // What the pad holds down now: when it goes away (a card covers the game), it lets go of all of it.
  const held = useRef(new Set<Action>());
  const press = useRef(onPress);
  press.current = onPress;
  useEffect(() => {
    const holding = held.current;
    return () => {
      for (const a of holding) press.current(a, false);
      holding.clear();
    };
  }, []);
  const release = (action: Action) => {
    held.current.delete(action);
    onPress(action, false);
  };
  const bind = (action: Action) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // A pointer the browser no longer tracks cannot be captured; the press still counts.
      }
      held.current.add(action);
      onPress(action, true);
    },
    onPointerUp: () => release(action),
    onPointerCancel: () => release(action),
    onLostPointerCapture: () => release(action),
    onContextMenu: (e: { preventDefault(): void }) => e.preventDefault(),
  });
  const pad = (buttons: Button[], kind: string) => (
    <div className={`next-touch__pad next-touch__pad--${kind}`}>
      {buttons.map((b) => (
        <button
          key={b.action}
          type="button"
          className="next-touch__button"
          data-action={b.action}
          data-ready={ready[b.action] ?? undefined}
          data-count={b.action === "box" ? boxes : undefined}
          aria-label={b.label}
          {...bind(b.action)}
        >
          {b.glyph}
        </button>
      ))}
    </div>
  );
  return (
    <div className="next-touch" aria-label="Touch controls">
      {pad(MOVE, "move")}
      {pad(boxes > 0 ? [...ACT, BOX] : ACT, "act")}
    </div>
  );
}
