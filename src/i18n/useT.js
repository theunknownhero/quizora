import { useCallback } from 'react'
import { dict } from './dict.js'
import { categories } from '../data/categories.js'
import { useApp } from '../state/AppState.jsx'

export function translate(lang, key, vars) {
  let s
  if (key.startsWith('cat.')) {
    // Category names are editable in the admin panel: English uses that name, other languages keep their translation
    const c = categories.find((x) => x.id === key.slice(4))
    s = (lang !== 'en' && dict[lang]?.[key]) || c?.name || dict.en[key] || key
  } else s = dict[lang]?.[key] ?? dict.en[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v)
  return s
}

// const t = useT();  t('hero.title1');  t('cats.games', { n: 3 })
export function useT() {
  const { lang } = useApp()
  return useCallback((key, vars) => translate(lang, key, vars), [lang])
}
