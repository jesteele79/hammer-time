/**
 * Where the camera looks in the pig fight (main spec §5.4, the shipped boss camera): halfway between him and the pig,
 * but never so far from him that he leaves the middle `reach` of the view on either side.
 */
export function fightFrame(heroX: number, pigX: number, reach: number): number {
  const mid = (heroX + pigX) / 2;
  return Math.min(heroX + reach, Math.max(heroX - reach, mid));
}
