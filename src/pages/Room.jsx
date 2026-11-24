// Live multiplayer room: /room/:code. Lobby → countdown → timed questions with reveals → results.
// The server decides timing and scores; this page follows it through Realtime updates plus a light poll.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  Copy, Check, X, Share2, Crown, LogOut, Play, Loader2, UserX, Users, Send, Timer, ListOrdered, Globe, Lock, Trophy, RotateCcw, Flame,
  Swords, Zap, Medal, Sparkles, ArrowLeft, CircleCheck, Hourglass,
} from 'lucide-react'
import Navbar from '../components/Navbar.jsx'
import PlayerAvatar from '../components/PlayerAvatar.jsx'
import { useApp } from '../state/AppState.jsx'
import { useSocial } from '../state/SocialState.jsx'
import { supabase } from '../lib/supabase.js'
import * as rooms from '../state/rooms.js'
import { games } from '../data/games.js'
import { GameSelect } from './PlayTogether.jsx'
import QuestionInput, { QuestionHeader } from '../components/QuestionInput.jsx'
import './profile.css'
import './social.css'
import './party.css'

const gameBySlug = (s) => games.find((g) => g.slug === s)

// ---------- clock ----------
function useNow(active, ms = 200) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [active, ms])
  return now
}

// ---------- pieces ----------
function CodeBox({ code }) {
  const { pushToast } = useApp()
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/room/${code}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Join my Quizora party', text: `Join my quiz party with code ${code}`, url })
      else {
        await navigator.clipboard.writeText(url)
        pushToast({ emoji: '🔗', title: 'Link copied', text: 'Send it to your friends!' })
      }
    } catch {
      /* cancelled */
    }
  }
  return (
    <div className="rm-code">
      <small>Room code</small>
      <div className="rm-code-row">
        <b aria-label={`Room code ${code.split('').join(' ')}`}>{code}</b>
        <button type="button" className="soc-btn is-icon" onClick={copy} aria-label="Copy code" title="Copy code">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
        <button type="button" className="soc-btn is-icon" onClick={share} aria-label="Share link" title="Share link">
          <Share2 size={16} />
        </button>
      </div>
    </div>
  )
}

