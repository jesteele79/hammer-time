import { PALETTE } from "./palette";

/** The play plane's ink (main spec §3): 4 px outlines on furniture, 3 px on its small parts. */
export const OUTLINE = 4;
export const INK = { width: OUTLINE, color: PALETTE.outline, join: "round" as const };
export const THIN = { width: 3, color: PALETTE.outline, join: "round" as const };
/**
 * A floor's front face reaches `depth` below its top line, past the bottom of any landscape view with the walking line at
 * 78 percent (story spec §15); its top strip runs `back` toward the wall and `top` toward us.
 */
export const FLOOR = { depth: 420, top: 26, back: 34 } as const;
