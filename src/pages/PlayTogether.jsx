// Multiplayer hub: quick 1v1 match, create a party, join with a code, browse public parties.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Swords, PartyPopper, KeyRound, Globe, Users, Zap, Loader2, RefreshCw, ArrowRight, Timer, ListOrdered, Lock } from 'lucide-react'
import Navbar from '../components/Navbar.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import Aurora from '../components/Aurora.jsx'
import { useApp } from '../state/AppState.jsx'
import { useSocial } from '../state/SocialState.jsx'
import * as rooms from '../state/rooms.js'
import { games } from '../data/games.js'
import { playableBy } from '../lib/age.js'
import './profile.css'
import './party.css'

const AURORA = ['#7c3aed', '#ec4899', '#22d3ee']
const gameBySlug = (s) => games.find((g) => g.slug === s)

export function GameSelect({ value, onChange, id }) {
  const { user } = useApp()
  const list = games.filter((g) => g.status === 'live' && playableBy(g, user))
  return (
    <select id={id} className="pt-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {list.map((g) => (
        <option key={g.slug} value={g.slug}>
          {g.emoji} {g.title}
        </option>
      ))}
    </select>
  )
}

function Seg({ options, value, onChange, fmt = (x) => x, label }) {
  return (
    <div className="seg pt-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={value === o} className={value === o ? 'is-on' : ''} onClick={() => onChange(o)}>
          {fmt(o)}
        </button>
      ))}
    </div>
  )
}

