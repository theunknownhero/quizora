// Admin panel shell: access guard, sidebar navigation and routes.
import { useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Gamepad2, Tags, Award, Medal, Gift, Swords, Settings as SettingsIcon, ShieldCheck, ScrollText, ArrowLeft, Menu, X, Lock, Megaphone,
} from 'lucide-react'
import { useApp } from '../state/AppState.jsx'
import Dashboard from './pages/Dashboard.jsx'
import UsersPage from './pages/Users.jsx'
import GamesPage from './pages/Games.jsx'
import QuestionsPage from './pages/Questions.jsx'
import CategoriesPage from './pages/Categories.jsx'
import BadgesPage from './pages/Badges.jsx'
import TournamentsPage from './pages/Tournaments.jsx'
import PrizesPage from './pages/Prizes.jsx'
import RoomsPage from './pages/Rooms.jsx'
import SettingsPage from './pages/Settings.jsx'
import StaffPage from './pages/Staff.jsx'
import AuditPage from './pages/Audit.jsx'
import './admin.css'

const NAV = [
  { group: 'Overview' },
  { to: '', label: 'Dashboard', icon: LayoutDashboard, perm: 'dash', end: true },
  { group: 'Players' },
  { to: 'users', label: 'Users', icon: Users, perm: 'users.view' },
  { to: 'staff', label: 'Staff & roles', icon: ShieldCheck, perm: 'staff' },
  { group: 'Content' },
  { to: 'games', label: 'Games & questions', icon: Gamepad2, perm: 'content' },
  { to: 'categories', label: 'Categories', icon: Tags, perm: 'content' },
  { to: 'badges', label: 'Badges', icon: Award, perm: 'badges' },
  { group: 'Competition' },
  { to: 'tournaments', label: 'Tournaments', icon: Medal, perm: 'tournaments' },
  { to: 'prizes', label: 'Prize claims', icon: Gift, perm: 'prizes.view' },
  { to: 'rooms', label: 'Live rooms', icon: Swords, perm: 'rooms' },
  { group: 'Site' },
  { to: 'settings', label: 'Site settings', icon: SettingsIcon, perm: 'settings' },
  { to: 'audit', label: 'Audit log', icon: ScrollText, perm: 'audit' },
]

function Denied({ text }) {
  return (
    <div className="ad-denied">
      <Lock size={40} />
      <h1>Admins only</h1>
      <p>{text}</p>
      <Link to="/" className="ad-btn is-primary">
        <ArrowLeft size={15} /> Back to Quizora
      </Link>
    </div>
  )
}

export default function Admin() {
  const { user, authReady, staff, can, openAuth, site } = useApp()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  if (!authReady) return <div className="admin-loading">Loading…</div>
  if (!user)
    return (
      <div className="ad-root">
        <div className="ad-denied">
          <Lock size={40} />
          <h1>Admin panel</h1>
          <p>Log in with a staff account.</p>
          <button type="button" className="ad-btn is-primary" onClick={() => openAuth('login')}>
            Log in
          </button>
        </div>
      </div>
    )
  if (!staff) return <div className="ad-root"><Denied text="Your account doesn’t have staff access. An owner can give you a role from Staff & roles." /></div>

  const nav = NAV.filter((n, i) => {
    if (n.group) {
      // show a group label only if something under it is visible
      const next = NAV.slice(i + 1)
      const end = next.findIndex((x) => x.group)
      return next.slice(0, end < 0 ? undefined : end).some((x) => can(x.perm))
    }
    return can(n.perm)
  })

  const guard = (perm, el) => (can(perm) ? el : <Denied text="Your role can’t open this section." />)
  const live = site.maintenance?.enabled ? 'Maintenance mode is ON' : site.announcement?.enabled ? 'Announcement is live' : null

  return (
    <div className="ad-root">
      <aside className={`ad-side ${open ? 'is-open' : ''}`}>
        <div className="ad-brand">
          <Link to="/admin" className="ad-logo" onClick={() => setOpen(false)}>
            <span className="nav-brand-bars" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            Quizora <em>Admin</em>
          </Link>
          <button type="button" className="ad-icon-btn ad-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav aria-label="Admin">
          {nav.map((n, i) =>
            n.group ? (
              <small key={`g${i}`} className="ad-nav-group">
                {n.group}
              </small>
            ) : (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `ad-nav-item ${isActive ? 'is-active' : ''}`} onClick={() => setOpen(false)}>
                <n.icon size={17} /> {n.label}
              </NavLink>
            )
          )}
        </nav>
        <div className="ad-side-foot">
          <div className="ad-me">
            <span className="acct-avatar">{user.username[0].toUpperCase()}</span>
            <div>
              <b>{user.username}</b>
              <small>{staff.role}</small>
            </div>
          </div>
          <Link to="/" className="ad-nav-item">
            <ArrowLeft size={16} /> Back to site
          </Link>
        </div>
      </aside>
      {open && <div className="ad-scrim" onClick={() => setOpen(false)} />}

      <div className="ad-main">
        <div className="ad-topbar">
          <button type="button" className="ad-icon-btn ad-burger" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <span className="ad-crumb">{NAV.find((n) => n.to && pathname.includes(`/admin/${n.to}`))?.label || 'Dashboard'}</span>
          {live && (
            <Link to="/admin/settings" className={`ad-live ${site.maintenance?.enabled ? 'is-warn' : ''}`}>
              <Megaphone size={14} /> {live}
            </Link>
          )}
        </div>
        <div className="ad-content">
          <Routes>
            <Route index element={guard('dash', <Dashboard />)} />
            <Route path="users" element={guard('users.view', <UsersPage />)} />
            <Route path="users/:id" element={guard('users.view', <UsersPage />)} />
            <Route path="staff" element={guard('staff', <StaffPage />)} />
            <Route path="games" element={guard('content', <GamesPage />)} />
            <Route path="games/:slug" element={guard('content', <QuestionsPage />)} />
            <Route path="categories" element={guard('content', <CategoriesPage />)} />
            <Route path="badges" element={guard('badges', <BadgesPage />)} />
            <Route path="tournaments" element={guard('tournaments', <TournamentsPage />)} />
            <Route path="prizes" element={guard('prizes.view', <PrizesPage />)} />
            <Route path="rooms" element={guard('rooms', <RoomsPage />)} />
            <Route path="settings" element={guard('settings', <SettingsPage />)} />
            <Route path="audit" element={guard('audit', <AuditPage />)} />
            <Route path="*" element={<Denied text="That page doesn’t exist." />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
