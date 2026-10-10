import { createFileRoute } from "@tanstack/react-router";
import { KilnHop } from "@/components/kiln-hop";
import { NextGame } from "@/components/next-game";

export const Route = createFileRoute("/")({
  // The rebuild lives behind ?next=1 until it replaces the shipped game.
  // The router validates its own output again, so the flags must accept true as well as 1.
  validateSearch: (search: Record<string, unknown>) => ({
    next: flag(search.next),
    gl: flag(search.gl),
    noart: flag(search.noart),
    board: flag(search.board),
  }),
  component: Home,
});

const flag = (v: unknown) => v === true || v === 1 || v === "1";

function Home() {
  const { next, gl, noart, board } = Route.useSearch();
  return next ? <NextGame forceWebgl={gl} noart={noart} board={board} /> : <KilnHop />;
}
