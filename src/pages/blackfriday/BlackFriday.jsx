// /blackfriday — link-only Black Friday landing page with the "Fake or Real?" deal game.
// Nothing on the site links here, and the quiz is a hidden game (supabase/011_blackfriday_fake_or_real.sql),
// so it never appears in the library, categories or search. Rounds are scored on the server like every quiz.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react'
import {
  ArrowRight, BadgePercent, Check, CreditCard, Fish, Flame, Gift, Globe, Link2, Loader2, Mail, Megaphone, MessageSquare,
  Newspaper, Play, RotateCcw, ScanSearch, Share2, ShieldCheck, ShoppingBag, Smartphone, Store, Tag, Timer, X, Zap,
} from 'lucide-react'
import { useApp } from '../../state/AppState.jsx'
import { useAnnounce } from '../../components/Toaster.jsx'
import { startRound, submitAnswer, finishRound } from '../../state/playService.js'
import { getSettings } from '../../lib/siteConfig.js'
import './blackfriday.css'

export const BF_SLUG = 'black-friday-fake-or-real'
const ROUND = 10
const WIN_AT = Math.ceil(ROUND * 0.7)

// Key visual pieces (public/blackfriday/): the "Black Friday Madness" logo, cut out so it blends over the page,
// and the cart rider. The hero rebuilds the campaign banner from them so it works at every screen size.
const KV = { logo: '/blackfriday/madness-logo.webp', rider: '/blackfriday/madness-rider.webp' }

const FLOATERS = [
  { t: '-70%', x: '6%', d: '26s', s: 1, r: '-8deg' },
  { t: 'SALE', x: '18%', d: '34s', s: 0.8, r: '6deg' },
  { t: '$9.99', x: '31%', d: '29s', s: 0.7, r: '-4deg' },
  { t: 'FAKE?', x: '44%', d: '38s', s: 0.9, r: '10deg' },
  { t: '-90%', x: '57%', d: '24s', s: 1.1, r: '-12deg' },
  { t: 'REAL?', x: '69%', d: '33s', s: 0.85, r: '5deg' },
  { t: '$1,199', x: '81%', d: '28s', s: 0.75, r: '-6deg' },
  { t: '-50%', x: '92%', d: '36s', s: 0.95, r: '9deg' },
]
const TAPE = ['Black Friday Madness', 'Fake or real?', 'Too good to be true?', 'Real deal', 'Total scam', 'Trust your gut']

const CHANNEL_ICON = [
  [/flyer/i, Newspaper],
  [/text|message/i, MessageSquare],
  [/email|newsletter/i, Mail],
  [/\bapp\b/i, Smartphone],
  [/marketplace/i, ShoppingBag],
  [/sign|store/i, Store],
  [/\bad\b|social|instagram|pop-up/i, Megaphone],
  [/web|site/i, Globe],
]
const channelIcon = (s = '') => (CHANNEL_ICON.find(([re]) => re.test(s)) || [null, Tag])[1]

const RANKS = [
  { min: 10, title: 'Scam Slayer', line: 'Not a single trick got past you. Black Friday fears you.', Icon: ShieldCheck },
  { min: 8, title: 'Deal Detective', line: 'You can smell a fake offer from a mile away.', Icon: ScanSearch },
  { min: 6, title: 'Bargain Hunter', line: 'Sharp instincts, with a couple of close calls.', Icon: Tag },
  { min: 3, title: 'Window Shopper', line: 'Some of those fakes looked convincing, right?', Icon: ShoppingBag },
  { min: 0, title: 'Easy Target', line: 'Careful out there: scammers love Black Friday.', Icon: Fish },
]
const rankFor = (correct, total) => RANKS.find((r) => Math.round((correct / Math.max(total, 1)) * 10) >= r.min)
const PRAISE = ['Nice catch!', 'Spot on!', 'Sharp eyes!', 'Nailed it!']

