const MONTHS = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
] as const;

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export function formatDate(date: Date, withTime: boolean): string {
  const day = pad(date.getDate());
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  if (!withTime) return `${day} ${month} ${year}`;
  return `${day} ${month} ${year} alle ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatIsoTimestamp(timestamp: string | number): string {
  return formatDate(new Date(timestamp), true);
}

const DISCORD_EPOCH = 1420070400000n;

export function snowflakeToDate(snowflake: string): Date {
  return new Date(Number((BigInt(snowflake) >> 22n) + DISCORD_EPOCH));
}

export function formatUnixTimestamp(unixSeconds: number): string {
  return formatDate(new Date(unixSeconds * 1000), true);
}
