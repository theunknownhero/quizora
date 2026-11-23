// Users: search, filter, sort, and a detail drawer with moderation and management actions.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Users as UsersIcon, X, Ban, ShieldCheck, Pencil, Sparkles, Award, Cake, ExternalLink, Mail, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { PageHead, Card, Btn, Pill, SearchBox, Loading, Empty, Field, Modal, useAsync } from '../ui.jsx'
import * as api from '../api.js'
import { useApp } from '../../state/AppState.jsx'
import { achievements, achievementById, tiersStyle } from '../../data/achievements.js'
import { games } from '../../data/games.js'

const ROLE_TONE = { owner: 'gold', admin: 'red', editor: 'cyan', moderator: 'violet', user: 'muted' }
const PAGE = 50

function BanModal({ user, onClose, onDone }) {
  const [days, setDays] = useState('7')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const submit = async () => {
    setBusy(true)
    try {
      await api.userAction(user.id, 'ban', { until: days === 'forever' ? null : new Date(Date.now() + Number(days) * 86400000).toISOString(), reason })
      onDone()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title={`Ban ${user.username}`} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="danger" icon={Ban} busy={busy} onClick={submit}>Ban player</Btn></>}>
      <p className="qa-muted">Banned players can still browse, but can’t play rounds, join rooms, add friends or create tournaments. They’re removed from any open room.</p>
      <div className="qa-form">
        <Field label="Duration">
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="1">1 day</option>
            <option value="3">3 days</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="365">1 year</option>
            <option value="forever">Permanent</option>
          </select>
        </Field>
        <Field label="Reason (shown to the player)" span={2}>
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. Offensive username" />
        </Field>
      </div>
      {err && <p className="qa-error">{err}</p>}
    </Modal>
  )
}

