// Player levels. Must match public.level_for_xp() in supabase/002_phase2.sql:
// level L starts at 50·L·(L−1) XP → L2 = 100, L3 = 300, L4 = 600, L5 = 1000, L10 = 4500, L25 = 30000.

export const xpForLevel = (level) => 50 * level * (level - 1)
export const levelForXp = (xp = 0) => Math.max(1, Math.floor((1 + Math.sqrt(1 + Math.max(0, xp) / 12.5)) / 2))

export function levelProgress(xp = 0) {
  const level = levelForXp(xp)
  const start = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return { level, xp, into: xp - start, need: next - start, toNext: next - xp, pct: Math.min(100, ((xp - start) / (next - start)) * 100) }
}

// Rank titles by level
export const tiers = [
  { min: 1, title: 'Rookie', emoji: '🌱', color: '#86efac' },
  { min: 5, title: 'Explorer', emoji: '🧭', color: '#67e8f9' },
  { min: 10, title: 'Scholar', emoji: '📘', color: '#a5b4fc' },
  { min: 20, title: 'Expert', emoji: '🎓', color: '#c4b5fd' },
  { min: 30, title: 'Master', emoji: '🏅', color: '#fcd34d' },
  { min: 40, title: 'Grandmaster', emoji: '👑', color: '#fbbf24' },
  { min: 60, title: 'Legend', emoji: '🌟', color: '#f472b6' },
]
export const tierFor = (level) => [...tiers].reverse().find((t) => level >= t.min) || tiers[0]

// How XP is earned (mirrors finish_session)
export const xpRules = [
  ['Correct answer', '+10 each'],
  ['Win the round (70%+)', '+50'],
  ['Best answer streak', '+3 per answer'],
  ['Perfect round', '+100'],
  ['First game of the day', '+20'],
]
