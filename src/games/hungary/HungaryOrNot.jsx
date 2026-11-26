import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, useSearchParams } from 'react-router-dom'
import Sprite, { spriteUrl } from './Sprite.jsx'
import Terrain from './Terrain.jsx'
import { spriteSizes } from './spriteSizes.js'
import { WORLD_W, WORLD_H, islands, nodes as islandNodes, sky } from './layout.js'
import { MAP_IMAGE, imageNodes } from './imageMap.js'
import { pickRound, regions, ranks, ROUND_SIZE, WIN_SCORE } from './questions.js'
import { getSettings } from '../../lib/siteConfig.js'
import { startRound, submitAnswer, finishRound } from '../../state/playService.js'
import { useApp } from '../../state/AppState.jsx'
import { useAnnounce } from '../../components/Toaster.jsx'
import { achievementById, tiersStyle } from '../../data/achievements.js'
import { levelProgress, tierFor } from '../../lib/levels.js'
import GradientText from '../../components/GradientText.jsx'
import ShinyText from '../../components/ShinyText.jsx'
import Aurora from '../../components/Aurora.jsx'
import CountUp from '../../components/CountUp.jsx'
import './hungary.css'
import { ArrowRight, ArrowLeft, Check, X, PartyPopper, Play, Star, Flame, Gift, RotateCcw, Share2, Trophy, Target, Users, Medal } from 'lucide-react'

const TOTAL = ROUND_SIZE

// Map style: the painted illustration (default) or the sprite-built islands (?map=islands)
const MODE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('map') === 'islands' ? 'islands' : 'image'
const W = MODE === 'image' ? MAP_IMAGE.w : WORLD_W
const H = MODE === 'image' ? MAP_IMAGE.h : WORLD_H
const nodes = MODE === 'image' ? imageNodes : islandNodes
const BEST_KEY = 'hon-best'
const FLIGHT_MS = 1500

const readBest = () => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}
const saveBest = (v) => {
  try {
    localStorage.setItem(BEST_KEY, String(v))
  } catch {
    /* storage unavailable */
  }
}

