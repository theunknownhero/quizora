// Multiplayer rooms (supabase/005_phase4.sql). The server owns questions, timing and scoring.
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { games } from '../data/games.js'

const MESSAGES = {
  not_signed_in: 'Log in to play with others',
  room_not_found: 'No room with that code',
  room_started: 'That game already started',
  room_full: 'That room is full',
  not_member: 'You’re not in this room',
  not_host: 'Only the host can do that',
  already_started: 'The game already started',
  age_restricted: 'This quiz is 18+',
  no_questions: 'That quiz isn’t available for multiplayer yet',
  rate_limited: 'Slow down a little and try again in a minute',
  time_up: 'Time’s up!',
  already_answered: 'You already answered',
  wrong_question: 'That question is over',
  not_friends: 'You can only invite friends',
  already_invited: 'Already invited',
}
const rpc = async (fn, args) => {
  if (!supabaseConfigured) throw new Error('Multiplayer isn’t set up on this site yet.')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    const code = Object.keys(MESSAGES).find((k) => error.message.includes(k))
    throw Object.assign(new Error(code ? MESSAGES[code] : 'Something went wrong. Try again.'), { code, raw: error.message })
  }
  return data
}

export const createRoom = (game, settings, isPublic) => rpc('create_room', { p_game: game, p_settings: settings, p_public: isPublic })
export const joinRoom = (code) => rpc('join_room', { p_code: code })
export const leaveRoom = (id) => rpc('leave_room', { p_room: id })
export const setReady = (id, ready) => rpc('set_ready', { p_room: id, p_ready: ready })
export const updateRoom = (id, { settings, isPublic, game }) => rpc('update_room', { p_room: id, p_settings: settings ?? null, p_public: isPublic ?? null, p_game: game ?? null })
export const kickPlayer = (id, user) => rpc('kick_player', { p_room: id, p_user: user })
export const startRoom = (id) => rpc('start_room', { p_room: id })
export const rematchRoom = (id) => rpc('rematch_room', { p_room: id })
export const quickMatch = (game, seconds) => rpc('quick_match', { p_game: game, p_seconds: seconds })
export const listPublicRooms = () => rpc('list_public_rooms')
export const getRoom = (code) => rpc('get_room', { p_code: code })
export const submitRoomAnswer = (id, index, value) => rpc('submit_room_answer_v2', { p_room: id, p_index: index, p_value: value })
export const advanceRoom = (id, index) => rpc('advance_room', { p_room: id, p_index: index })
export const sendRoomInvite = (to, id) => rpc('send_room_invite', { p_to: to, p_room: id })

// How each quiz phrases its two answers in multiplayer
const UI = {
  'hungary-or-not': { question: 'Does it have Hungarian origins?', yes: 'Hungary', no: 'Not', yesLong: 'Hungarian', noLong: 'Not Hungarian' },
}
export const gameUi = (slug) => {
  if (UI[slug]) return UI[slug]
  const g = games.find((x) => x.slug === slug)
  const yes = g?.yesLabel || 'True'
  const no = g?.noLabel || 'False'
  return { question: g?.prompt || 'True or false?', yes, no, yesLong: yes, noLong: no }
}

export const SETTING_OPTIONS = {
  count: [5, 10, 15, 20],
  seconds: [8, 10, 15, 20, 30],
  max_players: [2, 3, 4, 5, 6, 7, 8],
}
