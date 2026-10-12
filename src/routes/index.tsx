import { createFileRoute } from "@tanstack/react-router";
import { KilnHop } from "@/components/kiln-hop";
import { NextGame } from "@/components/next-game";

export const Route = createFileRoute("/")({
  // The rebuild lives behind ?next=1 until it replaces the shipped game.
  // The router validates its own output again, so the flags must accept true as well as 1.
  // An unset flag stays absent, so the shipped game's address never grows a search string.
  validateSearch: (search: Record<string, unknown>) => ({
    next: flag(search.next),
    gl: flag(search.gl),
    noart: flag(search.noart),
    board: flag(search.board),
    dev: flag(search.dev),
  }),
  component: Home,
});

const flag = (v: unknown): true | undefined => (v === true || v === 1 || v === "1" ? true : undefined);

function Home() {
  const { next, gl, noart, board, dev } = Route.useSearch();
  return next ? <NextGame forceWebgl={!!gl} noart={!!noart} board={!!board} dev={!!dev} /> : <KilnHop />;
}
