// Site-wide config from the admin panel (supabase/007a_admin_core.sql → get_site_config).
// Loaded once before the app renders; the catalog arrays are updated in place so existing imports keep working.
import { supabase, supabaseConfigured } from './supabase.js'
import { games } from '../data/games.js'
import { categories } from '../data/categories.js'
import { achievements } from '../data/achievements.js'

const DEFAULTS = {
  announcement: { enabled: false, text: '', link: '', link_label: '', tone: 'info' },
  features: { signups: true, multiplayer: true, tournaments: true, community_tournaments: true, friends: true, leaderboards: true },
  maintenance: { enabled: false, message: '' },
  prize: { url: 'https://fortunejack.com', label: 'Claim the Prize' },
  xp_event: { multiplier: 1, label: '', starts_at: null, ends_at: null },
  home: { featured_slug: 'hungary-or-not', hero_title: '', hero_subtitle: '' },
}

let settings = structuredClone(DEFAULTS)
let loaded = false
export const getSettings = () => settings
export const isLoaded = () => loaded
export const feature = (k) => settings.features?.[k] !== false

export function xpEventActive(now = Date.now()) {
  const e = settings.xp_event || {}
  if (!e.multiplier || e.multiplier <= 1) return null
  if (e.starts_at && now < new Date(e.starts_at).getTime()) return null
  if (e.ends_at && now > new Date(e.ends_at).getTime()) return null
  return e
}

const toGame = (g) => ({
  slug: g.slug,
  title: g.title,
  tagline: g.tagline,
  emoji: g.emoji,
  gradient: g.gradient?.length === 2 ? g.gradient : ['#8b5cf6', '#22d3ee'],
  categories: g.categories || [],
  ...(g.countries?.length ? { countries: g.countries } : {}),
  status: g.status,
  featured: g.featured,
  difficulty: g.difficulty,
  minutes: g.minutes,
  questions: g.questions,
  ageRating: g.age_rating || 0,
  prompt: g.prompt,
  yesLabel: g.yes_label,
  noLabel: g.no_label,
  sort: g.sort,
})
const toCategory = (c) => ({ id: c.id, group: c.grp, emoji: c.emoji, color: c.color, name: c.name, blurb: c.blurb })

export function applyConfig(cfg) {
  if (!cfg) return
  settings = { ...structuredClone(DEFAULTS), ...(cfg.settings || {}) }
  for (const k of Object.keys(DEFAULTS)) settings[k] = { ...DEFAULTS[k], ...(cfg.settings?.[k] || {}) }
  if (cfg.games?.length) games.splice(0, games.length, ...cfg.games.map(toGame))
  if (cfg.categories?.length) categories.splice(0, categories.length, ...cfg.categories.map(toCategory))
  for (const b of cfg.badges || []) {
    const badge = { id: b.id, emoji: b.emoji, tier: b.tier, name: b.name, desc: b.description, custom: true }
    const i = achievements.findIndex((a) => a.id === b.id)
    if (i >= 0) achievements[i] = badge
    else achievements.push(badge)
  }
  loaded = true
}

// Wait at most `ms` so a slow network never blocks the site; static data is the fallback.
export async function loadConfig(ms = 2500) {
  if (!supabaseConfigured) return
  try {
    const res = await Promise.race([supabase.rpc('get_site_config'), new Promise((r) => setTimeout(() => r({ timeout: true }), ms))])
    if (res?.data) applyConfig(res.data)
  } catch {
    /* keep defaults */
  }
}
