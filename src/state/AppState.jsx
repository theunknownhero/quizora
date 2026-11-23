// App-wide state: selected country, signed-in user (from the API), and which dialog is open.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ALL, countryByCode, guessCountry } from '../data/countries.js'
import * as auth from './authStore.js'

const COUNTRY_KEY = 'qz.country'
const Ctx = createContext(null)

const readCountry = () => {
  try {
    const v = localStorage.getItem(COUNTRY_KEY)
    if (v === ALL || countryByCode(v)) return v
  } catch {
    /* ignore */
  }
  return guessCountry()
}

export function AppProvider({ children }) {
  const [country, setCountryState] = useState(readCountry)
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false) // false until we've asked the server who's logged in
  const [authView, setAuthView] = useState(null) // null | 'login' | 'register' | 'forgot'
  const [onboarding, setOnboarding] = useState(false)

  // Restore the session from the httpOnly cookie
  useEffect(() => {
    auth
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setAuthReady(true))
  }, [])

  const setCountry = useCallback((code) => {
    setCountryState(code)
    try {
      localStorage.setItem(COUNTRY_KEY, code)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({
      country,
      setCountry,
      user,
      authReady,
      setUser,
      authView,
      openAuth: (view = 'login') => setAuthView(view),
      closeAuth: () => setAuthView(null),
      onboarding,
      openOnboarding: () => setOnboarding(true),
      closeOnboarding: () => setOnboarding(false),
      async register(data) {
        const u = await auth.register(data)
        setUser(u)
        setAuthView(null)
        setOnboarding(true) // straight into onboarding
        return u
      },
      async login(data) {
        const u = await auth.login(data)
        setUser(u)
        setAuthView(null)
        if (!u.profile?.onboarded) setOnboarding(true)
        return u
      },
      async logout() {
        setUser(null)
        await auth.logout().catch(() => {})
      },
      async saveProfile(profile) {
        if (!user) return
        setUser((u) => (u ? { ...u, profile: { ...u.profile, ...profile } } : u)) // optimistic
        try {
          setUser(await auth.saveProfile(profile))
        } catch (e) {
          console.error('Could not save profile', e)
        }
      },
    }),
    [country, setCountry, user, authReady, authView, onboarding]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useApp = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside <AppProvider>')
  return v
}
