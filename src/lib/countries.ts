export function getCountryName(countryCode: string, locale: string) {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(countryCode.toUpperCase()) ?? countryCode
  } catch {
    return countryCode
  }
}