export default function PlayTogether() {
  const { user, authReady, accountsEnabled, openAuth, pushToast } = useApp()
  const social = useSocial()
  const navigate = useNavigate()
  const firstLive = games.find((g) => g.status === 'live')?.slug
  const [qm, setQm] = useState({ game: firstLive, seconds: 10 })
  const [party, setParty] = useState({ game: firstLive, count: 10, seconds: 15, scoring: 'speed', max_players: 8, isPublic: false })
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(null)
  const [publicRooms, setPublicRooms] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const loadPublic = () =>
    rooms
      .listPublicRooms()
      .then(setPublicRooms)
      .catch(() => setPublicRooms([]))
  useEffect(() => {
    if (!user) return
    loadPublic()
    const t = setInterval(loadPublic, 10000)
    return () => clearInterval(t)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const guard = () => {
    if (!user) {
      openAuth('login')
      return false
    }
    return true
  }
  const run = async (key, fn) => {
    if (!guard()) return
    setBusy(key)
    try {
      const res = await fn()
      navigate(`/room/${res.code}`)
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Play together', text: e.message })
    } finally {
      setBusy(null)
    }
  }

  const findMatch = () => run('qm', () => rooms.quickMatch(qm.game, qm.seconds))
  const createParty = () => run('party', () => rooms.createRoom(party.game, { count: party.count, seconds: party.seconds, scoring: party.scoring, max_players: party.max_players }, party.isPublic))
  const join = (c) => run('join', () => rooms.joinRoom(c))

  if (!accountsEnabled) {
    return (
      <>
        <Navbar />
        <main className="placeholder">
          <div className="placeholder-card">
            <span className="placeholder-emoji">
              <Users size={64} />
            </span>
            <h1>Play together</h1>
            <p>Multiplayer needs accounts, which aren’t set up on this copy of the site.</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="profile pt-page">
        <section className="pt-hero">
          <div className="pf-hero-bg">
            <Aurora colors={AURORA} speed={0.5} />
            <div className="hero-fade" />
          </div>
          <div className="container pt-hero-in">
            <span className="pf-tier">
              <Users size={14} /> Multiplayer
            </span>
            <h1>Play together</h1>
            <p className="muted">Race a stranger in a 1v1, throw a party for up to 8 friends, or play a room on your own. Fastest right answers win.</p>
            {authReady && !user && (
              <button type="button" className="btn btn-primary btn-lg" onClick={() => openAuth('login')}>
                Log in to play
              </button>
            )}
          </div>
        </section>

        <div className="container pt-grid">
          <motion.section className="pf-card pt-card pt-card-qm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="pt-ico">
              <Swords size={24} />
            </span>
            <h2>Quick match</h2>
            <p className="muted">Get paired with another player for a 10-question duel.</p>
            <label className="pt-field">
              <span>Quiz</span>
              <GameSelect value={qm.game} onChange={(game) => setQm((s) => ({ ...s, game }))} />
            </label>
            <div className="pt-field">
              <span>Time per question</span>
              <Seg label="Time per question" options={[10, 15]} value={qm.seconds} onChange={(seconds) => setQm((s) => ({ ...s, seconds }))} fmt={(x) => `${x}s`} />
            </div>
            <button type="button" className="btn btn-primary btn-lg pt-go" onClick={findMatch} disabled={!!busy}>
              {busy === 'qm' ? <Loader2 size={18} className="spin" /> : <Zap size={18} />} Find opponent
            </button>
          </motion.section>

          <motion.section className="pf-card pt-card pt-card-party" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
            <span className="pt-ico">
              <PartyPopper size={24} />
            </span>
            <h2>Create a party</h2>
            <p className="muted">Pick the rules, share the code, start when you’re ready. Works solo too.</p>
            <label className="pt-field">
              <span>Quiz</span>
              <GameSelect value={party.game} onChange={(game) => setParty((s) => ({ ...s, game }))} />
            </label>
            <div className="pt-row">
              <div className="pt-field">
                <span>
                  <ListOrdered size={13} className="ico" /> Questions
                </span>
                <Seg label="Questions" options={rooms.SETTING_OPTIONS.count} value={party.count} onChange={(count) => setParty((s) => ({ ...s, count }))} />
              </div>
              <div className="pt-field">
                <span>
                  <Timer size={13} className="ico" /> Seconds each
                </span>
                <Seg label="Seconds per question" options={rooms.SETTING_OPTIONS.seconds} value={party.seconds} onChange={(seconds) => setParty((s) => ({ ...s, seconds }))} />
              </div>
            </div>
            <div className="pt-row">
              <div className="pt-field">
                <span>Scoring</span>
                <Seg label="Scoring" options={['speed', 'classic']} value={party.scoring} onChange={(scoring) => setParty((s) => ({ ...s, scoring }))} fmt={(x) => (x === 'speed' ? 'Speed bonus' : 'Classic')} />
              </div>
              <label className="pt-field">
                <span>Max players</span>
                <select className="pt-select" value={party.max_players} onChange={(e) => setParty((s) => ({ ...s, max_players: Number(e.target.value) }))}>
                  {rooms.SETTING_OPTIONS.max_players.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="pt-check">
              <input type="checkbox" checked={party.isPublic} onChange={(e) => setParty((s) => ({ ...s, isPublic: e.target.checked }))} />
              {party.isPublic ? <Globe size={15} /> : <Lock size={15} />} {party.isPublic ? 'Public: anyone can find and join it' : 'Private: only people with the code'}
            </label>
            <button type="button" className="btn btn-primary btn-lg pt-go" onClick={createParty} disabled={!!busy}>
              {busy === 'party' ? <Loader2 size={18} className="spin" /> : <PartyPopper size={18} />} Create party
            </button>
          </motion.section>

          <motion.section className="pf-card pt-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <span className="pt-ico">
              <KeyRound size={24} />
            </span>
            <h2>Join with a code</h2>
            <p className="muted">Got a 6-character code from a friend?</p>
            <form
              className="pt-code"
              onSubmit={(e) => {
                e.preventDefault()
                if (code.trim().length === 6) join(code.trim())
              }}
            >
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="ABC123"
                aria-label="Room code"
                autoCapitalize="characters"
                spellCheck="false"
                inputMode="text"
              />
              <button type="submit" className="btn btn-primary" disabled={code.length !== 6 || !!busy}>
                {busy === 'join' ? <Loader2 size={18} className="spin" /> : <ArrowRight size={18} />} Join
              </button>
            </form>
            {user && social?.onlineFriends.length > 0 && (
              <p className="pt-online">
                <i className="dot-on" /> {social.onlineFriends.length} {social.onlineFriends.length === 1 ? 'friend is' : 'friends are'} online. Create a party and invite them from the lobby.
              </p>
            )}
            {user && (
              <Link to="/friends" className="link-btn">
                <Users size={14} className="ico" /> Manage friends
              </Link>
            )}
          </motion.section>
        </div>

        {user && (
          <section className="container pt-public">
            <div className="pf-card">
              <div className="pf-card-head">
                <h3>
                  <Globe size={17} className="ico" /> Public parties
                </h3>
                <button type="button" className="soc-btn is-ghost" onClick={loadPublic} aria-label="Refresh public parties">
                  <RefreshCw size={15} /> Refresh
                </button>
              </div>
              {publicRooms === null ? (
                <p className="muted small">Loading…</p>
              ) : publicRooms.length === 0 ? (
                <p className="muted small">No public parties right now. Create one and it will show up here.</p>
              ) : (
                <ul className="pt-rooms">
                  {publicRooms.map((r) => {
                    const g = gameBySlug(r.game_slug)
                    return (
                      <li key={r.code}>
                        <span className="play-thumb" style={{ background: g ? `linear-gradient(135deg, ${g.gradient[0]}, ${g.gradient[1]})` : '#333' }}>
                          {g?.emoji}
                        </span>
                        <span className="pt-room-main">
                          <b>{g?.title || r.game_slug}</b>
                          <small>
                            Hosted by {r.host} · {r.settings.count} questions · {r.settings.seconds}s
                          </small>
                        </span>
                        <span className="pt-room-count">
                          <Users size={14} /> {r.players}/{r.settings.max_players}
                        </span>
                        <button type="button" className="soc-btn is-primary" onClick={() => join(r.code)} disabled={!!busy}>
                          Join
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  )
}
