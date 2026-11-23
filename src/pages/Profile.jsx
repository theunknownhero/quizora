// Personal profile suite: overview, history, stats & records, achievements & badges, library, playlists.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import Aurora from '../components/Aurora.jsx'
import GameCard from '../components/GameCard.jsx'
import Flag from '../components/Flag.jsx'
import { useAnnounce } from '../components/Toaster.jsx'
import { useApp } from '../state/AppState.jsx'
import * as udata from '../state/userData.js'
import { games } from '../data/games.js'
import { achievements, achievementById, tiersStyle } from '../data/achievements.js'
import { levelProgress, tierFor, xpRules } from '../lib/levels.js'
import { computeStats, insightsFrom, fmtDuration } from '../lib/stats.js'
import {
  LayoutDashboard, History as HistoryIcon, BarChart3, Award, Library as LibraryIcon, ListChecks, Gamepad2, Trophy, Target, Flame,
  Zap, Timer, Sparkles, Gem, CalendarDays, CalendarCheck, Check, X, ChevronRight, Pin, Lock, Share2, Pencil, Trash2,
  Star, Heart, Bookmark, Lightbulb, TrendingUp, TrendingDown, Clock, Brain, Dumbbell, Sunrise, Plus, Play, UserRound, Users,
} from 'lucide-react'
import './profile.css'

const TABS = [
  ['overview', 'Overview', LayoutDashboard],
  ['history', 'History', HistoryIcon],
  ['stats', 'Stats & records', BarChart3],
  ['achievements', 'Achievements', Award],
  ['library', 'Library', LibraryIcon],
  ['quizlists', 'QuizLists', ListChecks],
]
// Insight emoji from stats.js → Lucide icon
const INSIGHT_ICON = { '💪': Dumbbell, '🎯': Target, '🕒': Clock, '📅': CalendarDays, '⚡': Zap, '🧘': Brain, '📈': TrendingUp, '🔄': TrendingDown }
const InsightIcon = ({ e }) => {
  const I = INSIGHT_ICON[e] || Lightbulb
  return <I size={18} aria-hidden="true" />
}
const gameBySlug = (slug) => games.find((g) => g.slug === slug)
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const fmtWhen = (d) => {
  const diff = (Date.now() - new Date(d)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d ago`
  return fmtDate(d)
}

function Badge({ a, size = 'md', locked }) {
  return (
    <span className={`badge badge-${size} ${locked ? 'is-locked' : ''}`} style={{ '--tier': tiersStyle[a.tier].color }} title={`${a.name}: ${a.desc}`}>
      <span className="badge-emoji">{locked ? <Lock size={size === 'sm' ? 14 : 20} /> : a.emoji}</span>
    </span>
  )
}

function Bars({ data, max, label }) {
  const top = Math.max(1, max ?? Math.max(...data.map((d) => d.v)))
  return (
    <div className="bars" role="img" aria-label={label}>
      {data.map((d, i) => (
        <div key={i} className="bar-col" title={`${d.label}: ${d.v}`}>
          <motion.span className="bar" initial={{ height: 0 }} animate={{ height: `${(d.v / top) * 100}%` }} transition={{ delay: i * 0.02, duration: 0.5 }} />
          <small>{d.short}</small>
        </div>
      ))}
    </div>
  )
}

function Sparkline({ values }) {
  if (values.length < 2) return <span className="muted">Play more rounds to see your trend.</span>
  const w = 240
  const h = 60
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / 100) * h}`).join(' ')
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`Accuracy trend: ${values.join(', ')}%`}>
      <defs>
        <linearGradient id="spark-g" x1="0" x2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke="url(#spark-g)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function StatTile({ label, value, sub, icon: Icon }) {
  return (
    <div className="stat-tile">
      <span className="stat-emoji">
        <Icon size={18} aria-hidden="true" />
      </span>
      <b>{value}</b>
      <span>{label}</span>
      {sub && <small>{sub}</small>}
    </div>
  )
}

