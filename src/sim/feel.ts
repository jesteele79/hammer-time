import type { GameEvent } from "./events";

export type Feel = {
  hitstop: number;
  trauma: number;
  slowmo?: { scale: number; seconds: number };
  zoom?: { amount: number; seconds: number };
};

/** What each event does to time and the camera (spec §5.4, §6.4, §9). */
export function feelOf(e: GameEvent): Feel | null {
  switch (e.type) {
    case "hit":
      if (e.by === "mallet") return { hitstop: 0.06, trauma: 0.35 };
      if (e.by === "snot") return { hitstop: 0.03, trauma: 0.12 };
      return null;
    case "burst":
      return { hitstop: 0.08, trauma: 0.8, slowmo: { scale: 0.25, seconds: 0.25 }, zoom: { amount: 1.12, seconds: 0.4 } };
    case "superStart":
      return { hitstop: 0, trauma: 0.15 };
    case "fire":
      return { hitstop: 0, trauma: 0.08 };
    default:
      return null;
  }
}
