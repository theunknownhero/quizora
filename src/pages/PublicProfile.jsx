// Public player profile: /u/:username. Everyone sees the card, stats and badges; friends also see recent games.
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { Gamepad2, Trophy, Target, Flame, Gem, Users, CalendarDays, UserMinus, Lock, ListChecks, SearchX, Loader2, Pencil, Swords, Award } from 'lucide-react'
import Navbar from '../components/Navbar.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import PlayerAvatar from '../components/PlayerAvatar.jsx'
import InviteButton from '../components/InviteButton.jsx'
import { FriendAction } from './Friends.jsx'
import { useApp } from '../state/AppState.jsx'
import { useSocial } from '../state/SocialState.jsx'
import * as social from '../state/social.js'
import { levelProgress, tierFor } from '../lib/levels.js'
import { achievements, achievementById, tiersStyle } from '../data/achievements.js'
import { games, findGame } from '../data/games.js'
import './profile.css'
import './social.css'

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
const summary = (p) => ({
  games: p.stats.games,
  winRate: pct(p.stats.wins, p.stats.games),
  accuracy: pct(p.stats.correct, p.stats.answered),
  bestStreak: p.stats.best_streak,
  bestScore: p.stats.best_score,
  level: p.level,
})

function Compare({ me, them }) {
  const a = summary(me)
  const b = summary(them)
  const rows = [
    ['Level', 'level'],
    ['Games', 'games'],
    ['Win rate', 'winRate', '%'],
    ['Accuracy', 'accuracy', '%'],
    ['Best streak', 'bestStreak'],
    ['Best score', 'bestScore'],
  ]
  return (
    <section className="pf-card">
      <h3>
        <Swords size={17} className="ico" /> You vs {them.username}
      </h3>
      <ul className="cmp">
        <li className="cmp-head">
          <span>You</span>
          <span />
          <span>{them.username}</span>
        </li>
        {rows.map(([label, k, unit = '']) => {
          const max = Math.max(a[k], b[k], 1)
          return (
            <li key={k}>
              <span className={`cmp-v ${a[k] > b[k] ? 'is-win' : ''}`}>
                {a[k]}
                {unit}
                <i style={{ width: `${(a[k] / max) * 100}%` }} />
              </span>
              <small>{label}</small>
              <span className={`cmp-v is-right ${b[k] > a[k] ? 'is-win' : ''}`}>
                {b[k]}
                {unit}
                <i style={{ width: `${(b[k] / max) * 100}%` }} />
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default function PublicProfile() {
  const { username } = useParams()
  const { user, pushToast } = useApp()
  const { isOnline, refresh } = useSocial()
  const [p, setP] = useState(undefined)
  const [me, setMe] = useState(null)

  const load = useCallback(() => {
    social
      .getPublicProfile(username)
      .then((d) => setP(d || null))
      .catch(() => setP(null))
  }, [username])

  useEffect(() => {
    window.scrollTo(0, 0)
    setP(undefined)
    load()
  }, [load])

  useEffect(() => {
    if (!user || !p || p.relation === 'self') return setMe(null)
    social.getPublicProfile(user.username).then(setMe).catch(() => setMe(null))
  }, [user?.username, p?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const unfriend = async () => {
    if (!window.confirm(`Remove ${p.username} from your friends?`)) return
    try {
      await social.removeFriendship(p.friendship_id)
      await refresh()
      load()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Friends', text: e.message })
    }
  }

  if (p === undefined || p === null) {
    return (
      <>
        <Navbar />
        <main className="placeholder">
          <div className="placeholder-card">
            <span className="placeholder-emoji">{p === undefined ? <Loader2 size={56} className="spin" /> : <SearchX size={56} />}</span>
            <h1>{p === undefined ? 'Loading…' : 'Player not found'}</h1>
            {p === null && (
              <Link to="/friends?tab=find" className="btn btn-primary btn-lg">
                Find players
              </Link>
            )}
          </div>
        </main>
      </>
    )
  }

  const lp = levelProgress(p.xp)
  const tier = tierFor(p.level)
  const pins = (p.showcase || []).map(achievementById).filter(Boolean)
  const unlocked = new Set(p.achievements)
  const s = summary(p)
  const online = p.relation === 'friend' ? isOnline(p.id) : undefined

  return (
    <>
      <Navbar />
      <main className="profile">
        <section className="pf-hero pub-hero">
          <div className="container pf-hero-in">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <PlayerAvatar username={p.username} level={p.level} online={online} size={112} />
            </motion.div>
            <div className="pf-id">
              <span className="pf-tier" style={{ '--tier': tier.color }}>
                <tier.icon size={14} /> {tier.title}
              </span>
              <h1>{p.username}</h1>
              <div className="pf-meta">
                <span>
                  <CalendarDays size={15} /> Joined {fmtDate(p.joined)}
                </span>
                <span>
                  <Flame size={15} /> {p.day_streak}-day streak
                </span>
                <span>
                  <Users size={15} /> {p.friends} {p.friends === 1 ? 'friend' : 'friends'}
                </span>
                {online && (
                  <span className="pub-online">
                    <i className="dot-on" /> Online
                  </span>
                )}
              </div>
              <div className="pf-level">
                <div className="pf-level-row">
                  <b>Level {lp.level}</b>
                  <small>{p.xp.toLocaleString()} XP</small>
                </div>
                <div className="xp-bar big">
                  <motion.span initial={{ width: 0 }} animate={{ width: `${lp.pct}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
                </div>
              </div>
              <div className="pub-actions">
                {p.relation === 'self' ? (
                  <Link to="/profile" className="soc-btn is-ghost">
                    <Pencil size={15} /> Your full profile
                  </Link>
                ) : !user ? null : (
                  <>
                    <FriendAction player={p} relation={p.relation} friendshipId={p.friendship_id} onChange={load} />
                    {p.relation === 'friend' && (
                      <>
                        <InviteButton friend={p} />
                        <button type="button" className="soc-btn is-icon is-ghost" onClick={unfriend} aria-label="Remove friend" title="Remove friend">
                          <UserMinus size={15} />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="pf-pins" aria-label="Showcased badges">
              {pins.map((a) => (
                <div key={a.id} className="pf-pin">
                  <span className="badge badge-lg" style={{ '--tier': tiersStyle[a.tier].color }} title={a.desc}>
                    <span className="badge-emoji">{a.emoji}</span>
                  </span>
                  <small>{a.name}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="container pf-body">
          <div className="pf-grid">
            <section className="pf-card pf-span2">
              <h3>Stats</h3>
              <div className="stat-grid stat-grid-6 pub-stats">
                {[
                  [Gamepad2, 'Games', s.games],
                  [Trophy, 'Win rate', `${s.winRate}%`],
                  [Target, 'Accuracy', `${s.accuracy}%`],
                  [Flame, 'Best streak', s.bestStreak],
                  [Award, 'Best score', s.bestScore ? `${s.bestScore}/20` : '—'],
                  [Gem, 'Perfect rounds', p.stats.perfects],
                ].map(([I, label, v]) => (
                  <div key={label} className="stat-tile">
                    <span className="stat-emoji">
                      <I size={18} />
                    </span>
                    <b>{v}</b>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </section>
            {me ? (
              <Compare me={me} them={p} />
            ) : (
              <section className="pf-card">
                <h3>Badges</h3>
                <p className="muted small">
                  {unlocked.size} of {achievements.length} unlocked
                </p>
              </section>
            )}
            <section className="pf-card pf-span2">
              <h3>Recent games</h3>
              {p.recent ? (
                p.recent.length ? (
                  <ul className="plays">
                    {p.recent.map((r, i) => {
                      const g = findGame(r.game_slug)
                      return (
                        <li key={i} className="play-row">
                          <div className="play-row-head">
                            <span className="play-thumb" style={{ background: g ? `linear-gradient(135deg, ${g.gradient[0]}, ${g.gradient[1]})` : '#333' }}>
                              {g?.emoji || '🎲'}
                            </span>
                            <span className="play-main">
                              <b>{g?.title || r.game_slug}</b>
                              <small>{new Date(r.finished_at).toLocaleDateString()}</small>
                            </span>
                            <span className={`play-result ${r.won ? 'win' : 'loss'}`}>{r.won ? 'Win' : 'Loss'}</span>
                            <span className="play-score">
                              {r.correct}
                              <em>/{r.total}</em>
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="muted small">No games yet.</p>
                )
              ) : (
                <p className="muted small pub-locked">
                  <Lock size={15} className="ico" /> Only friends can see {p.username}’s recent games.
                </p>
              )}
            </section>
            <section className="pf-card">
              <h3>
                Achievements <em className="count">{unlocked.size}/{achievements.length}</em>
              </h3>
              <div className="mini-badges">
                {achievements.map((a) => (
                  <span key={a.id} className={`badge badge-sm ${unlocked.has(a.id) ? '' : 'is-locked'}`} style={{ '--tier': tiersStyle[a.tier].color }} title={`${a.name}: ${a.desc}`}>
                    <span className="badge-emoji">{unlocked.has(a.id) ? a.emoji : <Lock size={13} />}</span>
                  </span>
                ))}
              </div>
            </section>
            {p.quizlists.length > 0 && (
              <section className="pf-card pf-span3">
                <h3>
                  <ListChecks size={17} className="ico" /> Public QuizLists
                </h3>
                <div className="pub-lists">
                  {p.quizlists.map((l) => (
                    <Link key={l.share_code} to={`/quizlist/${l.share_code}`} className="pub-list">
                      <span className="pl-emoji">
                        <ListChecks size={20} />
                      </span>
                      <span>
                        <b>{l.title}</b>
                        <small>
                          {l.count} {l.count === 1 ? 'game' : 'games'}
                        </small>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
