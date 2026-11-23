// Tournaments: month calendar, create/edit any tournament (special events, daily, weekly), prizes and terms,
// end/hide/delete, and the templates that auto-create the Daily Challenge and Weekly Masters.
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Medal, Plus, CalendarDays, Flame, Users, Sparkles, Pencil, Trash2, EyeOff, Eye, Square, ExternalLink, Wand2, Save } from 'lucide-react'
import { PageHead, Card, Btn, Pill, Modal, Field, Toggle, Loading, PrizeEditor, useAsync } from '../ui.jsx'
import * as api from '../api.js'
import { useApp } from '../../state/AppState.jsx'
import { games } from '../../data/games.js'

const KIND = {
  special: { label: 'Special event', tone: 'gold', icon: Sparkles },
  daily: { label: 'Daily', tone: 'cyan', icon: CalendarDays },
  weekly: { label: 'Weekly', tone: 'red', icon: Flame },
  community: { label: 'Community', tone: 'violet', icon: Users },
}
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const state = (t, now = Date.now()) => (t.finalized_at ? 'final' : now < new Date(t.starts_at) ? 'upcoming' : now < new Date(t.ends_at) ? 'live' : 'ended')
const STATE_TONE = { live: 'green', upcoming: 'cyan', ended: 'gold', final: 'muted' }

