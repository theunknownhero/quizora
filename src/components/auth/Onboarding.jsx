import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router-dom'
import Stepper, { Step } from '../rb/Stepper.jsx'
import Flag from '../Flag.jsx'
import { useApp } from '../../state/AppState.jsx'
import { interests, topics } from '../../data/preferences.js'
import { ALL, countries } from '../../data/countries.js'
import { recommend } from '../../data/games.js'
import './auth.css'
import { ArrowRight, Check, PartyPopper } from 'lucide-react'

function ChipGrid({ options, value, onToggle, label }) {
  return (
    <div className="ob-chips" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o.id)
        return (
          <button key={o.id} type="button" aria-pressed={on} className={`ob-chip ${on ? 'is-on' : ''}`} onClick={() => onToggle(o.id)}>
            <span className="ob-chip-emoji" aria-hidden="true">
              {o.emoji}
            </span>
            {o.label}
            <span className="ob-chip-check" aria-hidden="true">
              <Check size={14} strokeWidth={3} />
            </span>
          </button>
        )
      })}
    </div>
  )
}

const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

export default function Onboarding() {
  const { user, onboarding, closeOnboarding, saveProfile, country } = useApp()
  const [step, setStep] = useState(1)
  const [picks, setPicks] = useState({ interests: [], topics: [], countries: [] })

  // Load existing answers (editing) or sensible defaults (first time)
  useEffect(() => {
    if (!onboarding || !user) return
    const p = user.profile || {}
    setPicks({
      interests: p.interests || [],
      topics: p.topics || [],
      countries: p.countries?.length ? p.countries : country !== ALL ? [country] : [],
    })
    setStep(1)
  }, [onboarding]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!onboarding) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [onboarding])

  const keys = ['interests', 'topics', 'countries']
  const currentKey = keys[step - 1]
  const canContinue = !currentKey || picks[currentKey].length > 0
  const editing = !!user?.profile?.onboarded
  const recs = useMemo(() => recommend(picks, { interests, topics }, country, 3), [picks, country])

  const finish = () => {
    saveProfile({ ...picks, onboarded: true })
    setStep(4)
  }
  const skip = () => {
    saveProfile({ onboarded: true })
    closeOnboarding()
  }

  if (!user) return null

  return (
    <AnimatePresence>
      {onboarding && (
        <motion.div className="ob-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="ob-shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ob-title"
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <div className="ob-head">
              <div>
                <span className="eyebrow">{editing ? 'Your preferences' : 'Welcome aboard'}</span>
                <h2 id="ob-title" className="ob-title">
                  {editing ? 'Update your picks' : `Hi ${user.username}! Let’s personalise Quizora`}
                </h2>
                <p className="ob-sub">Choose what you’re into and we’ll suggest quizzes you’ll love. You can change this any time.</p>
              </div>
              {step <= 3 && (
                <button type="button" className="ob-skip" onClick={editing ? closeOnboarding : skip}>
                  {editing ? 'Cancel' : 'Skip for now'}
                </button>
              )}
            </div>

            <Stepper
              step={step}
              onStepChange={setStep}
              onFinalStepCompleted={finish}
              indicator="numbers"
              linear={!editing}
              accentColor="#8b5cf6"
              width="100%"
              radius={26}
              className="ob-stepper"
              backButtonText="Back"
              nextButtonText="Continue"
              completeButtonText="Finish"
              nextButtonProps={{ disabled: !canContinue, 'aria-disabled': !canContinue }}
              completedContent={
                <div className="ob-done">
                  <motion.div className="ob-done-emoji" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12 }}>
                    <PartyPopper size={44} />
                  </motion.div>
                  <h3>You’re all set!</h3>
                  <p>Here are a few quizzes picked for you:</p>
                  <div className="ob-recs">
                    {recs.length ? (
                      recs.map((g) => (
                        <Link key={g.slug} to={g.status === 'live' ? `/play/${g.slug}` : '/#games'} className="ob-rec" onClick={closeOnboarding}>
                          <span className="ob-rec-thumb" style={{ background: `linear-gradient(135deg, ${g.gradient[0]}, ${g.gradient[1]})` }}>
                            {g.emoji}
                          </span>
                          <span>
                            <b>{g.title}</b>
                            <small>{g.status === 'live' ? 'Play now' : 'Coming soon'}</small>
                          </span>
                        </Link>
                      ))
                    ) : (
                      <p className="ob-empty">New quizzes for your picks are on the way.</p>
                    )}
                  </div>
                  <button type="button" className="btn btn-primary btn-lg" onClick={closeOnboarding}>
                    Start exploring <span className="btn-icon"><ArrowRight size={14} /></span>
                  </button>
                </div>
              }
            >
              <Step title="Interests">
                <div className="ob-step">
                  <h3>What are you into?</h3>
                  <p>Pick as many as you like.</p>
                  <ChipGrid label="Interests" options={interests} value={picks.interests} onToggle={(id) => setPicks((p) => ({ ...p, interests: toggle(p.interests, id) }))} />
                </div>
              </Step>
              <Step title="Topics">
                <div className="ob-step">
                  <h3>Which topics should we suggest more of?</h3>
                  <p>We’ll use these to recommend new quizzes.</p>
                  <ChipGrid label="Topics" options={topics} value={picks.topics} onToggle={(id) => setPicks((p) => ({ ...p, topics: toggle(p.topics, id) }))} />
                </div>
              </Step>
              <Step title="Countries">
                <div className="ob-step">
                  <h3>Which countries interest you?</h3>
                  <p>We’ll highlight quizzes about these places.</p>
                  <div className="ob-countries" role="group" aria-label="Countries">
                    {countries.map((c) => {
                      const on = picks.countries.includes(c.code)
                      return (
                        <button key={c.code} type="button" aria-pressed={on} className={`ob-country ${on ? 'is-on' : ''}`} onClick={() => setPicks((p) => ({ ...p, countries: toggle(p.countries, c.code) }))}>
                          <Flag code={c.code} size={34} />
                          <span>{c.name}</span>
                          <span className="ob-chip-check" aria-hidden="true">
                            <Check size={14} strokeWidth={3} />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </Step>
            </Stepper>
            {step <= 3 && !canContinue && <p className="ob-need">Pick at least one to continue</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
