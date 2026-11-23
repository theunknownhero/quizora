import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { games } from '../data/games.js'
import Navbar from '../components/Navbar.jsx'

// Temporary screen until each quiz is built.
export default function GamePlaceholder() {
  const { slug } = useParams()
  const g = games.find((x) => x.slug === slug)
  return (
    <>
      <Navbar />
      <main className="placeholder">
        <motion.div className="placeholder-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <span className="placeholder-emoji">{g?.emoji ?? '🎲'}</span>
          <h1>{g?.title ?? 'Game not found'}</h1>
          <p>{g ? 'This quiz is being built. Check back soon!' : 'We could not find that game.'}</p>
          <Link to="/" className="btn btn-primary btn-lg">
            ← Back to games
          </Link>
        </motion.div>
      </main>
    </>
  )
}
