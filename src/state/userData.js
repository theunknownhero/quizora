// Signed-in player's data in Supabase: library flags, plays, achievements, showcase and playlists.
// Row Level Security (supabase/002_phase2.sql) limits every query to the player's own rows.
import { supabase, supabaseConfigured } from '../lib/supabase.js'

const ok = ({ data, error }) => {
  if (error) throw Object.assign(new Error(error.message), { raw: error })
  return data
}

// ---------- Likes / favorites / saves ----------
export async function getFlags() {
  if (!supabaseConfigured) return []
  return ok(await supabase.from('user_game_flags').select('game_slug, kind'))
}

export async function setFlag(userId, slug, kind, on) {
  if (on) ok(await supabase.from('user_game_flags').upsert({ user_id: userId, game_slug: slug, kind }, { ignoreDuplicates: true }))
  else ok(await supabase.from('user_game_flags').delete().eq('user_id', userId).eq('game_slug', slug).eq('kind', kind))
  return on ? refreshAchievements() : []
}

export async function refreshAchievements() {
  const { data } = await supabase.rpc('refresh_achievements')
  return data || []
}

// ---------- Plays & achievements ----------
export async function getPlays(limit = 500) {
  return ok(
    await supabase
      .from('play_sessions')
      .select('id, game_slug, correct, total, won, xp_earned, best_streak, answers, started_at, finished_at')
      .eq('status', 'finished')
      .order('finished_at', { ascending: false })
      .limit(limit)
  )
}

export async function getAchievements() {
  return ok(await supabase.from('user_achievements').select('achievement_id, unlocked_at'))
}

export async function setShowcase(userId, ids) {
  ok(await supabase.from('profiles').update({ showcase: ids.slice(0, 3) }).eq('id', userId))
}

// ---------- Playlists ----------
export async function listPlaylists() {
  return ok(
    await supabase
      .from('playlists')
      .select('id, title, description, emoji, is_public, share_code, created_at, updated_at, playlist_items(game_slug, position)')
      .order('updated_at', { ascending: false })
  )
}

export async function createPlaylist(userId, { title, description = '', emoji }) {
  const row = ok(
    await supabase
      .from('playlists')
      .insert({ owner: userId, title: title.trim().slice(0, 60), description: description.trim().slice(0, 200), ...(emoji ? { emoji } : {}) })
      .select('id, title, description, emoji, is_public, share_code, created_at, updated_at')
      .single()
  )
  await refreshAchievements()
  return { ...row, playlist_items: [] }
}

export async function updatePlaylist(id, patch) {
  ok(await supabase.from('playlists').update(patch).eq('id', id))
}

export async function deletePlaylist(id) {
  ok(await supabase.from('playlists').delete().eq('id', id))
}

export async function addToPlaylist(id, slug, position = 0) {
  ok(await supabase.from('playlist_items').upsert({ playlist_id: id, game_slug: slug, position }, { ignoreDuplicates: true }))
}

export async function removeFromPlaylist(id, slug) {
  ok(await supabase.from('playlist_items').delete().eq('playlist_id', id).eq('game_slug', slug))
}

export async function getPlaylistByCode(code) {
  if (!supabaseConfigured) return null
  return ok(await supabase.rpc('get_playlist', { p_code: code }))
}
