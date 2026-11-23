import { useCallback } from 'react'
import { dict } from './dict.js'
import { useApp } from '../state/AppState.jsx'

export function translate(lang, key, vars) {
  let s = dict[lang]?.[key] ?? dict.en[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v)
  return s
}

// const t = useT();  t('hero.title1');  t('cats.games', { n: 3 })
export function useT() {
  const { lang } = useApp()
  return useCallback((key, vars) => translate(lang, key, vars), [lang])
}
