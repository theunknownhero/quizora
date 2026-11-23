import { forwardRef } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import SpotlightCard from './SpotlightCard.jsx'
import TiltCard from './TiltCard.jsx'
import { categories, isForCountry } from '../data/games.js'
import CountryBadge from './CountryBadge.jsx'
import { useApp } from '../state/AppState.jsx'

const GameCard = forwardRef(function GameCard({ game }, ref) {
  const { country } = useApp()
  const live = game.status === 'live'
  const [a, b] = game.gradient
  const cats = game.categories.map((id) => categories.find((c) => c.id === id)).filter(Boolean)
  const body = (
    <SpotlightCard className={`game-card ${live ? '' : 'game-card--soon'}`} color={`${a}33`}>
      <div className="game-thumb" style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
        <span className="game-thumb-emoji">{game.emoji}</span>
        <span className="game-thumb-grid" />
        {game.countries && <CountryBadge codes={game.countries} highlight={isForCountry(game, country)} className="game-country" />}
        <span className={`game-status ${live ? 'is-live' : ''}`}>
          {live ? (
            <>
              <i className="pulse-dot" /> Live
            </>
          ) : (
            'Coming soon'
          )}
        </span>
      </div>
      <div className="game-body">
        <h3>{game.title}</h3>
        <p>{game.tagline}</p>
        <div className="game-tags">
          {cats.slice(0, 2).map((c) => (
            <span key={c.id} className="tag">
              {c.emoji} {c.label}
            </span>
          ))}
        </div>
        <div className="game-meta">
          <span>{game.questions} Qs</span>
          <span>~{game.minutes} min</span>
          <span>{game.difficulty}</span>
          <span className="game-arrow" aria-hidden="true">
            →
          </span>
        </div>
      </div>
    </SpotlightCard>
  )
  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35 }}
    >
      <TiltCard max={6}>
        {live ? (
          <Link to={`/play/${game.slug}`} className="game-link" aria-label={`Play ${game.title}`}>
            {body}
          </Link>
        ) : (
          <div className="game-link" aria-disabled="true">
            {body}
          </div>
        )}
      </TiltCard>
    </motion.div>
  )
})

export default GameCard
