// Admin API (supabase/007b_admin_api.sql). Every call is permission-checked on the server.
import { supabase } from '../lib/supabase.js'

const MESSAGES = {
  forbidden: 'You don’t have permission for that',
  not_found: 'Not found',
  self: 'You can’t do that to your own account',
  invalid_username: 'Usernames are 3–20 letters, numbers, _ or .',
  username_taken: 'That username is taken',
  bad_role: 'Unknown role',
  last_owner: 'There must be at least one owner',
  bad_slug: 'Slug must be 2–60 lowercase letters, numbers or dashes',
  bad_title: 'Give it a title',
  bad_id: 'IDs are 2–40 lowercase letters, numbers or dashes',
  bad_item: 'The question text is empty',
  bad_rows: 'Import must be a list of up to 2000 rows',
  bad_dates: 'The end must be after the start',
  locked: 'Finished tournaments can’t be edited',
  has_attempts: 'Players already played it. Hide it or end it instead.',
  bad_key: 'Unknown setting',
  bad_kind: 'Unknown question type',
  need_answer: 'Pick the correct answer',
  need_options: 'Add 2–8 options',
  need_order_items: 'Add 3–8 items to put in order',
  need_correct_option: 'Mark the correct option',
  need_accepted: 'Add at least one accepted answer',
  need_number: 'Enter the correct number',
}
export async function call(fn, args) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    const code = Object.keys(MESSAGES).find((k) => error.message.includes(k))
    throw Object.assign(new Error(code ? MESSAGES[code] : error.message), { code })
  }
  return data
}

export const overview = () => call('admin_overview')
export const listUsers = (o) => call('admin_list_users', { p_q: o.q || '', p_role: o.role || null, p_status: o.status || null, p_sort: o.sort || 'new', p_limit: o.limit || 50, p_offset: o.offset || 0 })
export const getUser = (id) => call('admin_get_user', { p_id: id })
export const userAction = (id, action, data = {}) => call('admin_user_action', { p_id: id, p_action: action, p_data: data })
export const catalog = () => call('admin_catalog')
export const saveGame = (g) => call('admin_upsert_game', { p: g })
export const deleteGame = (slug) => call('admin_delete_game', { p_slug: slug })
export const saveCategory = (c) => call('admin_upsert_category', { p: c })
export const deleteCategory = (id) => call('admin_delete_category', { p_id: id })
export const listQuestions = (game, o = {}) => call('admin_list_questions', { p_game: game, p_q: o.q || '', p_active: o.active ?? null, p_limit: o.limit || 100, p_offset: o.offset || 0 })
export const saveQuestion = (q) => call('admin_upsert_question', { p: q })
export const deleteQuestion = (id) => call('admin_delete_question', { p_id: id })
export const importQuestions = (game, rows) => call('admin_import_questions', { p_game: game, p_rows: rows })
export const saveBadge = (b) => call('admin_upsert_badge', { p: b })
export const deleteBadge = (id) => call('admin_delete_badge', { p_id: id })
export const listTournaments = (from, to) => call('admin_list_tournaments', { p_from: from, p_to: to })
export const saveTournament = (t) => call('admin_upsert_tournament', { p: t })
export const tournamentAction = (id, action) => call('admin_tournament_action', { p_id: id, p_action: action })
export const listPrizes = (status) => call('admin_list_prizes', { p_status: status })
export const setPrize = (tid, uid, status) => call('admin_set_prize', { p_tid: tid, p_uid: uid, p_status: status })
export const listRooms = () => call('admin_list_rooms')
export const closeRoom = (id) => call('admin_close_room', { p_id: id })
export const getSettings = () => call('admin_get_settings')
export const setSetting = (key, value) => call('admin_set_setting', { p_key: key, p_value: value })
export const auditLog = (o = {}) => call('admin_audit_log', { p_limit: o.limit || 100, p_offset: o.offset || 0, p_q: o.q || '' })

export const ROLES = ['user', 'moderator', 'editor', 'admin', 'owner']
export const ROLE_INFO = {
  owner: 'Everything, including managing admins and owners',
  admin: 'Everything except managing admins and owners',
  editor: 'Games, questions, categories, tournaments and badges',
  moderator: 'View users, ban and rename, close rooms',
  user: 'Regular player, no admin access',
}

export const fmt = (d) => (d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
export const fmtDay = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
export function ago(d) {
  if (!d) return 'never'
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`
  return fmtDay(d)
}
// <input type="datetime-local"> helpers (local time)
export const toLocalInput = (d) => {
  if (!d) return ''
  const x = new Date(d)
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null)
