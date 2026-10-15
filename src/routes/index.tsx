import { createFileRoute } from "@tanstack/react-router";
import { KilnHop } from "@/components/kiln-hop";
import { NextGame } from "@/components/next-game";

export const Route = createFileRoute("/")({
  // `/` is the new game on its start screen; ?next=1 goes straight into play (the checks); the shipped game lives behind
  // ?classic=1 until R4 deletes it. The router validates its own output again, so the flags must accept true as well as 1.
  // An unset flag stays absent, so the plain address never grows a search string.
  validateSearch: (search: Record<string, unknown>) => ({
    next: flag(search.next),
    gl: flag(search.gl),
    noart: flag(search.noart),
    board: flag(search.board),
    dev: flag(search.dev),
    nocast: flag(search.nocast),
    venue: venueOf(search.venue),
    // ?title=1 puts ?next=1 on the start screen; ?classic=1 is the shipped game; ?quest=hungry opens Hungry Hungry Hammer's
    // practice from the new game's start screen (with ?classic=1, the shipped game's own banquet, until R4 deletes it).
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
  const { next, classic, gl, noart, board, dev, nocast, venue, title, quest } = Route.useSearch();
  // `/` is the new game on its start screen; `?next=1` goes straight into play (the checks); `?classic=1` is the shipped game.
  if (classic) return <KilnHop quest={quest} />;
  // A quest link holds the game on the start screen behind it: practice opens from there, ?next=1 or not.
  const banquet = classic ? undefined : quest;
  return <NextGame forceWebgl={!!gl} noart={!!noart} board={!!board} dev={!!dev} nocast={!!nocast} start={venue} title={!next || !!title || !!banquet} quest={banquet} />;
}
