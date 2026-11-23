// Game rounds. With Supabase configured, questions and scoring live on the server
// (start_session / submit_answer / finish_session in supabase/002_phase2.sql), so answers can't be
// read or faked in the browser. Without Supabase (local dev), it falls back to a local pool.
import { supabase, supabaseConfigured } from '../lib/supabase.js'

const GUEST_KEY = 'qz.guest'
const readGuest = () => {
  try {
    return localStorage.getItem(GUEST_KEY) || null
  } catch {
    return null
  }
}
const saveGuest = (t) => {
  try {
    if (t) localStorage.setItem(GUEST_KEY, t)
  } catch {
    /* ignore */
  }
}

const friendly = (error) => {
  const m = error?.message || ''
  if (/rate_limited/.test(m)) return 'You’re starting games very fast. Wait a moment and try again.'
  if (/too_fast/.test(m)) return 'Slow down a little!'
  if (/age_restricted/.test(m)) return 'This quiz is 18+. Log in and confirm your age to play.'
  if (/session_closed|no_session|not_yours/.test(m)) return 'This round has expired. Start a new one.'
  if (/fetch|network|Failed/i.test(m)) return 'Connection problem. Check your internet and try again.'
  return 'Something went wrong. Please try again.'
}
const fail = (error) => Object.assign(new Error(friendly(error)), { raw: error?.message })

/**
 * @param {string} slug game slug
 * @param {{ localPick?: () => Array }} opts localPick returns full questions (with answer + fact) for offline mode
 */
export async function startRound(slug, { count = 20, localPick } = {}) {
  if (supabaseConfigured) {
    const { data, error } = await supabase.rpc('start_session', { p_game: slug, p_count: count, p_guest_token: readGuest() })
    if (!error && data?.questions?.length) {
      if (data.guest_token) saveGuest(data.guest_token)
      return { mode: 'server', slug, sessionId: data.session_id, guestToken: data.guest_token || readGuest(), questions: data.questions, startedAt: Date.now() }
    }
    if (error && !/no_questions/.test(error.message)) throw fail(error)
  }
  if (!localPick) throw new Error('This game isn’t available right now.')
  const full = localPick()
  return {
    mode: 'local',
    slug,
    full,
    questions: full.map((q, i) => ({ id: i, item: q.item, type: q.type, emoji: q.emoji, sprite: q.sprite })),
    answers: [],
    startedAt: Date.now(),
  }
}

export async function submitAnswer(round, index, choice) {
  if (round.mode === 'server') {
    const { data, error } = await supabase.rpc('submit_answer', { p_session: round.sessionId, p_index: index, p_choice: choice, p_guest_token: round.guestToken })
    if (error) throw fail(error)
    return data
  }
  const q = round.full[index]
  const res = { correct: q.answer === choice, answer: q.answer, fact: q.fact, index }
  round.answers[index] = res
  return res
}

export async function finishRound(round) {
  if (round.mode === 'server') {
    const { data, error } = await supabase.rpc('finish_session', {
      p_session: round.sessionId,
      p_guest_token: round.guestToken,
      p_tz_offset_min: -new Date().getTimezoneOffset(),
    })
    if (error) throw fail(error)
    return data
  }
  const correct = round.answers.filter((a) => a?.correct).length
  const total = round.full.length
  let best = 0
  let cur = 0
  round.answers.forEach((a) => {
    cur = a?.correct ? cur + 1 : 0
    best = Math.max(best, cur)
  })
  return {
    correct,
    total,
    won: correct >= Math.ceil(total * 0.7),
    perfect: correct === total,
    best_streak: best,
    seconds: Math.round((Date.now() - round.startedAt) / 1000),
    xp_earned: 0,
    new_achievements: [],
    saved: false,
  }
}