function PlayRow({ p, open, onToggle }) {
  const g = gameBySlug(p.game_slug)
  return (
    <li className={`play-row ${open ? 'is-open' : ''}`}>
      <button type="button" className="play-row-head" onClick={onToggle} aria-expanded={open}>
        <span className="play-thumb" style={{ background: g ? `linear-gradient(135deg, ${g.gradient[0]}, ${g.gradient[1]})` : '#333' }}>{g?.emoji || '🎲'}</span>
        <span className="play-main">
          <b>{g?.title || p.game_slug}</b>
          <small>
            {fmtWhen(p.finished_at)} · {fmtDuration((new Date(p.finished_at) - new Date(p.started_at)) / 1000)}
          </small>
        </span>
        <span className={`play-result ${p.won ? 'win' : 'loss'}`}>{p.won ? 'Win' : 'Loss'}</span>
        <span className="play-score">
          {p.correct}
          <em>/{p.total}</em>
        </span>
        <span className="play-xp">+{p.xp_earned} XP</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ol className="play-answers" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {(p.answers || []).map((a, i) => (
              <li key={i} className={a.correct ? 'ok' : 'bad'}>
                <span className="pa-icon">{a.correct ? <Check size={15} /> : <X size={15} />}</span>
                <span className="pa-item">{a.item}</span>
                <span className="pa-type">{a.type}</span>
                <span className="pa-ans">{a.answer ? 'Hungarian' : 'Not Hungarian'}</span>
              </li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
    </li>
  )
}

// ---------------- Tabs ----------------
function Overview({ user, stats, plays, unlocked, setTab }) {
  const insights = insightsFrom(stats).slice(0, 3)
  const recent = plays.slice(0, 4)
  return (
    <div className="pf-grid">
      <section className="pf-card pf-span2">
        <h3>Quick stats</h3>
        <div className="stat-grid">
          <StatTile icon={Gamepad2} label="Games played" value={stats.games} />
          <StatTile icon={Trophy} label="Win rate" value={`${stats.winRate}%`} sub={`${stats.wins} wins`} />
          <StatTile icon={Target} label="Accuracy" value={`${stats.accuracy}%`} sub={`${stats.correct}/${stats.answered}`} />
          <StatTile icon={Flame} label="Best streak" value={stats.bestStreak} sub="answers in a row" />
        </div>
      </section>
      <section className="pf-card">
        <h3>Insights</h3>
        {insights.length ? (
          <ul className="insights">
            {insights.map((x) => (
              <li key={x.title}>
                <span className="ins-ico">
                  <InsightIcon e={x.emoji} />
                </span>
                <div>
                  <b>{x.title}</b>
                  <small>{x.text}</small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Play a couple of rounds to unlock personal insights.</p>
        )}
      </section>
      <section className="pf-card pf-span2">
        <div className="pf-card-head">
          <h3>Last plays</h3>
          {plays.length > 0 && (
            <button type="button" className="link-btn" onClick={() => setTab('history')}>
              See all <ChevronRight size={15} className="ico" />
            </button>
          )}
        </div>
        {recent.length ? (
          <ul className="plays">
            {recent.map((p) => (
              <PlayRow key={p.id} p={p} open={false} onToggle={() => setTab('history')} />
            ))}
          </ul>
        ) : (
          <div className="pf-empty">
            <span>
              <Gamepad2 size={36} />
            </span>
            <p>No games yet.</p>
            <Link to="/play/hungary-or-not" className="btn btn-primary btn-sm">
              Play your first round
            </Link>
          </div>
        )}
      </section>
      <section className="pf-card">
        <div className="pf-card-head">
          <h3>Achievements</h3>
          <button type="button" className="link-btn" onClick={() => setTab('achievements')}>
            {unlocked.size}/{achievements.length} <ChevronRight size={15} className="ico" />
          </button>
        </div>
        <div className="mini-badges">
          {achievements.slice(0, 12).map((a) => (
            <Badge key={a.id} a={a} size="sm" locked={!unlocked.has(a.id)} />
          ))}
        </div>
        <div className="xp-rules">
          <b>How to earn XP</b>
          {xpRules.map(([k, v]) => (
            <span key={k}>
              {k} <em>{v}</em>
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}

function History({ plays }) {
  const [open, setOpen] = useState(null)
  const [filter, setFilter] = useState('all')
  const list = plays.filter((p) => (filter === 'all' ? true : filter === 'wins' ? p.won : !p.won))
  return (
    <section className="pf-card">
      <div className="pf-card-head">
        <h3>Play history</h3>
        <div className="seg">
          {[
            ['all', 'All'],
            ['wins', 'Wins'],
            ['losses', 'Losses'],
          ].map(([k, l]) => (
            <button key={k} type="button" className={filter === k ? 'is-on' : ''} onClick={() => setFilter(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {list.length ? (
        <ul className="plays">
          {list.map((p) => (
            <PlayRow key={p.id} p={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} />
          ))}
        </ul>
      ) : (
        <p className="muted">Nothing here yet.</p>
      )}
    </section>
  )
}

function Stats({ user, stats }) {
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const types = Object.entries(stats.byType)
    .map(([k, v]) => ({ k, n: v.n, pct: Math.round((v.c / v.n) * 100) }))
    .sort((a, b) => b.n - a.n)
  const insights = insightsFrom(stats)
  return (
    <div className="pf-grid">
      <section className="pf-card pf-span3">
        <h3>Statistics</h3>
        <div className="stat-grid stat-grid-6">
          <StatTile icon={Gamepad2} label="Games" value={stats.games} />
          <StatTile icon={Trophy} label="Wins" value={stats.wins} sub={`${stats.winRate}% win rate`} />
          <StatTile icon={Target} label="Accuracy" value={`${stats.accuracy}%`} />
          <StatTile icon={Zap} label="Avg answer" value={stats.avgAnswerSec ? `${stats.avgAnswerSec.toFixed(1)}s` : '—'} />
          <StatTile icon={Timer} label="Time played" value={`${stats.totalMinutes} min`} />
          <StatTile icon={Sparkles} label="XP earned" value={user.xp.toLocaleString()} />
        </div>
      </section>
      <section className="pf-card">
        <h3>Records</h3>
        <ul className="records">
          <li>
            <span>
              <Target size={17} />
            </span> Best score <b>{stats.bestScore ? `${stats.bestScore}/20` : '—'}</b>
          </li>
          <li>
            <span>
              <Gem size={17} />
            </span> Perfect rounds <b>{stats.perfects}</b>
          </li>
          <li>
            <span>
              <Flame size={17} />
            </span> Longest answer streak <b>{stats.bestStreak}</b>
          </li>
          <li>
            <span>
              <Timer size={17} />
            </span> Fastest win <b>{fmtDuration(stats.fastestWin)}</b>
          </li>
          <li>
            <span>
              <CalendarCheck size={17} />
            </span> Current day streak <b>{user.dayStreak}</b>
          </li>
          <li>
            <span>
              <CalendarDays size={17} />
            </span> Best day streak <b>{user.bestDayStreak}</b>
          </li>
        </ul>
      </section>
      <section className="pf-card">
        <h3>Last 14 days</h3>
        <Bars label="Games per day, last 14 days" data={stats.days.map((d) => ({ v: d.plays, label: d.date.toDateString(), short: d.date.getDate() }))} />
        <h3 className="mt">Accuracy trend</h3>
        <Sparkline values={stats.trend} />
      </section>
      <section className="pf-card">
        <h3>When you play</h3>
        <Bars label="Games by weekday" data={stats.byWeekday.map((v, i) => ({ v, label: weekday[i], short: weekday[i][0] }))} />
        <h3 className="mt">By topic</h3>
        {types.length ? (
          <ul className="topic-bars">
            {types.map((t) => (
              <li key={t.k}>
                <span>{t.k}</span>
                <span className="tb-track">
                  <motion.i initial={{ width: 0 }} animate={{ width: `${t.pct}%` }} transition={{ duration: 0.6 }} />
                </span>
                <b>{t.pct}%</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No answers yet.</p>
        )}
      </section>
      <section className="pf-card pf-span2">
        <h3>Per game</h3>
        {Object.keys(stats.byGame).length ? (
          <table className="pf-table">
            <thead>
              <tr>
                <th>Game</th>
                <th>Plays</th>
                <th>Wins</th>
                <th>Best</th>
                <th>Fastest win</th>
                <th>XP</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.byGame).map(([slug, g]) => (
                <tr key={slug}>
                  <td>
                    {gameBySlug(slug)?.emoji} {gameBySlug(slug)?.title || slug}
                  </td>
                  <td>{g.plays}</td>
                  <td>{g.wins}</td>
                  <td>{g.best}</td>
                  <td>{fmtDuration(g.fastestWin)}</td>
                  <td>{g.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No games yet.</p>
        )}
      </section>
      <section className="pf-card">
        <h3>Insights</h3>
        {insights.length ? (
          <ul className="insights">
            {insights.map((x) => (
              <li key={x.title}>
                <span className="ins-ico">
                  <InsightIcon e={x.emoji} />
                </span>
                <div>
                  <b>{x.title}</b>
                  <small>{x.text}</small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Insights appear after a few rounds.</p>
        )}
      </section>
    </div>
  )
}

function Achievements({ user, unlockedMap, onShowcase }) {
  const showcase = user.showcase || []
  const toggle = (id) => {
    const next = showcase.includes(id) ? showcase.filter((x) => x !== id) : [...showcase, id].slice(-3)
    onShowcase(next)
  }
  return (
    <section className="pf-card">
      <div className="pf-card-head">
        <h3>
          Achievements <em className="count">{unlockedMap.size}/{achievements.length}</em>
        </h3>
        <small className="muted">Pin up to 3 badges to show on your profile.</small>
      </div>
      <div className="ach-grid">
        {achievements.map((a) => {
          const at = unlockedMap.get(a.id)
          const pinned = showcase.includes(a.id)
          return (
            <div key={a.id} className={`ach ${at ? 'is-on' : 'is-locked'}`} style={{ '--tier': tiersStyle[a.tier].color }}>
              <Badge a={a} locked={!at} />
              <div className="ach-body">
                <b>{a.name}</b>
                <small>{a.desc}</small>
                <span className="ach-meta">
                  <i>{tiersStyle[a.tier].label}</i>
                  {at && <span>· {fmtDate(at)}</span>}
                </span>
              </div>
              {at && (
                <button type="button" className={`pin ${pinned ? 'is-on' : ''}`} aria-pressed={pinned} onClick={() => toggle(a.id)} title={pinned ? 'Unpin from profile' : 'Pin to profile'}>
                  <Pin size={16} fill={pinned ? 'currentColor' : 'none'} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Library() {
  const { flags } = useApp()
  const [sub, setSub] = useState('favorite')
  const list = games.filter((g) => flags[sub]?.has(g.slug))
  const tabs = [
    ['favorite', 'Favorites', Star],
    ['like', 'Liked', Heart],
    ['save', 'Saved', Bookmark],
  ]
  return (
    <section className="pf-card">
      <div className="pf-card-head">
        <h3>Your library</h3>
        <div className="seg">
          {tabs.map(([k, l, I]) => (
            <button key={k} type="button" className={sub === k ? 'is-on' : ''} onClick={() => setSub(k)}>
              <I size={14} className="ico" /> {l} <em>{flags[k]?.size || 0}</em>
            </button>
          ))}
        </div>
      </div>
      {list.length ? (
        <div className="games-grid">
          {list.map((g) => (
            <GameCard key={g.slug} game={g} />
          ))}
        </div>
      ) : (
        <div className="pf-empty">
          <span>{(() => { const I = tabs.find((t) => t[0] === sub)[2]; return <I size={36} /> })()}</span>
          <p>Use the buttons on any game card to add games here.</p>
          <Link to="/#games" className="btn btn-ghost btn-sm">
            Browse games
          </Link>
        </div>
      )}
    </section>
  )
}

function QuizLists({ user }) {
  const { pushToast } = useApp()
  const announce = useAnnounce()
  const [lists, setLists] = useState(null)
  const [title, setTitle] = useState('')
  const [editing, setEditing] = useState(null)

  const load = useCallback(() => udata.listPlaylists().then(setLists).catch(() => setLists([])), [])
  useEffect(() => {
    load()
  }, [load])

  const create = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    try {
      const pl = await udata.createPlaylist(user.id, { title })
      setLists((l) => [pl, ...(l || [])])
      setTitle('')
      announce(await udata.refreshAchievements())
    } catch {
      pushToast({ emoji: '⚠️', title: 'QuizLists', text: 'Couldn’t create the QuizList' })
    }
  }
  const save = async (pl, patch) => {
    setLists((l) => l.map((x) => (x.id === pl.id ? { ...x, ...patch } : x)))
    try {
      await udata.updatePlaylist(pl.id, patch)
    } catch {
      pushToast({ emoji: '⚠️', title: 'QuizLists', text: 'Couldn’t save changes' })
      load()
    }
  }
  const remove = async (pl) => {
    if (!window.confirm(`Delete “${pl.title}”? This can’t be undone.`)) return
    setLists((l) => l.filter((x) => x.id !== pl.id))
    try {
      await udata.deletePlaylist(pl.id)
    } catch {
      load()
    }
  }
  const removeGame = async (pl, slug) => {
    setLists((l) => l.map((x) => (x.id === pl.id ? { ...x, playlist_items: x.playlist_items.filter((i) => i.game_slug !== slug) } : x)))
    await udata.removeFromPlaylist(pl.id, slug).catch(load)
  }
  const share = async (pl) => {
    const url = `${window.location.origin}/quizlist/${pl.share_code}`
    try {
      if (navigator.share) await navigator.share({ title: pl.title, text: `Play my Quizora QuizList “${pl.title}”`, url })
      else {
        await navigator.clipboard.writeText(url)
        pushToast({ emoji: '🔗', title: 'Link copied', text: 'Send it to your friends!' })
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <section className="pf-card">
      <div className="pf-card-head">
        <h3>QuizLists</h3>
        <form className="pl-new" onSubmit={create}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="New QuizList name" aria-label="New QuizList name" />
          <button type="submit" className="btn btn-primary btn-sm" disabled={!title.trim()}>
            <Plus size={15} /> Create
          </button>
        </form>
      </div>
      {lists === null ? (
        <p className="muted">Loading…</p>
      ) : lists.length === 0 ? (
        <div className="pf-empty">
          <span>
            <ListChecks size={36} />
          </span>
          <p>Bundle your favourite quizzes into a QuizList and share it with friends.</p>
        </div>
      ) : (
        <div className="pl-list">
          {lists.map((pl) => {
            const items = [...(pl.playlist_items || [])].sort((a, b) => a.position - b.position)
            const isEdit = editing === pl.id
            return (
              <article key={pl.id} className="pl-card">
                <header>
                  <span className="pl-emoji">
                    <ListChecks size={22} />
                  </span>
                  <div className="pl-titles">
                    {isEdit ? (
                      <>
                        <input defaultValue={pl.title} maxLength={60} onBlur={(e) => e.target.value.trim() && save(pl, { title: e.target.value.trim() })} aria-label="QuizList name" />
                        <input defaultValue={pl.description} maxLength={200} placeholder="Description (optional)" onBlur={(e) => save(pl, { description: e.target.value.trim() })} aria-label="Description" />
                      </>
                    ) : (
                      <>
                        <b>{pl.title}</b>
                        <small>
                          {items.length} {items.length === 1 ? 'game' : 'games'}
                          {pl.description ? ` · ${pl.description}` : ''}
                        </small>
                      </>
                    )}
                  </div>
                  <div className="pl-actions">
                    <button type="button" onClick={() => share(pl)} title="Share link">
                      <Share2 size={14} /> Share
                    </button>
                    <button type="button" onClick={() => setEditing(isEdit ? null : pl.id)}>
                      {isEdit ? (
                        <>
                          <Check size={14} /> Done
                        </>
                      ) : (
                        <>
                          <Pencil size={14} /> Edit
                        </>
                      )}
                    </button>
                    <button type="button" className="danger" onClick={() => remove(pl)} title="Delete QuizList" aria-label="Delete QuizList">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </header>
                {isEdit && (
                  <label className="pl-public">
                    <input type="checkbox" checked={pl.is_public} onChange={(e) => save(pl, { is_public: e.target.checked })} /> Show on my public profile (anyone with the link can always view it)
                  </label>
                )}
                {items.length ? (
                  <ul className="pl-games">
                    {items.map((i) => {
                      const g = gameBySlug(i.game_slug)
                      return (
                        <li key={i.game_slug}>
                          <span className="play-thumb sm" style={{ background: g ? `linear-gradient(135deg, ${g.gradient[0]}, ${g.gradient[1]})` : '#333' }}>
                            {g?.emoji || '🎲'}
                          </span>
                          <span>{g?.title || i.game_slug}</span>
                          {isEdit && (
                            <button type="button" onClick={() => removeGame(pl, i.game_slug)} aria-label={`Remove ${g?.title}`}>
                              <X size={14} />
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="muted small">Add games with the add-to-QuizList button on any game card.</p>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

// Aurora restarts its WebGL loop when the colors array changes identity, so key it by value.
function AuroraMemo({ colors }) {
  const key = colors.join(',')
  const stable = useMemo(() => colors, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return <Aurora colors={stable} speed={0.45} />
}

// ---------------- Page ----------------
export default function Profile() {
  const { user, authReady, accountsEnabled, openAuth, openOnboarding, setUser, country, pushToast } = useApp()
  const [params, setParams] = useSearchParams()
  const rawTab = params.get('tab') === 'playlists' ? 'quizlists' : params.get('tab')
  const tab = TABS.some(([k]) => k === rawTab) ? rawTab : 'overview'
  const setTab = (k) => setParams(k === 'overview' ? {} : { tab: k }, { replace: true })
  const [plays, setPlays] = useState(null)
  const [unlocked, setUnlocked] = useState(new Map())

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!user) return
    udata.getPlays().then(setPlays).catch(() => setPlays([]))
    udata
      .getAchievements()
      .then((rows) => setUnlocked(new Map(rows.map((r) => [r.achievement_id, r.unlocked_at]))))
      .catch(() => {})
  }, [user?.id, user?.xp])

  const stats = useMemo(() => computeStats(plays || []), [plays])

  const onShowcase = async (ids) => {
    setUser((u) => ({ ...u, showcase: ids }))
    try {
      await udata.setShowcase(user.id, ids)
    } catch {
      pushToast({ emoji: '⚠️', title: 'Badges', text: 'Couldn’t save your badges' })
    }
  }

  if (!accountsEnabled || (authReady && !user)) {
    return (
      <>
        <Navbar />
        <main className="placeholder">
          <div className="placeholder-card">
            <span className="placeholder-emoji">
              <UserRound size={64} />
            </span>
            <h1>Your profile</h1>
            <p>Log in to see your levels, history, stats, achievements and QuizLists.</p>
            {accountsEnabled && (
              <button type="button" className="btn btn-primary btn-lg" onClick={() => openAuth('login')}>
                Log in
              </button>
            )}
          </div>
        </main>
      </>
    )
  }
  if (!user) {
    return (
      <>
        <Navbar />
        <main className="placeholder">
          <p className="muted">Loading…</p>
        </main>
      </>
    )
  }

  const p = levelProgress(user.xp)
  const tier = tierFor(p.level)
  const auroraColors = [tier.color, '#7c3aed', '#22d3ee']
  const pins = (user.showcase || []).map(achievementById).filter(Boolean)

  return (
    <>
      <Navbar />
      <main className="profile">
        <section className="pf-hero">
          <div className="pf-hero-bg">
            <AuroraMemo colors={auroraColors} />
            <div className="hero-fade" />
          </div>
          <div className="container pf-hero-in">
            <motion.div className="pf-avatar" style={{ '--tier': tier.color }} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <span>{user.username[0].toUpperCase()}</span>
              <i className="pf-avatar-lvl">{p.level}</i>
            </motion.div>
            <div className="pf-id">
              <span className="pf-tier" style={{ '--tier': tier.color }}>
                <tier.icon size={14} /> {tier.title}
              </span>
              <h1>{user.username}</h1>
              <div className="pf-meta">
                <span>
                  <Flag code={country} size={16} /> Joined {fmtDate(user.joinedAt)}
                </span>
                <span>
                  <Flame size={15} /> {user.dayStreak}-day streak
                </span>
                <button type="button" className="link-btn" onClick={openOnboarding}>
                  <Sparkles size={14} className="ico" /> Edit interests
                </button>
                <Link to={`/u/${user.username}`} className="link-btn">
                  <Users size={14} className="ico" /> Public profile
                </Link>
              </div>
              <div className="pf-level">
                <div className="pf-level-row">
                  <b>Level {p.level}</b>
                  <small>
                    {p.into.toLocaleString()} / {p.need.toLocaleString()} XP · {p.toNext.toLocaleString()} to level {p.level + 1}
                  </small>
                </div>
                <div className="xp-bar big">
                  <motion.span initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
                </div>
              </div>
            </div>
            <div className="pf-pins" aria-label="Showcased badges">
              {pins.length ? (
                pins.map((a) => (
                  <div key={a.id} className="pf-pin">
                    <Badge a={a} size="lg" />
                    <small>{a.name}</small>
                  </div>
                ))
              ) : (
                <button type="button" className="pf-pin-empty" onClick={() => setTab('achievements')}>
                  <Pin size={15} className="ico" /> Pin your best badges
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="container">
          <nav className="pf-tabs" role="tablist" aria-label="Profile sections">
            {TABS.map(([k, label, Icon]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>
                {tab === k && <motion.span layoutId="pf-tab" className="pf-tab-pill" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                <span className="pf-tab-label">
                  <Icon size={16} className="ico" /> {label}
                </span>
              </button>
            ))}
          </nav>

          <div className="pf-body">
            {plays === null && tab !== 'library' && tab !== 'quizlists' ? (
              <p className="muted">Loading your data…</p>
            ) : (
              <>
                {tab === 'overview' && <Overview user={user} stats={stats} plays={plays} unlocked={unlocked} setTab={setTab} />}
                {tab === 'history' && <History plays={plays} />}
                {tab === 'stats' && <Stats user={user} stats={stats} />}
                {tab === 'achievements' && <Achievements user={user} unlockedMap={unlocked} onShowcase={onShowcase} />}
                {tab === 'library' && <Library />}
                {tab === 'quizlists' && <QuizLists user={user} />}
              </>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
