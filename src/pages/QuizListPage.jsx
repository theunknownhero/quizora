// Public shared QuizList: /quizlist/:code (old /playlist/:code links still work)
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import Navbar from '../components/Navbar.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import GameCard from '../components/GameCard.jsx'
import { useApp } from '../state/AppState.jsx'
import * as udata from '../state/userData.js'
import { games } from '../data/games.js'
import { ListMusic, Share2, Pencil, Play, SearchX, Loader2 } from 'lucide-react'
import './profile.css'

export default function QuizListPage() {
  const { code } = useParams()
  const { pushToast } = useApp()
  const [pl, setPl] = useState(undefined) // undefined = loading, null = not found

  useEffect(() => {
    window.scrollTo(0, 0)
    udata
      .getPlaylistByCode(code)
      .then((d) => setPl(d || null))
      .catch(() => setPl(null))
  }, [code])

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: pl.title, url })
      else {
        await navigator.clipboard.writeText(url)
        pushToast({ emoji: '🔗', title: 'Link copied', text: 'Send it to your friends!' })
      }
    } catch {
      /* cancelled */
    }
  }

  if (pl === undefined || pl === null) {
    return (
      <>
        <Navbar />
        <main className="placeholder">
          <div className="placeholder-card">
            <span className="placeholder-emoji">{pl === undefined ? <Loader2 size={56} className="spin" /> : <SearchX size={56} />}</span>
            <h1>{pl === undefined ? 'Loading…' : 'QuizList not found'}</h1>
            {pl === null && (
              <>
                <p>This link may be wrong, or the owner deleted the QuizList.</p>
                <Link to="/" className="btn btn-primary btn-lg">
                  Explore quizzes
                </Link>
              </>
            )}
          </div>
        </main>
      </>
    )
  }

  const items = (pl.items || []).map((i) => games.find((g) => g.slug === i.game_slug)).filter(Boolean)
  const first = items.find((g) => g.status !== 'soon')

  return (
    <>
      <Navbar />
      <main className="profile playlist-page">
        <section className="pl-hero container">
          <motion.span className="pl-hero-emoji" initial={{ scale: 0.5, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }}>
            <ListMusic size={64} />
          </motion.span>
          <div>
            <span className="pf-tier">
              <ListMusic size={14} /> QuizList
            </span>
            <h1>{pl.title}</h1>
            {pl.description && <p className="muted">{pl.description}</p>}
            <p className="pl-by">
              by <b>{pl.owner}</b> · {items.length} {items.length === 1 ? 'game' : 'games'}
            </p>
            <div className="pl-hero-actions">
              {first && (
                <Link to={`/play/${first.slug}`} className="btn btn-primary">
                  <Play size={16} fill="currentColor" /> Play first game
                </Link>
              )}
              <button type="button" className="btn btn-ghost" onClick={share}>
                <Share2 size={16} /> Share
              </button>
              {pl.is_owner && (
                <Link to="/profile?tab=quizlists" className="btn btn-ghost">
                  <Pencil size={16} /> Edit
                </Link>
              )}
            </div>
          </div>
        </section>
        <section className="container pf-body">
          {items.length ? (
            <div className="games-grid">
              {items.map((g) => (
                <GameCard key={g.slug} game={g} />
              ))}
            </div>
          ) : (
            <p className="muted">This QuizList is empty for now.</p>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
