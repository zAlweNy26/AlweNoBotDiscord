const GRAY = 0x747f8d
const BLUE = 0x2c82ec
const RED = 0xf04747
const YELLOW = 0xfaa61a

export function colorByStatus(status: number) {
  switch (status) {
    case 0:
      return GRAY
    case 1:
      return BLUE
    case 2:
      return RED
    case 3:
    case 4:
      return YELLOW
    case 5:
    case 6:
      return BLUE
    default:
      return GRAY
  }
}