// "Product — $99 (was $1,199)" → title, price, old price and discount. Anything else shows as plain text.
const money = (s) => Number(String(s).replace(/[^\d.]/g, ''))
export function parseDeal(item = '') {
  const cut = item.lastIndexOf(' — ')
  if (cut < 0) return { title: item }
  const m = item.slice(cut + 3).match(/^([$€£]\s?[\d.,]+)(.*?)(?:\s*\(was\s+([$€£]\s?[\d.,]+)\))?\s*$/i)
  if (!m) return { title: item }
  const [, now, unit, was] = m
  const off = was && money(was) > 0 ? Math.round((1 - money(now) / money(was)) * 100) : null
  return { title: item.slice(0, cut), now, unit: unit.trim(), was, off, free: money(now) === 0 }
}

function useHead() {
  useEffect(() => {
    const prevTitle = document.title
    document.title = 'Black Friday Madness: Fake or Real? | Quizora'
    const add = (tag, attrs) => {
      const el = document.createElement(tag)
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
      document.head.appendChild(el)
      return el
    }
    // Link-only page: keep it out of search engines too
    const robots = add('meta', { name: 'robots', content: 'noindex, nofollow' })
    // Anton for price tags, wide Archivo to echo the key visual's lettering, Rubik Wet Paint for its paint drips
    const font = add('link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wdth,wght@125,800;125,900&family=Rubik+Wet+Paint&display=swap' })
    return () => {
      document.title = prevTitle
      robots.remove()
      font.remove()
    }
  }, [])
}

