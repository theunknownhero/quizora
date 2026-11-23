// /categories (all categories, grouped) and /category/:id (one category with hero + its quizzes)
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import Aurora from '../components/Aurora.jsx'
import BlurText from '../components/BlurText.jsx'
import SpotlightCard from '../components/SpotlightCard.jsx'
import GameCard from '../components/GameCard.jsx'
import Flag from '../components/Flag.jsx'
import { categories, categoryById, groups } from '../data/categories.js'
import { gamesInCategory, isForCountry, sortForCountry } from '../data/games.js'
import { countryByCode } from '../data/countries.js'
import { useApp } from '../state/AppState.jsx'
import { useT } from '../i18n/useT.js'
import './categories.css'
import { ArrowLeft, SearchX, Play, Search } from 'lucide-react'

function CategoryTile({ c, i = 0 }) {
  const t = useT()
  const n = gamesInCategory(c.id).length
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: Math.min(i, 8) * 0.03, duration: 0.4 }}
      style={{ '--accent': c.color }}
    >
      <Link to={`/category/${c.id}`} className="cat-tile">
        <SpotlightCard className="cat-tile-in" color={`${c.color}30`}>
          <span className="cat-tile-emoji">{c.emoji}</span>
          <span className="cat-tile-name">{t(`cat.${c.id}`)}</span>
          <span className="cat-tile-count">{n ? (n === 1 ? t('cats.game') : t('cats.games', { n })) : t('cats.soon')}</span>
          <span className="cat-tile-glow" />
        </SpotlightCard>
      </Link>
    </motion.div>
  )
}

