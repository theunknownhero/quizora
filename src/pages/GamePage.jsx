// /play/:slug — plays any live quiz from the admin panel with the generic player
// (server-scored, XP, achievements and tournament attempts). "Coming soon" quizzes show a placeholder.
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Check, X, Play, Loader2, RotateCcw, Trophy, Target, Gift, Medal, Sparkles, Share2, Users, ArrowRight } from 'lucide-react'
import Navbar from '../components/Navbar.jsx'
import { useApp } from '../state/AppState.jsx'
import { useAnnounce } from '../components/Toaster.jsx'
import { startRound, submitAnswer, finishRound } from '../state/playService.js'
import { games } from '../data/games.js'
import { getSettings } from '../lib/siteConfig.js'
import { levelProgress } from '../lib/levels.js'
import { playableBy } from '../lib/age.js'
import QuestionInput, { QuestionHeader, answerText } from '../components/QuestionInput.jsx'
import './profile.css'
import './party.css'
import './game-page.css'

function Placeholder({ g }) {
  return (
    <>
      <Navbar />
      <main className="placeholder">
        <motion.div className="placeholder-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <span className="placeholder-emoji">{g?.emoji ?? '🎲'}</span>
          <h1>{g?.title ?? 'Game not found'}</h1>
          <p>{g ? 'This quiz is being built. Check back soon!' : 'We could not find that game.'}</p>
          <Link to="/" className="btn btn-primary btn-lg">
            <ArrowLeft size={16} /> Back to games
          </Link>
        </motion.div>
      </main>
    </>
  )
}

export default function GamePage() {
  const { slug } = useParams()
  const g = games.find((x) => x.slug === slug)
  if (!g || g.status !== 'live') return <Placeholder g={g} />
  return <GenericQuiz g={g} />
}

