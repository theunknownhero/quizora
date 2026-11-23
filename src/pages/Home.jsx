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
  return (
    <section className="hero" id="top">
      <div className="hero-bg">
        <Aurora colors={auroraColors} speed={0.6} />
        <div className="hero-grid" />
        <div className="hero-fade" />
      </div>

      {['🇭🇺', '🧠', '🍲', '💡', '🏆', '🎯'].map((e, i) => (
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
          <span className="pill-badge-new">NEW</span>
          <ShinyText>Hungary or Not? is now live</ShinyText>
          <span aria-hidden="true">→</span>
        </motion.a>

        <h1 className="hero-title">
          <SplitText text="Play smarter." delay={0.2} />
          <br />
          <motion.span
            style={{ display: 'inline-block' }}
            initial={{ opacity: 0, y: 40, filter: 'blur(14px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.7, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <GradientText className="hero-title-grad">Quiz harder.</GradientText>
          </motion.span>
        </h1>

        <motion.p className="hero-sub" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
          A growing library of bite-sized quiz games. Guess the origin of every{' '}
          <RotatingText words={['food', 'invention', 'celebrity', 'tradition']} className="hero-rotate" /> — and find out how much you
          really know.
        </motion.p>

        <motion.div className="hero-ctas" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }}>
          <Magnet strength={0.25}>
            <Link to="/play/hungary-or-not" className="btn btn-primary btn-lg">
              <span>Start playing</span>
              <span className="btn-icon">▶</span>
            </Link>
          </Magnet>
          <Magnet strength={0.2}>
            <a href="#games" className="btn btn-ghost btn-lg">
              Browse games
            </a>
          </Magnet>
        </motion.div>

        <motion.div className="hero-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7 }}>
          <div>
            <strong>
              <CountUp to={20} />
            </strong>
            <span>questions per round</span>
          </div>
          <div>
            <strong>
              <CountUp to={categories.length - 1} />
            </strong>
            <span>categories</span>
          </div>
          <div>
            <strong>
              ~<CountUp to={4} /> min
            </strong>
            <span>average game</span>
          </div>
          <div>
            <strong>
              <CountUp to={0} />
            </strong>
            <span>sign-ups needed</span>
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
  const g = games.find((x) => x.featured)
  return (
    <section className="section" id="featured">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Featured quiz</span>
          <BlurText text="This week's spotlight" className="section-title" />
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
                <i className="pulse-dot" /> Live now
              </span>
              <CountryBadge codes={g.countries} />
            </div>
            <h3 className="featured-title">{g.title}</h3>
            <p className="featured-text">{g.tagline} Paprika-powered trivia that will surprise even the locals.</p>
            <ul className="featured-points">
              <li>
                <span>🍲</span> Foods
              </li>
              <li>
                <span>💡</span> Inventions
              </li>
              <li>
                <span>⭐</span> Celebrities
              </li>
              <li>
                <span>🎉</span> Traditions
              </li>
            </ul>
            <div className="featured-meta">
              <span>
                <b>{g.questions}</b> questions
              </span>
              <span>
                <b>~{g.minutes}</b> minutes
              </span>
              <span>
                <b>{g.difficulty}</b> difficulty
              </span>
            </div>
            <Magnet strength={0.2}>
              <Link to={`/play/${g.slug}`} className="btn btn-light btn-lg">
                Play Hungary or Not? <span className="btn-icon">→</span>
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
  const row = (items) => items.map((t) => (
    <span key={t} className="marquee-item">
      {t} <i>✦</i>
    </span>
  ))
  return (
    <section className="marquee-section" aria-label="Topics">
      <ScrollVelocity
        rows={[
          row(['Goulash', 'Rubik’s Cube', 'Ballpoint Pen', 'Houdini', 'Lángos', 'Paprika', 'Tokaji', 'Busójárás']),
          row(['Geography', 'History', 'Food & Drink', 'Inventions', 'Celebrities', 'Traditions', 'Flags', 'Capitals']),
        ]}
      />
    </section>
  )
}

function Categories({ onPick }) {
  const list = categories.filter((c) => c.id !== 'all')
  return (
    <section className="section" id="categories">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Categories</span>
          <BlurText text="Pick your kind of challenge" className="section-title" />
          <p className="section-sub">Every game belongs to one or more categories. Tap one to filter the library.</p>
        </div>
        <div className="bento">
          {list.map((c, i) => (
            <motion.button
              key={c.id}
              className={`bento-item bento-${i}`}
              onClick={() => onPick(c.id)}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.07, duration: 0.5 }}
              style={{ '--accent': c.color }}
            >
              <SpotlightCard className="bento-card" color={`${c.color}30`}>
                <span className="bento-emoji">{c.emoji}</span>
                <div>
                  <h3>{c.label}</h3>
                  <p>{c.blurb}</p>
                </div>
                <span className="bento-count">
                  {countByCategory(c.id)} {countByCategory(c.id) === 1 ? 'game' : 'games'} <span aria-hidden="true">→</span>
                </span>
                <span className="bento-glow" />
              </SpotlightCard>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  )
}

function Library({ filter, setFilter }) {
  const { country } = useApp()
  const [q, setQ] = useState('')
  const [localOnly, setLocalOnly] = useState(false)
  const here = countryByCode(country)
  useEffect(() => setLocalOnly(false), [country])
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
            <span className="eyebrow">Game library</span>
            <BlurText text="All games" className="section-title" />
          </div>
          <label className="search">
            <span aria-hidden="true">⌕</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search games…" aria-label="Search games" />
          </label>
        </div>

        <div className="chips" role="tablist">
          {categories.map((c) => (
            <button key={c.id} role="tab" aria-selected={filter === c.id} className={`chip ${filter === c.id ? 'active' : ''}`} onClick={() => setFilter(c.id)}>
              {filter === c.id && <motion.span layoutId="chip-active" className="chip-bg" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
              <span className="chip-label">
                {c.emoji} {c.label} <em>{countByCategory(c.id)}</em>
              </span>
            </button>
          ))}
          {here && localCount > 0 && (
            <button className={`chip chip-country ${localOnly ? 'active' : ''}`} aria-pressed={localOnly} onClick={() => setLocalOnly((v) => !v)}>
              <span className="chip-label">
                <Flag code={country} size={16} /> Only {here.name} <em>{localCount}</em>
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
        {shown.length === 0 && <p className="empty">No games match that yet — new quizzes are on the way.</p>}
      </div>
    </section>
  )
}

function CountryPicker() {
  const { country, setCountry } = useApp()
  const options = [{ code: ALL, name: 'All countries', native: 'Global' }, ...countries]
  const count = (code) => (code === ALL ? games.length : games.filter((g) => isForCountry(g, code)).length)
  return (
    <section className="section section-tight" id="countries">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Your country</span>
          <BlurText text="Where are you playing from?" className="section-title" />
          <p className="section-sub">We’ll put quizzes made for your country first. Every quiz is still open to everyone.</p>
        </div>
        <div className="country-grid" role="radiogroup" aria-label="Choose your country">
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
                  <span className="country-card-meta">{c.code === ALL ? `${n} quizzes` : n ? `${n} ${n === 1 ? 'quiz' : 'quizzes'} for you` : 'Coming soon'}</span>
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
  const { user, country, openAuth, openOnboarding } = useApp()
  const onboarded = user?.profile?.onboarded && (user.profile.interests?.length || user.profile.countries?.length)
  const picks = useMemo(() => (onboarded ? recommend(user.profile, { interests, topics }, country, 3) : []), [onboarded, user, country])

  if (!onboarded) {
    return (
      <section className="section section-tight">
        <div className="container">
          <div className="foryou-cta">
            <div>
              <span className="eyebrow">Made for you</span>
              <h2>{user ? 'Tell us what you like' : 'Get quizzes picked for you'}</h2>
              <p>{user ? 'Pick your interests, topics and countries and we’ll suggest quizzes you’ll love.' : 'Create a free account, choose your interests and countries, and we’ll recommend quizzes you’ll love.'}</p>
            </div>
            <div className="foryou-cta-btns">
              {user ? (
                <button className="btn btn-primary btn-lg" onClick={openOnboarding}>
                  Choose interests <span className="btn-icon">→</span>
                </button>
              ) : (
                <>
                  <button className="btn btn-primary btn-lg" onClick={() => openAuth('register')}>
                    Sign up free <span className="btn-icon">→</span>
                  </button>
                  <button className="btn btn-ghost btn-lg" onClick={() => openAuth('login')}>
                    Log in
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
            <span className="eyebrow">Picked for you</span>
            <BlurText text={`Hey ${user.username}, try these`} className="section-title" />
          </div>
          <button className="btn btn-ghost btn-sm" onClick={openOnboarding}>
            ✨ Edit interests
          </button>
        </div>
        {picks.length ? (
          <div className="games-grid">
            {picks.map((g) => (
              <GameCard key={g.slug} game={g} />
            ))}
          </div>
        ) : (
          <p className="empty">No matches yet. New quizzes for your interests are on the way.</p>
        )}
      </div>
    </section>
  )
}

function How() {
  const steps = [
    { n: '01', t: 'Pick a game', d: 'Browse the library or jump into the featured quiz. No account, no download.', e: '🎮' },
    { n: '02', t: 'Make your call', d: 'Answer fast, rounds are short. Each answer comes with a quick fun fact.', e: '⚡' },
    { n: '03', t: 'Share your score', d: 'See how you did and challenge friends to beat it.', e: '🏆' },
  ]
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">How it works</span>
          <BlurText text="Three taps to trivia glory" className="section-title" />
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
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
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
            Think you know <GradientText colors={['#f87171', '#ffffff', '#4ade80', '#f87171']}>Hungary</GradientText>?
          </h2>
          <p>20 questions. 4 minutes. Prove it.</p>
          <Magnet strength={0.25}>
            <Link to="/play/hungary-or-not" className="btn btn-light btn-lg">
              Take the quiz <span className="btn-icon">→</span>
            </Link>
          </Magnet>
        </motion.div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="nav-logo">
          <span className="nav-logo-mark">Q</span>
          <span className="nav-logo-text">Quizora</span>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <a href="#featured">Featured</a>
          <a href="#categories">Categories</a>
          <a href="#games">Games</a>
          <a href="#how">How it works</a>
        </nav>
        <a className="powered" href="https://fortunejack.com" target="_blank" rel="noopener noreferrer">
          <span>Powered by</span>
          <img src="/brand/fortunejack.svg" alt="FortuneJack" width="150" height="17" />
        </a>
        <span className="footer-copy">© {new Date().getFullYear()} Quizora. Made for curious minds.</span>
      </div>
    </footer>
  )
}

export default function Home() {
  const [filter, setFilter] = useState('all')
  const pick = (id) => {
    setFilter(id)
    document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' })
  }
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
        <Categories onPick={pick} />
        <Library filter={filter} setFilter={setFilter} />
        <How />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
