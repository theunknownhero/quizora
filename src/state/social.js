// Friends, player search, public profiles and game invites (supabase/004_phase3.sql).
import { supabase, supabaseConfigured } from '../lib/supabase.js'

const MESSAGES = {
  not_found: 'No player with that username',
  self: 'That’s you!',
  already_friends: 'You’re already friends',
  already_sent: 'Request already sent',
  too_many_pending: 'You have too many pending requests. Wait for some answers first.',
  rate_limited: 'Slow down a little and try again in a minute.',
  not_friends: 'You can only invite friends',
  already_invited: 'You already invited them to this quiz',
  age_restricted: 'This quiz is 18+ and your friend can’t play it',
  no_request: 'That request is no longer there',
  no_friendship: 'Already removed',
}
const rpc = async (fn, args) => {
  if (!supabaseConfigured) throw new Error('Accounts aren’t set up on this site yet.')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    const code = Object.keys(MESSAGES).find((k) => error.message.includes(k))
    throw Object.assign(new Error(code ? MESSAGES[code] : 'Something went wrong. Try again.'), { code, raw: error.message })
  }
  return data
}

export const listFriends = () => rpc('list_friends')
export const sendFriendRequest = (username) => rpc('send_friend_request', { p_username: username })
export const respondFriendRequest = (id, accept) => rpc('respond_friend_request', { p_id: id, p_accept: accept })
export const removeFriendship = (id) => rpc('remove_friendship', { p_id: id })
export const searchPlayers = (q) => rpc('search_players', { p_q: q })
export const getPublicProfile = (username) => rpc('get_public_profile', { p_username: username })
export const sendGameInvite = (to, game) => rpc('send_game_invite', { p_to: to, p_game: game })
export const respondGameInvite = (id, accept) => rpc('respond_game_invite', { p_id: id, p_accept: accept })
export const listGameInvites = () => rpc('list_game_invites')
