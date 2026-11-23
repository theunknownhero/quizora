// Turn a player's finished plays into statistics, records and plain-language insights.

const DAY = 24 * 60 * 60 * 1000
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const PARTS = [
  { id: 'night', label: 'at night', from: 0, to: 5 },
  { id: 'morning', label: 'in the morning', from: 5, to: 12 },
  { id: 'afternoon', label: 'in the afternoon', from: 12, to: 18 },
  { id: 'evening', label: 'in the evening', from: 18, to: 24 },
]
const partOf = (h) => PARTS.find((p) => h >= p.from && h < p.to)

export function computeStats(plays = []) {
  const games = plays.length
  const wins = plays.filter((p) => p.won).length
  let correct = 0
  let answered = 0
  let ms = 0
  let msN = 0
  let time = 0
  const byType = {}
  const byGame = {}
  const byWeekday = Array(7).fill(0)
  const byPart = Object.fromEntries(PARTS.map((p) => [p.id, { n: 0, c: 0 }]))

  for (const p of plays) {
    const secs = p.finished_at && p.started_at ? Math.max(0, (new Date(p.finished_at) - new Date(p.started_at)) / 1000) : 0
    time += secs
    correct += p.correct
    answered += p.total
    const d = new Date(p.finished_at)
    byWeekday[d.getDay()]++
    const part = partOf(d.getHours())
    byPart[part.id].n += p.total
    byPart[part.id].c += p.correct
    const g = (byGame[p.game_slug] ||= { plays: 0, wins: 0, best: 0, bestPct: 0, fastestWin: null, xp: 0 })
    g.plays++
    g.xp += p.xp_earned || 0
    if (p.won) {
      g.wins++
      if (g.fastestWin === null || secs < g.fastestWin) g.fastestWin = secs
    }
    if (p.correct > g.best) g.best = p.correct
    g.bestPct = Math.max(g.bestPct, p.correct / p.total)
    for (const a of p.answers || []) {
      const t = (byType[a.type] ||= { n: 0, c: 0 })
      t.n++
      if (a.correct) t.c++
      if (a.ms && a.ms < 120000) {
        ms += a.ms
        msN++
      }
    }
  }

  const bestStreak = plays.reduce((m, p) => Math.max(m, p.best_streak || 0), 0)
  const bestScore = plays.reduce((m, p) => Math.max(m, p.correct), 0)
  const perfects = plays.filter((p) => p.correct === p.total).length
  const fastestWin = plays.filter((p) => p.won).reduce((m, p) => {
    const s = (new Date(p.finished_at) - new Date(p.started_at)) / 1000
    return m === null || s < m ? s : m
  }, null)

  // last 14 days activity
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 14 }, (_, i) => {
    const start = new Date(today.getTime() - (13 - i) * DAY)
    const end = new Date(start.getTime() + DAY)
    const dayPlays = plays.filter((p) => {
      const t = new Date(p.finished_at)
      return t >= start && t < end
    })
    return { date: start, plays: dayPlays.length, xp: dayPlays.reduce((s, p) => s + (p.xp_earned || 0), 0) }
  })

  // accuracy trend: last 10 games (oldest → newest)
  const trend = plays
    .slice(0, 10)
    .reverse()
    .map((p) => Math.round((p.correct / p.total) * 100))

  return {
    games,
    wins,
    winRate: games ? Math.round((wins / games) * 100) : 0,
    accuracy: answered ? Math.round((correct / answered) * 100) : 0,
    correct,
    answered,
    avgAnswerSec: msN ? ms / msN / 1000 : 0,
    totalMinutes: Math.round(time / 60),
    bestStreak,
    bestScore,
    perfects,
    fastestWin,
    xp: plays.reduce((s, p) => s + (p.xp_earned || 0), 0),
    byType,
    byGame,
    byWeekday,
    byPart,
    days,
    trend,
  }
}

export function insightsFrom(stats) {
  const out = []
  if (!stats.games) return out
  const types = Object.entries(stats.byType)
    .filter(([, v]) => v.n >= 4)
    .map(([k, v]) => ({ k, pct: Math.round((v.c / v.n) * 100), n: v.n }))
    .sort((a, b) => b.pct - a.pct)
  if (types.length >= 2) {
    out.push({ emoji: '💪', title: `Strongest topic: ${types[0].k}`, text: `You answer ${types[0].pct}% of ${types[0].k.toLowerCase()} questions correctly.` })
    const w = types[types.length - 1]
    if (w.pct < types[0].pct) out.push({ emoji: '🎯', title: `Room to grow: ${w.k}`, text: `${w.pct}% correct so far. A few more rounds will push it up.` })
  }
  const parts = Object.entries(stats.byPart)
    .filter(([, v]) => v.n >= 10)
    .map(([k, v]) => ({ k, pct: v.c / v.n }))
    .sort((a, b) => b.pct - a.pct)
  if (parts.length >= 2) {
    const p = PARTS.find((x) => x.id === parts[0].k)
    out.push({ emoji: '🕒', title: `Sharpest ${p.label}`, text: `Your accuracy is highest ${p.label} (${Math.round(parts[0].pct * 100)}%).` })
  }
  const maxDay = Math.max(...stats.byWeekday)
  if (stats.games >= 3 && maxDay > 0) {
    out.push({ emoji: '📅', title: `Favourite day: ${WEEKDAYS[stats.byWeekday.indexOf(maxDay)]}`, text: `You play most on ${WEEKDAYS[stats.byWeekday.indexOf(maxDay)]}s.` })
  }
  if (stats.avgAnswerSec) {
    const fast = stats.avgAnswerSec < 5
    out.push({ emoji: fast ? '⚡' : '🧘', title: fast ? 'Quick thinker' : 'Careful thinker', text: `You take ${stats.avgAnswerSec.toFixed(1)}s per answer on average.` })
  }
  if (stats.trend.length >= 4) {
    const half = Math.floor(stats.trend.length / 2)
    const a = stats.trend.slice(0, half).reduce((s, x) => s + x, 0) / half
    const b = stats.trend.slice(half).reduce((s, x) => s + x, 0) / (stats.trend.length - half)
    if (b - a >= 5) out.push({ emoji: '📈', title: 'On the rise', text: `Your recent rounds are ${Math.round(b - a)} points more accurate than before.` })
    else if (a - b >= 5) out.push({ emoji: '🔄', title: 'Shake it up', text: 'Your last few rounds dipped a little. A new category might help.' })
  }
  return out
}

export const fmtDuration = (secs) => {
  if (secs === null || secs === undefined) return '—'
  const m = Math.floor(secs / 60)
  const s = Math.round(secs % 60)
  return m ? `${m}m ${s}s` : `${s}s`
}
