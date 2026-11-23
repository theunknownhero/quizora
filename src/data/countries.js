// Countries Quizora runs in. Add a new one here (and drop its flag SVGs in /public/flags/circle + /rect).
// Flags: Untitled UI free flag icons (https://www.untitledui.com/resources/flag-icons)

export const ALL = 'ALL'

export const countries = [
  { code: 'HU', name: 'Hungary', native: 'Magyarország', lang: 'hu' },
  { code: 'DE', name: 'Germany', native: 'Deutschland', lang: 'de' },
  { code: 'US', name: 'United States', native: 'United States', lang: 'en' },
  { code: 'CA', name: 'Canada', native: 'Canada', lang: 'en' },
  { code: 'CZ', name: 'Czech Republic', native: 'Česko', lang: 'cs' },
  { code: 'RS', name: 'Serbia', native: 'Србија', lang: 'sr' },
  { code: 'ES', name: 'Spain', native: 'España', lang: 'es' },
  { code: 'PT', name: 'Portugal', native: 'Portugal', lang: 'pt' },
]

export const countryByCode = (code) => countries.find((c) => c.code === code)

export const flagUrl = (code, shape = 'circle') => `/flags/${shape === 'rect' ? 'rect' : 'circle'}/${code}.svg`

// Best guess from the browser language (e.g. "hu-HU" -> HU, "de" -> DE); otherwise all countries.
export function guessCountry() {
  if (typeof navigator === 'undefined') return ALL
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language || '']
  for (const l of langs) {
    const region = l.split('-')[1]?.toUpperCase()
    if (region && countryByCode(region)) return region
  }
  for (const l of langs) {
    const base = l.split('-')[0]?.toLowerCase()
    const hit = countries.find((c) => c.lang === base && c.lang !== 'en')
    if (hit) return hit.code
  }
  return ALL
}
