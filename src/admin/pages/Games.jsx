// Games: every quiz on the site. Create, edit, publish, feature, reorder, age-rate, and jump to its questions.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gamepad2, Plus, Pencil, Trash2, HelpCircle, Star, Eye, EyeOff, Clock, Lock, ExternalLink } from 'lucide-react'
import { PageHead, Card, Btn, Pill, Modal, Field, Toggle, Loading, Empty, SearchBox, useAsync } from '../ui.jsx'
import * as api from '../api.js'
import { useApp } from '../../state/AppState.jsx'
import { countries } from '../../data/countries.js'

const STATUS_TONE = { live: 'green', soon: 'gold', hidden: 'muted' }
const BLANK = {
  slug: '', title: '', tagline: '', emoji: '🎯', gradient: ['#8b5cf6', '#22d3ee'], categories: [], countries: [], status: 'soon', featured: false,
  difficulty: 'Medium', minutes: 4, questions: 20, age_rating: 0, prompt: 'True or false?', yes_label: 'True', no_label: 'False', sort: 100,
}
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

export function GameEditor({ game, categories, onClose, onSaved }) {
  const { pushToast, reloadSite } = useApp()
  const isNew = !game?.slug
  const [g, setG] = useState(() => ({ ...BLANK, ...(game || {}), countries: game?.countries || [] }))
  const [busy, setBusy] = useState(false)
  const set = (k) => (v) => setG((s) => ({ ...s, [k]: v }))
  const toggleIn = (k, v) => setG((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }))

  const save = async () => {
    setBusy(true)
    try {
      await api.saveGame({ ...g, slug: g.slug || slugify(g.title) })
      await reloadSite()
      pushToast({ emoji: '✅', title: 'Saved', text: `${g.title} is saved` })
      onSaved()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Games', text: e.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={isNew ? 'New quiz' : `Edit ${game.title}`}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" busy={busy} onClick={save}>
            {isNew ? 'Create quiz' : 'Save changes'}
          </Btn>
        </>
      }
    >
      <div className="qa-editor">
        <div className="qa-form">
          <Field label="Title" span={2}>
            <input value={g.title} onChange={(e) => setG((s) => ({ ...s, title: e.target.value, ...(isNew ? { slug: slugify(e.target.value) } : {}) }))} placeholder="Italy or Not?" autoFocus />
          </Field>
          <Field label="URL slug" hint={isNew ? `quizora.com/play/${g.slug || '…'}` : 'Can’t change after creation'}>
            <input value={g.slug} onChange={(e) => set('slug')(slugify(e.target.value))} disabled={!isNew} />
          </Field>
          <Field label="Emoji">
            <input value={g.emoji} onChange={(e) => set('emoji')(e.target.value)} maxLength={8} />
          </Field>
          <Field label="Tagline" span={2}>
            <input value={g.tagline} onChange={(e) => set('tagline')(e.target.value)} placeholder="One line that makes people want to play" />
          </Field>
          <Field label="Status">
            <select value={g.status} onChange={(e) => set('status')(e.target.value)}>
              <option value="live">Live: playable</option>
              <option value="soon">Coming soon: visible, not playable</option>
              <option value="hidden">Hidden: not shown anywhere</option>
            </select>
          </Field>
          <Field label="Difficulty">
            <select value={g.difficulty} onChange={(e) => set('difficulty')(e.target.value)}>
              {['Easy', 'Medium', 'Hard'].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Questions per round" hint="5–50">
            <input type="number" min={5} max={50} value={g.questions} onChange={(e) => set('questions')(Number(e.target.value))} />
          </Field>
          <Field label="Minutes (shown on card)">
            <input type="number" min={1} max={60} value={g.minutes} onChange={(e) => set('minutes')(Number(e.target.value))} />
          </Field>
          <Field label="Gradient start">
            <input type="color" value={g.gradient[0]} onChange={(e) => set('gradient')([e.target.value, g.gradient[1]])} />
          </Field>
          <Field label="Gradient end">
            <input type="color" value={g.gradient[1]} onChange={(e) => set('gradient')([g.gradient[0], e.target.value])} />
          </Field>
          <Field label="Question prompt" span={2} hint="Shown under every question">
            <input value={g.prompt} onChange={(e) => set('prompt')(e.target.value)} placeholder="Does it come from Italy?" />
          </Field>
          <Field label="“Yes” button">
            <input value={g.yes_label} onChange={(e) => set('yes_label')(e.target.value)} placeholder="Italy" />
          </Field>
          <Field label="“No” button">
            <input value={g.no_label} onChange={(e) => set('no_label')(e.target.value)} placeholder="Not" />
          </Field>
          <Field label="Sort order" hint="Lower shows first">
            <input type="number" value={g.sort} onChange={(e) => set('sort')(Number(e.target.value))} />
          </Field>
          <div className="qa-field span-2 qa-toggles">
            <Toggle checked={g.featured} onChange={set('featured')} label="Featured" hint="Hero spot on the home page (only one)" />
            <Toggle checked={g.age_rating >= 18} onChange={(v) => set('age_rating')(v ? 18 : 0)} label="18+ only" hint="Hidden from minors, enforced by the server" />
          </div>
          <Field label="Categories" span={2}>
            <div className="qa-chips">
              {categories.map((c) => (
                <button key={c.id} type="button" className={g.categories.includes(c.id) ? 'is-on' : ''} onClick={() => toggleIn('categories', c.id)}>
                  {c.emoji} {c.name}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Country badges (optional)" span={2} hint="Shows a flag badge and boosts it for players from these countries">
            <div className="qa-chips">
              {countries
                .filter((c) => c.code !== 'ALL')
                .map((c) => (
                  <button key={c.code} type="button" className={g.countries.includes(c.code) ? 'is-on' : ''} onClick={() => toggleIn('countries', c.code)}>
                    {c.code}
                  </button>
                ))}
            </div>
          </Field>
        </div>
        <div className="qa-preview">
          <small>Card preview</small>
          <div className="qa-game-preview">
            <div className="qa-game-thumb" style={{ background: `linear-gradient(135deg, ${g.gradient[0]}, ${g.gradient[1]})` }}>
              <span>{g.emoji}</span>
              <Pill tone={STATUS_TONE[g.status]}>{g.status}</Pill>
              {g.age_rating >= 18 && <em className="game-age">18+</em>}
            </div>
            <b>{g.title || 'Quiz title'}</b>
            <p>{g.tagline || 'Tagline goes here.'}</p>
            <small>
              {g.questions} Qs · ~{g.minutes} min · {g.difficulty}
            </small>
          </div>
          <div className="qa-q-preview">
            <small>Question preview</small>
            <b>Pizza Margherita</b>
            <p>{g.prompt}</p>
            <div>
              <span className="yes">{g.yes_label}</span>
              <span className="no">{g.no_label}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function GamesPage() {
  const { pushToast, reloadSite } = useApp()
  const { data, loading, error, reload } = useAsync(() => api.catalog(), [])
  const [edit, setEdit] = useState(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const list = useMemo(
    () => (data?.games || []).filter((g) => (!status || g.status === status) && (!q || `${g.title} ${g.slug}`.toLowerCase().includes(q.toLowerCase()))),
    [data, q, status]
  )

  const quick = async (g, patch, msg) => {
    try {
      await api.saveGame({ ...g, ...patch })
      await reloadSite()
      pushToast({ emoji: '✅', title: 'Games', text: msg })
      reload()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Games', text: e.message })
    }
  }
  const remove = async (g) => {
    if (!window.confirm(`Delete “${g.title}”? If people already played it, it will be hidden instead so history stays intact.`)) return
    try {
      await api.deleteGame(g.slug)
      await reloadSite()
      reload()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Games', text: e.message })
    }
  }

  return (
    <>
      <PageHead title="Games & questions" sub="Every quiz on Quizora. New “live” quizzes are playable right away with the standard player." icon={Gamepad2}>
        <Btn kind="primary" icon={Plus} onClick={() => setEdit({})}>
          New quiz
        </Btn>
      </PageHead>
      <div className="qa-filters">
        <SearchBox value={q} onChange={setQ} placeholder="Search quizzes" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          <option value="live">Live</option>
          <option value="soon">Coming soon</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <p className="qa-error">{error.message}</p>
      ) : !list.length ? (
        <Empty icon={Gamepad2} title="No quizzes match" />
      ) : (
        <div className="qa-game-grid">
          {list.map((g) => {
            const enough = g.question_count >= g.questions
            return (
              <article key={g.slug} className="qa-game">
                <div className="qa-game-thumb" style={{ background: `linear-gradient(135deg, ${g.gradient[0]}, ${g.gradient[1]})` }}>
                  <span>{g.emoji}</span>
                  <Pill tone={STATUS_TONE[g.status]}>{g.status}</Pill>
                  {g.featured && (
                    <em className="qa-feat">
                      <Star size={12} fill="currentColor" /> Featured
                    </em>
                  )}
                  {g.age_rating >= 18 && <em className="game-age">18+</em>}
                </div>
                <div className="qa-game-body">
                  <b>{g.title}</b>
                  <small>/{g.slug}</small>
                  <div className="qa-game-stats">
                    <span className={enough ? '' : 'warn'} title={enough ? '' : `Needs at least ${g.questions} active questions for a full round`}>
                      <HelpCircle size={13} /> {g.question_count} questions
                    </span>
                    <span>
                      <Clock size={13} /> {g.rounds_30d} rounds / 30d
                    </span>
                  </div>
                  {g.status === 'live' && !enough && <p className="qa-warn-text">Not enough questions for a full {g.questions}-question round.</p>}
                </div>
                <div className="qa-game-actions">
                  <Link to={`/admin/games/${g.slug}`} className="qa-btn is-primary is-sm">
                    <HelpCircle size={14} /> Questions
                  </Link>
                  <Btn size="sm" icon={Pencil} onClick={() => setEdit(g)}>
                    Edit
                  </Btn>
                  {g.status !== 'live' ? (
                    <Btn size="sm" icon={Eye} onClick={() => quick(g, { status: 'live' }, `${g.title} is live`)} disabled={!g.question_count}>
                      Publish
                    </Btn>
                  ) : (
                    <Btn size="sm" icon={EyeOff} onClick={() => quick(g, { status: 'soon' }, `${g.title} is now “coming soon”`)}>
                      Unpublish
                    </Btn>
                  )}
                  {!g.featured && (
                    <Btn size="sm" icon={Star} onClick={() => quick(g, { featured: true }, `${g.title} is featured`)}>
                      Feature
                    </Btn>
                  )}
                  <a href={`/play/${g.slug}`} target="_blank" rel="noopener noreferrer" className="qa-icon-btn" title="Open on site" aria-label="Open on site">
                    <ExternalLink size={15} />
                  </a>
                  <button type="button" className="qa-icon-btn is-danger" onClick={() => remove(g)} title="Delete" aria-label={`Delete ${g.title}`}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
      {data?.orphan_questions?.length > 0 && (
        <p className="qa-muted small">
          <Lock size={12} /> Questions exist for unknown games: {data.orphan_questions.join(', ')}. Create a quiz with that slug to use them.
        </p>
      )}
      {edit && <GameEditor game={edit.slug ? edit : null} categories={data?.categories || []} onClose={() => setEdit(null)} onSaved={() => (setEdit(null), reload())} />}
    </>
  )
}
