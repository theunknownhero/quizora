// Home page "Compete" section: today's tournaments, this week's top players and multiplayer.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { CalendarDays, Flame, Gift, Clock, Trophy, Swords, Users, Crown, ChevronRight, Medal } from 'lucide-react'
import SpotlightCard from './SpotlightCard.jsx'
import BlurText from './BlurText.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'
import { supabaseConfigured } from '../lib/supabase.js'
import * as compete from '../state/compete.js'
import { useT } from '../i18n/useT.js'
import './compete-home.css'

function useNow() {
  const [n, setN] = useState(Date.now())
  useEffect(() => {
    const i = setInterval(() => setN(Date.now()), 1000)
    return () => clearInterval(i)
  }, [])
  return n
}

function TourneyCard({ t, fallback, kind, now, offset }) {
  const isWeekly = kind === 'weekly'
  const Icon = isWeekly ? Flame : CalendarDays
  const left = t ? new Date(t.ends_at).getTime() - (now + offset) : null
  return (
    <Link to={t ? `/tournament/${t.code}` : '/tournaments'} className={`ch-card ch-tourney ${isWeekly ? 'is-weekly' : 'is-daily'}`}>
      <SpotlightCard className="ch-inner" color={isWeekly ? 'rgba(244,63,94,0.18)' : 'rgba(34,211,238,0.18)'}>
        <div className="ch-glow" aria-hidden="true" />
        <header>
          <span className="ch-kind">
            <Icon size={13} /> {isWeekly ? 'Weekly · Hard' : 'Daily'}
          </span>
          {left != null && (
            <span className="ch-time">
              <Clock size={13} /> {compete.fmtLeft(left)}
            </span>
          )}
        </header>
        <h3>{t?.title || fallback.title}</h3>
        <p>{t?.description || fallback.text}</p>
        {t?.prizes?.[0] && (
          <div className="ch-prize">
            <Gift size={16} /> <span>1st: {t.prizes[0].label}</span>
          </div>
        )}
        <span className="ch-go">
          {t ? 'Enter now' : 'See tournaments'} <ChevronRight size={16} />
        </span>
      </SpotlightCard>
    </Link>
  )
}

export default function CompeteSection() {
  const t = useT()
  const now = useNow()
  const [official, setOfficial] = useState([])
  const [offset, setOffset] = useState(0)
  const [top, setTop] = useState(null)

  useEffect(() => {
    if (!supabaseConfigured) return
    compete
      .listTournaments()
      .then((d) => {
        setOffset(new Date(d.now).getTime() - Date.now())
        setOfficial(d.official)
      })
      .catch(() => {})
    compete
      .getLeaderboard('week', 'global', null)
      .then((d) => setTop(d.rows.slice(0, 3)))
      .catch(() => setTop([]))
  }, [])

  const daily = official.find((x) => x.kind === 'daily')
  const weekly = official.find((x) => x.kind === 'weekly')

  return (
    <section className="section ch" id="compete">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t('compete.eyebrow')}</span>
          <BlurText text={t('compete.title')} className="section-title" />
          <p className="section-sub">{t('compete.sub')}</p>
        </div>
        <motion.div className="ch-grid" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.55 }}>
          <TourneyCard t={daily} kind="daily" now={now} offset={offset} fallback={{ title: 'Daily Challenge', text: 'A fresh challenge every day. Three attempts, XP rewards for the top 10.' }} />
          <TourneyCard t={weekly} kind="weekly" now={now} offset={offset} fallback={{ title: 'Weekly Masters', text: 'The hard one. One attempt, level 3+, a real prize for the winner.' }} />

          <Link to="/leaderboards" className="ch-card ch-board">
            <SpotlightCard className="ch-inner" color="rgba(252,211,77,0.16)">
              <header>
                <span className="ch-kind is-gold">
                  <Trophy size={13} /> {t('nav.leaderboards')}
                </span>
                <span className="ch-time">This week</span>
              </header>
              {top && top.length > 0 ? (
                <ol className="ch-top">
                  {top.map((r) => (
                    <li key={r.id}>
                      <span className={`ch-rank r${r.rank}`}>{r.rank === 1 ? <Crown size={14} /> : r.rank}</span>
                      <PlayerAvatar username={r.username} level={r.level} size={34} />
                      <b>{r.username}</b>
                      <em>{r.xp.toLocaleString()} XP</em>
                    </li>
                  ))}
                </ol>
              ) : (
                <>
                  <h3>Climb the board</h3>
                  <p>Every round earns XP. Top the weekly, monthly or all-time rankings, or just beat your friends.</p>
                </>
              )}
              <span className="ch-go">
                See full rankings <ChevronRight size={16} />
              </span>
            </SpotlightCard>
          </Link>

          <Link to="/play-together" className="ch-card ch-together">
            <SpotlightCard className="ch-inner" color="rgba(139,92,246,0.2)">
              <header>
                <span className="ch-kind is-violet">
                  <Swords size={13} /> {t('nav.together')}
                </span>
              </header>
              <h3>Duel or party</h3>
              <p>Quick 1v1 matches against other players, or a private party for up to 8 friends with a room code.</p>
              <div className="ch-chips">
                <span>
                  <Swords size={13} /> 1v1
                </span>
                <span>
                  <Users size={13} /> Up to 8
                </span>
                <span>
                  <Medal size={13} /> Speed bonus
                </span>
              </div>
              <span className="ch-go">
                Play now <ChevronRight size={16} />
              </span>
            </SpotlightCard>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
