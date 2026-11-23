// Tournaments hub: today's daily, the weekly masters, community tournaments, upcoming and recent results.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Medal, CalendarDays, Flame, Users, Plus, Clock, Trophy, Gift, X, Loader2, Globe, Lock, Crown, Sparkles, ChevronRight } from 'lucide-react'
import Navbar from '../components/Navbar.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import Aurora from '../components/Aurora.jsx'
import { useApp } from '../state/AppState.jsx'
import * as compete from '../state/compete.js'
import { games } from '../data/games.js'
import { levelForXp } from '../lib/levels.js'
import { GameSelect } from './PlayTogether.jsx'
import './profile.css'
import './social.css'
import './party.css'
import './compete.css'

const AURORA = ['#f59e0b', '#ef4444', '#8b5cf6']
const gameBySlug = (s) => games.find((g) => g.slug === s)
export const KIND = {
  daily: { label: 'Daily', icon: CalendarDays, cls: 'is-daily' },
  weekly: { label: 'Weekly · Hard', icon: Flame, cls: 'is-weekly' },
  community: { label: 'Community', icon: Users, cls: 'is-community' },
}

export function useTick(ms = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

export function KindBadge({ kind }) {
  const k = KIND[kind]
  return (
    <span className={`tn-kind ${k.cls}`}>
      <k.icon size={13} /> {k.label}
    </span>
  )
}

function OfficialCard({ t, now, offset }) {
  const g = gameBySlug(t.game_slug)
  const left = new Date(t.ends_at).getTime() - (now + offset)
  const top = t.prizes?.[0]
  return (
    <motion.article className={`tn-official ${KIND[t.kind].cls}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="tn-official-glow" aria-hidden="true" />
      <header>
        <KindBadge kind={t.kind} />
        <span className="tn-time">
          <Clock size={14} /> Ends in {compete.fmtLeft(left)}
        </span>
      </header>
      <h2>{t.title}</h2>
      <p className="muted">{t.description}</p>
      <div className="tn-facts">
        <span>
          {g?.emoji} {g?.title}
        </span>
        <span>
          {t.max_attempts} {t.max_attempts === 1 ? 'attempt' : 'attempts'}
        </span>
        {t.min_level > 1 && <span>Level {t.min_level}+</span>}
        <span>
          <Users size={13} /> {t.players}
        </span>
      </div>
      {top && (
        <div className="tn-prize">
          <Gift size={18} />
          <div>
            <small>1st place</small>
            <b>{top.label}</b>
          </div>
        </div>
      )}
      <Link to={`/tournament/${t.code}`} className="btn btn-primary tn-cta">
        {t.joined ? 'Open' : 'Enter'} <ChevronRight size={16} />
      </Link>
    </motion.article>
  )
}

function Row({ t, now, offset, state }) {
  const g = gameBySlug(t.game_slug)
  const start = new Date(t.starts_at).getTime()
  const end = new Date(t.ends_at).getTime()
  const n = now + offset
  return (
    <li>
      <Link to={`/tournament/${t.code}`} className="tn-row">
        <span className="play-thumb" style={{ background: g ? `linear-gradient(135deg, ${g.gradient[0]}, ${g.gradient[1]})` : '#333' }}>
          {g?.emoji}
        </span>
        <span className="tn-row-main">
          <b>{t.title}</b>
          <small>
            <KindBadge kind={t.kind} /> {t.creator ? `by ${t.creator} · ` : ''}
            {t.players} {t.players === 1 ? 'player' : 'players'}
          </small>
        </span>
        <span className="tn-row-time">
          {state === 'upcoming' ? (
            <>Starts in {compete.fmtLeft(start - n)}</>
          ) : state === 'finished' ? (
            t.winner ? (
              <>
                <Crown size={13} /> {t.winner}
              </>
            ) : t.finalized ? (
              'No entries'
            ) : (
              'Finalizing…'
            )
          ) : (
            <>Ends in {compete.fmtLeft(end - n)}</>
          )}
        </span>
        <ChevronRight size={16} className="tn-row-go" />
      </Link>
    </li>
  )
}

function CreateModal({ onClose }) {
  const { user, pushToast } = useApp()
  const navigate = useNavigate()
  const firstLive = games.find((g) => g.status === 'live')?.slug
  const [f, setF] = useState({ title: '', description: '', game: firstLive, when: 'now', start: '', hours: 24, attempts: 3, isPublic: true })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const tooLow = levelForXp(user?.xp || 0) < 2

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (f.title.trim().length < 3) return setErr('Give it a name (3+ characters)')
    setBusy(true)
    try {
      const res = await compete.createTournament({
        title: f.title,
        description: f.description,
        game: f.game,
        startsAt: f.when === 'later' && f.start ? new Date(f.start).toISOString() : null,
        hours: f.hours,
        attempts: f.attempts,
        isPublic: f.isPublic,
      })
      pushToast({ emoji: '✅', title: 'Tournament created', text: 'Share the link so people can join' })
      navigate(`/tournament/${res.code}`)
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  const min = new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)
  const max = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16)

  return (
    <motion.div className="auth-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form
        className="auth-card tn-create"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tn-create-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
      >
        <button type="button" className="auth-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <span className="age-ico">
          <Trophy size={28} />
        </span>
        <h2 id="tn-create-title">Create a tournament</h2>
        <p className="muted small">Points only: players compete for the top spot and bragging rights.</p>
        {tooLow && <p className="q-error">Reach level 2 to create tournaments. Play a couple of rounds first!</p>}
        <label className="pt-field">
          <span>Name</span>
          <input className="tn-input" value={f.title} onChange={(e) => set('title')(e.target.value)} maxLength={80} placeholder="Friday Night Quiz Cup" autoFocus />
        </label>
        <label className="pt-field">
          <span>Description (optional)</span>
          <textarea className="tn-input" rows={2} value={f.description} onChange={(e) => set('description')(e.target.value)} maxLength={600} placeholder="Winner picks the next quiz!" />
        </label>
        <label className="pt-field">
          <span>Quiz</span>
          <GameSelect value={f.game} onChange={set('game')} />
        </label>
        <div className="pt-row">
          <div className="pt-field">
            <span>Starts</span>
            <div className="seg pt-seg">
              <button type="button" className={f.when === 'now' ? 'is-on' : ''} onClick={() => set('when')('now')}>
                Now
              </button>
              <button type="button" className={f.when === 'later' ? 'is-on' : ''} onClick={() => set('when')('later')}>
                Later
              </button>
            </div>
          </div>
          <label className="pt-field">
            <span>Runs for</span>
            <select className="pt-select" value={f.hours} onChange={(e) => set('hours')(Number(e.target.value))}>
              {[1, 3, 6, 12, 24, 72, 168].map((h) => (
                <option key={h} value={h}>
                  {h < 24 ? `${h} hour${h > 1 ? 's' : ''}` : h === 24 ? '1 day' : h === 72 ? '3 days' : '1 week'}
                </option>
              ))}
            </select>
          </label>
        </div>
        {f.when === 'later' && (
          <label className="pt-field">
            <span>Start time</span>
            <input className="tn-input" type="datetime-local" min={min} max={max} value={f.start} onChange={(e) => set('start')(e.target.value)} required />
          </label>
        )}
        <div className="pt-field">
          <span>Attempts per player</span>
          <div className="seg pt-seg">
            {[1, 3, 5, 10].map((n) => (
              <button key={n} type="button" className={f.attempts === n ? 'is-on' : ''} onClick={() => set('attempts')(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <label className="pt-check">
          <input type="checkbox" checked={f.isPublic} onChange={(e) => set('isPublic')(e.target.checked)} />
          {f.isPublic ? <Globe size={15} /> : <Lock size={15} />} {f.isPublic ? 'Listed publicly' : 'Unlisted: only people with the link'}
        </label>
        {err && <p className="q-error">{err}</p>}
        <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={busy || tooLow}>
          {busy ? <Loader2 size={18} className="spin" /> : <Plus size={18} />} Create tournament
        </button>
      </motion.form>
    </motion.div>
  )
}

export default function Tournaments() {
  const { user, accountsEnabled, openAuth } = useApp()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [offset, setOffset] = useState(0)
  const [creating, setCreating] = useState(false)
  const now = useTick(1000)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  useEffect(() => {
    if (!accountsEnabled) return
    const load = () =>
      compete
        .listTournaments()
        .then((d) => {
          setOffset(new Date(d.now).getTime() - Date.now())
          setData(d)
        })
        .catch((e) => setError(e.message))
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [user?.id, accountsEnabled])

  const section = (title, icon, list, state, empty) => (
    <section className="pf-card tn-section">
      <h3>
        {icon} {title}
      </h3>
      {list.length ? (
        <ul className="tn-list">
          {list.map((t) => (
            <Row key={t.code} t={t} now={now} offset={offset} state={state} />
          ))}
        </ul>
      ) : (
        <p className="muted small">{empty}</p>
      )}
    </section>
  )

  return (
    <>
      <Navbar />
      <main className="profile tn-page">
        <section className="pt-hero">
          <div className="pf-hero-bg">
            <Aurora colors={AURORA} speed={0.45} />
            <div className="hero-fade" />
          </div>
          <div className="container pt-hero-in">
            <span className="pf-tier" style={{ '--tier': '#fcd34d' }}>
              <Medal size={14} /> Tournaments
            </span>
            <h1>Compete & win</h1>
            <p className="muted">A new Daily Challenge every day with XP rewards, the Weekly Masters for the best of the best, and tournaments run by players.</p>
            <div className="lb-links">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => (user ? setCreating(true) : openAuth('login'))}>
                <Plus size={16} /> Create a tournament
              </button>
              <Link to="/leaderboards" className="btn btn-ghost btn-sm">
                <Trophy size={16} /> Leaderboards
              </Link>
            </div>
          </div>
        </section>

        <div className="container">
          {!accountsEnabled ? (
            <p className="muted">Tournaments need accounts, which aren’t set up on this copy of the site.</p>
          ) : error ? (
            <p className="q-error">{error}</p>
          ) : !data ? (
            <div className="lb-loading">
              <Loader2 size={32} className="spin" />
            </div>
          ) : (
            <>
              <div className="tn-officials">
                {data.official.map((t) => (
                  <OfficialCard key={t.code} t={t} now={now} offset={offset} />
                ))}
              </div>
              {data.mine.length > 0 && section('Your tournaments', <Sparkles size={17} className="ico" />, data.mine, 'live', '')}
              <div className="tn-cols">
                {section('Community, live now', <Users size={17} className="ico" />, data.live, 'live', 'No community tournaments running. Start one!')}
                {section('Upcoming', <Clock size={17} className="ico" />, data.upcoming, 'upcoming', 'Nothing scheduled yet.')}
              </div>
              {section('Recent results', <Crown size={17} className="ico" />, data.finished, 'finished', 'Results will show up here.')}
            </>
          )}
        </div>
      </main>
      <AnimatePresence>{creating && <CreateModal onClose={() => setCreating(false)} />}</AnimatePresence>
      <SiteFooter />
    </>
  )
}
