import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import Aurora from '../components/Aurora.jsx'
import SplitText from '../components/SplitText.jsx'
import BlurText from '../components/BlurText.jsx'
import RotatingText from '../components/RotatingText.jsx'
import ShinyText from '../components/ShinyText.jsx'
import GradientText from '../components/GradientText.jsx'
import SpotlightCard from '../components/SpotlightCard.jsx'
import CountUp from '../components/CountUp.jsx'
import Magnet from '../components/Magnet.jsx'
import ScrollVelocity from '../components/ScrollVelocity.jsx'
import ClickSpark from '../components/ClickSpark.jsx'
import GameCard from '../components/GameCard.jsx'
import { categories, games, countByCategory, isForCountry, sortForCountry, recommend } from '../data/games.js'
import { categoryById, homeCategories } from '../data/categories.js'
import { topicsFor } from '../data/regional.js'
import { useT } from '../i18n/useT.js'
import SiteFooter from '../components/SiteFooter.jsx'
import { ALL, countries, countryByCode } from '../data/countries.js'
import { interests, topics } from '../data/preferences.js'
import { useApp } from '../state/AppState.jsx'
import CountryBadge from '../components/CountryBadge.jsx'
import Flag from '../components/Flag.jsx'

const auroraColors = ['#7c3aed', '#22d3ee', '#ec4899']

const teaser = [
  { item: "Rubik's Cube", type: 'Invention', emoji: '🧊', hu: true },
  { item: 'Croissant', type: 'Food', emoji: '🥐', hu: false },
  { item: 'Ballpoint pen', type: 'Invention', emoji: '🖊️', hu: true },
  { item: 'Harry Houdini', type: 'Celebrity', emoji: '🎩', hu: true },
  { item: 'Tango', type: 'Tradition', emoji: '💃', hu: false },
  { item: 'Goulash', type: 'Food', emoji: '🍲', hu: true },
]

