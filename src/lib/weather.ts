export type WeatherCodeKey =
  | "code0"
  | "code1"
  | "code2"
  | "code3"
  | "code45"
  | "code48"
  | "code51"
  | "code53"
  | "code55"
  | "code56"
  | "code57"
  | "code61"
  | "code63"
  | "code65"
  | "code66"
  | "code67"
  | "code71"
  | "code73"
  | "code75"
  | "code77"
  | "code80"
  | "code81"
  | "code82"
  | "code85"
  | "code86"
  | "code95"
  | "code96"
  | "code99"
  | "unknown"

const CODE_KEYS: Record<number, Exclude<WeatherCodeKey, "unknown">> = {
  0: "code0",
  1: "code1",
  2: "code2",
  3: "code3",
  45: "code45",
  48: "code48",
  51: "code51",
  53: "code53",
  55: "code55",
  56: "code56",
  57: "code57",
  61: "code61",
  63: "code63",
  65: "code65",
  66: "code66",
  67: "code67",
  71: "code71",
  73: "code73",
  75: "code75",
  77: "code77",
  80: "code80",
  81: "code81",
  82: "code82",
  85: "code85",
  86: "code86",
  95: "code95",
  96: "code96",
  99: "code99",
}

export function weatherCodeKey(code: number): WeatherCodeKey {
  return CODE_KEYS[code] ?? "unknown"
}
