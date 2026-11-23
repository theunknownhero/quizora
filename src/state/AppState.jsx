// App-wide state: selected country, signed-in user (Supabase), and which dialog is open.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ALL, countryByCode, guessCountry } from '../data/countries.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { countryLang } from '../data/regional.js'
import * as auth from './authStore.js'

const COUNTRY_KEY = 'qz.country'
const LANG_KEY = 'qz.lang' // only set when the player picks a language by hand
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
  const [langOverride, setLangOverride] = useState(() => {
    try {
      return localStorage.getItem(LANG_KEY) || null
    } catch {
      return null
    }
  })
  const lang = langOverride || countryLang[country] || 'en'
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false) // false until we know if someone is logged in
  const [recovery, setRecovery] = useState(false) // true after opening a password-reset link
  const [authView, setAuthView] = useState(null) // null | 'login' | 'register' | 'forgot' | 'check-email'
  const [pendingEmail, setPendingEmail] = useState('') // where we sent the confirmation link
  const [onboarding, setOnboarding] = useState(false)

  useEffect(() => {
    if (!supabaseConfigured) {
      setAuthReady(true)
      return
    }
    auth
      .currentUser()
      .then(setUser)
      .finally(() => setAuthReady(true))
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
        return
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        // Supabase recommends not awaiting other Supabase calls inside this callback
        setTimeout(() => auth.loadUser(session.user).then(setUser), 0)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const setCountry = useCallback((code) => {
    setCountryState(code)
    try {
      localStorage.setItem(COUNTRY_KEY, code)
    } catch {
      /* ignore */
    }
  }, [])

  const setLang = useCallback((code) => {
    setLangOverride(code)
    try {
      if (code) localStorage.setItem(LANG_KEY, code)
      else localStorage.removeItem(LANG_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo(
    () => ({
      accountsEnabled: supabaseConfigured,
      lang,
      langIsAuto: !langOverride,
      setLang,
      country,
      setCountry,
      user,
      setUser,
      authReady,
      recovery,
      authView,
      pendingEmail,
      openAuth: (view = 'login') => setAuthView(view),
      closeAuth: () => setAuthView(null),
      onboarding,
      openOnboarding: () => setOnboarding(true),
      closeOnboarding: () => setOnboarding(false),
      async register(data) {
        const res = await auth.register(data)
        if (res.needsConfirmation) {
          setPendingEmail(data.email)
          setAuthView('check-email')
        } else {
          setUser(res.user)
          setAuthView(null)
          setOnboarding(true)
        }
        return res
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
          setUser(await auth.saveProfile(user.id, profile))
        } catch (e) {
          console.error(e.message)
        }
      },
    }),
    [country, setCountry, lang, langOverride, setLang, user, authReady, recovery, authView, pendingEmail, onboarding]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useApp = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside <AppProvider>')
  return v
}
