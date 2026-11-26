// Central games registry. Add a new quiz here and it appears on the home page.
// status: 'live' | 'soon'
// countries: optional list of country codes (see countries.js). If set, the quiz is about / made for
//            those countries and gets a flag badge. Leave it out for quizzes that work everywhere.
// ageRating: optional. Set 18 for adult quizzes: minors never see them, guests see them locked, and the
//            server refuses to start them unless the player is 18+ (also add the slug to public.game_settings).

import { ALL } from './countries.js'

export { categories, categoryById, groups } from './categories.js'

export const games = [
  {
    slug: 'hungary-or-not',
    title: 'Hungary or Not?',
    tagline: 'Guess whether a food, invention, celebrity or tradition has Hungarian origins.',
    categories: ['culture', 'food', 'tech', 'celebs', 'general'],
    countries: ['HU'],
    status: 'live',
    featured: true,
    questions: 20,
    minutes: 4,
    difficulty: 'Medium',
    emoji: '🇭🇺',
    gradient: ['#CE2939', '#477050'],
  },
  {
    slug: 'capital-clash',
    title: 'Capital Clash',
    tagline: 'Two cities, one capital. Pick fast before the timer runs out.',
    categories: ['capitals', 'geo', 'travel'],
    status: 'soon',
    questions: 25,
    minutes: 3,
    difficulty: 'Easy',
    emoji: '🏙️',
    gradient: ['#0ea5e9', '#22c55e'],
  },
  {
    slug: 'german-engineering',
    title: 'Made in Germany?',
    tagline: 'Cars, gadgets and everyday things: which ones were really invented in Germany?',
    categories: ['tech', 'cars', 'history'],
    countries: ['DE'],
    status: 'soon',
    questions: 20,
    minutes: 4,
    difficulty: 'Medium',
    emoji: '⚙️',
    gradient: ['#1f2937', '#dd0000'],
  },
  {
    slug: 'usa-or-canada',
    title: 'USA or Canada?',
    tagline: 'Celebrities, snacks and sports: guess which side of the border they come from.',
    categories: ['celebs', 'food', 'culture'],
    countries: ['US', 'CA'],
    status: 'soon',
    questions: 20,
    minutes: 4,
    difficulty: 'Medium',
    emoji: '🍁',
    gradient: ['#1d4ed8', '#dc2626'],
  },
  {
    slug: 'spain-or-portugal',
    title: 'Spain or Portugal?',
    tagline: 'Pastéis, paella, fado or flamenco: tell the Iberian neighbours apart.',
    categories: ['food', 'culture'],
    countries: ['ES', 'PT'],
    status: 'soon',
    questions: 20,
    minutes: 4,
    difficulty: 'Hard',
    emoji: '🥘',
    gradient: ['#c60b1e', '#046a38'],
  },
  {
    slug: 'czech-it-out',
    title: 'Czech It Out',
    tagline: 'Sugar cubes, contact lenses and Pilsner: how much do you know about Czech inventions?',
    categories: ['tech', 'food', 'culture'],
    countries: ['CZ'],
    status: 'soon',
    questions: 15,
    minutes: 3,
    difficulty: 'Medium',
    emoji: '🍺',
    gradient: ['#11457e', '#d7141a'],
  },
  {
    slug: 'serbian-stories',
    title: 'Serbian Legends',
    tagline: 'From Tesla to Novak: famous Serbs, dishes and traditions.',
    categories: ['celebs', 'culture', 'history', 'sports'],
    countries: ['RS'],
    status: 'soon',
    questions: 15,
    minutes: 3,
    difficulty: 'Medium',
    emoji: '🎾',
    gradient: ['#c6363c', '#0c4076'],
  },
  {
    slug: 'flag-frenzy',
    title: 'Flag Frenzy',
    tagline: 'Spot the right flag among near-identical lookalikes.',
    categories: ['flags', 'geo'],
    status: 'soon',
    questions: 30,
    minutes: 5,
    difficulty: 'Hard',
    emoji: '🚩',
    gradient: ['#ef4444', '#f59e0b'],
  },
  {
    slug: 'dish-detective',
    title: 'Dish Detective',
    tagline: 'One photo, four countries. Where is this dish from?',
    categories: ['food', 'culture', 'travel'],
    status: 'soon',
    questions: 20,
    minutes: 4,
    difficulty: 'Easy',
    emoji: '🍜',
    gradient: ['#f97316', '#e11d48'],
  },
  {
    slug: 'year-it-happened',
    title: 'The Year It Happened',
    tagline: 'Drag the slider to the year a historic moment took place.',
    categories: ['history', 'general'],
    status: 'soon',
    questions: 12,
    minutes: 5,
    difficulty: 'Hard',
    emoji: '⏳',
    gradient: ['#eab308', '#a855f7'],
  },
]

// The game the home page spotlights: the featured one, else the first live game (never undefined while any game exists)
// Link-only quizzes (status 'hidden' in the admin panel) are never listed, but players' history still needs a name for them
export const unlisted = {
  'black-friday-fake-or-real': { slug: 'black-friday-fake-or-real', title: 'Black Friday: Fake or Real?', emoji: '🏷️', gradient: ['#fcd01c', '#d24629'], yesLabel: 'Real', noLabel: 'Fake', path: '/blackfriday' },
}
export const findGame = (slug) => games.find((g) => g.slug === slug) || unlisted[slug]

export const featuredGame = () => games.find((g) => g.featured && g.status === 'live') || games.find((g) => g.status === 'live') || games[0]
export const countByCategory = (id, list = games) => (id === 'all' ? list.length : list.filter((g) => g.categories.includes(id)).length)
export const gamesInCategory = (id) => games.filter((g) => g.categories.includes(id))

export const isForCountry = (g, code) => code !== ALL && (g.countries || []).includes(code)

// Live first, then quizzes made for the chosen country, then global, then other countries' quizzes.
export function sortForCountry(list, code) {
  const rank = (g) => (g.status === 'live' ? 0 : 4) + (isForCountry(g, code) ? 0 : g.countries ? 2 : 1)
  return [...list].sort((a, b) => rank(a) - rank(b))
}

// Simple scoring from onboarding answers.
export function recommend(profile, { interests = [], topics = [] } = {}, siteCountry = ALL, limit = 3) {
  if (!profile) return []
  const catWeight = {}
  const bump = (cats, w) => cats.forEach((c) => (catWeight[c] = (catWeight[c] || 0) + w))
  interests.filter((i) => profile.interests?.includes(i.id)).forEach((i) => bump(i.cats, 2))
  topics.filter((t) => profile.topics?.includes(t.id)).forEach((t) => bump(t.cats, 1))
  const wanted = new Set([...(profile.countries || []), ...(siteCountry !== ALL ? [siteCountry] : [])])
  return games
    .map((g) => {
      let score = g.categories.reduce((s, c) => s + (catWeight[c] || 0), 0)
      if (g.countries?.some((c) => wanted.has(c))) score += 6
      else if (g.countries) score -= 3
      if (g.status === 'live') score += 2
      return { g, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.g)
}
