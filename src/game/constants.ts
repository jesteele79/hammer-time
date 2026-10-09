export const TILE = 16;
export const VIEW_W = 384;
export const VIEW_H = 216;
export const DISPLAY_W = 1920;
export const DISPLAY_H = 1080;
export const MAP_H = 14;
export const GROUND_ROW = 12;

export const ID = {
  empty: 0,
  ground: 1,
  brick: 2,
  question: 3,
  power: 4,
  used: 5,
  pipe: 6,
  coin: 7,
  ledge: 8,
  brickCoin: 9,
  hidden: 10,
  nut: 11,
  treat: 12,
} as const;

export type TileId = (typeof ID)[keyof typeof ID];

export function isSolid(id: number): boolean {
  return (
    id === ID.ground ||
    id === ID.brick ||
    id === ID.question ||
    id === ID.power ||
    id === ID.used ||
    id === ID.pipe ||
    id === ID.brickCoin ||
    id === ID.treat
  );
}