function Editor({ t, onClose, onSaved }) {
  const { pushToast } = useApp()
  const live = games.filter((g) => g.status === 'live')
  const [f, setF] = useState(() => ({
    kind: 'special',
    title: '',
    description: '',
    game_slug: live[0]?.slug,
    starts_at: new Date(Date.now() + 3600000).toISOString(),
    ends_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    question_count: 20,
    max_attempts: 3,
    min_level: 1,
    is_public: true,
    prizes: [
      { from: 1, to: 1, label: '1000 XP', xp: 1000 },
      { from: 2, to: 3, label: '500 XP', xp: 500 },
    ],
    terms: '',
    ...(t || {}),
  }))
  const [busy, setBusy] = useState(false)
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const save = async () => {
    setBusy(true)
    try {
      const code = await api.saveTournament(f)
      pushToast({ emoji: '✅', title: 'Tournament saved', text: `Code ${code}` })
      onSaved()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Tournaments', text: e.message })
    } finally {
      setBusy(false)
    }
  }
  const hours = Math.round((new Date(f.ends_at) - new Date(f.starts_at)) / 3600000)
  return (
    <Modal open wide onClose={onClose} title={t?.id ? `Edit ${t.title}` : 'New tournament'} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" busy={busy} onClick={save}>{t?.id ? 'Save changes' : 'Create tournament'}</Btn></>}>
      <div className="qa-form">
        <Field label="Title" span={2}>
          <input value={f.title} onChange={(e) => set('title')(e.target.value)} placeholder="Christmas Cup 2026" autoFocus />
        </Field>
        <Field label="Type">
          <select value={f.kind} onChange={(e) => set('kind')(e.target.value)}>
            <option value="special">Special event (featured on top)</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="community">Community (points only)</option>
          </select>
        </Field>
        <Field label="Quiz">
          <select value={f.game_slug} onChange={(e) => set('game_slug')(e.target.value)}>
            {live.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.emoji} {g.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Starts">
          <input type="datetime-local" value={api.toLocalInput(f.starts_at)} onChange={(e) => set('starts_at')(api.fromLocalInput(e.target.value))} />
        </Field>
        <Field label="Ends" hint={hours > 0 ? `Runs ${hours >= 48 ? `${Math.round(hours / 24)} days` : `${hours} hours`}` : 'End must be after start'}>
          <input type="datetime-local" value={api.toLocalInput(f.ends_at)} onChange={(e) => set('ends_at')(api.fromLocalInput(e.target.value))} />
        </Field>
        <Field label="Attempts per player">
          <select value={f.max_attempts} onChange={(e) => set('max_attempts')(Number(e.target.value))}>
            {[1, 2, 3, 5, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Minimum level">
          <input type="number" min={1} max={100} value={f.min_level} onChange={(e) => set('min_level')(Number(e.target.value))} />
        </Field>
        <Field label="Questions per attempt" hint="20 fits the Hungary map">
          <input type="number" min={5} max={50} value={f.question_count} onChange={(e) => set('question_count')(Number(e.target.value))} />
        </Field>
        <div className="qa-field">
          <Toggle checked={f.is_public} onChange={set('is_public')} label="Listed publicly" hint="Off = only people with the link" />
        </div>
        <Field label="Description" span={2}>
          <textarea rows={2} value={f.description} onChange={(e) => set('description')(e.target.value)} placeholder="What makes this one special?" />
        </Field>
        <div className="qa-field span-2">
          <span>Prizes</span>
          <PrizeEditor value={f.prizes} onChange={set('prizes')} />
          <small>XP is paid automatically when results are final. Tick “External” for real-world prizes (gift cards). They appear in Prize claims with the winner’s email.</small>
        </div>
        <Field label="Terms & conditions" span={2} hint="Shown on the tournament page">
          <textarea rows={3} value={f.terms} onChange={(e) => set('terms')(e.target.value)} placeholder="Eligibility, how prizes are delivered, disqualification rules…" />
        </Field>
      </div>
    </Modal>
  )
}

function Templates() {
  const { pushToast } = useApp()
  const { data, loading, reload } = useAsync(() => api.getSettings(), [])
  const [tpl, setTpl] = useState(null)
  const [busy, setBusy] = useState(false)
  const cur = tpl || data?.tournament_templates
  if (loading && !data) return <Loading />
  if (!cur) return null
  const set = (kind, k) => (v) => setTpl({ ...cur, [kind]: { ...cur[kind], [k]: v } })
  const save = async () => {
    setBusy(true)
    try {
      await api.setSetting('tournament_templates', cur)
      pushToast({ emoji: '✅', title: 'Saved', text: 'New daily/weekly tournaments will use these settings' })
      setTpl(null)
      reload()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Templates', text: e.message })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card title="Automatic tournaments" icon={Wand2} actions={<Btn kind="primary" size="sm" icon={Save} busy={busy} disabled={!tpl} onClick={save}>Save templates</Btn>}>
      <p className="qa-muted small">These are created automatically: a Daily Challenge every UTC day and a Weekly Masters every Monday. Changes apply to the next one; edit the current one from the calendar.</p>
      <div className="qa-grid-2">
        {['daily', 'weekly'].map((kind) => {
          const t = cur[kind]
          return (
            <div key={kind} className="qa-tpl">
              <Toggle checked={t.enabled !== false} onChange={set(kind, 'enabled')} label={kind === 'daily' ? 'Daily Challenge' : 'Weekly Masters'} hint={kind === 'daily' ? 'Every day at 00:00 UTC' : 'Every Monday at 00:00 UTC'} />
              <div className="qa-form">
                <Field label="Title prefix">
                  <input value={t.title || ''} onChange={(e) => set(kind, 'title')(e.target.value)} />
                </Field>
                <Field label="Quiz" hint="Auto = the quiz with the most questions">
                  <select value={t.game || ''} onChange={(e) => set(kind, 'game')(e.target.value || null)}>
                    <option value="">Auto</option>
                    {games
                      .filter((g) => g.status === 'live')
                      .map((g) => (
                        <option key={g.slug} value={g.slug}>
                          {g.title}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Attempts">
                  <input type="number" min={1} max={10} value={t.attempts} onChange={(e) => set(kind, 'attempts')(Number(e.target.value))} />
                </Field>
                <Field label="Min level">
                  <input type="number" min={1} value={t.min_level} onChange={(e) => set(kind, 'min_level')(Number(e.target.value))} />
                </Field>
                <Field label="Description" span={2}>
                  <input value={t.description || ''} onChange={(e) => set(kind, 'description')(e.target.value)} />
                </Field>
                <div className="qa-field span-2">
                  <span>Prizes</span>
                  <PrizeEditor value={t.prizes || []} onChange={set(kind, 'prizes')} />
                </div>
                <Field label="Terms" span={2}>
                  <textarea rows={2} value={t.terms || ''} onChange={(e) => set(kind, 'terms')(e.target.value)} />
                </Field>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default function TournamentsPage() {
  const { pushToast } = useApp()
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const from = new Date(month.getFullYear(), month.getMonth(), 1 - ((month.getDay() + 6) % 7))
  const to = new Date(from.getTime() + 42 * 86400000)
  const { data, loading, error, reload } = useAsync(() => api.listTournaments(from.toISOString(), to.toISOString()), [month.getTime()])
  const [edit, setEdit] = useState(null)
  const [sel, setSel] = useState(null)
  const days = Array.from({ length: 42 }, (_, i) => new Date(from.getTime() + i * 86400000))

  const byDay = useMemo(() => {
    const m = {}
    for (const t of data || []) {
      const s = new Date(t.starts_at)
      const e = new Date(t.ends_at)
      for (const d of days) {
        const dEnd = new Date(d.getTime() + 86400000)
        if (s < dEnd && e > d) (m[dayKey(d)] ||= []).push(t)
      }
    }
    return m
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (t, action, label) => {
    if (!window.confirm(`${label} “${t.title}”?`)) return
    try {
      await api.tournamentAction(t.id, action)
      pushToast({ emoji: '✅', title: 'Tournaments', text: `${label}: done` })
      setSel(null)
      reload()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Tournaments', text: e.message })
    }
  }

  const list = (data || []).slice().sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
  const today = dayKey(new Date())

  return (
    <>
      <PageHead title="Tournaments" sub="Plan events on the calendar, set prize pools and terms, and manage the automatic daily and weekly tournaments." icon={Medal}>
        <Btn kind="primary" icon={Plus} onClick={() => setEdit({})}>
          New tournament
        </Btn>
      </PageHead>

      <Card
        title={month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        icon={CalendarDays}
        actions={
          <>
            <Btn size="sm" icon={ChevronLeft} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month" />
            <Btn size="sm" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
              Today
            </Btn>
            <Btn size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month">
              <ChevronRight size={15} />
            </Btn>
          </>
        }
      >
        <div className="qa-legend">
          {Object.entries(KIND).map(([k, v]) => (
            <span key={k} className={`qa-ev tone-${v.tone}`}>
              {v.label}
            </span>
          ))}
        </div>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <p className="qa-error">{error.message}</p>
        ) : (
          <div className="qa-cal">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <b key={d} className="qa-cal-dow">
                {d}
              </b>
            ))}
            {days.map((d) => {
              const evs = byDay[dayKey(d)] || []
              const out = d.getMonth() !== month.getMonth()
              return (
                <div key={d.toISOString()} className={`qa-cal-day ${out ? 'is-out' : ''} ${dayKey(d) === today ? 'is-today' : ''}`}>
                  <span className="qa-cal-n">{d.getDate()}</span>
                  <div className="qa-cal-evs">
                    {evs.slice(0, 4).map((t) => (
                      <button key={t.id} type="button" className={`qa-ev tone-${KIND[t.kind].tone} ${t.is_public ? '' : 'is-hidden'}`} onClick={() => setSel(t)} title={t.title}>
                        {t.title}
                      </button>
                    ))}
                    {evs.length > 4 && <small>+{evs.length - 4} more</small>}
                  </div>
                  <button type="button" className="qa-cal-add" onClick={() => setEdit({ starts_at: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18).toISOString(), ends_at: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 2, 18).toISOString() })} aria-label={`New tournament on ${d.toDateString()}`}>
                    <Plus size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card title={`This view (${list.length})`} icon={Medal} pad={false}>
        <div className="qa-table-wrap">
          <table className="qa-table is-click">
            <thead>
              <tr>
                <th>Tournament</th>
                <th>Type</th>
                <th>When</th>
                <th>Players</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => {
                const st = state(t)
                return (
                  <tr key={t.id} onClick={() => setSel(t)}>
                    <td>
                      <b>{t.title}</b>
                      <small className="qa-block qa-muted">
                        {t.code}
                        {t.creator ? ` · by ${t.creator}` : ''}
                        {!t.is_public ? ' · hidden' : ''}
                      </small>
                    </td>
                    <td>
                      <Pill tone={KIND[t.kind].tone}>{KIND[t.kind].label}</Pill>
                    </td>
                    <td className="qa-nowrap">
                      {api.fmt(t.starts_at)}
                      <small className="qa-block qa-muted">→ {api.fmt(t.ends_at)}</small>
                    </td>
                    <td>
                      {t.players} <small className="qa-muted">· {t.attempts} attempts</small>
                    </td>
                    <td>
                      <Pill tone={STATE_TONE[st]}>{st}</Pill>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Templates />

      <Modal
        open={!!sel}
        onClose={() => setSel(null)}
        title={sel?.title}
        footer={
          sel && (
            <>
              <a href={`/tournament/${sel.code}`} target="_blank" rel="noopener noreferrer" className="qa-btn">
                <ExternalLink size={15} /> Open
              </a>
              {!sel.finalized_at && (
                <Btn icon={Pencil} onClick={() => (setEdit(sel), setSel(null))}>
                  Edit
                </Btn>
              )}
              <Btn icon={sel.is_public ? EyeOff : Eye} onClick={() => act(sel, sel.is_public ? 'hide' : 'show', sel.is_public ? 'Hide' : 'Show')}>
                {sel.is_public ? 'Hide' : 'Show'}
              </Btn>
              {!sel.finalized_at && new Date(sel.starts_at) < new Date() && (
                <Btn icon={Square} onClick={() => act(sel, 'end_now', 'End now and pay out')}>
                  End now
                </Btn>
              )}
              <Btn kind="danger" icon={Trash2} disabled={sel.attempts > 0} onClick={() => act(sel, 'delete', 'Delete')}>
                Delete
              </Btn>
            </>
          )
        }
      >
        {sel && (
          <div className="qa-kv">
            <span>Code</span>
            <b>{sel.code}</b>
            <span>Type</span>
            <b>{KIND[sel.kind].label}</b>
            <span>Quiz</span>
            <b>{games.find((g) => g.slug === sel.game_slug)?.title || sel.game_slug}</b>
            <span>Runs</span>
            <b>
              {api.fmt(sel.starts_at)} → {api.fmt(sel.ends_at)}
            </b>
            <span>Status</span>
            <b>{state(sel)}</b>
            <span>Players · attempts</span>
            <b>
              {sel.players} · {sel.attempts}
            </b>
            <span>Attempts each · min level</span>
            <b>
              {sel.max_attempts} · {sel.min_level}
            </b>
            <span>Prizes</span>
            <b>{(sel.prizes || []).map((p) => `#${p.from}${p.to > p.from ? `–${p.to}` : ''}: ${p.label}`).join(' · ') || 'none'}</b>
          </div>
        )}
      </Modal>

      {edit && <Editor t={edit.id ? edit : { ...edit }} onClose={() => setEdit(null)} onSaved={() => (setEdit(null), reload())} />}
    </>
  )
}
