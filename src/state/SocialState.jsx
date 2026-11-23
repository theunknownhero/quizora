// Friends list, who's online (Supabase Realtime presence) and live friend requests / game invites.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { useApp } from './AppState.jsx'
import * as social from './social.js'
import { games } from '../data/games.js'

const Ctx = createContext(null)
const EMPTY = { friends: [], incoming: [], outgoing: [] }

export function SocialProvider({ children }) {
  const { user, pushToast } = useApp()
  const navigate = useNavigate()
  const [lists, setLists] = useState(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [online, setOnline] = useState(() => new Set())
  const [invites, setInvites] = useState([])
  const seenInvites = useRef(new Set())
  const seenRequests = useRef(null)

  const refresh = useCallback(async () => {
    if (!user) return
    try {
      const rows = await social.listFriends()
      const next = { friends: [], incoming: [], outgoing: [] }
      rows.forEach((r) => next[r.status === 'friend' ? 'friends' : r.status].push(r))
      // Toast new incoming requests (not the ones that were already there on first load)
      if (seenRequests.current) {
        next.incoming
          .filter((r) => !seenRequests.current.has(r.friendship_id))
          .forEach((r) =>
            pushToast({ emoji: '👋', title: 'Friend request', text: `${r.user.username} wants to be friends`, duration: 8000, action: { label: 'View', onClick: () => navigate('/friends?tab=requests') } })
          )
      }
      seenRequests.current = new Set(next.incoming.map((r) => r.friendship_id))
      setLists(next)
    } catch {
      /* keep old list */
    } finally {
      setLoaded(true)
    }
  }, [user, pushToast, navigate])

  const refreshInvites = useCallback(async () => {
    if (!user) return
    try {
      const rows = await social.listGameInvites()
      rows
        .filter((i) => !seenInvites.current.has(i.id))
        .forEach((i) => {
          seenInvites.current.add(i.id)
          const g = games.find((x) => x.slug === i.game_slug)
          pushToast({
            emoji: '🎮',
            title: 'Game invite',
            text: `${i.from.username} invited you to ${g?.title || 'a quiz'}`,
            duration: 12000,
            action: {
              label: 'Play now',
              onClick: () => {
                social.respondGameInvite(i.id, true).catch(() => {})
                navigate(`/play/${i.game_slug}`)
              },
            },
          })
        })
      setInvites(rows)
    } catch {
      /* ignore */
    }
  }, [user, pushToast, navigate])

  // Load + live updates
  useEffect(() => {
    if (!supabaseConfigured || !user) {
      setLists(EMPTY)
      setInvites([])
      setLoaded(false)
      seenRequests.current = null
      return
    }
    refresh()
    refreshInvites()
    const ch = supabase
      .channel(`social:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => refresh())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_invites', filter: `to_user=eq.${user.id}` }, () => refreshInvites())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Presence: everyone signed in joins "online"; we only show it for friends.
  useEffect(() => {
    if (!supabaseConfigured || !user) {
      setOnline(new Set())
      return
    }
    const ch = supabase.channel('online', { config: { presence: { key: user.id } } })
    ch.on('presence', { event: 'sync' }, () => setOnline(new Set(Object.keys(ch.presenceState()))))
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') ch.track({ at: Date.now() })
    })
    return () => {
      supabase.removeChannel(ch)
    }
  }, [user?.id])

  const value = useMemo(
    () => ({
      ...lists,
      loaded,
      online,
      invites,
      isOnline: (id) => online.has(id),
      onlineFriends: lists.friends.filter((f) => online.has(f.user.id)),
      refresh,
      refreshInvites,
    }),
    [lists, loaded, online, invites, refresh, refreshInvites]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useSocial = () => useContext(Ctx)
