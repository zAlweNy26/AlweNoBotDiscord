import type { TFunction } from "i18next"

export function formatRouteDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatRouteDuration(seconds: number, t: TFunction) {
  const total = Math.round(seconds / 60)
  if (total < 1) return t(($) => $.lib.lessThanMinute)
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (hours === 0) return `${total} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${minutes} min`
}
