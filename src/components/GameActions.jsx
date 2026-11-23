// Like / favorite / save toggles + "Add to QuizList" for a game. Used on game cards and pages.
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useApp } from '../state/AppState.jsx'
import { useAnnounce } from './Toaster.jsx'
import * as udata from '../state/userData.js'
import { Heart, Star, Bookmark, ListPlus, Check, Plus, ListChecks } from 'lucide-react'

const ACTIONS = [
  { kind: 'like', Icon: Heart, label: 'Like' },
  { kind: 'favorite', Icon: Star, label: 'Favorite' },
  { kind: 'save', Icon: Bookmark, label: 'Save for later' },
]

const stop = (e) => {
  e.preventDefault()
  e.stopPropagation()
}

function PlaylistMenu({ slug, onClose }) {
  const { user, pushToast } = useApp()
  const announce = useAnnounce()
  const [lists, setLists] = useState(null)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    udata.listPlaylists().then(setLists).catch(() => setLists([]))
    const onDown = (e) => !ref.current?.contains(e.target) && onClose()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const has = (l) => l.playlist_items?.some((i) => i.game_slug === slug)
  const toggle = async (l) => {
    const inList = has(l)
    setLists((ls) => ls.map((x) => (x.id === l.id ? { ...x, playlist_items: inList ? x.playlist_items.filter((i) => i.game_slug !== slug) : [...x.playlist_items, { game_slug: slug }] } : x)))
    try {
      if (inList) await udata.removeFromPlaylist(l.id, slug)
      else await udata.addToPlaylist(l.id, slug, l.playlist_items?.length || 0)
    } catch {
      pushToast({ emoji: '⚠️', title: 'QuizList', text: 'Couldn’t update the QuizList' })
    }
  }
  const create = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    try {
      const pl = await udata.createPlaylist(user.id, { title })
      await udata.addToPlaylist(pl.id, slug, 0)
      setLists((ls) => [{ ...pl, playlist_items: [{ game_slug: slug }] }, ...(ls || [])])
      setTitle('')
      announce(await udata.refreshAchievements())
    } catch {
      pushToast({ emoji: '⚠️', title: 'QuizList', text: 'Couldn’t create the QuizList' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      ref={ref}
      className="pl-menu"
      role="dialog"
      aria-label="Add to QuizList"
      onClick={stop}
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.96 }}
      transition={{ duration: 0.16 }}
    >
      <b className="pl-menu-title">Add to QuizList</b>
      {lists === null ? (
        <span className="pl-menu-empty">Loading…</span>
      ) : lists.length === 0 ? (
        <span className="pl-menu-empty">No QuizLists yet. Create your first one:</span>
      ) : (
        <ul>
          {lists.map((l) => (
            <li key={l.id}>
              <button type="button" className={has(l) ? 'is-on' : ''} onClick={() => toggle(l)}>
                <ListChecks size={15} aria-hidden="true" /> <span className="pl-menu-name">{l.title}</span> <i>{has(l) ? <Check size={14} /> : <Plus size={14} />}</i>
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={create} className="pl-menu-new">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="New QuizList name" aria-label="New QuizList name" />
        <button type="submit" disabled={busy || !title.trim()}>
          Create
        </button>
      </form>
    </motion.div>
  )
}

export default function GameActions({ slug, compact = false }) {
  const { user, flags, toggleFlag, openAuth, accountsEnabled } = useApp()
  const announce = useAnnounce()
  const [menu, setMenu] = useState(false)
  if (!accountsEnabled) return null

  const act = async (e, kind) => {
    stop(e)
    if (!user) return openAuth('login')
    try {
      announce((await toggleFlag(slug, kind)) || [])
    } catch {
      /* reverted inside toggleFlag */
    }
  }

  return (
    <div className={`gact ${compact ? 'is-compact' : ''}`} onClick={stop}>
      {ACTIONS.map((a) => {
        const on = flags[a.kind]?.has(slug)
        return (
          <motion.button
            key={a.kind}
            type="button"
            className={`gact-btn ${on ? 'is-on' : ''}`}
            aria-pressed={!!on}
            aria-label={a.label}
            title={a.label}
            whileTap={{ scale: 0.8 }}
            onClick={(e) => act(e, a.kind)}
          >
            <a.Icon size={16} strokeWidth={2.2} fill={on ? 'currentColor' : 'none'} aria-hidden="true" />
          </motion.button>
        )
      })}
      <div className="gact-pl">
        <button
          type="button"
          className="gact-btn"
          aria-label="Add to QuizList"
          title="Add to QuizList"
          aria-expanded={menu}
          onClick={(e) => {
            stop(e)
            if (!user) return openAuth('login')
            setMenu((m) => !m)
          }}
        >
          <ListPlus size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
        <AnimatePresence>{menu && <PlaylistMenu slug={slug} onClose={() => setMenu(false)} />}</AnimatePresence>
      </div>
    </div>
  )
}
