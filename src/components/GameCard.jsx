import { forwardRef } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import SpotlightCard from './SpotlightCard.jsx'
import TiltCard from './TiltCard.jsx'
import { categories, isForCountry } from '../data/games.js'
import CountryBadge from './CountryBadge.jsx'
import GameActions from './GameActions.jsx'
import { useApp } from '../state/AppState.jsx'
import { useT } from '../i18n/useT.js'
import { ArrowRight, Lock } from 'lucide-react'
import { isAdultOnly, playableBy, visibleTo } from '../lib/age.js'

const GameCard = forwardRef(function GameCard({ game }, ref) {
  const { country, user, openAuth, openAgeCheck } = useApp()
  const t = useT()
  if (!visibleTo(game, user)) return null
  const adult = isAdultOnly(game)
  const locked = adult && !playableBy(game, user)
  const live = game.status === 'live'
  const [a, b] = game.gradient
  const cats = game.categories.map((id) => categories.find((c) => c.id === id)).filter(Boolean)
  const body = (
    <SpotlightCard className={`game-card ${live ? '' : 'game-card--soon'}`} color={`${a}33`}>
      <div className="game-thumb" style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
        <span className="game-thumb-emoji">{game.emoji}</span>
        <span className="game-thumb-grid" />
        {game.countries && <CountryBadge codes={game.countries} highlight={isForCountry(game, country)} className="game-country" />}
        {adult && (
          <span className="game-age" title="18+ only">
            {locked && <Lock size={11} strokeWidth={2.6} />}18+
          </span>
        )}
        <span className={`game-status ${live ? 'is-live' : ''}`}>
          {live ? (
            <>
              <i className="pulse-dot" /> {t('card.live')}
            </>
          ) : (
            t('card.soon')
          )}
        </span>
      </div>
      <div className="game-body">
        <h3>{game.title}</h3>
        <p>{game.tagline}</p>
        <div className="game-tags">
          {cats.slice(0, 2).map((c) => (
            <span key={c.id} className="tag">
              {c.emoji} {t(`cat.${c.id}`)}
            </span>
          ))}
        </div>
        <GameActions slug={game.slug} compact />
        <div className="game-meta">
          <span>{t('card.qs', { n: game.questions })}</span>
          <span>{t('card.min', { n: game.minutes })}</span>
          <span>{t(`diff.${game.difficulty}`)}</span>
          <span className="game-arrow" aria-hidden="true">
            <ArrowRight size={16} />
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
        {live && locked ? (
          <button type="button" className="game-link" aria-label={`${game.title} is 18+. ${user ? 'Confirm your age' : 'Log in'} to play`} onClick={() => (user ? openAgeCheck() : openAuth('login'))}>
            {body}
          </button>
        ) : live ? (
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
