const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: "Cielo sereno",
  1: "Prevalentemente sereno",
  2: "Parzialmente nuvoloso",
  3: "Cielo coperto",
  45: "Nebbia",
  48: "Nebbia con brina",
  51: "Pioviggine leggera",
  53: "Pioviggine moderata",
  55: "Pioviggine intensa",
  56: "Pioviggine gelata leggera",
  57: "Pioviggine gelata intensa",
  61: "Pioggia leggera",
  63: "Pioggia moderata",
  65: "Pioggia intensa",
  66: "Pioggia gelata leggera",
  67: "Pioggia gelata intensa",
  71: "Neve leggera",
  73: "Neve moderata",
  75: "Neve intensa",
  77: "Granelli di neve",
  80: "Rovesci di pioggia leggeri",
  81: "Rovesci di pioggia moderati",
  82: "Rovesci di pioggia violenti",
  85: "Rovesci di neve leggeri",
  86: "Rovesci di neve intensi",
  95: "Temporale",
  96: "Temporale con grandine leggera",
  99: "Temporale con grandine intensa",
}

export function describeWeatherCode(code: number) {
  return WEATHER_DESCRIPTIONS[code] ?? "Condizioni sconosciute"
}