function Hero() {
  const t = useT()
  const { lang } = useApp()
  const featuredGame = games.find((g) => g.featured)
  const picks = ['geo', 'movies', 'history', 'music', 'food', 'sports', 'science', 'flags'].map((id) => t(`cat.${id}`))
  return (
    <section className="hero" id="top">
      <div className="hero-bg">
        <Aurora colors={auroraColors} speed={0.6} />
        <div className="hero-grid" />
        <div className="hero-fade" />
      </div>

      {['🌍', '🧠', '🎬', '💡', '🏆', '🎯'].map((e, i) => (
        <motion.span
          key={e}
          className={`orb orb-${i}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1, y: [0, -14, 0] }}
          transition={{ opacity: { delay: 1 + i * 0.1 }, scale: { delay: 1 + i * 0.1 }, y: { duration: 5 + i, repeat: Infinity, ease: 'easeInOut' } }}
          aria-hidden="true"
        >
          {e}
        </motion.span>
      ))}

      <div className="hero-content container">
        <motion.a
          href="#featured"
          className="pill-badge"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <span className="pill-badge-new">{t('hero.new')}</span>
          <ShinyText>{t('hero.badge', { game: featuredGame.title })}</ShinyText>
          <span aria-hidden="true">→</span>
        </motion.a>

        <h1 className="hero-title">
          <SplitText key={lang} text={t('hero.title1')} delay={0.2} />
          <br />
          <motion.span
            style={{ display: 'inline-block' }}
            initial={{ opacity: 0, y: 40, filter: 'blur(14px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.7, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <GradientText className="hero-title-grad">{t('hero.title2')}</GradientText>
          </motion.span>
        </h1>

        <motion.p className="hero-sub" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
          {t('hero.sub')}
          <span className="hero-today">
            {t('hero.today')} <RotatingText key={lang} words={picks} className="hero-rotate" />
          </span>
        </motion.p>

        <motion.div className="hero-ctas" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }}>
          <Magnet strength={0.25}>
            <Link to={`/play/${featuredGame.slug}`} className="btn btn-primary btn-lg">
              <span>{t('hero.start')}</span>
              <span className="btn-icon">▶</span>
            </Link>
          </Magnet>
          <Magnet strength={0.2}>
            <a href="#games" className="btn btn-ghost btn-lg">
              {t('hero.browse')}
            </a>
          </Magnet>
        </motion.div>

        <motion.div className="hero-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7 }}>
          <div>
            <strong>
              <CountUp to={20} />
            </strong>
            <span>{t('hero.stat1')}</span>
          </div>
          <div>
            <strong>
              <CountUp to={categories.length} />
            </strong>
            <span>{t('hero.stat2')}</span>
          </div>
          <div>
            <strong>
              ~<CountUp to={4} /> min
            </strong>
            <span>{t('hero.stat3')}</span>
          </div>
          <div>
            <strong>
              <CountUp to={0} />
            </strong>
            <span>{t('hero.stat4')}</span>
          </div>
        </motion.div>
      </div>

      <a href="#featured" className="scroll-cue" aria-label="Scroll down">
        <span />
      </a>
    </section>
  )
}

function TeaserStack() {
  const [i, setI] = useState(0)
  const [reveal, setReveal] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setReveal(true), 1400)
    const t2 = setTimeout(() => {
      setReveal(false)
      setI((v) => (v + 1) % teaser.length)
    }, 2800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [i])
  const stack = [0, 1, 2].map((k) => teaser[(i + k) % teaser.length])
  return (
    <div className="teaser" aria-hidden="true">
      <AnimatePresence initial={false}>
        {stack
          .map((q, k) => (
            <motion.div
              key={q.item}
              className="teaser-card"
              initial={{ opacity: 0, y: 40, scale: 0.85 }}
              animate={{ opacity: 1 - k * 0.25, y: k * -18, scale: 1 - k * 0.06, zIndex: 3 - k, rotate: k === 0 ? 0 : k % 2 ? 4 : -4 }}
              exit={{ opacity: 0, x: q.hu ? -260 : 260, rotate: q.hu ? -18 : 18, transition: { duration: 0.45 } }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            >
              <span className="teaser-type">{q.type}</span>
              <span className="teaser-emoji">{q.emoji}</span>
              <span className="teaser-item">{q.item}</span>
              <span className="teaser-q">Hungarian origin?</span>
              <div className="teaser-btns">
                <span className={`tb tb-yes ${k === 0 && reveal && q.hu ? 'on' : ''}`}>🇭🇺 Hungary</span>
                <span className={`tb tb-no ${k === 0 && reveal && !q.hu ? 'on' : ''}`}>✕ Not</span>
              </div>
            </motion.div>
          ))
          .reverse()}
      </AnimatePresence>
    </div>
  )
}

function Featured() {
  const t = useT()
  const g = games.find((x) => x.featured)
  return (
    <section className="section" id="featured">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t('featured.eyebrow')}</span>
          <BlurText text={t('featured.title')} className="section-title" />
        </div>
        <motion.div
          className="featured"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="featured-flag" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="featured-copy">
            <div className="featured-tags">
              <span className="tag tag-live">
                <i className="pulse-dot" /> {t('featured.live')}
              </span>
              <CountryBadge codes={g.countries} />
            </div>
            <h3 className="featured-title">{g.title}</h3>
            <p className="featured-text">{g.tagline} Paprika-powered trivia that will surprise even the locals.</p>
            <ul className="featured-points">
              {['food', 'tech', 'celebs', 'holidays'].map((id) => (
                <li key={id}>
                  <span>{categoryById(id).emoji}</span> {t(`cat.${id}`)}
                </li>
              ))}
            </ul>
            <div className="featured-meta">
              <span>
                <b>{g.questions}</b> {t('featured.questions')}
              </span>
              <span>
                <b>~{g.minutes}</b> {t('featured.minutes')}
              </span>
              <span>
                <b>{t(`diff.${g.difficulty}`)}</b> {t('featured.difficulty')}
              </span>
            </div>
            <Magnet strength={0.2}>
              <Link to={`/play/${g.slug}`} className="btn btn-light btn-lg">
                {t('featured.play', { game: g.title })} <span className="btn-icon">→</span>
              </Link>
            </Magnet>
          </div>
          <TeaserStack />
        </motion.div>
      </div>
    </section>
  )
}

function Marquee() {
  const t = useT()
  const { country } = useApp()
  const row = (items) =>
    items.map((x) => (
      <span key={x} className="marquee-item">
        {x} <i>✦</i>
      </span>
    ))
  return (
    <section className="marquee-section" aria-label="Topics">
      <ScrollVelocity
        rows={[
          row(topicsFor(country)),
          row(['general', 'geo', 'history', 'movies', 'music', 'sports', 'science', 'food', 'gaming', 'flags'].map((id) => t(`cat.${id}`))),
        ]}
      />
    </section>
  )
}

function Categories() {
  const t = useT()
  const list = homeCategories.map(categoryById)
  return (
    <section className="section" id="categories">
      <div className="container">
        <div className="section-head section-head--row">
          <div>
            <span className="eyebrow">{t('cats.eyebrow')}</span>
            <BlurText text={t('cats.title')} className="section-title" />
            <p className="section-sub">{t('cats.sub')}</p>
          </div>
          <Link to="/categories" className="btn btn-ghost btn-sm">
            {t('cats.seeAll', { n: categories.length })} <span className="btn-icon">→</span>
          </Link>
        </div>
        <div className="bento">
          {list.map((c, i) => {
            const n = countByCategory(c.id)
            return (
              <motion.div
                key={c.id}
                className={`bento-item bento-${i}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                style={{ '--accent': c.color }}
              >
                <Link to={`/category/${c.id}`} className="bento-link">
                  <SpotlightCard className="bento-card" color={`${c.color}30`}>
                    <span className="bento-emoji">{c.emoji}</span>
                    <div>
                      <h3>{t(`cat.${c.id}`)}</h3>
                      {i === 0 && <p>{c.blurb}</p>}
                    </div>
                    <span className="bento-count">
                      {n ? (n === 1 ? t('cats.game') : t('cats.games', { n })) : t('cats.soon')} <span aria-hidden="true">→</span>
                    </span>
                    <span className="bento-glow" />
                  </SpotlightCard>
                </Link>
              </motion.div>
            )
          })}
          <motion.div className="bento-item bento-more" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Link to="/categories" className="bento-link">
              <SpotlightCard className="bento-card bento-card-more" color="rgba(167,139,250,0.25)">
                <span className="bento-more-emojis" aria-hidden="true">
                  {categories.slice(8, 16).map((c) => (
                    <i key={c.id}>{c.emoji}</i>
                  ))}
                </span>
                <h3>{t('cats.seeAll', { n: categories.length })}</h3>
                <span className="bento-count">→</span>
              </SpotlightCard>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function Library({ filter, setFilter }) {
  const t = useT()
  const { country } = useApp()
  const [q, setQ] = useState('')
  const [localOnly, setLocalOnly] = useState(false)
  const here = countryByCode(country)
  useEffect(() => {
    setLocalOnly(false)
  }, [country])
  const shown = useMemo(
    () =>
      sortForCountry(
        games.filter(
          (g) =>
            (filter === 'all' || g.categories.includes(filter)) &&
            (!localOnly || isForCountry(g, country)) &&
            (g.title + ' ' + g.tagline).toLowerCase().includes(q.trim().toLowerCase())
        ),
        country
      ),
    [filter, q, country, localOnly]
  )
  const localCount = games.filter((g) => isForCountry(g, country)).length
  return (
    <section className="section" id="games">
      <div className="container">
        <div className="section-head section-head--row">
          <div>
            <span className="eyebrow">{t('lib.eyebrow')}</span>
            <BlurText text={t('lib.title')} className="section-title" />
          </div>
          <label className="search">
            <span aria-hidden="true">⌕</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('lib.search')} aria-label={t('lib.search')} />
          </label>
        </div>

        <div className="chips chips-scroll" role="tablist">
          {[{ id: 'all', emoji: '✨' }, ...categories.filter((c) => countByCategory(c.id) > 0)].map((c) => (
            <button key={c.id} role="tab" aria-selected={filter === c.id} className={`chip ${filter === c.id ? 'active' : ''}`} onClick={() => setFilter(c.id)}>
              {filter === c.id && <motion.span layoutId="chip-active" className="chip-bg" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
              <span className="chip-label">
                {c.emoji} {c.id === 'all' ? t('lib.all') : t(`cat.${c.id}`)} <em>{countByCategory(c.id)}</em>
              </span>
            </button>
          ))}
          {here && localCount > 0 && (
            <button className={`chip chip-country ${localOnly ? 'active' : ''}`} aria-pressed={localOnly} onClick={() => setLocalOnly((v) => !v)}>
              <span className="chip-label">
                <Flag code={country} size={16} /> {t('lib.only', { country: here.name })} <em>{localCount}</em>
              </span>
            </button>
          )}
        </div>

        <motion.div layout className="games-grid">
          <AnimatePresence mode="popLayout">
            {shown.map((g) => (
              <GameCard key={g.slug} game={g} />
            ))}
          </AnimatePresence>
        </motion.div>
        {shown.length === 0 && <p className="empty">{t('lib.empty')}</p>}
      </div>
    </section>
  )
}

function CountryPicker() {
  const t = useT()
  const { country, setCountry } = useApp()
  const options = [{ code: ALL, name: t('country.all'), native: 'Global' }, ...countries]
  const count = (code) => (code === ALL ? games.length : games.filter((g) => isForCountry(g, code)).length)
  return (
    <section className="section section-tight" id="countries">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t('country.eyebrow')}</span>
          <BlurText text={t('country.title')} className="section-title" />
          <p className="section-sub">{t('country.sub')}</p>
        </div>
        <div className="country-grid" role="radiogroup" aria-label={t('country.pick')}>
          {options.map((c, i) => {
            const on = country === c.code
            const n = count(c.code)
            return (
              <motion.button
                key={c.code}
                type="button"
                role="radio"
                aria-checked={on}
                className={`country-card ${on ? 'is-on' : ''}`}
                onClick={() => setCountry(c.code)}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
              >
                <SpotlightCard className="country-card-in" color="rgba(167,139,250,0.22)">
                  <Flag code={c.code} size={40} />
                  <span className="country-card-name">{c.name}</span>
                  <span className="country-card-meta">{c.code === ALL ? t('country.quizzes', { n }) : n ? t('country.forYou', { n }) : t('country.soon')}</span>
                  {on && (
                    <motion.span layoutId="country-on" className="country-card-ring" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
                  )}
                </SpotlightCard>
              </motion.button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ForYou() {
  const t = useT()
  const { user, country, openAuth, openOnboarding } = useApp()
  const onboarded = user?.profile?.onboarded && (user.profile.interests?.length || user.profile.countries?.length)
  const picks = useMemo(() => (onboarded ? recommend(user.profile, { interests, topics }, country, 3) : []), [onboarded, user, country])

  if (!onboarded) {
    return (
      <section className="section section-tight">
        <div className="container">
          <div className="foryou-cta">
            <div>
              <span className="eyebrow">{t('foryou.eyebrow')}</span>
              <h2>{user ? t('foryou.titleUser') : t('foryou.titleGuest')}</h2>
              <p>{user ? t('foryou.subUser') : t('foryou.subGuest')}</p>
            </div>
            <div className="foryou-cta-btns">
              {user ? (
                <button className="btn btn-primary btn-lg" onClick={openOnboarding}>
                  {t('foryou.choose')} <span className="btn-icon">→</span>
                </button>
              ) : (
                <>
                  <button className="btn btn-primary btn-lg" onClick={() => openAuth('register')}>
                    {t('foryou.signup')} <span className="btn-icon">→</span>
                  </button>
                  <button className="btn btn-ghost btn-lg" onClick={() => openAuth('login')}>
                    {t('nav.login')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section section-tight" id="for-you">
      <div className="container">
        <div className="section-head section-head--row">
          <div>
            <span className="eyebrow">{t('foryou.picked')}</span>
            <BlurText text={t('foryou.hey', { name: user.username })} className="section-title" />
          </div>
          <button className="btn btn-ghost btn-sm" onClick={openOnboarding}>
            ✨ {t('foryou.edit')}
          </button>
        </div>
        {picks.length ? (
          <div className="games-grid">
            {picks.map((g) => (
              <GameCard key={g.slug} game={g} />
            ))}
          </div>
        ) : (
          <p className="empty">{t('foryou.none')}</p>
        )}
      </div>
    </section>
  )
}

function How() {
  const t = useT()
  const steps = [
    { n: '01', k: 's1', e: '🎮' },
    { n: '02', k: 's2', e: '⚡' },
    { n: '03', k: 's3', e: '🏆' },
  ]
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t('how.eyebrow')}</span>
          <BlurText text={t('how.title')} className="section-title" />
        </div>
        <div className="steps">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.55 }}
            >
              <SpotlightCard className="step">
                <span className="step-n">{s.n}</span>
                <span className="step-e">{s.e}</span>
                <h3>{t(`how.${s.k}t`)}</h3>
                <p>{t(`how.${s.k}d`)}</p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  const t = useT()
  const g = games.find((x) => x.featured)
  return (
    <section className="section">
      <div className="container">
        <motion.div
          className="cta"
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="cta-aurora">
            <Aurora colors={['#ec4899', '#7c3aed', '#22d3ee']} speed={0.8} />
          </div>
          <h2>
            <GradientText colors={['#c4b5fd', '#ffffff', '#67e8f9', '#c4b5fd']}>{t('cta.title')}</GradientText>
          </h2>
          <p>{t('cta.sub')}</p>
          <Magnet strength={0.25}>
            <Link to={`/play/${g.slug}`} className="btn btn-light btn-lg">
              {t('cta.btn')} <span className="btn-icon">→</span>
            </Link>
          </Magnet>
        </motion.div>
      </div>
    </section>
  )
}

export default function Home() {
  const [filter, setFilter] = useState('all')
  return (
    <>
      <ClickSpark />
      <Navbar />
      <main>
        <Hero />
        <Featured />
        <Marquee />
        <CountryPicker />
        <ForYou />
        <Categories />
        <Library filter={filter} setFilter={setFilter} />
        <How />
        <CTA />
      </main>
      <SiteFooter />
    </>
  )
}
