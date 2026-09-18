const DISCORD_EPOCH = 1420070400000n

export function formatDate(date: Date, withTime: boolean, locale: string) {
  const options: Intl.DateTimeFormatOptions = withTime
    ? { dateStyle: "long", timeStyle: "medium" }
    : { dateStyle: "long" }
  return new Intl.DateTimeFormat(locale, options).format(date)
}

export function formatIsoTimestamp(timestamp: string | number, locale: string) {
  return formatDate(new Date(timestamp), true, locale)
}

export function snowflakeToDate(snowflake: string) {
  return new Date(Number((BigInt(snowflake) >> 22n) + DISCORD_EPOCH))
}

export function formatUnixTimestamp(unixSeconds: number, locale: string) {
  return formatDate(new Date(unixSeconds * 1000), true, locale)
}
