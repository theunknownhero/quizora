// App-wide state: selected country, signed-in user (Supabase), and which dialog is open.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ALL, countryByCode, guessCountry } from '../data/countries.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { countryLang } from '../data/regional.js'
import * as auth from './authStore.js'
import * as udata from './userData.js'

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
  const [ageCheck, setAgeCheck] = useState(false)
  const [flags, setFlags] = useState({ like: new Set(), favorite: new Set(), save: new Set() })
  const [toasts, setToasts] = useState([])

  const pushToast = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, ...toast }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), toast.duration || 4500)
  }, [])

  // Load the player's likes / favorites / saves
  useEffect(() => {
    if (!user?.id) {
      setFlags({ like: new Set(), favorite: new Set(), save: new Set() })
      return
    }
    udata
      .getFlags()
      .then((rows) => {
        const f = { like: new Set(), favorite: new Set(), save: new Set() }
        rows.forEach((r) => f[r.kind]?.add(r.game_slug))
        setFlags(f)
      })
      .catch(() => {})
  }, [user?.id])

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
      ageCheck,
      openAgeCheck: () => setAgeCheck(true),
      closeAgeCheck: () => setAgeCheck(false),
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
      flags,
      toasts,
      pushToast,
      dismissToast: (id) => setToasts((t) => t.filter((x) => x.id !== id)),
      async reloadUser() {
        if (!supabaseConfigured) return null
        const u = await auth.currentUser()
        setUser(u)
        return u
      },
      async toggleFlag(slug, kind) {
        if (!user) {
          setAuthView('login')
          return
        }
        const on = !flags[kind].has(slug)
        setFlags((f) => {
          const next = { ...f, [kind]: new Set(f[kind]) }
          on ? next[kind].add(slug) : next[kind].delete(slug)
          return next
        })
        try {
          const unlocked = await udata.setFlag(user.id, slug, kind, on)
          return unlocked
        } catch (e) {
          setFlags((f) => {
            const next = { ...f, [kind]: new Set(f[kind]) }
            on ? next[kind].delete(slug) : next[kind].add(slug)
            return next
          })
          throw e
        }
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
    [country, setCountry, lang, langOverride, setLang, user, authReady, recovery, authView, pendingEmail, onboarding, ageCheck, flags, toasts, pushToast]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useApp = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside <AppProvider>')
  return v
}
