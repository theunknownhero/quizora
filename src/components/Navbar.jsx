import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import GooeyNav from './rb/GooeyNav.jsx'
import StarBorder from './rb/StarBorder.jsx'
import CountrySelector from './CountrySelector.jsx'
import AccountMenu from './AccountMenu.jsx'
import { useApp } from '../state/AppState.jsx'
import './Navbar.css'

// Home page sections, in the order they appear on the page.
const SECTIONS = [
  { label: 'Home', id: 'top' },
  { label: 'Featured', id: 'featured' },
  { label: 'Categories', id: 'categories' },
  { label: 'Games', id: 'games' },
  { label: 'How it works', id: 'how' },
]
const ITEMS = SECTIONS.map(({ label }) => ({ label }))
const PARTICLES = ['#7c5cff', '#ff5fa2', '#2ec4b6', '#ffd166']
const CTA = { to: '/play/hungary-or-not', label: 'Play now' }

const scrollToId = (id) => {
  if (id === 'top') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function Navbar() {
  const { pathname, hash } = useLocation()
  const navigate = useNavigate()
  const { user, openAuth, openOnboarding, logout } = useApp()
  const isHome = pathname === '/'
  const [active, setActive] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const lockRef = useRef(0) // pauses scroll-spy while a click-triggered smooth scroll runs

  const go = useCallback(
    (index) => {
      const { id } = SECTIONS[index]
      setActive(index)
      setOpen(false)
      lockRef.current = Date.now() + 1000
      if (!isHome) {
        navigate('/')
        setTimeout(() => scrollToId(id), 80)
      } else {
        scrollToId(id)
      }
    },
    [isHome, navigate]
  )

  // Scroll-spy + "scrolled" state
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      setScrolled(window.scrollY > 24)
      if (!isHome || Date.now() < lockRef.current) return
      const line = window.innerHeight * 0.4
      let idx = 0
      SECTIONS.forEach((s, i) => {
        const el = s.id === 'top' ? document.body : document.getElementById(s.id)
        if (el && (s.id === 'top' || el.getBoundingClientRect().top <= line)) idx = i
      })
      setActive(idx)
    }
    const onScroll = () => {
      if (Date.now() < lockRef.current) lockRef.current = Math.max(lockRef.current, Date.now() + 160) // extend lock until scrolling settles
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [isHome])

  // Arriving on "/#games" etc. from another page
  useEffect(() => {
    if (!isHome || !hash) return
    const id = hash.slice(1)
    const i = SECTIONS.findIndex((s) => s.id === id)
    const t = setTimeout(() => {
      if (i >= 0) {
        setActive(i)
        lockRef.current = Date.now() + 1000
      }
      scrollToId(id)
    }, 80)
    return () => clearTimeout(t)
  }, [isHome, hash])

  // Close the mobile sheet when resizing up to desktop
  useEffect(() => {
    const onResize = () => window.innerWidth > 860 && setOpen(false)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <header className={`nav-wrap ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="nav-bar">
        <Link
          to="/"
          className="nav-brand"
          onClick={() => {
            setOpen(false)
            if (isHome) go(0)
          }}
          aria-label="Quizora home"
        >
          <span className="nav-brand-bars" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="nav-brand-text">Quizora</span>
        </Link>

        <div className={`nav-center ${isHome ? '' : 'is-off'}`}>
          <GooeyNav
            items={ITEMS}
            activeIndex={isHome ? active : -1}
            onChange={go}
            frame={false}
            size="sm"
            color="#ffffff"
            colors={PARTICLES}
          />
        </div>

        <div className="nav-right">
          <CountrySelector />
          <span className="nav-acct-desktop">
            <AccountMenu />
          </span>
          <StarBorder as={Link} to={CTA.to} radius={999} className="nav-cta" color="#c4b5fd" backgroundColor="rgba(255,255,255,0.06)">
            {CTA.label} <span aria-hidden="true">→</span>
          </StarBorder>
          <button
            type="button"
            className={`nav-burger ${open ? 'is-open' : ''}`}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="nav-sheet"
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      <nav id="nav-sheet" className={`nav-sheet ${open ? 'is-open' : ''}`} aria-label="Mobile">
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`nav-sheet-item ${isHome && i === active ? 'is-active' : ''}`}
            onClick={() => go(i)}
          >
            {s.label}
          </button>
        ))}
        <div className="nav-sheet-acct">
          {user ? (
            <>
              <span className="nav-sheet-user">
                <span className="acct-avatar">{user.username[0].toUpperCase()}</span>
                {user.username}
              </span>
              <button type="button" onClick={() => (setOpen(false), openOnboarding())}>
                Edit interests
              </button>
              <button type="button" onClick={() => (setOpen(false), logout())}>
                Log out
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => (setOpen(false), openAuth('login'))}>
                Log in
              </button>
              <button type="button" className="is-primary" onClick={() => (setOpen(false), openAuth('register'))}>
                Sign up
              </button>
            </>
          )}
        </div>
        <Link to={CTA.to} className="nav-sheet-cta" onClick={() => setOpen(false)}>
          {CTA.label} →
        </Link>
      </nav>
    </header>
  )
}
