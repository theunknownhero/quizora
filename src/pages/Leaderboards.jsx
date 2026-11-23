// XP leaderboards: this week / month / year / all time, global or friends, optionally per quiz.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Trophy, Users, Globe, Crown, Medal, Loader2, CalendarDays, Gamepad2, Swords } from 'lucide-react'
import Navbar from '../components/Navbar.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import Aurora from '../components/Aurora.jsx'
import PlayerAvatar from '../components/PlayerAvatar.jsx'
import { useApp } from '../state/AppState.jsx'
import * as compete from '../state/compete.js'
import { games } from '../data/games.js'
import { achievementById } from '../data/achievements.js'
import './profile.css'
import './social.css'
import './party.css'
import './compete.css'

const PERIODS = [
  ['week', 'This week'],
  ['month', 'This month'],
  ['year', 'This year'],
  ['all', 'All time'],
]
const AURORA = ['#f59e0b', '#8b5cf6', '#22d3ee']

function Podium({ rows }) {
  const order = [rows[1], rows[0], rows[2]]
  return (
    <div className="lb-podium">
      {order.map((r, i) =>
        r ? (
          <motion.div key={r.id} className={`lb-pod lb-pod-${r.rank > 3 ? 3 : r.rank}`} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }}>
            <Link to={`/u/${r.username}`} className="lb-pod-who">
              {r.rank === 1 && <Crown size={22} className="lb-crown" />}
              <PlayerAvatar username={r.username} level={r.level} size={i === 1 ? 84 : 64} />
              <b>{r.username}</b>
              <small>{r.xp.toLocaleString()} XP</small>
            </Link>
            <span className="lb-pod-bar">{r.rank}</span>
          </motion.div>
        ) : (
          <span key={`e${i}`} />
        )
      )}
    </div>
  )
}

export default function Leaderboards() {
  const { user, accountsEnabled } = useApp()
  const [period, setPeriod] = useState('week')
  const [scope, setScope] = useState('global')
  const [game, setGame] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!accountsEnabled) return
    setData(null)
    setError('')
    compete
      .getLeaderboard(period, scope === 'friends' && !user ? 'global' : scope, game)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [period, scope, game, user?.id, accountsEnabled])

  const rows = data?.rows || []
  const range =
    data?.from &&
    `${new Date(data.from).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${new Date(new Date(data.to) - 1).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
  const meInTop = user && rows.some((r) => r.id === user.id)

  return (
    <>
      <Navbar />
      <main className="profile lb-page">
        <section className="pt-hero lb-hero">
          <div className="pf-hero-bg">
            <Aurora colors={AURORA} speed={0.45} />
            <div className="hero-fade" />
          </div>
          <div className="container pt-hero-in">
            <span className="pf-tier" style={{ '--tier': '#fcd34d' }}>
              <Trophy size={14} /> Leaderboards
            </span>
            <h1>Top players</h1>
            <p className="muted">Ranked by XP earned from solo rounds, parties and tournament rewards. Weeks start on Monday (UTC).</p>
            <div className="lb-links">
              <Link to="/tournaments" className="btn btn-primary btn-sm">
                <Medal size={16} /> Tournaments
              </Link>
              <Link to="/play-together" className="btn btn-ghost btn-sm">
                <Swords size={16} /> Play together
              </Link>
            </div>
          </div>
        </section>

        <div className="container lb-wrap">
          <div className="lb-controls">
            <nav className="pf-tabs lb-tabs" role="tablist" aria-label="Period">
              {PERIODS.map(([k, label]) => (
                <button key={k} role="tab" aria-selected={period === k} className={period === k ? 'is-on' : ''} onClick={() => setPeriod(k)}>
                  {period === k && <motion.span layoutId="lb-tab" className="pf-tab-pill" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                  <span className="pf-tab-label">{label}</span>
                </button>
              ))}
            </nav>
            <div className="lb-filters">
              <div className="seg" role="radiogroup" aria-label="Who">
                <button type="button" role="radio" aria-checked={scope === 'global'} className={scope === 'global' ? 'is-on' : ''} onClick={() => setScope('global')}>
                  <Globe size={14} className="ico" /> Everyone
                </button>
                <button type="button" role="radio" aria-checked={scope === 'friends'} className={scope === 'friends' ? 'is-on' : ''} onClick={() => setScope('friends')} disabled={!user} title={user ? '' : 'Log in to see friends'}>
                  <Users size={14} className="ico" /> Friends
                </button>
              </div>
              <label className="lb-game">
                <Gamepad2 size={15} aria-hidden="true" />
                <select value={game} onChange={(e) => setGame(e.target.value)} aria-label="Quiz">
                  <option value="">All quizzes</option>
                  {games
                    .filter((g) => g.status === 'live')
                    .map((g) => (
                      <option key={g.slug} value={g.slug}>
                        {g.title}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            {range && (
              <p className="lb-range">
                <CalendarDays size={14} className="ico" /> {range}
              </p>
            )}
          </div>

          {!accountsEnabled ? (
            <p className="muted">Leaderboards need accounts, which aren’t set up on this copy of the site.</p>
          ) : error ? (
            <p className="q-error">{error}</p>
          ) : !data ? (
            <div className="lb-loading">
              <Loader2 size={32} className="spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="pf-card pf-empty">
              <span>
                <Trophy size={36} />
              </span>
              <p>{scope === 'friends' ? 'No XP from you or your friends in this period yet.' : 'Nobody has earned XP in this period yet. Be the first!'}</p>
              <Link to="/play/hungary-or-not" className="btn btn-primary btn-sm">
                Play now
              </Link>
            </div>
          ) : (
            <>
              <Podium rows={rows} />
              <section className="pf-card lb-card">
                <ol className="lb-list">
                  <AnimatePresence initial={false}>
                    {rows.map((r) => {
                      const pins = (r.showcase || []).map(achievementById).filter(Boolean)
                      return (
                        <motion.li key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={user?.id === r.id ? 'is-me' : ''}>
                          <span className={`lb-rank lb-rank-${r.rank <= 3 ? r.rank : 'n'}`}>{r.rank}</span>
                          <Link to={`/u/${r.username}`} className="soc-who">
                            <PlayerAvatar username={r.username} level={r.level} size={40} />
                            <span className="soc-name">
                              <b>
                                {r.username}
                                {user?.id === r.id && <em className="lb-you"> you</em>}
                              </b>
                              <small>
                                Lv {r.level} · {r.games} {r.games === 1 ? 'game' : 'games'}
                              </small>
                            </span>
                          </Link>
                          <span className="lb-pins" aria-hidden="true">
                            {pins.map((a) => (
                              <i key={a.id} title={a.name}>
                                {a.emoji}
                              </i>
                            ))}
                          </span>
                          <b className="lb-xp">{r.xp.toLocaleString()}</b>
                        </motion.li>
                      )
                    })}
                  </AnimatePresence>
                </ol>
              </section>
            </>
          )}

          {user && data && !meInTop && (
            <div className="lb-me">
              <span className="lb-rank lb-rank-n">{data.me ? data.me.rank : '—'}</span>
              <PlayerAvatar username={user.username} level={1} size={36} showLevel={false} />
              <span className="lb-me-name">
                <b>You</b>
                <small>{data.me ? `of ${data.me.of} players · ${data.me.games} games` : 'Play a round to get on the board'}</small>
              </span>
              <b className="lb-xp">{data.me ? data.me.xp.toLocaleString() : 0} XP</b>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
