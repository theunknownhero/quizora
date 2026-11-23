// Age rules. Must match supabase/004_phase3.sql (min sign-up age and the 18+ check in start_session).
export const MIN_SIGNUP_AGE = 13
export const ADULT_AGE = 18

export function ageFrom(birthDate, now = new Date()) {
  if (!birthDate) return null
  const [y, m, d] = String(birthDate).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--
  return age
}

export function validBirthDate(v) {
  if (!v) return 'Enter your date of birth'
  const [y, m, d] = v.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (!y || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return 'That date doesn’t exist'
  const age = ageFrom(v)
  if (age < 0 || age > 120) return 'Check the year'
  if (age < MIN_SIGNUP_AGE) return `You need to be at least ${MIN_SIGNUP_AGE} to create an account`
  return null
}

export const isAdult = (user) => (ageFrom(user?.birthDate) ?? -1) >= ADULT_AGE
export const isMinor = (user) => !!user?.birthDate && !isAdult(user)
export const isAdultOnly = (game) => (game?.ageRating || 0) >= ADULT_AGE

// Minors never see 18+ quizzes. Guests and players without a birth date see them locked.
export const visibleTo = (game, user) => !isAdultOnly(game) || !isMinor(user)
export const playableBy = (game, user) => !isAdultOnly(game) || isAdult(user)
