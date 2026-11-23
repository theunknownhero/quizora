// Staff & roles: who has admin access, what each role can do, and promoting players.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, UserPlus, Check, X } from 'lucide-react'
import { PageHead, Card, Btn, Pill, SearchBox, Loading, useAsync } from '../ui.jsx'
import * as api from '../api.js'
import { useApp } from '../../state/AppState.jsx'

const MATRIX = [
  ['Dashboard & stats', ['owner', 'admin', 'editor', 'moderator']],
  ['View users', ['owner', 'admin', 'editor', 'moderator']],
  ['Ban, unban & rename users', ['owner', 'admin', 'moderator']],
  ['Adjust XP, badges, birth dates', ['owner', 'admin']],
  ['Games, questions & categories', ['owner', 'admin', 'editor']],
  ['Tournaments & templates', ['owner', 'admin', 'editor']],
  ['Custom badges', ['owner', 'admin', 'editor']],
  ['Prize claims (with winner emails)', ['owner', 'admin']],
  ['Close live rooms', ['owner', 'admin', 'moderator']],
  ['Site settings, maintenance, XP events', ['owner', 'admin']],
  ['Audit log', ['owner', 'admin']],
  ['Give moderator / editor roles', ['owner', 'admin']],
  ['Give admin / owner roles', ['owner']],
]
const COLS = ['owner', 'admin', 'editor', 'moderator']
const TONE = { owner: 'gold', admin: 'red', editor: 'cyan', moderator: 'violet', user: 'muted' }

export default function StaffPage() {
  const { staff, pushToast } = useApp()
  const team = useAsync(() => api.listUsers({ status: 'staff', limit: 200 }), [])
  const [q, setQ] = useState('')
  const found = useAsync(() => (q.length >= 2 ? api.listUsers({ q, limit: 8 }) : Promise.resolve(null)), [q])
  const [role, setRole] = useState('moderator')

  const assign = async (u, r) => {
    if (!window.confirm(`Make ${u.username} ${r === 'user' ? 'a regular player (remove staff access)' : `a ${r}`}?`)) return
    try {
      await api.userAction(u.id, 'role', { role: r })
      pushToast({ emoji: '✅', title: 'Roles', text: `${u.username} is now ${r}` })
      team.reload()
      found.reload()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Roles', text: e.message })
    }
  }
  const assignable = api.ROLES.filter((r) => r !== 'user' && (staff.role === 'owner' || !['admin', 'owner'].includes(r)))

  return (
    <>
      <PageHead title="Staff & roles" sub="Give trusted people access to parts of the admin panel." icon={ShieldCheck} />
      <div className="qa-grid-2">
        <Card title="Team" icon={ShieldCheck} pad={false}>
          {team.loading && !team.data ? (
            <Loading />
          ) : (
            <table className="qa-table">
              <tbody>
                {team.data?.rows.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Link to={`/admin/users/${u.id}`} className="qa-user-cell">
                        <span className="acct-avatar">{u.username[0].toUpperCase()}</span>
                        <span>
                          <b>{u.username}</b>
                          <small>{u.email}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <Pill tone={TONE[u.role]}>{u.role}</Pill>
                    </td>
                    <td className="qa-right">
                      {(staff.role === 'owner' || !['admin', 'owner'].includes(u.role)) && (
                        <Btn size="sm" onClick={() => assign(u, 'user')}>
                          Remove access
                        </Btn>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title="Add a staff member" icon={UserPlus}>
          <div className="qa-inline">
            <SearchBox value={q} onChange={setQ} placeholder="Find player by username or email" />
            <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role to give">
              {assignable.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <p className="qa-muted small">{api.ROLE_INFO[role]}</p>
          <ul className="qa-list">
            {found.data?.rows.map((u) => (
              <li key={u.id}>
                <span className="qa-list-row">
                  <span className="acct-avatar">{u.username[0].toUpperCase()}</span>
                  <b>{u.username}</b>
                  <Pill tone={TONE[u.role]}>{u.role}</Pill>
                  <Btn size="sm" kind="primary" disabled={u.role === role} onClick={() => assign(u, role)}>
                    Make {role}
                  </Btn>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card title="What each role can do" pad={false}>
        <div className="qa-table-wrap">
          <table className="qa-table qa-matrix">
            <thead>
              <tr>
                <th>Permission</th>
                {COLS.map((c) => (
                  <th key={c}>
                    <Pill tone={TONE[c]}>{c}</Pill>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map(([label, roles]) => (
                <tr key={label}>
                  <td>{label}</td>
                  {COLS.map((c) => (
                    <td key={c}>{roles.includes(c) ? <Check size={16} className="ok" /> : <X size={16} className="qa-muted" />}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