export function CategoriesPage() {
  const t = useT()
  const [q, setQ] = useState('')
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  const match = (c) => {
    const s = q.trim().toLowerCase()
    return !s || t(`cat.${c.id}`).toLowerCase().includes(s) || c.name.toLowerCase().includes(s)
  }
  const anyMatch = categories.some(match)

  return (
    <>
      <Navbar />
      <main className="catpage">
        <section className="cat-hero cat-hero--all">
          <div className="cat-hero-bg">
            <Aurora colors={['#7c3aed', '#22d3ee', '#ec4899']} speed={0.5} />
            <div className="hero-grid" />
            <div className="hero-fade" />
          </div>
          <div className="container cat-hero-in">
            <span className="eyebrow">{t('nav.categories')}</span>
            <h1 className="cat-hero-title">{t('allcats.title')}</h1>
            <p className="cat-hero-sub">{t('allcats.sub')}</p>
            <label className="search cat-search">
              <Search size={17} aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('allcats.search')} aria-label={t('allcats.search')} autoFocus />
            </label>
          </div>
        </section>

        <div className="container cat-groups">
          {groups.map((g) => {
            const list = categories.filter((c) => c.group === g.id && match(c))
            if (!list.length) return null
            return (
              <section key={g.id} className="cat-group" aria-labelledby={`grp-${g.id}`}>
                <h2 id={`grp-${g.id}`} className="cat-group-title">
                  <span aria-hidden="true">{g.emoji}</span> {t(`group.${g.id}`)} <em>{list.length}</em>
                </h2>
                <div className="cat-grid">
                  {list.map((c, i) => (
                    <CategoryTile key={c.id} c={c} i={i} />
                  ))}
                </div>
              </section>
            )
          })}
          {!anyMatch && <p className="empty">{t('allcats.none')}</p>}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

export function CategoryPage() {
  const { id } = useParams()
  const t = useT()
  const { country } = useApp()
  const c = categoryById(id)
  const [sort, setSort] = useState('live')
  const [localOnly, setLocalOnly] = useState(false)
  useEffect(() => {
    window.scrollTo(0, 0)
    setLocalOnly(false)
  }, [id])

  const all = useMemo(() => (c ? gamesInCategory(c.id) : []), [c])
  const here = countryByCode(country)
  const localCount = all.filter((g) => isForCountry(g, country)).length
  const list = useMemo(() => {
    let l = localOnly ? all.filter((g) => isForCountry(g, country)) : all
    if (sort === 'live') l = sortForCountry(l, country)
    if (sort === 'quick') l = [...l].sort((a, b) => a.minutes - b.minutes)
    if (sort === 'az') l = [...l].sort((a, b) => a.title.localeCompare(b.title))
    return l
  }, [all, sort, localOnly, country])
  const liveGame = all.find((g) => g.status === 'live')
  const related = c ? categories.filter((x) => x.group === c.group && x.id !== c.id) : []

  if (!c) {
    return (
      <>
        <Navbar />
        <main className="placeholder">
          <div className="placeholder-card">
            <span className="placeholder-emoji"><SearchX size={60} /></span>
            <h1>{t('catpage.notFound')}</h1>
            <Link to="/categories" className="btn btn-primary btn-lg">
              <ArrowLeft size={16} /> {t('catpage.back')}
            </Link>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="catpage" style={{ '--accent': c.color }}>
        <section className="cat-hero">
          <div className="cat-hero-bg">
            <Aurora key={c.id} colors={[c.color, '#7c3aed', '#22d3ee']} speed={0.55} />
            <div className="hero-grid" />
            <div className="hero-fade" />
          </div>
          <div className="container cat-hero-in">
            <nav className="cat-crumbs" aria-label="Breadcrumb">
              <Link to="/">{t('nav.home')}</Link>
              <span aria-hidden="true">/</span>
              <Link to="/categories">{t('catpage.all')}</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{t(`cat.${c.id}`)}</span>
            </nav>
            <motion.div
              key={c.id}
              className="cat-hero-orb"
              initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14 }}
            >
              {c.emoji}
            </motion.div>
            <span className="cat-hero-group">
              {groups.find((g) => g.id === c.group)?.emoji} {t(`group.${c.group}`)}
            </span>
            <h1 className="cat-hero-title">{t(`cat.${c.id}`)}</h1>
            <p className="cat-hero-sub">{c.blurb}</p>
            <div className="cat-hero-stats">
              <span>
                <b>{all.length}</b> {t('catpage.quizzes')}
              </span>
              <span>
                <b>{all.filter((g) => g.status === 'live').length}</b> {t('card.live')}
              </span>
            </div>
            {liveGame && (
              <Link to={`/play/${liveGame.slug}`} className="btn btn-primary btn-lg">
                {t('catpage.play')} <span className="btn-icon"><Play size={12} fill="currentColor" /></span>
              </Link>
            )}
          </div>
        </section>

        <section className="section section-tight">
          <div className="container">
            <div className="section-head section-head--row">
              <div>
                <span className="eyebrow">{t('catpage.quizzes')}</span>
                <BlurText key={c.id + all.length} text={all.length ? t('catpage.count', { n: all.length }) : t('cats.soon')} className="section-title" />
              </div>
              {all.length > 1 && (
                <div className="cat-sort" role="group" aria-label="Sort">
                  {[
                    ['live', t('catpage.liveFirst')],
                    ['quick', t('catpage.quick')],
                    ['az', t('catpage.az')],
                  ].map(([k, label]) => (
                    <button key={k} className={`chip ${sort === k ? 'active' : ''}`} aria-pressed={sort === k} onClick={() => setSort(k)}>
                      {sort === k && <motion.span layoutId="cat-sort" className="chip-bg" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
                      <span className="chip-label">{label}</span>
                    </button>
                  ))}
                  {here && localCount > 0 && (
                    <button className={`chip chip-country ${localOnly ? 'active' : ''}`} aria-pressed={localOnly} onClick={() => setLocalOnly((v) => !v)}>
                      <span className="chip-label">
                        <Flag code={country} size={16} /> {t('catpage.local', { country: here.name })}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {list.length ? (
              <motion.div layout className="games-grid">
                <AnimatePresence mode="popLayout">
                  {list.map((g) => (
                    <GameCard key={g.slug} game={g} />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="cat-empty">
                <span aria-hidden="true">{c.emoji}</span>
                <p>{t('catpage.empty')}</p>
              </div>
            )}
          </div>
        </section>

        {related.length > 0 && (
          <section className="section section-tight cat-related">
            <div className="container">
              <div className="section-head">
                <span className="eyebrow">{t(`group.${c.group}`)}</span>
                <h2 className="section-title cat-related-title">{t('catpage.related')}</h2>
              </div>
              <div className="cat-grid">
                {related.map((x, i) => (
                  <CategoryTile key={x.id} c={x} i={i} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  )
}
