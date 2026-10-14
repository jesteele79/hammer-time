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
    nocast: flag(search.nocast),
    venue: venueOf(search.venue),
    // The start screen (until the switch, behind ?next=1&title=1), and the shipped game's side quest from it.
    title: flag(search.title),
    classic: flag(search.classic),
    quest: search.quest === "hungry" ? ("hungry" as const) : undefined,
  }),
  component: Home,
});

const flag = (v: unknown): true | undefined => (v === true || v === 1 || v === "1" ? true : undefined);
const VENUES = ["restaurant", "campus", "arena"] as const;
type Venue = (typeof VENUES)[number];
/** `&venue=` starts the shift at a later venue (R3a's play-test link, before the start screen). */
const venueOf = (v: unknown): Venue | undefined => ((VENUES as readonly unknown[]).includes(v) ? (v as Venue) : undefined);

function Home() {
  const { next, gl, noart, board, dev, nocast, venue, title, quest } = Route.useSearch();
  return next ? <NextGame forceWebgl={!!gl} noart={!!noart} board={!!board} dev={!!dev} nocast={!!nocast} start={venue} title={!!title} /> : <KilnHop quest={quest} />;
}
