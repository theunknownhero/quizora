import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, UserRound, Users, Swords, Trophy, Medal } from 'lucide-react'
import GooeyNav from './rb/GooeyNav.jsx'
import StarBorder from './rb/StarBorder.jsx'
import CountrySelector from './CountrySelector.jsx'
import AccountMenu from './AccountMenu.jsx'
import { useApp } from '../state/AppState.jsx'
import { useT } from '../i18n/useT.js'
import './Navbar.css'

// Home page sections, in the order they appear on the page.
const SECTIONS = [
  { key: 'nav.home', id: 'top' },
  { key: 'nav.featured', id: 'featured' },
  { key: 'nav.categories', id: 'categories' },
  { key: 'nav.games', id: 'games' },
  { key: 'nav.how', id: 'how' },
]
const PARTICLES = ['#7c5cff', '#ff5fa2', '#2ec4b6', '#ffd166']
const CTA_TO = '/play/hungary-or-not'

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
  const t = useT()
  const items = useMemo(() => SECTIONS.map((s) => ({ label: t(s.key) })), [t])
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
            items={items}
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
          <StarBorder as={Link} to={CTA_TO} radius={999} className="nav-cta" color="#c4b5fd" backgroundColor="rgba(255,255,255,0.06)">
            {t('nav.play')} <ArrowRight size={16} aria-hidden="true" />
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
            {t(s.key)}
          </button>
        ))}
        <div className="nav-sheet-acct">
          {user ? (
            <>
              <span className="nav-sheet-user">
                <span className="acct-avatar">{user.username[0].toUpperCase()}</span>
                {user.username}
              </span>
              <Link to="/profile" className="nav-sheet-link" onClick={() => setOpen(false)}>
                <UserRound size={15} className="ico" /> Profile
              </Link>
              <Link to="/play-together" className="nav-sheet-link" onClick={() => setOpen(false)}>
                <Swords size={15} className="ico" /> Play together
              </Link>
              <Link to="/tournaments" className="nav-sheet-link" onClick={() => setOpen(false)}>
                <Medal size={15} className="ico" /> Tournaments
              </Link>
              <Link to="/leaderboards" className="nav-sheet-link" onClick={() => setOpen(false)}>
                <Trophy size={15} className="ico" /> Leaderboards
              </Link>
              <Link to="/friends" className="nav-sheet-link" onClick={() => setOpen(false)}>
                <Users size={15} className="ico" /> Friends
              </Link>
              <button type="button" onClick={() => (setOpen(false), openOnboarding())}>
                {t('nav.editInterests')}
              </button>
              <button type="button" onClick={() => (setOpen(false), logout())}>
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => (setOpen(false), openAuth('login'))}>
                {t('nav.login')}
              </button>
              <button type="button" className="is-primary" onClick={() => (setOpen(false), openAuth('register'))}>
                {t('nav.signup')}
              </button>
            </>
          )}
        </div>
        <Link to={CTA_TO} className="nav-sheet-cta" onClick={() => setOpen(false)}>
          {t('nav.play')} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </nav>
    </header>
  )
}
