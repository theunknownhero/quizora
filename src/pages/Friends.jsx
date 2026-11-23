// Friends hub: friends (online first), requests, and player search.
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Users, UserPlus, Search, Inbox, Check, X, UserMinus, Clock, Flame, UserRound, Loader2 } from 'lucide-react'
import Navbar from '../components/Navbar.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import PlayerAvatar from '../components/PlayerAvatar.jsx'
import InviteButton from '../components/InviteButton.jsx'
import { useApp } from '../state/AppState.jsx'
import { useSocial } from '../state/SocialState.jsx'
import * as social from '../state/social.js'
import { tierFor } from '../lib/levels.js'
import './profile.css'
import './social.css'

const playedLabel = (d) => {
  if (!d) return 'Hasn’t played yet'
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d + 'T00:00:00')) / 86400000)
  return days <= 0 ? 'Played today' : days === 1 ? 'Played yesterday' : `Played ${days} days ago`
}

// Add / cancel / accept / friends button for any player, based on the relation.
export function FriendAction({ player, relation, friendshipId, onChange }) {
  const { pushToast } = useApp()
  const { refresh } = useSocial()
  const [busy, setBusy] = useState(false)
  const run = async (fn, okText) => {
    setBusy(true)
    try {
      const res = await fn()
      await refresh()
      onChange?.(res)
      if (okText) pushToast({ emoji: '✅', title: 'Friends', text: okText })
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Friends', text: e.message })
    } finally {
      setBusy(false)
    }
  }
  if (relation === 'self') return null
  if (busy)
    return (
      <span className="soc-btn is-ghost" aria-live="polite">
        <Loader2 size={15} className="spin" />
      </span>
    )
  if (relation === 'friend')
    return (
      <span className="soc-chip">
        <Check size={14} /> Friends
      </span>
    )
  if (relation === 'outgoing')
    return (
      <button type="button" className="soc-btn is-ghost" onClick={() => run(() => social.removeFriendship(friendshipId), 'Request cancelled')}>
        <Clock size={15} /> Requested
      </button>
    )
  if (relation === 'incoming')
    return (
      <button type="button" className="soc-btn is-primary" onClick={() => run(() => social.respondFriendRequest(friendshipId, true), `You and ${player.username} are now friends`)}>
        <Check size={15} /> Accept
      </button>
    )
  return (
    <button type="button" className="soc-btn is-primary" onClick={() => run(() => social.sendFriendRequest(player.username), `Request sent to ${player.username}`)}>
      <UserPlus size={15} /> Add friend
    </button>
  )
}

function PlayerRow({ u, online, children, sub }) {
  const tier = tierFor(u.level || 1)
  return (
    <li className="soc-row">
      <Link to={`/u/${u.username}`} className="soc-who">
        <PlayerAvatar username={u.username} level={u.level} online={online} />
        <span className="soc-name">
          <b>{u.username}</b>
          <small>
            <tier.icon size={12} className="ico" /> {tier.title} · Lv {u.level}
            {sub ? ` · ${sub}` : ''}
          </small>
        </span>
      </Link>
      <span className="soc-actions">{children}</span>
    </li>
  )
}

