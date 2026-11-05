/** Where a row of the cabin stands along its 40 m, in the sim's px: row 52 at 50, row 1 at 3,977, 0.77 m apart. */
export const rowX = (row: number): number => Math.round(100 * (0.5 + (52 - row) * 0.77));
