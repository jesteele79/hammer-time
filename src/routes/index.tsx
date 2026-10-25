import { createFileRoute } from "@tanstack/react-router";
import { NextGame } from "@/components/next-game";

export const Route = createFileRoute("/")({
  // `/` is the game on its start screen; ?next=1 goes straight into play (the checks); ?quest=hungry straight into the
  // banquet's practice, ?quest=fares the gate's. An old ?classic=1 link opens the start screen. The router validates its own output again, so the
  // flags must accept true as well as 1. An unset flag stays absent, so the plain address never grows a search string.
  validateSearch: (search: Record<string, unknown>) => ({
    next: flag(search.next),
    gl: flag(search.gl),
    noart: flag(search.noart),
    board: flag(search.board),
    dev: flag(search.dev),
    nocast: flag(search.nocast),
    venue: venueOf(search.venue),
    // ?title=1 puts ?next=1 on the start screen; ?quest=hungry or ?quest=fares opens that side quest's practice from it.
    title: flag(search.title),
    quest: questOf(search.quest),
  }),
  component: Home,
});

const flag = (v: unknown): true | undefined => (v === true || v === 1 || v === "1" ? true : undefined);
const VENUES = ["restaurant", "campus", "arena"] as const;
type Venue = (typeof VENUES)[number];
/** `&venue=` starts the shift at a later venue (R3a's play-test link, before the start screen). */
const venueOf = (v: unknown): Venue | undefined => ((VENUES as readonly unknown[]).includes(v) ? (v as Venue) : undefined);
const QUESTS = ["hungry", "fares"] as const;
/** `&quest=` opens a side quest's practice (R4 §8, R5 §11). */
const questOf = (v: unknown): (typeof QUESTS)[number] | undefined => ((QUESTS as readonly unknown[]).includes(v) ? (v as (typeof QUESTS)[number]) : undefined);

function Home() {
  const { next, gl, noart, board, dev, nocast, venue, title, quest } = Route.useSearch();
  // A quest link holds the game on the start screen behind it: practice opens from there, ?next=1 or not.
  return <NextGame forceWebgl={!!gl} noart={!!noart} board={!!board} dev={!!dev} nocast={!!nocast} start={venue} title={!next || !!title || !!quest} quest={quest} />;
}