function GenericQuiz({ g }) {
  const { user, openAuth, reloadUser, openAgeCheck } = useApp()
  const announce = useAnnounce()
  const [params] = useSearchParams()
  const tcode = params.get('t')
  const [phase, setPhase] = useState('intro') // intro | question | done
  const [round, setRound] = useState(null)
  const [i, setI] = useState(0)
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [outcome, setOutcome] = useState(null)
  const [streak, setStreak] = useState(0)
  const yes = g.yesLabel || 'True'
  const no = g.noLabel || 'False'
  const total = round?.questions.length || g.questions
  const q = round?.questions[i]
  const res = results[i]
  const correct = results.filter((r) => r?.correct).length
  const winAt = Math.ceil(total * 0.7)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const begin = async () => {
    if (!playableBy(g, user)) return user ? openAgeCheck() : openAuth('login')
    setBusy(true)
    setError('')
    try {
      const r = await startRound(g.slug, { count: g.questions, tournament: tcode })
      setRound(r)
      setResults([])
      setI(0)
      setStreak(0)
      setOutcome(null)
      setPhase('question')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const pick = useCallback(
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
        setStreak((s) => (r.correct ? s + 1 : 0))
      } catch (e) {
        setError(e.message)
      } finally {
        setBusy(false)
      }
    },
    [round, results, i, busy]
  )

  const next = async () => {
    if (i + 1 < total) return setI(i + 1)
    setBusy(true)
    try {
      const o = await finishRound(round)
      setOutcome(o)
      setPhase('done')
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

  // Enter goes to the next question
  useEffect(() => {
    if (phase !== 'question') return
    const onKey = (e) => {
      if (res && e.key === 'Enter') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const bg = { '--g1': g.gradient[0], '--g2': g.gradient[1] }

  return (
    <>
      <Navbar />
      <main className="profile gp-page" style={bg}>
        <div className="gp-bg" aria-hidden="true" />
        <div className="container gp-wrap">
          <Link to="/#games" className="link-btn gp-back">
            <ArrowLeft size={14} className="ico" /> All games
          </Link>

          <AnimatePresence mode="wait">
            {phase === 'intro' && (
              <motion.section key="intro" className="rm-stage gp-intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <span className="gp-emoji">{g.emoji}</span>
                {tcode && (
                  <p className="intro-tourney">
                    <Medal size={16} /> Tournament attempt · <Link to={`/tournament/${tcode}`}>see standings</Link>
                  </p>
                )}
                <h1>{g.title}</h1>
                <p className="muted gp-tag">{g.tagline}</p>
                <div className="tn-facts">
                  <span>{total} questions</span>
                  <span>~{g.minutes} min</span>
                  <span>{g.difficulty}</span>
                  <span>Win with {winAt}+ correct</span>
                </div>
                {error && <p className="q-error">{error}</p>}
                <button type="button" className="btn btn-primary btn-lg gp-start" onClick={begin} disabled={busy}>
                  {busy ? <Loader2 size={18} className="spin" /> : <Play size={18} fill="currentColor" />} {tcode ? 'Start my attempt' : 'Start quiz'}
                </button>
                {!tcode && (
                  <Link to="/play-together" className="btn btn-ghost gp-start">
                    <Users size={17} /> Play with friends
                  </Link>
                )}
                {!user && <p className="muted small">Playing as a guest. <button type="button" className="link-btn" onClick={() => openAuth('register')}>Sign up</button> to earn XP.</p>}
              </motion.section>
            )}

            {phase === 'question' && q && (
              <motion.section key={`q${i}`} className="rm-stage gp-q" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <div className="rm-progress">
                  <span>
                    Question {i + 1} of {total}
                  </span>
                  <span className="gp-score">
                    <Check size={14} /> {correct}
                    {streak >= 3 && <em> · {streak} in a row</em>}
                  </span>
                </div>
                <div className="rm-timebar">
                  <span style={{ width: `${((i + (res ? 1 : 0)) / total) * 100}%` }} />
                </div>
                <div className="rm-q">
                  <QuestionHeader q={q} prompt={g.prompt || 'True or false?'} />
                  <QuestionInput q={q} yes={yes} no={no} pending={busy && !res} picked={res?.choice} result={res} onSubmit={pick} />
                  {res ? (
                    <motion.div className={`gp-verdict ${res.correct ? 'ok' : 'bad'}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <b>
                        {res.correct ? <Check size={18} /> : <X size={18} />} {res.correct ? 'Correct!' : `Answer: ${answerText(q, res, yes, no)}`}
                      </b>
                      {res.fact && <p>{res.fact}</p>}
                      <button type="button" className="btn btn-primary" onClick={next} disabled={busy} autoFocus>
                        {busy ? <Loader2 size={16} className="spin" /> : null} {i + 1 < total ? 'Next' : 'See results'} <ArrowRight size={16} />
                      </button>
                    </motion.div>
                  ) : (
                    (q.kind || 'truefalse') === 'truefalse' && (
                      <p className="rm-after muted small">
                        <kbd>←</kbd> {yes} · <kbd>→</kbd> {no}
                      </p>
                    )
                  )}
                  {error && <p className="q-error">{error}</p>}
                </div>
              </motion.section>
            )}

            {phase === 'done' && outcome && (
              <Results key="done" g={g} outcome={outcome} results={results} round={round} tcode={tcode} onReplay={begin} />
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  )
}

function Results({ g, outcome, results, round, tcode, onReplay }) {
  const { user, openAuth } = useApp()
  const [copied, setCopied] = useState(false)
  const won = outcome.won
  const prize = getSettings().prize || {}
  const lp = user ? levelProgress(user.xp) : null
  const share = async () => {
    const text = `I scored ${outcome.correct}/${outcome.total} on ${g.title} at Quizora!`
    try {
      if (navigator.share) await navigator.share({ title: g.title, text, url: window.location.origin + `/play/${g.slug}` })
      else {
        await navigator.clipboard.writeText(`${text} ${window.location.origin}/play/${g.slug}`)
        setCopied(true)
      }
    } catch {
      /* cancelled */
    }
  }
  return (
    <motion.section className="rm-stage gp-done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
      <span className="rm-res-ico">{won ? <Trophy size={44} /> : <Target size={44} />}</span>
      <h1>{won ? 'You won!' : 'Nice try!'}</h1>
      <p className="gp-big">
        {outcome.correct}
        <em>/{outcome.total}</em>
      </p>
      {outcome.saved ? (
        <div className="gp-xp">
          <span className="rm-xp">+{outcome.xp_earned} XP</span>
          {outcome.level_after > outcome.level_before && (
            <span className="gp-lvl">
              <Sparkles size={15} /> Level up! Level {outcome.level_after}
            </span>
          )}
          {lp && (
            <div className="xp-bar">
              <span style={{ width: `${lp.pct}%` }} />
            </div>
          )}
        </div>
      ) : (
        <p className="muted small">
          <button type="button" className="link-btn" onClick={() => openAuth('register')}>
            Sign up
          </button>{' '}
          to save this score and earn XP.
        </p>
      )}
      <div className="gp-actions">
        {tcode && (
          <Link className="btn btn-primary btn-lg" to={`/tournament/${tcode}`}>
            <Medal size={18} /> Tournament standings
          </Link>
        )}
        {won && !tcode && prize.url && (
          <a className="btn btn-lg btn-prize" href={prize.url} target="_blank" rel="noopener noreferrer">
            <Gift size={18} /> {prize.label || 'Claim the Prize'}
          </a>
        )}
        <button type="button" className="btn btn-ghost btn-lg" onClick={onReplay}>
          <RotateCcw size={17} /> Play again
        </button>
        <button type="button" className="btn btn-ghost btn-lg" onClick={share}>
          {copied ? <Check size={17} /> : <Share2 size={17} />} {copied ? 'Copied' : 'Share'}
        </button>
      </div>
      <ol className="gp-review">
        {round.questions.map((q, i) => (
          <li key={q.id} className={results[i]?.correct ? 'ok' : 'bad'}>
            <span className="rl-icon">{results[i]?.correct ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}</span>
            <span className="gp-r-item">
              {q.emoji} {q.item}
            </span>
            <span className="gp-r-ans">{answerText(q, results[i], g.yesLabel || 'True', g.noLabel || 'False')}</span>
          </li>
        ))}
      </ol>
    </motion.section>
  )
}