function useWorldScale() {
  const [s, setS] = useState(1)
  useLayoutEffect(() => {
    const f = () =>
      setS(MODE === 'image' ? Math.min(1.15, Math.max(0.5, window.innerWidth / W)) : Math.min(1, Math.max(0.52, window.innerWidth / W)))
    f()
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  return s
}

// All props in world coords, painter-sorted (back first, then by bottom y)
const worldProps = islands
  .flatMap((isl) => isl.props.map((p) => ({ ...p, x: isl.cx + p.dx, y: isl.cy + p.dy })))
  .sort((a, b) => (a.back === b.back ? a.y - b.y : a.back ? -1 : 1))

const stars = (() => {
  let seed = 7
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  return Array.from({ length: 90 }, () => ({ x: r() * WORLD_W, y: r() * WORLD_H * 0.75, s: 1 + r() * 2.2, d: 2 + r() * 4 }))
})()

function Confetti({ burstKey, count = 28 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 460,
        y: -120 - Math.random() * 220,
        r: Math.random() * 540 - 270,
        c: ['#ce2939', '#ffffff', '#477050', '#a78bfa', '#22d3ee', '#edc240'][i % 6],
        d: Math.random() * 0.15,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [burstKey]
  )
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={`${burstKey}-${p.id}`}
          style={{ background: p.c }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 280], opacity: [1, 1, 0], rotate: p.r }}
          transition={{ duration: 1.4, delay: p.d, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

function ItemArt({ q }) {
  if (q.sprite) {
    const [w, h] = spriteSizes[q.sprite]
    const k = Math.min(160 / w, 120 / h, 1.6)
    return <img className="item-sprite" src={spriteUrl(q.sprite)} alt="" width={w * k} height={h * k} />
  }
  return <span className="item-emoji">{q.emoji}</span>
}

function QuestionCard({ q, index, picked, result, error, onPick, onNext, onClose, onRetry }) {
  const answered = !!result
  const pending = picked !== null && !result && !error
  const correct = answered && result.correct
  const region = regions[nodes[index].region]

  useEffect(() => {
    const key = (e) => {
      if (pending) return
      if (!answered) {
        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'h') onPick(true)
        if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'n') onPick(false)
        if (e.key === 'Escape') onClose()
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [answered, pending, onPick, onNext, onClose])

  return (
    <motion.div
      className="g-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && !answered && !pending && onClose()}
    >
      <motion.div
        className={`g-card q-card ${answered ? (correct ? 'is-correct' : 'is-wrong') : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="q-item"
        initial={{ y: 80, scale: 0.92, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1, x: answered && !correct ? [0, -10, 10, -6, 6, 0] : 0 }}
        exit={{ y: 60, scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26, x: { duration: 0.4 } }}
      >
        {answered && correct && <Confetti burstKey={index} />}
        <div className="q-top">
          <span className="g-chip g-chip-violet">
            Level {index + 1}
            <em>/{TOTAL}</em>
          </span>
          <span className="q-region">
            {region.emoji} {region.name}
          </span>
          {!answered && !pending && (
            <button className="g-icon-btn" onClick={onClose} aria-label="Close question">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="q-art">
          <span className="q-art-glow" />
          <motion.div
            key={index}
            initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
          >
            <ItemArt q={q} />
          </motion.div>
        </div>

        <span className="q-type">{q.type}</span>
        <h2 className="q-item" id="q-item">
          {q.item}
        </h2>

        <AnimatePresence mode="wait" initial={false}>
          {!answered ? (
            <motion.div key="ask" exit={{ opacity: 0, y: -8 }}>
              <p className="q-question">Does it have Hungarian origins?</p>
              <div className="q-btns">
                <button className={`btn btn-lg btn-hu ${pending && picked === true ? 'is-picked' : ''}`} disabled={pending} onClick={() => onPick(true)}>
                  {pending && picked === true ? <span className="auth-spinner" aria-label="Checking" /> : <span className="flag-chip" aria-hidden="true" />} Hungary
                </button>
                <button className={`btn btn-lg btn-not ${pending && picked === false ? 'is-picked' : ''}`} disabled={pending} onClick={() => onPick(false)}>
                  {pending && picked === false ? <span className="auth-spinner" aria-label="Checking" /> : <X size={20} strokeWidth={2.6} aria-hidden="true" />} Not
                </button>
              </div>
              {error && (
                <div className="q-error" role="alert">
                  {error}
                  <button type="button" onClick={onRetry}>
                    Try again
                  </button>
                </div>
              )}
              <p className="q-hint">
                <kbd>←</kbd> Hungary · <kbd>→</kbd> Not
              </p>
            </motion.div>
          ) : (
            <motion.div key="reveal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className={`q-verdict ${correct ? 'ok' : 'bad'}`}>
                <span className="q-verdict-icon">{correct ? <Star size={18} fill="currentColor" /> : <X size={18} strokeWidth={3} />}</span>
                <div>
                  <strong>{correct ? 'Correct!' : 'Not quite!'}</strong>
                  <span>{result.answer ? 'It’s Hungarian 🇭🇺' : 'Not Hungarian'}</span>
                </div>
              </div>
              <p className="q-fact">{result.fact}</p>
              <button className="btn btn-primary btn-lg g-full" onClick={onNext} autoFocus disabled={error === 'finishing'}>
                {error === 'finishing' ? <span className="auth-spinner" aria-label="Saving" /> : index + 1 < TOTAL ? 'Fly to the next stop' : 'See results'}{' '}
                {error !== 'finishing' && <span className="btn-icon"><ArrowRight size={14} /></span>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

function Intro({ onStart, best, loading, error, tournament }) {
  return (
    <motion.div className="g-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="g-card intro-card"
        initial={{ y: 60, scale: 0.94, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      >
        <motion.img
          className="intro-balloon"
          src={spriteUrl('hungarian_hot_air_balloon')}
          alt=""
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="pill-badge intro-badge">
          <span className="pill-badge-new">QUIZ</span>
          <ShinyText>20 questions · 8 regions</ShinyText>
        </span>
        <h1 className="g-title">
          Hungary <GradientText colors={['#f87171', '#ffffff', '#4ade80', '#f87171']}>or Not?</GradientText>
        </h1>
        <p className="g-text">
          Fly the balloon from the Great Plain all the way up to Buda Castle. On every stop, guess whether a food, invention, celebrity or
          tradition is <b>Hungarian</b>, or not. Get <b>{WIN_SCORE}+</b> right to win.
        </p>
        <div className="intro-regions">
          {regions.map((r) => (
            <span key={r.id}>
              <i>{r.emoji}</i>
              {r.name}
            </span>
          ))}
        </div>
        {tournament && (
          <p className="intro-tourney">
            <Medal size={16} /> Tournament attempt · <Link to={`/tournament/${tournament}`}>see standings</Link>
          </p>
        )}
        {error && (
          <p className="q-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-lg g-full" onClick={onStart} autoFocus disabled={loading}>
          {loading ? <span className="auth-spinner" aria-label="Loading" /> : tournament ? 'Start my attempt' : 'Start the journey'} {!loading && <span className="btn-icon"><Play size={12} fill="currentColor" /></span>}
        </button>
        {!tournament && <Link to="/play-together" className="btn btn-ghost g-full intro-multi">
          <Users size={17} /> Play with friends
        </Link>}
        {best > 0 && (
          <span className="intro-best">
            Your best: <b>{best}</b>/{TOTAL}
          </span>
        )}
      </motion.div>
    </motion.div>
  )
}

function XpPanel({ outcome }) {
  const { user, openAuth } = useApp()
  if (!outcome.saved) {
    return (
      <div className="xp-panel xp-guest">
        <span>
          <Star size={26} fill="currentColor" />
        </span>
        <div>
          <b>Save your progress</b>
          <small>Log in to earn XP, level up and unlock achievements.</small>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => openAuth(user ? 'login' : 'register')}>
          Sign up
        </button>
      </div>
    )
  }
  const p = levelProgress(outcome.xp_total || 0)
  const before = levelProgress((outcome.xp_total || 0) - (outcome.xp_earned || 0))
  const leveled = outcome.level_after > outcome.level_before
  const tier = tierFor(p.level)
  return (
    <div className={`xp-panel ${leveled ? 'is-levelup' : ''}`}>
      <div className="xp-top">
        <motion.span className="xp-gain" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 14 }}>
          +{outcome.xp_earned} XP
        </motion.span>
        <span className="xp-level" style={{ '--tier': tier.color }}>
          {tier.emoji} Lv {p.level} · {tier.title}
        </span>
      </div>
      <div className="xp-bar" aria-label={`${p.into} of ${p.need} XP to level ${p.level + 1}`}>
        <motion.span initial={{ width: `${leveled ? 0 : before.pct}%` }} animate={{ width: `${p.pct}%` }} transition={{ delay: 0.7, duration: 1.1, ease: 'easeOut' }} />
      </div>
      <small className="xp-next">{p.toNext} XP to level {p.level + 1}</small>
      {leveled && (
        <motion.div className="xp-levelup" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.2 }}>
          <PartyPopper size={18} className="ico" /> Level up! You reached level {outcome.level_after}
        </motion.div>
      )}
      {outcome.new_achievements?.length > 0 && (
        <div className="xp-ach">
          {outcome.new_achievements.map((id) => {
            const a = achievementById(id)
            return a ? (
              <span key={id} className="xp-ach-chip" style={{ '--tier': tiersStyle[a.tier].color }} title={a.desc}>
                {a.emoji} {a.name}
              </span>
            ) : null
          })}
        </div>
      )}
    </div>
  )
}

function Results({ round, results, outcome, prevBest, onReplay, tournament }) {
  const score = outcome.correct
  const won = outcome.won
  const rank = [...ranks].reverse().find((r) => score >= r.min)
  const stars = score >= 19 ? 3 : score >= 16 ? 2 : won ? 1 : 0
  const [copied, setCopied] = useState(false)
  const [showList, setShowList] = useState(false)

  const share = async () => {
    const text = `I scored ${score}/${TOTAL} on "Hungary or Not?" 🇭🇺 (${rank.title}). Can you beat me?`
    try {
      if (navigator.share) await navigator.share({ title: 'Hungary or Not?', text, url: window.location.href })
      else {
        await navigator.clipboard.writeText(`${text} ${window.location.href}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <motion.div className="g-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div
        className={`g-card results-card ${won ? 'is-win' : 'is-lose'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="res-title"
        initial={{ y: 80, scale: 0.88, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      >
        {won && (
          <div className="results-aurora" aria-hidden="true">
            <Aurora colors={['#edc240', '#7c3aed', '#22d3ee']} speed={0.9} />
          </div>
        )}
        {won && <Confetti burstKey="win" count={40} />}

        <motion.div
          className="results-trophy"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.15 }}
          aria-hidden="true"
        >
          {won ? <Trophy size={64} /> : <Target size={64} />}
        </motion.div>

        <h2 className="results-title" id="res-title">
          {won ? <GradientText colors={['#edc240', '#ffffff', '#f59e0b', '#edc240']}>You win!</GradientText> : 'So close!'}
        </h2>
        <p className="results-sub">{won ? 'You made it to Buda Castle like a true local.' : `You need ${WIN_SCORE} correct answers to win. Give it another go!`}</p>

        <div className="results-stars">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className={i < stars ? 'on' : ''}
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.35 + i * 0.18, type: 'spring', stiffness: 300, damping: 12 }}
            >
              <Star size={34} fill="currentColor" />
            </motion.span>
          ))}
        </div>

        <div className="results-score">
          <CountUp to={score} duration={1} />
          <em>/{TOTAL}</em>
        </div>
        <div className="results-rank">
          {rank.emoji} {rank.title}
          {score > prevBest && <span className="results-new">New best!</span>}
        </div>

        <XpPanel outcome={outcome} />

        <div className="results-actions">
          {tournament && (
            <Link className="btn btn-lg btn-primary g-full" to={`/tournament/${tournament.code}`}>
              <Medal size={18} /> See tournament standings
            </Link>
          )}
          {won && !tournament && (
            <a className="btn btn-lg btn-prize g-full" href={getSettings().prize?.url || 'https://fortunejack.com'} target="_blank" rel="noopener noreferrer">
              <span className="btn-prize-shine" aria-hidden="true" />
              <Gift size={18} /> {getSettings().prize?.label || 'Claim the Prize'}
            </a>
          )}
          <div className="results-row">
            <button className={`btn btn-lg ${won || tournament ? 'btn-ghost' : 'btn-primary'}`} onClick={onReplay}>
              <RotateCcw size={17} /> Play again
            </button>
            <button className="btn btn-lg btn-ghost" onClick={share}>
              {copied ? (
                <>
                  <Check size={17} /> Copied
                </>
              ) : (
                <>
                  <Share2 size={17} /> Share score
                </>
              )}
            </button>
          </div>
        </div>

        <button className="results-toggle" onClick={() => setShowList((v) => !v)} aria-expanded={showList}>
          {showList ? 'Hide' : 'See'} your answers {showList ? '▴' : '▾'}
        </button>
        <AnimatePresence>
          {showList && (
            <motion.ul className="results-list" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              {round.map((q, i) => {
                const r = results[i]
                const ok = !!r?.correct
                return (
                  <li key={q.item} className={ok ? 'ok' : 'bad'}>
                    <span className="rl-icon">{ok ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}</span>
                    <span className="rl-item">{q.item}</span>
                    <span className="rl-ans">{r?.answer ? '🇭🇺 Hungarian' : 'Not Hungarian'}</span>
                  </li>
                )
              })}
            </motion.ul>
          )}
        </AnimatePresence>

        <div className="results-foot">
          <Link to="/#games">
            <ArrowLeft size={15} className="ico" /> All games
          </Link>
          <a className="powered" href="https://fortunejack.com" target="_blank" rel="noopener noreferrer">
            <span>Powered by</span>
            <img src="/brand/fortunejack.svg" alt="FortuneJack" />
          </a>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function HungaryOrNot() {
  const [searchParams] = useSearchParams()
  const tcode = searchParams.get('t')
  const s = useWorldScale()
  const scroller = useRef(null)
  const { reloadUser } = useApp()
  const announce = useAnnounce()
  const [game, setGame] = useState(null) // server/local round from playService
  const round = game?.questions || []
  const [phase, setPhase] = useState('intro') // intro | map | question | done
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState(() => Array(TOTAL).fill(null)) // player's choices
  const [results, setResults] = useState(() => Array(TOTAL).fill(null)) // server verdicts
  const [qError, setQError] = useState('')
  const [loading, setLoading] = useState(false)
  const [startError, setStartError] = useState('')
  const [outcome, setOutcome] = useState(null)
  const [flying, setFlying] = useState(false)
  const [banner, setBanner] = useState(null)
  const [best, setBest] = useState(readBest)
  const [prevBest, setPrevBest] = useState(best)
  const timers = useRef([])

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const score = results.filter((r) => r?.correct).length
  const answeredCount = results.filter(Boolean).length
  const streak = useMemo(() => {
    let n = 0
    for (let i = current - (results[current] ? 0 : 1); i >= 0; i--) {
      if (results[i]?.correct) n++
      else break
    }
    return n
  }, [results, current])

  const focusNode = useCallback(
    (i, smooth = true) => {
      const el = scroller.current
      if (!el) return
      const n = nodes[Math.min(i, TOTAL - 1)]
      const wrapW = Math.max(el.clientWidth, W * s)
      const offX = (wrapW - W * s) / 2
      el.scrollTo({
        left: offX + n.x * s - el.clientWidth / 2,
        top: n.y * s - el.clientHeight * 0.58,
        behavior: smooth ? 'smooth' : 'auto',
      })
    },
    [s]
  )

  useLayoutEffect(() => {
    focusNode(current, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s])

  const showBanner = (r) => {
    setBanner(r)
    later(() => setBanner(null), 2400)
  }

  const newRound = async () => {
    setLoading(true)
    setStartError('')
    try {
      const g = await startRound('hungary-or-not', { count: TOTAL, localPick: tcode ? undefined : pickRound, tournament: tcode })
      setGame(g)
      setAnswers(Array(TOTAL).fill(null))
      setResults(Array(TOTAL).fill(null))
      setOutcome(null)
      setQError('')
      return true
    } catch (e) {
      setStartError(e.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  const begin = async () => {
    if (!(await newRound())) return
    setPhase('map')
    showBanner(0)
    focusNode(0)
    later(() => setPhase('question'), 900)
  }

  const send = useCallback(
    async (val) => {
      setQError('')
      try {
        const r = await submitAnswer(game, current, val)
        setResults((rs) => {
          const next = [...rs]
          next[current] = r
          return next
        })
      } catch (e) {
        setQError(e.message)
      }
    },
    [game, current]
  )

  const pick = useCallback(
    (val) => {
      if (answers[current] !== null) return
      setAnswers((a) => {
        const next = [...a]
        next[current] = val
        return next
      })
      send(val)
    },
    [answers, current, send]
  )

  const next = useCallback(() => {
    if (current + 1 >= TOTAL) {
      setQError('finishing')
      finishRound(game)
        .then((out) => {
          setQError('')
          setOutcome(out)
          setPrevBest(best)
          if (out.correct > best) {
            saveBest(out.correct)
            setBest(out.correct)
          }
          setPhase('done')
          if (out.saved) {
            reloadUser()
            announce(out.new_achievements || [])
          }
        })
        .catch((e) => setQError(e.message))
      return
    }
    const to = current + 1
    setPhase('map')
    setFlying(true)
    setCurrent(to)
    focusNode(to)
    if (nodes[to].region !== nodes[current].region) later(() => showBanner(nodes[to].region), 300)
    later(() => {
      setFlying(false)
      setPhase('question')
    }, FLIGHT_MS + 250)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, best, game, focusNode])

  const replay = async () => {
    timers.current.forEach(clearTimeout)
    if (!(await newRound())) {
      setPhase('intro')
      return
    }
    setCurrent(0)
    setFlying(false)
    setPhase('map')
    focusNode(0)
    showBanner(0)
    later(() => setPhase('question'), 1100)
  }

  const nodeState = (i) => {
    if (results[i]) return results[i].correct ? 'ok' : 'bad'
    if (i === current) return 'current'
    return 'locked'
  }

  const balloon = nodes[Math.min(current, TOTAL - 1)]
  // Keep discs & balloon a comfortable on-screen size whatever the map scale
  const ui = MODE === 'image' ? (s >= 0.9 ? 60 : 40) / (74 * s) : 1
  const region = regions[balloon.region]

  return (
    <div className="hon">
      {/* Floating menu (matches the site nav) */}
      <header className="g-nav-wrap">
        <nav className="nav nav--scrolled g-nav" aria-label="Game">
          <Link to="/" className="nav-logo">
            <span className="nav-logo-mark">Q</span>
            <span className="nav-logo-text">QuizBit</span>
          </Link>
          <div className="g-nav-title">
            <span className="flag-chip" aria-hidden="true" />
            <div>
              <b>Hungary or Not?</b>
              <small>
                {region.emoji} {region.name}
              </small>
            </div>
          </div>
          <div className="g-nav-stats">
            <span className="g-stat" title="Correct answers">
              <Star size={16} fill="currentColor" className="g-star" /> {score}
            </span>
            <AnimatePresence>
              {streak >= 2 && (
                <motion.span className="g-stat g-stat-streak" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} title="Streak">
                  <Flame size={15} className="ico" /> {streak}
                </motion.span>
              )}
            </AnimatePresence>
            <span className="g-stat g-stat-lvl" title="Progress">
              {Math.min(current + 1, TOTAL)}/{TOTAL}
            </span>
            <Link to="/#games" className="g-exit" aria-label="Exit to all games">
              <X size={18} />
            </Link>
          </div>
          <span className="g-nav-progress" aria-hidden="true">
            <motion.span animate={{ width: `${(answeredCount / TOTAL) * 100}%` }} />
          </span>
        </nav>
      </header>

      {/* Map */}
      <div className="hon-scroller" ref={scroller}>
        <div className={`hon-sky ${MODE === 'image' ? 'is-image' : ''}`} style={{ width: `max(100%, ${W * s}px)`, height: H * s }}>
          <div className="hon-world" style={{ width: W, height: H, transform: `translateX(-50%) scale(${s})`, '--ui': ui }}>
            {MODE === 'image' ? (
              <img className="map-img" src={MAP_IMAGE.src} width={W} height={H} alt="Illustrated map of Hungary's regions" draggable="false" />
            ) : (
              <>
                {stars.map((st, i) => (
                  <span key={i} className="star" style={{ left: st.x, top: st.y, width: st.s, height: st.s }} />
                ))}
                <span className="moon" style={{ left: 40, top: 1240 }} />
                {sky.clouds.map((c, i) => (
                  <Sprite key={i} n="cloud_b_clean" x={c.x} y={c.y} s={c.s} flip={i % 2 === 1} anchor="top" className="cloud-static" />
                ))}
                {sky.balloons.map((b, i) => (
                  <Sprite key={i} n="hungarian_hot_air_balloon" x={b.x} y={b.y} s={b.s} />
                ))}
                <Terrain />
                {worldProps.map((p, i) => (
                  <Sprite key={i} n={p.n} x={p.x} y={p.y} s={p.s} flip={p.flip} />
                ))}
              </>
            )}

            {/* Level discs */}
            {nodes.map((n, i) => {
              const st = nodeState(i)
              const clickable = st === 'current' && phase === 'map' && !flying
              return (
                <button
                  key={i}
                  className={`disc disc-${st} ${i === TOTAL - 1 ? 'disc-final' : ''}`}
                  style={{ left: n.x, top: n.y }}
                  onClick={() => clickable && setPhase('question')}
                  disabled={!clickable}
                  aria-label={`Level ${i + 1}${st === 'ok' ? ', correct' : st === 'bad' ? ', wrong' : st === 'locked' ? ', locked' : ''}`}
                >
                  <span className="disc-face">{st === 'ok' ? <Star size={20} fill="currentColor" /> : st === 'bad' ? <X size={20} strokeWidth={3} /> : i === TOTAL - 1 && st === 'locked' ? <Trophy size={20} /> : i + 1}</span>
                </button>
              )
            })}

            {/* Player balloon */}
            <motion.div
              className="balloon"
              initial={false}
              animate={{ left: balloon.x, top: balloon.y - 30 * ui }}
              transition={{ duration: FLIGHT_MS / 1000, ease: [0.45, 0, 0.2, 1] }}
            >
              <motion.div animate={flying ? { rotate: [0, -6, 4, 0], scale: [1, 1.12, 1] } : { rotate: 0, scale: 1 }} transition={{ duration: FLIGHT_MS / 1000 }}>
                <img src={spriteUrl('hungarian_hot_air_balloon')} alt="You" className="balloon-img" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {banner !== null && (
          <motion.div
            className="region-banner"
            initial={{ y: -24, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <span className="rb-emoji">{regions[banner].emoji}</span>
            <div>
              <small>
                Region {banner + 1} of {regions.length}
              </small>
              <strong>{regions[banner].name}</strong>
              <em>{regions[banner].subtitle}</em>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'map' && !flying && answers[current] === null && (
        <motion.button className="tap-hint btn btn-primary btn-lg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={() => setPhase('question')}>
          Play level {current + 1} <span className="btn-icon"><Play size={12} fill="currentColor" /></span>
        </motion.button>
      )}

      <AnimatePresence>
        {phase === 'intro' && <Intro key="intro" onStart={begin} best={best} loading={loading} error={startError} tournament={tcode} />}
        {phase === 'question' && round[current] && (
          <QuestionCard
            key={`q${current}`}
            q={round[current]}
            index={current}
            picked={answers[current]}
            result={results[current]}
            error={qError}
            onPick={pick}
            onNext={next}
            onRetry={() => (qError === 'finishing' || results[current] ? next() : send(answers[current]))}
            onClose={() => setPhase('map')}
          />
        )}
      </AnimatePresence>
      {phase === 'done' && outcome && <Results round={round} results={results} outcome={outcome} prevBest={prevBest} onReplay={replay} tournament={game?.tournament} />}
    </div>
  )
}
