import i18next, { type TFunction } from "i18next"
import { en } from "../locales/en"
import { it } from "../locales/it"

export const supportedLocales = ["en", "it"] as const
export type Locale = (typeof supportedLocales)[number]

const resources = {
  en: { translation: en },
  it: { translation: it },
}

export function isLocale(value: string): value is Locale {
  return supportedLocales.some((locale) => locale === value)
}

export function normalizeLocale(locale: string | undefined): Locale {
  if (!locale) return "en"
  const primary = locale.toLowerCase().split("-")[0]
  return primary && isLocale(primary) ? primary : "en"
}

export function createTranslator(locale: string | undefined): TFunction {
  const instance = i18next.createInstance()
  instance.init({
    lng: normalizeLocale(locale),
    fallbackLng: "en",
    supportedLngs: supportedLocales,
    resources,
    initAsync: false,
    interpolation: { escapeValue: false },
  })
  return instance.t
}