function FriendsTab() {
  const { friends, loaded, isOnline, refresh } = useSocial()
  const { pushToast } = useApp()
  const sorted = [...friends].sort((a, b) => Number(isOnline(b.user.id)) - Number(isOnline(a.user.id)) || a.user.username.localeCompare(b.user.username))
  const onlineCount = friends.filter((f) => isOnline(f.user.id)).length
  const unfriend = async (f) => {
    if (!window.confirm(`Remove ${f.user.username} from your friends?`)) return
    try {
      await social.removeFriendship(f.friendship_id)
      await refresh()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Friends', text: e.message })
    }
  }
  if (!loaded) return <p className="muted">Loading…</p>
  if (!friends.length)
    return (
      <div className="pf-empty">
        <span>
          <Users size={36} />
        </span>
        <p>No friends yet. Find players by username and send a request.</p>
      </div>
    )
  return (
    <>
      <p className="soc-count">
        <i className="dot-on" /> {onlineCount} online · {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
      </p>
      <ul className="soc-list">
        {sorted.map((f) => {
          const on = isOnline(f.user.id)
          return (
            <PlayerRow key={f.friendship_id} u={f.user} online={on} sub={on ? 'Online now' : playedLabel(f.user.last_played_on)}>
              {f.user.day_streak > 0 && (
                <span className="soc-streak" title="Day streak">
                  <Flame size={14} /> {f.user.day_streak}
                </span>
              )}
              <InviteButton friend={f.user} />
              <button type="button" className="soc-btn is-icon is-ghost" onClick={() => unfriend(f)} aria-label={`Remove ${f.user.username}`} title="Remove friend">
                <UserMinus size={15} />
              </button>
            </PlayerRow>
          )
        })}
      </ul>
    </>
  )
}

function RequestsTab() {
  const { incoming, outgoing, loaded } = useSocial()
  if (!loaded) return <p className="muted">Loading…</p>
  return (
    <div className="soc-req">
      <section>
        <h3>Received</h3>
        {incoming.length ? (
          <ul className="soc-list">
            {incoming.map((r) => (
              <PlayerRow key={r.friendship_id} u={r.user}>
                <FriendAction player={r.user} relation="incoming" friendshipId={r.friendship_id} />
                <DeclineButton id={r.friendship_id} />
              </PlayerRow>
            ))}
          </ul>
        ) : (
          <p className="muted small">No new requests.</p>
        )}
      </section>
      <section>
        <h3>Sent</h3>
        {outgoing.length ? (
          <ul className="soc-list">
            {outgoing.map((r) => (
              <PlayerRow key={r.friendship_id} u={r.user}>
                <FriendAction player={r.user} relation="outgoing" friendshipId={r.friendship_id} />
              </PlayerRow>
            ))}
          </ul>
        ) : (
          <p className="muted small">No pending requests.</p>
        )}
      </section>
    </div>
  )
}

function DeclineButton({ id }) {
  const { refresh } = useSocial()
  return (
    <button type="button" className="soc-btn is-icon is-ghost" aria-label="Decline" title="Decline" onClick={() => social.respondFriendRequest(id, false).then(refresh).catch(refresh)}>
      <X size={15} />
    </button>
  )
}

function FindTab() {
  const [q, setQ] = useState('')
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)
  const { isOnline, friends, incoming, outgoing } = useSocial()
  const timer = useRef(null)

  useEffect(() => {
    clearTimeout(timer.current)
    if (q.trim().length < 2) {
      setRes(null)
      return
    }
    setBusy(true)
    timer.current = setTimeout(() => {
      social
        .searchPlayers(q.trim())
        .then(setRes)
        .catch(() => setRes([]))
        .finally(() => setBusy(false))
    }, 280)
    return () => clearTimeout(timer.current)
  }, [q, friends.length, incoming.length, outgoing.length])

  return (
    <>
      <label className="soc-search">
        <Search size={18} aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players by username" aria-label="Search players by username" autoFocus spellCheck="false" autoCapitalize="off" maxLength={20} />
        {busy && <Loader2 size={16} className="spin" />}
      </label>
      {res === null ? (
        <p className="muted small">Type at least 2 letters.</p>
      ) : res.length === 0 ? (
        <p className="muted small">No players found.</p>
      ) : (
        <ul className="soc-list">
          {res.map((p) => (
            <PlayerRow key={p.id} u={p} online={p.relation === 'friend' ? isOnline(p.id) : undefined}>
              <FriendAction player={p} relation={p.relation} friendshipId={p.friendship_id} />
            </PlayerRow>
          ))}
        </ul>
      )}
    </>
  )
}

const TABS = [
  ['friends', 'Friends', Users],
  ['requests', 'Requests', Inbox],
  ['find', 'Find players', UserPlus],
]

export default function Friends() {
  const { user, authReady, accountsEnabled, openAuth } = useApp()
  const { incoming } = useSocial()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'friends'
  const setTab = (k) => setParams(k === 'friends' ? {} : { tab: k }, { replace: true })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  if (!accountsEnabled || (authReady && !user)) {
    return (
      <>
        <Navbar />
        <main className="placeholder">
          <div className="placeholder-card">
            <span className="placeholder-emoji">
              <Users size={64} />
            </span>
            <h1>Friends</h1>
            <p>Log in to add friends, see who’s online and invite them to quizzes.</p>
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

  return (
    <>
      <Navbar />
      <main className="profile soc-page">
        <section className="container soc-head">
          <span className="pf-tier">
            <Users size={14} /> Social
          </span>
          <h1>Friends</h1>
          <p className="muted">Play with friends, compare stats and send quick invites.</p>
          {user && (
            <Link to={`/u/${user.username}`} className="link-btn">
              <UserRound size={14} className="ico" /> See your public profile
            </Link>
          )}
        </section>
        <div className="container">
          <nav className="pf-tabs" role="tablist" aria-label="Friends sections">
            {TABS.map(([k, label, Icon]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>
                {tab === k && <motion.span layoutId="soc-tab" className="pf-tab-pill" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                <span className="pf-tab-label">
                  <Icon size={16} className="ico" /> {label}
                  {k === 'requests' && incoming.length > 0 && <em className="soc-badge">{incoming.length}</em>}
                </span>
              </button>
            ))}
          </nav>
          <AnimatePresence mode="wait">
            <motion.section key={tab} className="pf-card soc-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              {tab === 'friends' && <FriendsTab />}
              {tab === 'requests' && <RequestsTab />}
              {tab === 'find' && <FindTab />}
            </motion.section>
          </AnimatePresence>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