function InviteFriends({ room }) {
  const social = useSocial()
  const { pushToast } = useApp()
  const [sent, setSent] = useState(() => new Set())
  const inRoom = new Set(room.players.filter((p) => !p.left).map((p) => p.id))
  const list = (social?.friends || [])
    .filter((f) => !inRoom.has(f.user.id))
    .sort((a, b) => Number(social.isOnline(b.user.id)) - Number(social.isOnline(a.user.id)))
  const invite = async (f) => {
    try {
      await rooms.sendRoomInvite(f.user.id, room.id)
      setSent((s) => new Set(s).add(f.user.id))
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Invite', text: e.message })
    }
  }
  return (
    <section className="pf-card rm-invite">
      <h3>
        <Send size={16} className="ico" /> Invite friends
      </h3>
      {list.length === 0 ? (
        <p className="muted small">
          {social?.friends.length ? 'All your friends are here!' : 'Add friends to invite them here, or share the code.'}{' '}
          {!social?.friends.length && (
            <Link to="/friends?tab=find" className="link-btn">
              Find players
            </Link>
          )}
        </p>
      ) : (
        <ul className="soc-list">
          {list.slice(0, 12).map((f) => {
            const on = social.isOnline(f.user.id)
            return (
              <li key={f.friendship_id} className="soc-row">
                <span className="soc-who">
                  <PlayerAvatar username={f.user.username} level={f.user.level} online={on} size={36} />
                  <span className="soc-name">
                    <b>{f.user.username}</b>
                    <small>{on ? 'Online' : 'Offline'}</small>
                  </span>
                </span>
                <button type="button" className={`soc-btn ${sent.has(f.user.id) ? 'is-ghost' : 'is-primary'}`} disabled={sent.has(f.user.id)} onClick={() => invite(f)}>
                  {sent.has(f.user.id) ? <Check size={15} /> : <Send size={15} />} {sent.has(f.user.id) ? 'Sent' : 'Invite'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function Settings({ room, onError }) {
  const s = room.settings
  const edit = room.is_host && room.mode === 'party'
  const save = async (patch) => {
    try {
      await rooms.updateRoom(room.id, patch)
    } catch (e) {
      onError(e.message)
    }
  }
  const g = gameBySlug(room.game_slug)
  if (!edit)
    return (
      <div className="rm-chips">
        <span>
          {g?.emoji} {g?.title}
        </span>
        <span>
          <ListOrdered size={14} /> {s.count} questions
        </span>
        <span>
          <Timer size={14} /> {s.seconds}s each
        </span>
        <span>
          <Zap size={14} /> {s.scoring === 'speed' ? 'Speed bonus' : 'Classic'}
        </span>
        <span>
          <Users size={14} /> Up to {s.max_players}
        </span>
        {room.mode === 'party' && <span>{room.is_public ? <><Globe size={14} /> Public</> : <><Lock size={14} /> Private</>}</span>}
      </div>
    )
  const opt = (key, values, fmt = (x) => x) => (
    <div className="seg pt-seg">
      {values.map((v) => (
        <button key={v} type="button" className={s[key] === v ? 'is-on' : ''} onClick={() => save({ settings: { ...s, [key]: v } })}>
          {fmt(v)}
        </button>
      ))}
    </div>
  )
  return (
    <div className="rm-settings">
      <label className="pt-field">
        <span>Quiz</span>
        <GameSelect value={room.game_slug} onChange={(game) => save({ game })} />
      </label>
      <div className="pt-field">
        <span>
          <ListOrdered size={13} className="ico" /> Questions
        </span>
        {opt('count', rooms.SETTING_OPTIONS.count)}
      </div>
      <div className="pt-field">
        <span>
          <Timer size={13} className="ico" /> Seconds each
        </span>
        {opt('seconds', rooms.SETTING_OPTIONS.seconds)}
      </div>
      <div className="pt-field">
        <span>Scoring</span>
        {opt('scoring', ['speed', 'classic'], (x) => (x === 'speed' ? 'Speed bonus' : 'Classic'))}
      </div>
      <div className="pt-field">
        <span>Max players</span>
        {opt('max_players', rooms.SETTING_OPTIONS.max_players)}
      </div>
      <label className="pt-check">
        <input type="checkbox" checked={room.is_public} onChange={(e) => save({ isPublic: e.target.checked })} />
        {room.is_public ? <Globe size={15} /> : <Lock size={15} />} {room.is_public ? 'Public party' : 'Private party'}
      </label>
    </div>
  )
}

function Lobby({ room, onLeave, setError }) {
  const me = room.players.find((p) => p.id === room.me)
  const active = room.players.filter((p) => !p.left)
  const ready = active.filter((p) => p.ready).length
  const [busy, setBusy] = useState(false)
  const now = useNow(room.mode === 'match', 1000)
  const [since] = useState(Date.now())

  const act = async (fn) => {
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (room.mode === 'match') {
    const secs = Math.floor((now - since) / 1000)
    return (
      <div className="rm-wait">
        <motion.span className="rm-radar" animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}>
          <Swords size={40} />
        </motion.span>
        <h2>Finding an opponent…</h2>
        <p className="muted">
          {gameBySlug(room.game_slug)?.title} · {room.settings.seconds}s per question · {secs}s
        </p>
        {secs > 45 && <p className="muted small">Quiet right now. Keep waiting, or create a party and invite friends instead.</p>}
        <div className="rm-actions">
          <button type="button" className="btn btn-ghost" onClick={onLeave}>
            <X size={16} /> Cancel
          </button>
          {secs > 45 && (
            <Link to="/play-together" className="btn btn-primary" onClick={onLeave}>
              Create a party
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rm-lobby">
      <div className="rm-lobby-main">
        <section className="pf-card">
          <div className="rm-lobby-head">
            <CodeBox code={room.code} />
            <div className="rm-lobby-status">
              <b>
                {active.length}/{room.settings.max_players}
              </b>
              <small>players · {ready} ready</small>
            </div>
          </div>
          <ul className="rm-players">
            <AnimatePresence>
              {active.map((p) => (
                <motion.li key={p.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className={p.ready ? 'is-ready' : ''}>
                  <PlayerAvatar username={p.username} level={p.level} size={52} />
                  <b>
                    {p.id === room.host && <Crown size={13} className="rm-crown" aria-label="Host" />} {p.username}
                    {p.id === room.me && <em> (you)</em>}
                  </b>
                  <small>{p.ready ? <><CircleCheck size={13} /> Ready</> : <><Hourglass size={13} /> Not ready</>}</small>
                  {room.is_host && p.id !== room.me && (
                    <button type="button" className="rm-kick" aria-label={`Remove ${p.username}`} title="Remove" onClick={() => act(() => rooms.kickPlayer(room.id, p.id))}>
                      <UserX size={14} />
                    </button>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
            {Array.from({ length: Math.max(0, Math.min(room.settings.max_players, 8) - active.length) }).map((_, i) => (
              <li key={`empty${i}`} className="is-empty">
                <span className="rm-empty-av" />
                <small>Waiting…</small>
              </li>
            ))}
          </ul>
          <div className="rm-actions">
            {room.is_host ? (
              <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={() => act(() => rooms.startRoom(room.id))}>
                {busy ? <Loader2 size={18} className="spin" /> : <Play size={18} fill="currentColor" />} {active.length === 1 ? 'Start solo' : 'Start game'}
              </button>
            ) : (
              <button type="button" className={`btn btn-lg ${me?.ready ? 'btn-ghost' : 'btn-primary'}`} disabled={busy} onClick={() => act(() => rooms.setReady(room.id, !me?.ready))}>
                {me?.ready ? <><X size={18} /> Not ready</> : <><Check size={18} /> I’m ready</>}
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={onLeave}>
              <LogOut size={16} /> Leave
            </button>
          </div>
          {!room.is_host && <p className="muted small rm-hint">Waiting for the host to start.</p>}
          {room.is_host && ready < active.length && <p className="muted small rm-hint">You can start any time. Players who aren’t ready still join in.</p>}
        </section>
        <section className="pf-card">
          <h3>Rules</h3>
          <Settings room={room} onError={setError} />
        </section>
      </div>
      <InviteFriends room={room} />
    </div>
  )
}

function Scoreboard({ room, compact }) {
  const list = room.players.filter((p) => !p.left)
  return (
    <ol className={`rm-board ${compact ? 'is-compact' : ''}`}>
      <AnimatePresence>
        {list.map((p, i) => (
          <motion.li key={p.id} layout transition={{ type: 'spring', stiffness: 400, damping: 34 }} className={p.id === room.me ? 'is-me' : ''}>
            <span className="rm-rank">{i + 1}</span>
            <PlayerAvatar username={p.username} level={p.level} size={30} showLevel={false} />
            <span className="rm-name">{p.username}</span>
            {room.status === 'playing' && !compact && (
              <span className={`rm-state ${p.answered ? 'is-done' : ''}`} title={p.answered ? 'Answered' : 'Thinking'}>
                {p.answered ? <Check size={13} /> : <Hourglass size={13} />}
              </span>
            )}
            {p.last_result && compact && (
              <span className={`rm-delta ${p.last_result.correct ? 'ok' : 'bad'}`}>{p.last_result.correct ? `+${p.last_result.points}` : '0'}</span>
            )}
            {p.streak >= 3 && (
              <span className="rm-streak">
                <Flame size={12} /> {p.streak}
              </span>
            )}
            <b className="rm-score">{p.score}</b>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  )
}

function Playing({ room, offset, refetch, setError }) {
  const ui = rooms.gameUi(room.game_slug)
  const now = useNow(true, 100) + offset
  const startsAt = new Date(room.question_started_at).getTime()
  const secs = room.settings.seconds
  const endsAt = startsAt + secs * 1000
  const idx = room.current_index
  const q = room.question && room.question.index === idx ? room.question : null
  const [mine, setMine] = useState({}) // index -> {choice, correct, points} | 'pending'
  const [pendingChoice, setPendingChoice] = useState(null)
  const advanced = useRef({})
  const fetchedFor = useRef(-1)
  const active = room.players.filter((p) => !p.left)
  const allAnswered = active.length > 0 && active.every((p) => p.answered)
  const myAnswer = mine[idx] && mine[idx] !== 'pending' ? mine[idx] : room.my_answer
  const phase = now < startsAt ? (idx === 0 ? 'countdown' : 'reveal') : 'question'

  // Load the question as soon as it opens
  useEffect(() => {
    if (phase === 'question' && !q && fetchedFor.current !== idx) {
      fetchedFor.current = idx
      refetch()
    }
  }, [phase, q, idx, refetch])
  useEffect(() => {
    const wait = startsAt - (Date.now() + offset)
    if (wait <= 0) return
    const t = setTimeout(refetch, wait + 50)
    return () => clearTimeout(t)
  }, [startsAt, offset, refetch])

  // Move on when everyone answered or time ran out (first caller wins on the server)
  useEffect(() => {
    if (phase !== 'question') return
    const due = allAnswered || now >= endsAt + 1200
    const last = advanced.current[idx] || 0
    if (due && Date.now() - last > 2500) {
      advanced.current[idx] = Date.now()
      rooms.advanceRoom(room.id, idx).then(refetch).catch(() => {})
    }
  }, [phase, allAnswered, now, endsAt, idx, room.id, refetch])

  const pick = async (choice) => {
    if (mine[idx] || room.my_answer || now > endsAt + 900) return
    setMine((m) => ({ ...m, [idx]: 'pending' }))
    setPendingChoice(choice)
    try {
      const res = await rooms.submitRoomAnswer(room.id, idx, choice)
      setMine((m) => ({ ...m, [idx]: { choice, ...res } }))
      refetch()
    } catch (e) {
      setMine((m) => ({ ...m, [idx]: undefined }))
      setError(e.message)
    }
  }

  if (phase === 'countdown') {
    const n = Math.max(1, Math.ceil((startsAt - now) / 1000))
    return (
      <div className="rm-stage rm-count">
        <small>
          {gameBySlug(room.game_slug)?.title} · {room.total} questions
        </small>
        <AnimatePresence mode="popLayout">
          <motion.b key={n} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}>
            {n}
          </motion.b>
        </AnimatePresence>
        <p>Get ready!</p>
      </div>
    )
  }

  if (phase === 'reveal') {
    const last = room.last
    const myLast = room.players.find((p) => p.id === room.me)?.last_result
    return (
      <div className="rm-play">
        <div className="rm-stage rm-reveal">
          <div className="rm-progress">
            Question {idx} of {room.total} · next in {Math.max(0, Math.ceil((startsAt - now) / 1000))}s
          </div>
          {last && (
            <>
              <span className="rm-q-emoji">{last.emoji}</span>
              <h2>{last.item}</h2>
              {(last.kind || 'truefalse') === 'truefalse' ? (
                <p className={`rm-answer ${last.answer ? 'is-yes' : 'is-no'}`}>{last.answer ? ui.yesLong : ui.noLong}</p>
              ) : (
                <p className="rm-answer is-yes">{last.answer_text}</p>
              )}
              <p className={`rm-you ${myLast?.correct ? 'ok' : 'bad'}`}>
                {myLast ? (myLast.correct ? <><Check size={16} /> +{myLast.points} points</> : <><X size={16} /> Missed</>) : <><Hourglass size={16} /> No answer</>}
              </p>
              {last.fact && <p className="rm-fact">{last.fact}</p>}
            </>
          )}
        </div>
        <aside className="pf-card rm-side">
          <h3>Leaderboard</h3>
          <Scoreboard room={room} compact />
        </aside>
      </div>
    )
  }

  // question
  const left = Math.max(0, endsAt - now)
  const pct = Math.min(100, (left / (secs * 1000)) * 100)
  const pending = mine[idx] === 'pending'
  return (
    <div className="rm-play">
      <div className="rm-stage rm-question">
        <div className="rm-progress">
          Question {idx + 1} of {room.total}
          <span className={`rm-timer ${left < 4000 ? 'is-low' : ''}`}>
            <Timer size={14} /> {Math.ceil(left / 1000)}s
          </span>
        </div>
        <div className="rm-timebar">
          <span style={{ width: `${pct}%` }} />
        </div>
        {q ? (
          <motion.div key={q.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rm-q">
            <QuestionHeader q={q} prompt={ui.question} />
            {/* The right answer is only revealed after everyone answers, so no result is passed here */}
            <QuestionInput q={q} yes={ui.yes} no={ui.no} disabled={!!myAnswer || left <= 0} pending={pending} picked={myAnswer?.choice ?? pendingChoice} onSubmit={pick} />
            <p className="rm-after" aria-live="polite">
              {myAnswer ? (
                myAnswer.correct ? (
                  <span className="ok">
                    <Check size={16} /> Correct! +{myAnswer.points}
                  </span>
                ) : (
                  <span className="bad">
                    <X size={16} /> Not quite
                  </span>
                )
              ) : left <= 0 ? (
                'Time’s up!'
              ) : (q.kind || 'truefalse') === 'truefalse' ? (
                <span className="muted small">
                  <kbd>←</kbd> {ui.yes} · <kbd>→</kbd> {ui.no}
                </span>
              ) : null}
            </p>
            {myAnswer && !allAnswered && <p className="muted small">Waiting for others…</p>}
          </motion.div>
        ) : (
          <Loader2 size={36} className="spin rm-loading" />
        )}
      </div>
      <aside className="pf-card rm-side">
        <h3>Players</h3>
        <Scoreboard room={room} />
      </aside>
    </div>
  )
}

function Results({ room, onLeave, setError }) {
  const { reloadUser } = useApp()
  const list = room.players.filter((p) => p.final_rank != null).sort((a, b) => a.final_rank - b.final_rank)
  const me = list.find((p) => p.id === room.me)
  const solo = list.length === 1
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    reloadUser()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const podium = [list[1], list[0], list[2]]
  return (
    <div className="rm-results">
      <motion.div className="rm-res-head" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <span className="rm-res-ico">{me?.final_rank === 1 && !solo ? <Trophy size={44} /> : solo ? <Sparkles size={44} /> : <Medal size={44} />}</span>
        <h1>{solo ? 'Room complete!' : me?.final_rank === 1 ? 'You won!' : me ? `You finished #${me.final_rank}` : 'Game over'}</h1>
        {me && (
          <p className="muted">
            {me.correct}/{room.total} correct · {me.score} points · best streak {me.best_streak}
          </p>
        )}
        {me && <span className="rm-xp">+{me.xp_earned} XP</span>}
      </motion.div>

      {!solo && (
        <div className="rm-podium">
          {podium.map((p, i) =>
            p ? (
              <motion.div key={p.id} className={`rm-pod rm-pod-${p.final_rank}`} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.12 }}>
                <PlayerAvatar username={p.username} level={p.level} size={i === 1 ? 72 : 56} />
                <b>{p.username}</b>
                <small>{p.score} pts</small>
                <span className="rm-pod-bar">{p.final_rank}</span>
              </motion.div>
            ) : (
              <span key={`e${i}`} />
            )
          )}
        </div>
      )}

      <section className="pf-card rm-res-table">
        <table className="pf-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Score</th>
              <th>Correct</th>
              <th>Streak</th>
              <th>XP</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className={p.id === room.me ? 'is-me' : ''}>
                <td>{p.final_rank}</td>
                <td>
                  <Link to={`/u/${p.username}`}>{p.username}</Link>
                </td>
                <td>{p.score}</td>
                <td>
                  {p.correct}/{room.total}
                </td>
                <td>{p.best_streak}</td>
                <td>+{p.xp_earned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="rm-actions">
        {room.is_host && room.mode === 'party' ? (
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await rooms.rematchRoom(room.id)
              } catch (e) {
                setError(e.message)
              } finally {
                setBusy(false)
              }
            }}
          >
            <RotateCcw size={18} /> Play again
          </button>
        ) : room.mode === 'party' ? (
          <span className="muted small">Waiting for the host to start a rematch…</span>
        ) : (
          <Link to="/play-together" className="btn btn-primary btn-lg" onClick={onLeave}>
            <Swords size={18} /> New match
          </Link>
        )}
        <button type="button" className="btn btn-ghost" onClick={onLeave}>
          <LogOut size={16} /> Leave
        </button>
      </div>
    </div>
  )
}

// ---------- page ----------
export default function Room() {
  const { code: rawCode } = useParams()
  const code = (rawCode || '').toUpperCase()
  const navigate = useNavigate()
  const { user, authReady, accountsEnabled, openAuth, pushToast } = useApp()
  const [room, setRoom] = useState(null)
  const [fatal, setFatal] = useState(null)
  const [offset, setOffset] = useState(0)
  const inflight = useRef(false)
  const again = useRef(false)

  const setError = useCallback((m) => pushToast({ emoji: '⚠️', title: 'Room', text: m }), [pushToast])

  const refetch = useCallback(async () => {
    if (inflight.current) {
      again.current = true
      return
    }
    inflight.current = true
    try {
      const t0 = Date.now()
      const r = await rooms.getRoom(code)
      const t1 = Date.now()
      setOffset(new Date(r.now).getTime() - (t0 + t1) / 2)
      setRoom(r)
    } catch (e) {
      if (e.code === 'not_member') {
        try {
          await rooms.joinRoom(code)
          inflight.current = false
          return refetch()
        } catch (je) {
          setFatal(je.message)
        }
      } else if (e.code === 'room_not_found') setFatal(e.message)
    } finally {
      inflight.current = false
      if (again.current) {
        again.current = false
        refetch()
      }
    }
  }, [code])

  useEffect(() => {
    if (!user) return
    setFatal(null)
    refetch()
  }, [user?.id, refetch]) // eslint-disable-line react-hooks/exhaustive-deps

  // Live updates for this room + a safety poll
  const roomId = room?.id
  useEffect(() => {
    if (!roomId) return
    const ch = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, () => refetch())
      .subscribe()
    const poll = setInterval(refetch, 3000)
    return () => {
      clearInterval(poll)
      supabase.removeChannel(ch)
    }
  }, [roomId, refetch])

  // Kicked or room closed
  useEffect(() => {
    if (!room) return
    if (room.status === 'closed') setFatal('This room was closed.')
    else if (!room.players.some((p) => p.id === room.me)) setFatal('You were removed from this room.')
  }, [room])

  const leave = async () => {
    if (room) await rooms.leaveRoom(room.id).catch(() => {})
    navigate('/play-together')
  }

  const body = useMemo(() => {
    if (!room) return null
    if (room.status === 'lobby') return <Lobby room={room} onLeave={leave} setError={setError} />
    if (room.status === 'playing') return <Playing room={room} offset={offset} refetch={refetch} setError={setError} />
    return <Results room={room} onLeave={leave} setError={setError} />
  }, [room, offset]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!accountsEnabled || (authReady && !user)) {
    return (
      <>
        <Navbar />
        <main className="placeholder">
          <div className="placeholder-card">
            <span className="placeholder-emoji">
              <Users size={64} />
            </span>
            <h1>Join room {code}</h1>
            <p>Log in to join this quiz party.</p>
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

  if (fatal) {
    return (
      <>
        <Navbar />
        <main className="placeholder">
          <div className="placeholder-card">
            <span className="placeholder-emoji">
              <X size={64} />
            </span>
            <h1>Can’t open room</h1>
            <p>{fatal}</p>
            <Link to="/play-together" className="btn btn-primary btn-lg">
              <ArrowLeft size={18} /> Play together
            </Link>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="profile rm-page">
        <div className="container">
          {!room ? (
            <div className="rm-stage">
              <Loader2 size={40} className="spin" />
            </div>
          ) : (
            <>
              <div className="rm-top">
                <Link to="/play-together" className="link-btn">
                  <ArrowLeft size={14} className="ico" /> Play together
                </Link>
                <span className="rm-top-game">
                  {gameBySlug(room.game_slug)?.emoji} {gameBySlug(room.game_slug)?.title} · {room.mode === 'match' ? '1v1 match' : 'Party'} · <b>{room.code}</b>
                </span>
              </div>
              {body}
            </>
          )}
        </div>
      </main>
    </>
  )
}

