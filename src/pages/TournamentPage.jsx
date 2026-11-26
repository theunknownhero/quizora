// One tournament: /tournament/:code. Countdown, prizes, rules, your attempts and the standings.
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { Clock, Users, Gift, Play, Share2, Trophy, Lock, Loader2, ArrowLeft, Medal, ScrollText, Target, Timer, Crown, SearchX, Check, Hourglass } from 'lucide-react'
import Navbar from '../components/Navbar.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import PlayerAvatar from '../components/PlayerAvatar.jsx'
import { useApp } from '../state/AppState.jsx'
import * as compete from '../state/compete.js'
import { games } from '../data/games.js'
import { KindBadge, KIND, useTick } from './Tournaments.jsx'
import './profile.css'
import './social.css'
import './party.css'
import './compete.css'

const gameBySlug = (s) => games.find((g) => g.slug === s)

export default function TournamentPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user, openAuth, pushToast } = useApp()
  const [t, setT] = useState(undefined)
  const [offset, setOffset] = useState(0)
  const [busy, setBusy] = useState(false)
  const now = useTick(1000)

  const load = useCallback(
    () =>
      compete
        .getTournament(code)
        .then((d) => {
          setOffset(new Date(d.now).getTime() - Date.now())
          setT(d)
        })
        .catch(() => setT(null)),
    [code]
  )
  useEffect(() => {
    window.scrollTo(0, 0)
    load()
    const i = setInterval(load, 20000)
    return () => clearInterval(i)
  }, [load, user?.id])

  if (t === undefined || t === null) {
    return (
      <>
        <Navbar />
        <main className="placeholder">
          <div className="placeholder-card">
            <span className="placeholder-emoji">{t === undefined ? <Loader2 size={56} className="spin" /> : <SearchX size={56} />}</span>
            <h1>{t === undefined ? 'Loading…' : 'Tournament not found'}</h1>
            {t === null && (
              <Link to="/tournaments" className="btn btn-primary btn-lg">
                All tournaments
              </Link>
            )}
          </div>
        </main>
      </>
    )
  }

  const g = gameBySlug(t.game_slug)
  const n = now + offset
  const start = new Date(t.starts_at).getTime()
  const end = new Date(t.ends_at).getTime()
  const state = n < start ? 'upcoming' : n < end ? 'live' : t.finalized ? 'final' : 'closing'
  const left = Math.max(0, t.max_attempts - (t.attempts_used || 0))
  const levelOk = !user || (t.my_level || 1) >= t.min_level
  const pct = state === 'live' ? Math.min(100, ((n - start) / (end - start)) * 100) : state === 'upcoming' ? 0 : 100

  const play = async () => {
    if (!user) return openAuth('login')
    setBusy(true)
    try {
      await compete.joinTournament(t.code)
      navigate(`/play/${t.game_slug}?t=${t.code}`)
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Tournament', text: e.message })
    } finally {
      setBusy(false)
    }
  }
  const join = async () => {
    if (!user) return openAuth('login')
    setBusy(true)
    try {
      await compete.joinTournament(t.code)
      await load()
      pushToast({ emoji: '✅', title: 'You’re in', text: 'We’ll see you on the leaderboard!' })
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Tournament', text: e.message })
    } finally {
      setBusy(false)
    }
  }
  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: t.title, text: `Join "${t.title}" on QuizBit`, url })
      else {
        await navigator.clipboard.writeText(url)
        pushToast({ emoji: '🔗', title: 'Link copied', text: 'Send it to your friends!' })
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <>
      <Navbar />
      <main className={`profile tn-detail ${KIND[t.kind].cls}`}>
        <section className="tn-hero">
          <div className="tn-hero-glow" aria-hidden="true" />
          <div className="container">
            <Link to="/tournaments" className="link-btn">
              <ArrowLeft size={14} className="ico" /> All tournaments
            </Link>
            <div className="tn-hero-in">
              <div className="tn-hero-main">
                <KindBadge kind={t.kind} />
                <h1>{t.title}</h1>
                {t.description && <p className="muted">{t.description}</p>}
                <div className="tn-facts">
                  <span>
                    {g?.emoji} {g?.title}
                  </span>
                  <span>
                    <Target size={13} /> {t.question_count} questions
                  </span>
                  <span>
                    {t.max_attempts} {t.max_attempts === 1 ? 'attempt' : 'attempts'}
                  </span>
                  {t.min_level > 1 && <span>Level {t.min_level}+</span>}
                  <span>
                    <Users size={13} /> {t.players} {t.players === 1 ? 'player' : 'players'}
                  </span>
                  {t.creator && <span>by {t.creator}</span>}
                </div>
              </div>
              <motion.div className="pf-card tn-status" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <small>{state === 'upcoming' ? 'Starts in' : state === 'live' ? 'Ends in' : state === 'closing' ? 'Final results in' : 'Finished'}</small>
                <b className="tn-count">
                  {state === 'upcoming'
                    ? compete.fmtLeft(start - n)
                    : state === 'live'
                      ? compete.fmtLeft(end - n)
                      : state === 'closing'
                        ? compete.fmtLeft(end + 15 * 60000 - n)
                        : new Date(t.ends_at).toLocaleDateString()}
                </b>
                <div className="tn-bar">
                  <span style={{ width: `${pct}%` }} />
                </div>
                {state === 'live' && (
                  <>
                    {!levelOk ? (
                      <p className="tn-note">
                        <Lock size={14} /> Reach level {t.min_level} to enter (you’re level {t.my_level}).
                      </p>
                    ) : left > 0 ? (
                      <button type="button" className="btn btn-primary btn-lg tn-play" onClick={play} disabled={busy}>
                        {busy ? <Loader2 size={18} className="spin" /> : <Play size={18} fill="currentColor" />} {t.attempts_used ? 'Play again' : 'Play now'}
                      </button>
                    ) : (
                      <p className="tn-note">
                        <Check size={14} /> You’ve used all your attempts. Good luck!
                      </p>
                    )}
                    {user && (
                      <p className="tn-attempts">
                        {Array.from({ length: t.max_attempts }).map((_, i) => (
                          <i key={i} className={i < (t.attempts_used || 0) ? 'used' : ''} />
                        ))}
                        {left} of {t.max_attempts} {t.max_attempts === 1 ? 'attempt' : 'attempts'} left
                      </p>
                    )}
                  </>
                )}
                {state === 'upcoming' && levelOk && (
                  <button type="button" className="btn btn-primary btn-lg tn-play" onClick={join} disabled={busy || t.joined}>
                    {t.joined ? <><Check size={18} /> You’re in</> : <><Medal size={18} /> Join now</>}
                  </button>
                )}
                {state === 'closing' && (
                  <p className="tn-note">
                    <Hourglass size={14} /> Rounds in progress can still finish. Results and rewards come next.
                  </p>
                )}
                {t.me && (
                  <div className="tn-me">
                    <span>
                      Your rank <b>#{t.me.rank}</b>
                    </span>
                    <span>
                      Best <b>{t.me.correct}/{t.question_count}</b> in {compete.fmtSecs(t.me.seconds)}
                    </span>
                    {t.me.prize && (
                      <span className="tn-won">
                        <Gift size={14} /> {t.me.prize}
                        {t.me.external_prize && <em> · we’ll email you about your prize</em>}
                      </span>
                    )}
                  </div>
                )}
                <button type="button" className="soc-btn is-ghost tn-share" onClick={share}>
                  <Share2 size={15} /> Share
                </button>
              </motion.div>
            </div>
          </div>
        </section>

        <div className="container tn-body">
          <section className="pf-card tn-board">
            <div className="pf-card-head">
              <h3>
                <Trophy size={17} className="ico" /> {state === 'final' ? 'Final standings' : 'Live standings'}
              </h3>
              <small className="muted">Best attempt counts · correct answers first, then speed</small>
            </div>
            {t.board.length ? (
              <ol className="lb-list">
                {t.board.map((r) => (
                  <li key={r.id} className={user?.id === r.id ? 'is-me' : ''}>
                    <span className={`lb-rank lb-rank-${r.rank <= 3 ? r.rank : 'n'}`}>{r.rank}</span>
                    <Link to={`/u/${r.username}`} className="soc-who">
                      <PlayerAvatar username={r.username} level={r.level} size={38} />
                      <span className="soc-name">
                        <b>
                          {r.rank === 1 && state === 'final' && <Crown size={13} className="rm-crown" />} {r.username}
                        </b>
                        <small>
                          {r.correct}/{t.question_count} correct · <Timer size={11} className="ico" /> {compete.fmtSecs(r.seconds)}
                          {r.prize ? ` · ${r.prize}` : ''}
                        </small>
                      </span>
                    </Link>
                    <b className="lb-xp">{r.score.toLocaleString()}</b>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="pf-empty">
                <span>
                  <Medal size={36} />
                </span>
                <p>{state === 'upcoming' ? 'The standings open when the tournament starts.' : 'No finished attempts yet. Be the first on the board!'}</p>
              </div>
            )}
          </section>

          <aside className="tn-side">
            {t.prizes?.length > 0 && (
              <section className="pf-card">
                <h3>
                  <Gift size={17} className="ico" /> Prizes
                </h3>
                <ul className="tn-prizes">
                  {t.prizes.map((p) => (
                    <li key={`${p.from}-${p.to}`}>
                      <span className={`tn-place tn-place-${p.from}`}>{p.from === p.to ? `#${p.from}` : `#${p.from}–${p.to}`}</span>
                      <span>{p.label}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {t.kind === 'community' && (
              <section className="pf-card">
                <h3>
                  <Medal size={17} className="ico" /> Points only
                </h3>
                <p className="muted small">Community tournaments are for glory: the winner tops the board and earns the tournament badges.</p>
              </section>
            )}
            <section className="pf-card">
              <h3>
                <ScrollText size={17} className="ico" /> Rules
              </h3>
              <ul className="tn-rules">
                <li>
                  Each attempt is {t.question_count} questions. Your best attempt counts.
                </li>
                <li>Score = 1,000 per correct answer, plus up to 900 for speed.</li>
                <li>
                  <Clock size={12} className="ico" /> Attempts must start before the tournament ends. Results are final 15 minutes later.
                </li>
                {t.terms && <li>{t.terms}</li>}
              </ul>
            </section>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