function Drawer({ id, onClose, onChanged }) {
  const { can, staff, user: me, pushToast } = useApp()
  const { data: u, loading, error, reload } = useAsync(() => api.getUser(id), [id])
  const [modal, setModal] = useState(null)
  const [val, setVal] = useState('')
  const [badge, setBadge] = useState('')

  const act = async (action, data, msg) => {
    try {
      await api.userAction(id, action, data)
      pushToast({ emoji: '✅', title: 'Saved', text: msg })
      setModal(null)
      setVal('')
      reload()
      onChanged()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Admin', text: e.message })
    }
  }

  const banned = u?.banned_until && new Date(u.banned_until) > new Date()
  const owned = new Set((u?.achievements || []).map((a) => a.id))

  return (
    <motion.aside className="qa-drawer" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
      <header>
        <button type="button" className="qa-icon-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <span>Player</span>
        {u && (
          <a href={`/u/${u.username}`} target="_blank" rel="noopener noreferrer" className="qa-link">
            Public profile <ExternalLink size={13} />
          </a>
        )}
      </header>
      {loading && !u ? (
        <Loading />
      ) : error ? (
        <p className="qa-error">{error.message}</p>
      ) : (
        <div className="qa-drawer-body">
          <div className="qa-user-head">
            <span className="acct-avatar lg">{u.username[0].toUpperCase()}</span>
            <div>
              <h2>{u.username}</h2>
              <p>
                <Mail size={13} /> {u.email}{' '}
                {u.verified ? <CheckCircle2 size={13} className="ok" aria-label="Verified" /> : <AlertCircle size={13} className="warn" aria-label="Not verified" />}
              </p>
              <div className="qa-pills">
                <Pill tone={ROLE_TONE[u.role]}>{u.role}</Pill>
                <Pill>Level {u.level}</Pill>
                <Pill>{u.xp.toLocaleString()} XP</Pill>
                {u.age != null && <Pill>Age {u.age}</Pill>}
                {banned && <Pill tone="red">Banned</Pill>}
              </div>
            </div>
          </div>

          {banned && (
            <div className="qa-alert is-red">
              <Ban size={16} />
              <div>
                <b>Banned {new Date(u.banned_until).getFullYear() > 9000 ? 'permanently' : `until ${api.fmt(u.banned_until)}`}</b>
                {u.ban_reason && <small>Reason: {u.ban_reason}</small>}
              </div>
            </div>
          )}

          <div className="qa-kv">
            <span>Joined</span>
            <b>{api.fmt(u.created_at)}</b>
            <span>Last sign-in</span>
            <b>{api.ago(u.last_sign_in_at)}</b>
            <span>Last played</span>
            <b>{u.last_played_on || '—'}</b>
            <span>Games · wins</span>
            <b>
              {u.stats.games} · {u.stats.wins}
            </b>
            <span>Accuracy</span>
            <b>{u.stats.answered ? Math.round((u.stats.correct / u.stats.answered) * 100) : 0}%</b>
            <span>Day streak</span>
            <b>
              {u.day_streak} (best {u.best_day_streak})
            </b>
            <span>Friends</span>
            <b>{u.friends}</b>
            <span>Birth date</span>
            <b>{u.birth_date || 'not set'}</b>
          </div>

          <div className="qa-actions">
            {can('users.moderate') &&
              (banned ? (
                <Btn icon={ShieldCheck} onClick={() => act('unban', {}, `${u.username} is unbanned`)}>
                  Unban
                </Btn>
              ) : (
                <Btn kind="danger" icon={Ban} onClick={() => setModal('ban')} disabled={u.id === me.id}>
                  Ban
                </Btn>
              ))}
            {can('users.moderate') && (
              <Btn icon={Pencil} onClick={() => (setVal(u.username), setModal('rename'))}>
                Rename
              </Btn>
            )}
            {can('users.manage') && (
              <Btn icon={Sparkles} onClick={() => (setVal('100'), setModal('xp'))}>
                Adjust XP
              </Btn>
            )}
            {can('users.manage') && u.birth_date && (
              <Btn icon={Cake} onClick={() => window.confirm('Clear this player’s birth date? They will be asked to enter it again.') && act('reset_birth_date', {}, 'Birth date cleared')}>
                Reset birth date
              </Btn>
            )}
            {can('staff') && (
              <select
                className="qa-select"
                value={u.role}
                onChange={(e) => window.confirm(`Change ${u.username}’s role to ${e.target.value}?`) && act('role', { role: e.target.value }, `Role set to ${e.target.value}`)}
                aria-label="Role"
              >
                {api.ROLES.filter((r) => staff.role === 'owner' || !['admin', 'owner'].includes(r) || r === u.role).map((r) => (
                  <option key={r} value={r}>
                    Role: {r}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Card title={`Badges (${u.achievements.length})`} icon={Award}>
            <div className="qa-badges">
              {u.achievements.map((a) => {
                const def = achievementById(a.id)
                return (
                  <span key={a.id} className="qa-badge" style={{ '--tier': tiersStyle[def?.tier || 'bronze'].color }} title={`${def?.name || a.id} · ${api.fmtDay(a.at)}`}>
                    {def?.emoji || '🏅'} <small>{def?.name || a.id}</small>
                    {can('users.manage') && (
                      <button type="button" onClick={() => window.confirm(`Remove “${def?.name || a.id}”?`) && act('revoke_badge', { id: a.id }, 'Badge removed')} aria-label="Remove badge">
                        <X size={12} />
                      </button>
                    )}
                  </span>
                )
              })}
            </div>
            {can('badges') && (
              <div className="qa-inline">
                <select value={badge} onChange={(e) => setBadge(e.target.value)} aria-label="Badge to grant">
                  <option value="">Grant a badge…</option>
                  {achievements
                    .filter((a) => !owned.has(a.id))
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.emoji} {a.name}
                        {a.custom ? ' (custom)' : ''}
                      </option>
                    ))}
                </select>
                <Btn kind="primary" size="sm" disabled={!badge} onClick={() => act('grant_badge', { id: badge }, 'Badge granted').then(() => setBadge(''))}>
                  Grant
                </Btn>
              </div>
            )}
          </Card>

          <Card title="Recent rounds" pad={false}>
            {u.plays.length ? (
              <table className="qa-table is-compact">
                <tbody>
                  {u.plays.map((p) => (
                    <tr key={p.id}>
                      <td>{games.find((g) => g.slug === p.game_slug)?.title || p.game_slug}</td>
                      <td>
                        {p.correct}/{p.total}
                      </td>
                      <td>{p.won ? <Pill tone="green">win</Pill> : <Pill>loss</Pill>}</td>
                      <td>+{p.xp}</td>
                      <td className="qa-muted">{api.ago(p.finished_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="qa-muted qa-pad">No rounds yet.</p>
            )}
          </Card>

          {u.tournaments.length > 0 && (
            <Card title="Tournament results" pad={false}>
              <table className="qa-table is-compact">
                <tbody>
                  {u.tournaments.map((t) => (
                    <tr key={t.code}>
                      <td>{t.title}</td>
                      <td>#{t.rank}</td>
                      <td>{t.prize || '—'}</td>
                      <td>{t.claim !== 'none' && <Pill tone={t.claim === 'sent' ? 'green' : 'gold'}>{t.claim}</Pill>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {u.audit.length > 0 && (
            <Card title="Admin history" pad={false}>
              <ul className="qa-list">
                {u.audit.map((a, i) => (
                  <li key={i}>
                    <span className="qa-list-row">
                      <b>{a.action}</b>
                      <small>
                        {a.actor} · {api.ago(a.at)}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {modal === 'ban' && <BanModal user={u} onClose={() => setModal(null)} onDone={() => (setModal(null), reload(), onChanged())} />}
      <Modal open={modal === 'rename'} onClose={() => setModal(null)} title="Rename player" footer={<><Btn onClick={() => setModal(null)}>Cancel</Btn><Btn kind="primary" onClick={() => act('rename', { username: val }, 'Username changed')}>Save</Btn></>}>
        <Field label="New username" hint="3–20 letters, numbers, _ or .">
          <input value={val} onChange={(e) => setVal(e.target.value)} autoFocus />
        </Field>
      </Modal>
      <Modal open={modal === 'xp'} onClose={() => setModal(null)} title="Adjust XP" footer={<><Btn onClick={() => setModal(null)}>Cancel</Btn><Btn kind="primary" onClick={() => act('xp', { delta: Number(val) }, `XP adjusted by ${val}`)}>Apply</Btn></>}>
        <Field label="Change by" hint="Use a negative number to remove XP. Levels update automatically.">
          <input type="number" value={val} onChange={(e) => setVal(e.target.value)} autoFocus />
        </Field>
      </Modal>
    </motion.aside>
  )
}

export default function UsersPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [f, setF] = useState({ q: '', role: '', status: '', sort: 'new' })
  const [page, setPage] = useState(0)
  const { data, loading, error, reload } = useAsync(() => api.listUsers({ ...f, limit: PAGE, offset: page * PAGE }), [f.q, f.role, f.status, f.sort, page])

  useEffect(() => setPage(0), [f.q, f.role, f.status, f.sort])
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))

  return (
    <>
      <PageHead title="Users" sub={data ? `${data.total.toLocaleString()} matching players` : 'All players'} icon={UsersIcon} />
      <div className="qa-filters">
        <SearchBox value={f.q} onChange={set('q')} placeholder="Search username or email" />
        <select value={f.status} onChange={(e) => set('status')(e.target.value)} aria-label="Status">
          <option value="">Everyone</option>
          <option value="staff">Staff only</option>
          <option value="banned">Banned</option>
          <option value="unverified">Email not verified</option>
        </select>
        <select value={f.role} onChange={(e) => set('role')(e.target.value)} aria-label="Role">
          <option value="">Any role</option>
          {api.ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select value={f.sort} onChange={(e) => set('sort')(e.target.value)} aria-label="Sort">
          <option value="new">Newest</option>
          <option value="active">Recently active</option>
          <option value="xp">Most XP</option>
          <option value="games">Most games</option>
        </select>
      </div>

      <Card pad={false}>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <p className="qa-error qa-pad">{error.message}</p>
        ) : data.rows.length === 0 ? (
          <Empty icon={UsersIcon} title="No players found" />
        ) : (
          <div className="qa-table-wrap">
            <table className="qa-table is-click">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Role</th>
                  <th>Level</th>
                  <th>Games</th>
                  <th>Joined</th>
                  <th>Last sign-in</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((u) => (
                  <tr key={u.id} onClick={() => navigate(`/admin/users/${u.id}`)} className={id === u.id ? 'is-sel' : ''}>
                    <td>
                      <span className="qa-user-cell">
                        <span className="acct-avatar">{u.username[0].toUpperCase()}</span>
                        <span>
                          <b>{u.username}</b>
                          <small>{u.email}</small>
                        </span>
                      </span>
                    </td>
                    <td>
                      <Pill tone={ROLE_TONE[u.role]}>{u.role}</Pill>
                    </td>
                    <td>
                      {u.level} <small className="qa-muted">· {u.xp.toLocaleString()} XP</small>
                    </td>
                    <td>{u.games}</td>
                    <td>{api.fmtDay(u.created_at)}</td>
                    <td>{api.ago(u.last_sign_in_at)}</td>
                    <td>
                      {u.banned_until && new Date(u.banned_until) > new Date() ? <Pill tone="red">banned</Pill> : !u.verified ? <Pill tone="gold">unverified</Pill> : <Pill tone="green">active</Pill>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {data && data.total > PAGE && (
        <div className="qa-pager">
          <Btn icon={ChevronLeft} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Btn>
          <span>
            Page {page + 1} of {Math.ceil(data.total / PAGE)}
          </span>
          <Btn disabled={(page + 1) * PAGE >= data.total} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight size={15} />
          </Btn>
        </div>
      )}

      <AnimatePresence>{id && <Drawer key={id} id={id} onClose={() => navigate('/admin/users')} onChanged={reload} />}</AnimatePresence>
      {id && <div className="qa-scrim is-drawer" onClick={() => navigate('/admin/users')} />}
    </>
  )
}