export default function BlackFriday() {
  useHead()
  const { user, openAuth, reloadUser } = useApp()
  const announce = useAnnounce()
  const stageRef = useRef(null)
  const [phase, setPhase] = useState('intro') // intro | question | done
  const [round, setRound] = useState(null)
  const [i, setI] = useState(0)
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [outcome, setOutcome] = useState(null)
  const [exitDir, setExitDir] = useState(1)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const total = round?.questions.length || ROUND
  const q = round?.questions[i]
  const res = results[i]
  const correct = results.filter((r) => r?.correct).length
  const streak = useMemo(() => {
    let s = 0
    for (let k = results.length - 1; k >= 0 && results[k]?.correct; k--) s++
    return s
  }, [results])

  const toStage = () => setTimeout(() => stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)

  const begin = async () => {
    setBusy(true)
    setError('')
    try {
      let localPick
      if (import.meta.env.DEV) {
        const { pickDeals } = await import('./devDeals.js')
        localPick = () => pickDeals(ROUND)
      }
      const r = await startRound(BF_SLUG, { count: ROUND, localPick })
      setRound(r)
      setResults([])
      setI(0)
      setOutcome(null)
      setPhase('question')
      toStage()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const decide = useCallback(
    async (choice) => {
      if (!round || results[i] || busy) return
      setBusy(true)
      setError('')
      try {
        const r = await submitAnswer(round, i, choice)
        setResults((rs) => {
          const n = [...rs]
          n[i] = { ...r, choice }
          return n
        })
      } catch (e) {
        setError(e.message)
      } finally {
        setBusy(false)
      }
    },
    [round, results, i, busy]
  )

  const next = async () => {
    if (!res || busy) return
    setExitDir(res.answer ? 1 : -1)
    if (i + 1 < total) return setI(i + 1)
    setBusy(true)
    try {
      const o = await finishRound(round)
      setOutcome(o)
      setPhase('done')
      toStage()
      if (o.saved) {
        reloadUser()
        announce(o.new_achievements || [])
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  // ← fake, → real, Enter for the next offer
  useEffect(() => {
    if (phase !== 'question') return
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, [contenteditable]')) return
      if (!res && e.key === 'ArrowLeft') decide(false)
      if (!res && e.key === 'ArrowRight') decide(true)
      if (res && e.key === 'Enter' && e.target.tagName !== 'BUTTON') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="bf">
      <Backdrop />
      <header className="bf-top">
        <Link to="/" className="bf-logo" aria-label="Quizora home">
          <span className="bf-logo-bars" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          Quizora
        </Link>
        <span className="bf-top-chip">
          <Zap size={14} aria-hidden="true" /> Black Friday Madness
        </span>
        {user ? (
          <Link to="/profile" className="bf-top-user">
            <span>{user.username[0].toUpperCase()}</span>
            {user.username}
          </Link>
        ) : (
          <button type="button" className="bf-top-user" onClick={() => openAuth('login')}>
            Log in
          </button>
        )}
      </header>

      <main>
        <HeroBanner />

        <section className="bf-intro">
          <motion.p className="bf-eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <BadgePercent size={15} aria-hidden="true" /> One game. Ten offers. No mercy.
          </motion.p>
          <motion.h1 className="bf-title" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, type: 'spring', stiffness: 160, damping: 18 }}>
            <span className="bf-glitch is-fake" data-text="Fake">
              Fake
            </span>{' '}
            <span className="bf-or">or</span>
            {' '}
            <span className="bf-glitch is-real" data-text="Real?">
              Real?
            </span>
          </motion.h1>
          <motion.p className="bf-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            Some of these Black Friday offers are genuine bargains. The rest are scams dressed up as deals. Swipe, tap or use your arrow keys to call it.
          </motion.p>
          <motion.div className="bf-cta-row" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <button type="button" className="bf-btn bf-btn-hot bf-btn-xl" onClick={phase === 'question' ? toStage : begin} disabled={busy && phase !== 'question'}>
              {busy && phase === 'intro' ? <Loader2 size={20} className="spin" /> : <Play size={20} fill="currentColor" />}
              {phase === 'question' ? 'Back to the game' : phase === 'done' ? 'Play again' : 'Start spotting'}
            </button>
            <ul className="bf-facts" aria-label="About this game">
              <li>{ROUND} offers</li>
              <li>~2 min</li>
              <li>Win with {WIN_AT}+</li>
            </ul>
          </motion.div>
          {error && phase === 'intro' && <p className="bf-error">{error}</p>}
        </section>

        <Tape />

        <section className="bf-stage" ref={stageRef} aria-live="polite">
          <AnimatePresence mode="wait">
            {phase === 'intro' && (
              <motion.div key="tips" className="bf-tips" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <h2>
                  Spot the <em>red flags</em>
                </h2>
                <div className="bf-tip-grid">
                  <Tip Icon={Tag} title="Too-good price" text="90% off the newest phone? Real discounts on hot items are small." />
                  <Tip Icon={Link2} title="Strange link or site" text="Random texts, pop-ups and lookalike web addresses are where fakes live." />
                  <Tip Icon={CreditCard} title="Odd way to pay" text="Gift cards, crypto or bank transfer only? Real shops don't ask for that." />
                </div>
                <button type="button" className="bf-btn bf-btn-hot" onClick={begin} disabled={busy}>
                  {busy ? <Loader2 size={18} className="spin" /> : <Play size={18} fill="currentColor" />} Let's go
                </button>
              </motion.div>
            )}

            {phase === 'question' && q && (
              <motion.div key="game" className="bf-game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="bf-hud">
                  <span className="bf-hud-count">
                    Offer <b>{i + 1}</b>/{total}
                  </span>
                  <ol className="bf-pips" aria-hidden="true">
                    {Array.from({ length: total }, (_, k) => (
                      <li key={k} className={results[k] ? (results[k].correct ? 'ok' : 'bad') : k === i ? 'now' : ''} />
                    ))}
                  </ol>
                  <span className="bf-hud-score">
                    <Check size={15} strokeWidth={3} /> {correct}
                    {streak >= 3 && (
                      <em>
                        <Flame size={14} /> {streak}
                      </em>
                    )}
                  </span>
                </div>

                <div className="bf-deck">
                  <span className="bf-deck-ghost g2" aria-hidden="true" />
                  <span className="bf-deck-ghost g1" aria-hidden="true" />
                  <AnimatePresence custom={exitDir} initial={false}>
                    <DealCard key={q.id} q={q} result={res} locked={busy || !!res} onDecide={decide} pending={busy && !res} />
                  </AnimatePresence>
                </div>

                {res ? (
                  <motion.div className={`bf-verdict ${res.correct ? 'ok' : 'bad'}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    <b>
                      {res.correct ? <Check size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />}
                      {res.correct ? PRAISE[i % PRAISE.length] : res.answer ? 'That one was real!' : 'Gotcha! It was fake.'}
                    </b>
                    {res.fact && <p>{res.fact}</p>}
                    <button type="button" className="bf-btn bf-btn-hot" onClick={next} disabled={busy} autoFocus>
                      {busy ? <Loader2 size={18} className="spin" /> : null} {i + 1 < total ? 'Next offer' : 'See my rank'} <ArrowRight size={18} />
                    </button>
                  </motion.div>
                ) : (
                  <div className="bf-choices">
                    <button type="button" className="bf-choice is-fake" onClick={() => decide(false)} disabled={busy}>
                      <X size={22} strokeWidth={3} /> Fake
                    </button>
                    <button type="button" className="bf-choice is-real" onClick={() => decide(true)} disabled={busy}>
                      Real <Check size={22} strokeWidth={3} />
                    </button>
                  </div>
                )}
                {!res && (
                  <p className="bf-keys">
                    <span className="bf-keys-mouse">
                      <kbd>←</kbd> Fake · drag the card · Real <kbd>→</kbd>
                    </span>
                    <span className="bf-keys-touch">Swipe the card left for fake, right for real</span>
                  </p>
                )}
                {error && <p className="bf-error">{error}</p>}
              </motion.div>
            )}

            {phase === 'done' && outcome && <Results key="done" outcome={outcome} results={results} round={round} onReplay={begin} busy={busy} user={user} openAuth={openAuth} />}
          </AnimatePresence>
        </section>

        <footer className="bf-foot">
          <p>
            <ShieldCheck size={16} aria-hidden="true" /> If a deal looks too good to be true, it probably is. Shop on official sites and apps.
          </p>
          <Link to="/" className="bf-foot-link">
            More quizzes on Quizora <ArrowRight size={15} />
          </Link>
        </footer>
      </main>
    </div>
  )
}

function Backdrop() {
  return (
    <div className="bf-backdrop" aria-hidden="true">
      <span className="bf-bg-x is-right" />
      <span className="bf-bg-x is-left" />
      <div className="bf-glow g1" />
      <div className="bf-glow g2" />
      <div className="bf-glow g3" />
      <div className="bf-floor">
        <div className="bf-floor-grid" />
      </div>
      {FLOATERS.map((f, k) => (
        <span key={k} className="bf-floater" style={{ '--x': f.x, '--d': f.d, '--s': f.s, '--r': f.r, '--delay': `-${(k * 4.3) % 30}s` }}>
          {f.t}
        </span>
      ))}
      <div className="bf-grain" />
    </div>
  )
}

function HeroBanner() {
  return (
    <motion.section className="bf-hero" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}>
      <div className="bf-hero-kv">
        <span className="bf-hero-x" aria-hidden="true" />
        <span className="bf-hero-glow" aria-hidden="true" />
        <motion.img
          className="bf-hero-logo"
          src={KV.logo}
          alt="Black Friday Madness"
          width="1065"
          height="645"
          fetchpriority="high"
          initial={{ opacity: 0, scale: 1.12, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 140, damping: 14, delay: 0.1 }}
        />
        <motion.div
          className="bf-hero-rider"
          initial={{ x: '70%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 90, damping: 13, delay: 0.35 }}
        >
          <span className="bf-hero-speed" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <img src={KV.rider} alt="" width="1200" height="811" />
        </motion.div>
        <div className="bf-hero-tags" aria-hidden="true">
          <HeroTag emoji="📱" now="$99" was="$1,199" className="t1" />
          <HeroTag emoji="👟" now="$19" was="$180" className="t2" />
        </div>
      </div>
    </motion.section>
  )
}

function HeroTag({ emoji, now, was, className }) {
  return (
    <span className={`bf-hero-tag ${className}`}>
      <span className="bf-hero-tag-emoji">{emoji}</span>
      <s>{was}</s>
      <b>{now}</b>
      <em>?</em>
    </span>
  )
}

function Tape() {
  const row = (dir) => (
    <div className={`bf-tape ${dir}`} aria-hidden="true">
      <div className="bf-tape-track">
        {[0, 1].map((n) => (
          <span key={n}>
            {TAPE.map((t) => (
              <b key={t}>
                {t} <i>✦</i>
              </b>
            ))}
          </span>
        ))}
      </div>
    </div>
  )
  return (
    <div className="bf-tapes">
      {row('is-a')}
      {row('is-b')}
    </div>
  )
}

function Tip({ Icon, title, text }) {
  return (
    <div className="bf-tip">
      <span className="bf-tip-ico">
        <Icon size={20} />
      </span>
      <b>{title}</b>
      <p>{text}</p>
    </div>
  )
}

// Decorative "offer ends in" clock, different per card
function useCountdown(seed, running) {
  const start = useMemo(() => {
    let h = 0
    for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0
    return 95 + (h % 780)
  }, [seed])
  const [left, setLeft] = useState(start)
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [running])
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  return `00:${mm}:${ss}`
}

const cardVariants = {
  enter: { opacity: 0, y: 36, scale: 0.94 },
  in: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 24 } },
  out: (dir) => ({ opacity: 0, x: dir * 520, rotate: dir * 18, transition: { duration: 0.35, ease: 'easeIn' } }),
}

function DealCard({ q, result, locked, pending, onDecide }) {
  const d = useMemo(() => parseDeal(q.item), [q.item])
  const Channel = channelIcon(q.type)
  const clock = useCountdown(q.id ?? q.item, !result)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-240, 240], [-14, 14])
  const realOpacity = useTransform(x, [24, 130], [0, 1])
  const fakeOpacity = useTransform(x, [-130, -24], [1, 0])

  return (
    <motion.article
      className={`bf-card ${result ? (result.answer ? 'is-real' : 'is-fake') : ''}`}
      style={{ x, rotate }}
      variants={cardVariants}
      initial="enter"
      animate="in"
      exit="out"
      drag={locked ? false : 'x'}
      dragSnapToOrigin
      dragElastic={0.65}
      onDragEnd={(_, info) => {
        if (locked) return
        if (info.offset.x > 110 || info.velocity.x > 650) onDecide(true)
        else if (info.offset.x < -110 || info.velocity.x < -650) onDecide(false)
      }}
      whileDrag={{ cursor: 'grabbing' }}
      aria-label={`Offer: ${q.item}`}
    >
      <span className="bf-card-hole" aria-hidden="true" />
      <div className="bf-card-top">
        <span className="bf-chip">
          <Channel size={14} aria-hidden="true" /> {q.type || 'Offer'}
        </span>
        <span className="bf-clock">
          <Timer size={13} aria-hidden="true" /> {clock}
        </span>
      </div>

      {d.off != null && <span className={`bf-off ${d.free ? 'is-free' : ''}`}>{d.free ? 'FREE' : `-${d.off}%`}</span>}

      <div className="bf-card-body">
        <span className="bf-card-emoji">{q.emoji || '🏷️'}</span>
        <h3 className={`bf-card-title ${d.now ? '' : 'is-solo'}`}>{d.title}</h3>
        {d.now && (
          <div className="bf-price">
            {d.was && <s>{d.was}</s>}
            <b>{d.free ? '$0' : d.now}</b>
            {d.unit && <small>{d.unit}</small>}
          </div>
        )}
      </div>

      <div className="bf-barcode" aria-hidden="true">
        <span />
        <small>BF-{String(q.id ?? 0).padStart(6, '0')}</small>
      </div>

      <motion.span className="bf-swipe is-real" style={{ opacity: realOpacity }} aria-hidden="true">
        Real
      </motion.span>
      <motion.span className="bf-swipe is-fake" style={{ opacity: fakeOpacity }} aria-hidden="true">
        Fake
      </motion.span>

      {pending && (
        <span className="bf-card-wait" aria-hidden="true">
          <Loader2 size={28} className="spin" />
        </span>
      )}

      <AnimatePresence>
        {result && (
          <motion.span
            className={`bf-stamp ${result.answer ? 'is-real' : 'is-fake'}`}
            initial={{ scale: 2.6, opacity: 0, rotate: -28 }}
            animate={{ scale: 1, opacity: 1, rotate: -12 }}
            transition={{ type: 'spring', stiffness: 520, damping: 20 }}
          >
            {result.answer ? 'Real deal' : 'Fake!'}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

function Results({ outcome, results, round, onReplay, busy, user, openAuth }) {
  const [copied, setCopied] = useState(false)
  const rank = rankFor(outcome.correct, outcome.total)
  const prize = getSettings().prize || {}
  const share = async () => {
    const url = `${window.location.origin}/blackfriday`
    const text = `I spotted ${outcome.correct}/${outcome.total} Black Friday fakes and got "${rank.title}". Can you beat me?`
    try {
      if (navigator.share) await navigator.share({ title: 'Black Friday: Fake or Real?', text, url })
      else {
        await navigator.clipboard.writeText(`${text} ${url}`)
        setCopied(true)
      }
    } catch {
      /* cancelled */
    }
  }
  return (
    <motion.div className="bf-results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
      <motion.span className="bf-rank-ico" initial={{ rotate: -20, scale: 0.4 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.1 }}>
        <rank.Icon size={40} />
      </motion.span>
      <small className="bf-rank-label">Your rank</small>
      <h2 className="bf-rank">{rank.title}</h2>
      <p className="bf-rank-line">{rank.line}</p>
      <p className="bf-score">
        {outcome.correct}
        <em>/{outcome.total}</em>
      </p>
      {outcome.saved ? (
        <span className="bf-xp">+{outcome.xp_earned} XP</span>
      ) : (
        <p className="bf-muted">
          <button type="button" className="bf-link" onClick={() => openAuth('register')}>
            Sign up
          </button>{' '}
          to save your score and earn XP.
        </p>
      )}
      <div className="bf-actions">
        {outcome.won && prize.url && (
          <a className="bf-btn bf-btn-hot" href={prize.url} target="_blank" rel="noopener noreferrer">
            <Gift size={18} /> {prize.label || 'Claim the Prize'}
          </a>
        )}
        <button type="button" className={`bf-btn ${outcome.won && prize.url ? 'bf-btn-ghost' : 'bf-btn-hot'}`} onClick={onReplay} disabled={busy}>
          {busy ? <Loader2 size={18} className="spin" /> : <RotateCcw size={18} />} Play again
        </button>
        <button type="button" className="bf-btn bf-btn-ghost" onClick={share}>
          {copied ? <Check size={18} /> : <Share2 size={18} />} {copied ? 'Link copied' : 'Challenge a friend'}
        </button>
      </div>
      {!user && outcome.won && !prize.url && <p className="bf-muted small">Nice work! Log in next time to keep your XP.</p>}
      <ol className="bf-review">
        {round.questions.map((qq, k) => {
          const r = results[k]
          return (
            <li key={qq.id ?? k} className={r?.correct ? 'ok' : 'bad'}>
              <span className="bf-review-ico">{r?.correct ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}</span>
              <span className="bf-review-item">
                {qq.emoji} {parseDeal(qq.item).title}
              </span>
              <span className={`bf-review-ans ${r?.answer ? 'is-real' : 'is-fake'}`}>{r?.answer ? 'Real' : 'Fake'}</span>
            </li>
          )
        })}
      </ol>
    </motion.div>
  )
}
