const GRAY = 0x747f8d;
const BLUE = 0x2c82ec;
const RED = 0xf04747;
const YELLOW = 0xfaa61a;

export function colorByNumber(num: number): number {
  if (num < 100) return 0x00dc00;
  if (num < 400) return 0xffdc00;
  if (num < 700) return 0xff6400;
  if (num < 1000) return 0xc80000;
  return 0x000000;
}

export function colorByStatus(status: number): number {
  switch (status) {
    case 0:
      return GRAY;
    case 1:
      return BLUE;
    case 2:
      return RED;
    case 3:
    case 4:
      return YELLOW;
    case 5:
    case 6:
      return BLUE;
    default:
      return GRAY;
  }
}
