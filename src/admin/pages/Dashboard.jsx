// Admin dashboard: KPIs, 30-day charts, top games, newest players and recent admin activity.
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserPlus, Activity, Gamepad2, Swords, Medal, Gift, ShieldAlert, HelpCircle, Zap, RefreshCw, ScrollText, Trophy, Plus, Megaphone, Settings,
} from 'lucide-react'
import { PageHead, Card, Stat, Bars, Btn, Loading, Pill, useAsync } from '../ui.jsx'
import * as api from '../api.js'
import { games } from '../../data/games.js'
import { useApp } from '../../state/AppState.jsx'

const title = (slug) => games.find((g) => g.slug === slug)?.title || slug

export default function Dashboard() {
  const { can } = useApp()
  const { data, loading, error, reload } = useAsync(() => api.overview(), [])
  if (loading && !data) return <Loading />
  if (error) return <p className="ad-error">{error.message}</p>
  const k = data.kpis
  const s = data.series
  const sum = (key) => s.reduce((a, d) => a + (d[key] || 0), 0)

  return (
    <>
      <PageHead title="Dashboard" sub={`Live overview · updated ${new Date(data.now).toLocaleTimeString()}`} icon={LayoutDashboard}>
        <Btn icon={RefreshCw} onClick={reload} busy={loading}>
          Refresh
        </Btn>
      </PageHead>

      <div className="ad-quick">
        {can('tournaments') && (
          <Link to="/admin/tournaments" className="ad-quick-item">
            <Plus size={16} /> New tournament
          </Link>
        )}
        {can('content') && (
          <Link to="/admin/games" className="ad-quick-item">
            <Gamepad2 size={16} /> New quiz
          </Link>
        )}
        {can('settings') && (
          <Link to="/admin/settings" className="ad-quick-item">
            <Megaphone size={16} /> Announcement
          </Link>
        )}
        {can('settings') && (
          <Link to="/admin/settings#xp" className="ad-quick-item">
            <Zap size={16} /> XP event
          </Link>
        )}
        {can('users.view') && (
          <Link to="/admin/users" className="ad-quick-item">
            <Users size={16} /> Find a player
          </Link>
        )}
      </div>

      <div className="ad-stats">
        <Stat label="Players" value={k.users.toLocaleString()} icon={Users} delta={k.users_7d - k.users_prev_7d} sub={`${k.users_7d} new this week`} />
        <Stat label="Active today" value={k.active_today} icon={Activity} tone="green" sub={`${k.active_7d} this week`} />
        <Stat label="Rounds today" value={k.rounds_today} icon={Gamepad2} tone="cyan" sub={`${k.rounds_7d} this week · ${k.guest_rounds_7d} by guests`} />
        <Stat label="Live rooms" value={k.rooms_live} icon={Swords} tone="pink" sub={`${k.rooms_7d} finished this week`} />
        <Stat label="Live tournaments" value={k.tournaments_live} icon={Medal} tone="gold" />
        <Stat label="Prizes to send" value={k.prizes_pending} icon={Gift} tone={k.prizes_pending ? 'red' : 'muted'} />
        <Stat label="Questions" value={k.questions} icon={HelpCircle} sub={`${k.games_live} live quizzes`} />
        <Stat label="Banned" value={k.banned} icon={ShieldAlert} tone={k.banned ? 'red' : 'muted'} sub={k.xp_multiplier > 1 ? `XP event ×${k.xp_multiplier} live` : ''} />
      </div>

      <div className="ad-grid-2">
        <Card title={`Rounds played · last 30 days (${sum('rounds')})`} icon={Gamepad2}>
          <Bars data={s} keyName="rounds" label="Rounds per day" color="linear-gradient(180deg, #22d3ee, #8b5cf6)" />
        </Card>
        <Card title={`New players · last 30 days (${sum('signups')})`} icon={UserPlus}>
          <Bars data={s} keyName="signups" label="Sign-ups per day" color="linear-gradient(180deg, #86efac, #16a34a)" />
        </Card>
        <Card title="Daily active players" icon={Activity}>
          <Bars data={s} keyName="players" label="Active players per day" color="linear-gradient(180deg, #fde68a, #f59e0b)" />
        </Card>
        <Card title={`Multiplayer rooms finished (${sum('rooms')})`} icon={Swords}>
          <Bars data={s} keyName="rooms" label="Rooms per day" color="linear-gradient(180deg, #f9a8d4, #db2777)" />
        </Card>
      </div>

      <div className="ad-grid-3">
        <Card title="Top games · 30 days" icon={Trophy} pad={false}>
          {data.top_games.length ? (
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Rounds</th>
                  <th>Players</th>
                  <th>Win %</th>
                </tr>
              </thead>
              <tbody>
                {data.top_games.map((g) => (
                  <tr key={g.slug}>
                    <td>
                      <Link to={`/admin/games/${g.slug}`}>{title(g.slug)}</Link>
                    </td>
                    <td>{g.rounds}</td>
                    <td>{g.players}</td>
                    <td>{g.win_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="ad-muted ad-pad">No rounds yet.</p>
          )}
        </Card>
        <Card title="Newest players" icon={UserPlus} pad={false} actions={<Link to="/admin/users" className="ad-link">All users</Link>}>
          <ul className="ad-list">
            {data.recent_users.map((u) => (
              <li key={u.id}>
                <Link to={`/admin/users/${u.id}`}>
                  <span className="acct-avatar">{u.username[0].toUpperCase()}</span>
                  <b>{u.username}</b>
                  <Pill>Lv {u.level}</Pill>
                  <small>{api.ago(u.created_at)}</small>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Recent admin activity" icon={ScrollText} pad={false} actions={can('audit') && <Link to="/admin/audit" className="ad-link">Audit log</Link>}>
          {data.recent_audit.length ? (
            <ul className="ad-list">
              {data.recent_audit.map((a, i) => (
                <li key={i}>
                  <span className="ad-list-row">
                    <Settings size={14} />
                    <b>{a.action}</b>
                    <small>
                      {a.actor || 'system'} · {api.ago(a.at)}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ad-muted ad-pad">No admin actions yet.</p>
          )}
        </Card>
      </div>
    </>
  )
}
