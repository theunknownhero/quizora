// Leaderboards and tournaments (supabase/006_phase5.sql).
import { supabase, supabaseConfigured } from '../lib/supabase.js'

const MESSAGES = {
  not_signed_in: 'Log in first',
  tournament_not_found: 'Tournament not found',
  tournament_over: 'This tournament has ended',
  tournament_not_started: 'This tournament hasn’t started yet',
  level_too_low: 'Your level is too low for this',
  age_restricted: 'This quiz is 18+',
  no_attempts_left: 'No attempts left',
  bad_title: 'Give it a name (3+ characters)',
  too_many: 'You can run up to 3 tournaments at a time',
  too_far: 'Start it within the next 7 days',
  no_questions: 'That quiz isn’t available for tournaments yet',
  rate_limited: 'Slow down a little and try again in a minute',
}
const rpc = async (fn, args) => {
  if (!supabaseConfigured) throw new Error('Competitions aren’t set up on this site yet.')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    const code = Object.keys(MESSAGES).find((k) => error.message.includes(k))
    throw Object.assign(new Error(code ? MESSAGES[code] : 'Something went wrong. Try again.'), { code, raw: error.message })
  }
  return data
}

export const getLeaderboard = (period, scope, game) => rpc('get_leaderboard', { p_period: period, p_scope: scope, p_game: game || null })
export const listTournaments = () => rpc('list_tournaments')
export const getTournament = (code) => rpc('get_tournament', { p_code: code })
export const joinTournament = (code) => rpc('join_tournament', { p_code: code })
export const createTournament = ({ title, description, game, startsAt, hours, attempts, isPublic }) =>
  rpc('create_tournament', { p_title: title, p_description: description, p_game: game, p_starts_at: startsAt, p_hours: hours, p_attempts: attempts, p_public: isPublic })

// "2d 4h", "3h 12m", "45s"
export function fmtLeft(ms) {
  if (ms <= 0) return '0s'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d) return `${d}d ${h}h`
  if (h) return `${h}h ${m}m`
  if (m) return `${m}m ${s % 60}s`
  return `${s}s`
}
export const fmtSecs = (s) => (s == null ? '—' : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`)
