// Questions for one quiz: every question type, add/edit with live preview, (de)activate, delete,
// bulk import (CSV / JSON) and CSV export.
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { HelpCircle, Plus, Pencil, Trash2, Upload, Download, ArrowLeft, Check, X, Settings2, ArrowUp, ArrowDown, ToggleLeft, ListChecks, CheckSquare, Type, Hash, ListOrdered, Image as ImageIcon } from 'lucide-react'
import { PageHead, Card, Btn, Pill, Modal, Field, Toggle, Loading, Empty, SearchBox, useAsync } from '../ui.jsx'
import * as api from '../api.js'
import { useApp } from '../../state/AppState.jsx'
import { GameEditor } from './Games.jsx'
import QuestionInput, { QuestionHeader, KIND_LABEL } from '../../components/QuestionInput.jsx'

const KINDS = [
  ['truefalse', 'True / False', ToggleLeft, 'Two buttons, like Hungary / Not'],
  ['choice', 'Multiple choice', ListChecks, '2–8 options, one is right'],
  ['multi', 'Pick all that apply', CheckSquare, 'Several options are right'],
  ['text', 'Type the answer', Type, 'Players type it; case and punctuation don’t matter'],
  ['number', 'Number guess', Hash, 'Year, size, amount… with a tolerance'],
  ['order', 'Put in order', ListOrdered, 'Arrange 3–8 items in the right order'],
]
const KIND_ICON = Object.fromEntries(KINDS.map(([k, , I]) => [k, I]))
const BLANK = { item: '', type: 'General', emoji: '❓', kind: 'truefalse', answer: true, options: ['', '', '', ''], solution: { index: 0 }, prompt: '', image: '', fact: '', active: true }

function blankFor(kind, base = {}) {
  const keep = { item: base.item || '', type: base.type || 'General', emoji: base.emoji || '❓', prompt: base.prompt || '', image: base.image || '', fact: base.fact || '', active: base.active ?? true, id: base.id }
  if (kind === 'truefalse') return { ...keep, kind, answer: base.answer ?? true }
  if (kind === 'choice') return { ...keep, kind, options: base.options?.length >= 2 ? base.options : ['', '', '', ''], solution: { index: 0 } }
  if (kind === 'multi') return { ...keep, kind, options: base.options?.length >= 2 ? base.options : ['', '', '', ''], solution: { indices: [] } }
  if (kind === 'text') return { ...keep, kind, solution: { accepted: [''] } }
  if (kind === 'number') return { ...keep, kind, solution: { value: '', tolerance: 0, unit: '', min: '', max: '', step: 1 } }
  if (kind === 'order') return { ...keep, kind, options: base.options?.length >= 3 ? base.options : ['', '', ''] }
  return keep
}

// Turn the editor state into what the server stores (drops empty rows, numbers as numbers)
function clean(q) {
  const out = { ...q }
  if (['choice', 'multi', 'order'].includes(q.kind)) {
    const keepIdx = []
    out.options = q.options.filter((o, i) => (o.trim() ? (keepIdx.push(i), true) : false)).map((o) => o.trim())
    const remap = (i) => keepIdx.indexOf(i)
    if (q.kind === 'choice') out.solution = { index: remap(q.solution.index) }
    if (q.kind === 'multi') out.solution = { indices: q.solution.indices.map(remap).filter((i) => i >= 0) }
  }
  if (q.kind === 'text') out.solution = { accepted: q.solution.accepted.map((a) => a.trim()).filter(Boolean) }
  if (q.kind === 'number') {
    const n = (v) => (v === '' || v == null ? null : Number(v))
    out.solution = { value: n(q.solution.value), tolerance: n(q.solution.tolerance) || 0, unit: q.solution.unit || '', min: n(q.solution.min), max: n(q.solution.max), step: n(q.solution.step) || 1 }
  }
  return out
}

// Fake a public question so the preview looks exactly like the player view
const previewQ = (q) => {
  const c = clean(q)
  return {
    id: 'preview',
    item: c.item || 'Your question',
    type: c.type,
    emoji: c.emoji,
    kind: c.kind,
    prompt: c.prompt,
    image: c.image,
    options: c.options?.map((t, i) => ({ i, t })),
    pick: c.kind === 'multi' ? c.solution?.indices?.length : undefined,
    number: c.kind === 'number' ? { min: c.solution.min, max: c.solution.max, step: c.solution.step, unit: c.solution.unit } : undefined,
  }
}

// CSV: item, kind, answer, options (a | b | c), prompt, type, emoji, fact, image, tolerance, min, max, unit
function parseImport(text) {
  const t = text.trim()
  if (!t) return []
  const truthy = (v) => /^(1|true|yes|y|igen|ja|si|sí|sim|ano|da)$/i.test(String(v).trim())
  const split = (v) => String(v || '').split('|').map((x) => x.trim()).filter(Boolean)
  const build = (r) => {
    const kind = (r.kind || 'truefalse').trim().toLowerCase().replace(/[^a-z]/g, '')
    const k = { tf: 'truefalse', truefalse: 'truefalse', boolean: 'truefalse', choice: 'choice', mc: 'choice', multiplechoice: 'choice', multi: 'multi', multiselect: 'multi', text: 'text', type: 'text', typed: 'text', number: 'number', numeric: 'number', order: 'order', ordering: 'order' }[kind] || 'truefalse'
    const base = { item: String(r.item || '').trim(), kind: k, ...(r.type ? { type: r.type } : {}), ...(r.emoji ? { emoji: r.emoji } : {}), fact: r.fact || '', prompt: r.prompt || '', image: r.image || '' }
    const opts = Array.isArray(r.options) ? r.options : split(r.options)
    if (k === 'truefalse') return { ...base, answer: typeof r.answer === 'boolean' ? r.answer : truthy(r.answer) }
    if (k === 'choice') {
      const a = String(r.answer ?? '').trim()
      const idx = /^\d+$/.test(a) && Number(a) >= 1 && Number(a) <= opts.length ? Number(a) - 1 : opts.findIndex((o) => o.toLowerCase() === a.toLowerCase())
      return { ...base, options: opts, solution: { index: idx } }
    }
    if (k === 'multi') {
      const ans = split(r.answer).map((a) => a.toLowerCase())
      return { ...base, options: opts, solution: { indices: opts.map((o, i) => (ans.includes(o.toLowerCase()) || ans.includes(String(i + 1)) ? i : -1)).filter((i) => i >= 0) } }
    }
    if (k === 'text') return { ...base, solution: { accepted: split(r.answer) } }
    if (k === 'number') {
      const m = String(r.answer ?? '').match(/^\s*(-?[\d.]+)\s*(?:±|\+-|\+\/-)?\s*([\d.]+)?/)
      return { ...base, solution: { value: m ? Number(m[1]) : null, tolerance: Number(r.tolerance ?? m?.[2] ?? 0) || 0, unit: r.unit || '', min: r.min !== undefined && r.min !== '' ? Number(r.min) : null, max: r.max !== undefined && r.max !== '' ? Number(r.max) : null, step: 1 } }
    }
    if (k === 'order') return { ...base, options: opts }
    return base
  }
  if (t.startsWith('[')) return JSON.parse(t).map(build)
  const rows = []
  let row = []
  let cell = ''
  let q = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (q) {
      if (c === '"' && t[i + 1] === '"') (cell += '"'), i++
      else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',' || c === ';' || c === '\t') row.push(cell), (cell = '')
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  row.push(cell)
  rows.push(row)
  const head = rows.shift().map((h) => h.trim().toLowerCase())
  if (!head.includes('item')) throw new Error('CSV needs an “item” column')
  return rows.filter((r) => r.some((c) => c.trim())).map((r) => build(Object.fromEntries(head.map((h, i) => [h, r[i] ?? '']))))
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
function toCsvRow(r) {
  const opts = (r.options || []).join(' | ')
  let answer = ''
  if (r.kind === 'truefalse') answer = r.answer ? 'yes' : 'no'
  else if (r.kind === 'choice') answer = r.options?.[r.solution?.index] ?? ''
  else if (r.kind === 'multi') answer = (r.solution?.indices || []).map((i) => r.options[i]).join(' | ')
  else if (r.kind === 'text') answer = (r.solution?.accepted || []).join(' | ')
  else if (r.kind === 'number') answer = r.solution?.value ?? ''
  return [r.item, r.kind, answer, opts, r.prompt, r.type, r.emoji, r.fact, r.image, r.solution?.tolerance ?? '', r.solution?.min ?? '', r.solution?.max ?? '', r.solution?.unit ?? '', r.active].map(csvCell).join(',')
}

function OptionsEditor({ q, setQ }) {
  const set = (i, v) => setQ({ ...q, options: q.options.map((o, j) => (j === i ? v : o)) })
  const remove = (i) => {
    const options = q.options.filter((_, j) => j !== i)
    let solution = q.solution
    if (q.kind === 'choice') solution = { index: q.solution.index === i ? 0 : q.solution.index > i ? q.solution.index - 1 : q.solution.index }
    if (q.kind === 'multi') solution = { indices: q.solution.indices.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)) }
    setQ({ ...q, options, solution })
  }
  const move = (i, d) => {
    const j = i + d
    if (j < 0 || j >= q.options.length) return
    const options = [...q.options]
    ;[options[i], options[j]] = [options[j], options[i]]
    setQ({ ...q, options })
  }
  const isRight = (i) => (q.kind === 'choice' ? q.solution.index === i : q.kind === 'multi' ? q.solution.indices.includes(i) : false)
  const toggleRight = (i) =>
    q.kind === 'choice'
      ? setQ({ ...q, solution: { index: i } })
      : setQ({ ...q, solution: { indices: isRight(i) ? q.solution.indices.filter((x) => x !== i) : [...q.solution.indices, i] } })
  const max = 8
  const min = q.kind === 'order' ? 3 : 2
  return (
    <div className="qa-opts">
      {q.options.map((o, i) => (
        <div key={i} className={`qa-opt-row ${isRight(i) ? 'is-right' : ''}`}>
          {q.kind === 'order' ? (
            <span className="qa-opt-n">{i + 1}</span>
          ) : (
            <button type="button" className={`qa-opt-mark ${isRight(i) ? 'on' : ''}`} onClick={() => toggleRight(i)} title={q.kind === 'choice' ? 'Mark as the correct answer' : 'Toggle correct'} aria-label={`Mark option ${i + 1} correct`}>
              {isRight(i) ? <Check size={14} strokeWidth={3} /> : 'ABCDEFGH'[i]}
            </button>
          )}
          <input value={o} onChange={(e) => set(i, e.target.value)} placeholder={q.kind === 'order' ? `${i === 0 ? 'First' : i === q.options.length - 1 ? 'Last' : 'Next'} item` : `Option ${i + 1}`} aria-label={`Option ${i + 1}`} />
          {q.kind === 'order' && (
            <>
              <button type="button" className="qa-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                <ArrowUp size={14} />
              </button>
              <button type="button" className="qa-icon-btn" onClick={() => move(i, 1)} disabled={i === q.options.length - 1} aria-label="Move down">
                <ArrowDown size={14} />
              </button>
            </>
          )}
          <button type="button" className="qa-icon-btn is-danger" onClick={() => remove(i)} disabled={q.options.length <= min} aria-label="Remove option">
            <X size={14} />
          </button>
        </div>
      ))}
      {q.options.length < max && (
        <Btn size="sm" icon={Plus} onClick={() => setQ({ ...q, options: [...q.options, ''] })}>
          Add {q.kind === 'order' ? 'item' : 'option'}
        </Btn>
      )}
      <small className="qa-muted">
        {q.kind === 'choice' && 'Click a letter to mark the correct answer. Players see the options shuffled.'}
        {q.kind === 'multi' && 'Tick every correct option. Players must pick exactly these. Options are shuffled.'}
        {q.kind === 'order' && 'Enter the items in the correct order (top = first). Players get them shuffled.'}
      </small>
    </div>
  )
}

function Editor({ edit, setEdit, game, onSave, busy }) {
  const yes = game?.yes_label || 'True'
  const no = game?.no_label || 'False'
  const [preview, setPreview] = useState(null)
  const previewKey = edit.kind + JSON.stringify(edit.options || '') + JSON.stringify(edit.solution || '') + String(edit.answer)
  useEffect(() => setPreview(null), [previewKey])
  const set = (k) => (v) => setEdit({ ...edit, [k]: v })
  const sol = (k) => (v) => setEdit({ ...edit, solution: { ...edit.solution, [k]: v } })
  return (
    <div className="qa-qeditor">
      <div className="qa-form">
        <div className="qa-field span-2">
          <span>Question type</span>
          <div className="qa-kinds">
            {KINDS.map(([k, label, I, hint]) => (
              <button key={k} type="button" className={edit.kind === k ? 'is-on' : ''} onClick={() => setEdit(blankFor(k, edit))} title={hint}>
                <I size={16} /> {label}
              </button>
            ))}
          </div>
        </div>
        <Field label={edit.kind === 'truefalse' ? 'Statement / thing players judge' : 'Question'} span={2}>
          <input value={edit.item} onChange={(e) => set('item')(e.target.value)} placeholder={edit.kind === 'truefalse' ? 'Rubik’s Cube' : edit.kind === 'number' ? 'In what year was the Rubik’s Cube invented?' : 'What is the capital of Hungary?'} autoFocus />
        </Field>
        <Field label="Instruction under the question (optional)" span={2} hint={edit.kind === 'truefalse' ? `Leave empty to use the quiz’s: “${game?.prompt || 'True or false?'}”` : `Leave empty for “${KIND_LABEL[edit.kind]}”`}>
          <input value={edit.prompt} onChange={(e) => set('prompt')(e.target.value)} />
        </Field>

        {edit.kind === 'truefalse' && (
          <Field label="Correct answer" span={2}>
            <div className="seg qa-seg">
              <button type="button" className={edit.answer ? 'is-on' : ''} onClick={() => set('answer')(true)}>
                <Check size={14} /> {yes}
              </button>
              <button type="button" className={!edit.answer ? 'is-on' : ''} onClick={() => set('answer')(false)}>
                <X size={14} /> {no}
              </button>
            </div>
          </Field>
        )}
        {['choice', 'multi', 'order'].includes(edit.kind) && (
          <div className="qa-field span-2">
            <span>{edit.kind === 'order' ? 'Items, in the correct order' : 'Options'}</span>
            <OptionsEditor q={edit} setQ={setEdit} />
          </div>
        )}
        {edit.kind === 'text' && (
          <div className="qa-field span-2">
            <span>Accepted answers</span>
            {edit.solution.accepted.map((a, i) => (
              <div key={i} className="qa-opt-row">
                <input value={a} onChange={(e) => sol('accepted')(edit.solution.accepted.map((x, j) => (j === i ? e.target.value : x)))} placeholder={i === 0 ? 'Main answer (shown after answering)' : 'Also accept…'} />
                <button type="button" className="qa-icon-btn is-danger" disabled={edit.solution.accepted.length <= 1} onClick={() => sol('accepted')(edit.solution.accepted.filter((_, j) => j !== i))} aria-label="Remove">
                  <X size={14} />
                </button>
              </div>
            ))}
            <Btn size="sm" icon={Plus} onClick={() => sol('accepted')([...edit.solution.accepted, ''])}>
              Add spelling
            </Btn>
            <small>Matching ignores capitals, spaces and punctuation. Add other spellings (e.g. “NYC”, “New York City”).</small>
          </div>
        )}
        {edit.kind === 'number' && (
          <>
            <Field label="Correct number">
              <input type="number" value={edit.solution.value} onChange={(e) => sol('value')(e.target.value)} />
            </Field>
            <Field label="Accept within ±" hint="0 = exact">
              <input type="number" min={0} value={edit.solution.tolerance} onChange={(e) => sol('tolerance')(e.target.value)} />
            </Field>
            <Field label="Slider minimum (optional)">
              <input type="number" value={edit.solution.min ?? ''} onChange={(e) => sol('min')(e.target.value)} />
            </Field>
            <Field label="Slider maximum (optional)">
              <input type="number" value={edit.solution.max ?? ''} onChange={(e) => sol('max')(e.target.value)} />
            </Field>
            <Field label="Unit (optional)" hint="e.g. km, °C, people">
              <input value={edit.solution.unit} onChange={(e) => sol('unit')(e.target.value)} />
            </Field>
            <Field label="Step">
              <input type="number" min={0} value={edit.solution.step} onChange={(e) => sol('step')(e.target.value)} />
            </Field>
          </>
        )}

        <Field label="Emoji">
          <input value={edit.emoji} onChange={(e) => set('emoji')(e.target.value)} maxLength={8} />
        </Field>
        <Field label="Topic" hint="e.g. Food, Invention, History">
          <input value={edit.type} onChange={(e) => set('type')(e.target.value)} />
        </Field>
        <Field label="Image URL (optional)" span={2} hint="Shown instead of the emoji. Use a direct link to a .jpg/.png/.webp">
          <input value={edit.image} onChange={(e) => set('image')(e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="Fun fact (shown after answering)" span={2}>
          <textarea rows={2} value={edit.fact} onChange={(e) => set('fact')(e.target.value)} />
        </Field>
        <div className="qa-field">
          <Toggle checked={edit.active} onChange={set('active')} label="Active" hint="Inactive questions are never asked" />
        </div>
      </div>
      <div className="qa-qpreview">
        <small>Player preview</small>
        <div className="rm-stage qa-qstage">
          <div className="rm-q">
            <QuestionHeader q={previewQ(edit)} prompt={game?.prompt || 'True or false?'} />
            <QuestionInput key={edit.kind + JSON.stringify(edit.options || '') + JSON.stringify(edit.solution?.min ?? '') + JSON.stringify(edit.solution?.max ?? '')} q={previewQ(edit)} yes={yes} no={no} keyboard={false} picked={preview?.v} result={preview?.res} onSubmit={(v) => {
              const c = clean(edit)
              let correct = false
              if (c.kind === 'truefalse') correct = v === c.answer
              if (c.kind === 'choice') correct = v === c.solution.index
              if (c.kind === 'multi') correct = [...v].sort().join() === [...c.solution.indices].sort().join()
              if (c.kind === 'text') correct = c.solution.accepted.some((a) => a.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') === String(v).toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''))
              if (c.kind === 'number') correct = Math.abs(Number(v) - c.solution.value) <= (c.solution.tolerance || 0)
              if (c.kind === 'order') correct = v.every((x, i) => x === i)
              setPreview({ v, res: { correct, answer: c.answer, solution: c.kind === 'choice' ? c.solution.index : c.kind === 'multi' ? c.solution.indices : undefined } })
            }} />
            {preview && (
              <p className={`qa-try ${preview.res.correct ? 'ok' : 'bad'}`}>
                {preview.res.correct ? 'Correct!' : 'Wrong'} ·{' '}
                <button type="button" className="qa-link" onClick={() => setPreview(null)}>
                  try again
                </button>
              </p>
            )}
          </div>
        </div>
        <small>Try answering it here. Real games shuffle the options.</small>
      </div>
    </div>
  )
}

export default function QuestionsPage() {
  const { slug } = useParams()
  const { pushToast } = useApp()
  const cat = useAsync(() => api.catalog(), [slug])
  const game = cat.data?.games.find((g) => g.slug === slug)
  const [f, setF] = useState({ q: '', active: '', kind: '' })
  const { data, loading, error, reload } = useAsync(() => api.listQuestions(slug, { q: f.q, active: f.active === '' ? null : f.active === 'yes', limit: 500 }), [slug, f.q, f.active])
  const [edit, setEdit] = useState(null)
  const [importing, setImporting] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [editGame, setEditGame] = useState(false)

  const all = data?.rows || []
  const rows = f.kind ? all.filter((r) => r.kind === f.kind) : all
  const stats = useMemo(() => {
    const act = all.filter((r) => r.active)
    const tf = act.filter((r) => r.kind === 'truefalse')
    return { active: act.length, tf: tf.length, yes: tf.filter((r) => r.answer).length, inactive: all.length - act.length }
  }, [all])
  const preview = useMemo(() => {
    try {
      return { rows: parseImport(text) }
    } catch (e) {
      return { error: e.message }
    }
  }, [text])

  const openEdit = (r) =>
    setEdit({
      ...blankFor(r.kind || 'truefalse', r),
      ...r,
      kind: r.kind || 'truefalse',
      prompt: r.prompt || '',
      image: r.image || '',
      fact: r.fact || '',
      options: r.options || blankFor(r.kind || 'truefalse').options,
      solution: r.solution || blankFor(r.kind || 'truefalse').solution,
    })

  const save = async () => {
    setBusy(true)
    try {
      await api.saveQuestion({ ...clean(edit), game_slug: slug })
      pushToast({ emoji: '✅', title: 'Saved', text: 'Question saved' })
      setEdit(null)
      reload()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Questions', text: e.message })
    } finally {
      setBusy(false)
    }
  }
  const toggle = async (r) => {
    try {
      await api.saveQuestion({ ...r, game_slug: slug, active: !r.active })
      reload()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Questions', text: e.message })
    }
  }
  const remove = async (r) => {
    if (!window.confirm(`Delete “${r.item}”? If it was used in past rounds it will be deactivated instead.`)) return
    await api.deleteQuestion(r.id).catch((e) => pushToast({ emoji: '⚠️', title: 'Questions', text: e.message }))
    reload()
  }
  const runImport = async () => {
    if (!preview.rows?.length) return
    setBusy(true)
    try {
      const res = await api.importQuestions(slug, preview.rows)
      pushToast({ emoji: '✅', title: 'Imported', text: `${res.new} new, ${res.updated} updated${res.skipped ? `, ${res.skipped} skipped (incomplete)` : ''}` })
      setImporting(false)
      setText('')
      reload()
      cat.reload()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Import', text: e.message })
    } finally {
      setBusy(false)
    }
  }
  const exportCsv = () => {
    const lines = ['item,kind,answer,options,prompt,type,emoji,fact,image,tolerance,min,max,unit,active', ...all.map(toCsvRow)]
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
    a.download = `${slug}-questions.csv`
    a.click()
  }

  const yes = game?.yes_label || 'True'
  const no = game?.no_label || 'False'
  const answerCell = (r) =>
    r.kind === 'truefalse' || !r.kind ? (r.answer ? <Pill tone="green">{yes}</Pill> : <Pill tone="red">{no}</Pill>) : <span className="qa-answer-txt">{r.answer_text}</span>

  return (
    <>
      <Link to="/admin/games" className="qa-link qa-back">
        <ArrowLeft size={14} /> All games
      </Link>
      <PageHead title={game ? `${game.emoji} ${game.title}` : slug} sub="Mix any question types in one quiz. Each round picks a random, balanced set." icon={HelpCircle}>
        {game && (
          <Btn icon={Settings2} onClick={() => setEditGame(true)}>
            Quiz settings
          </Btn>
        )}
        <Btn icon={Download} onClick={exportCsv} disabled={!all.length}>
          Export CSV
        </Btn>
        <Btn icon={Upload} onClick={() => setImporting(true)}>
          Bulk import
        </Btn>
        <Btn kind="primary" icon={Plus} onClick={() => setEdit({ ...BLANK, kind: f.kind || 'truefalse', ...(f.kind ? blankFor(f.kind) : {}) })}>
          Add question
        </Btn>
      </PageHead>

      <div className="qa-stats is-3">
        <div className="qa-mini">
          <b>{stats.active}</b>
          <small>active questions{game ? ` (a round uses ${game.questions})` : ''}</small>
        </div>
        <div className="qa-mini">
          <b>{Object.keys(data?.kinds || {}).length || 0} types</b>
          <small>
            {Object.entries(data?.kinds || {})
              .map(([k, n]) => `${KIND_LABEL[k] || k}: ${n}`)
              .join(' · ') || 'no questions yet'}
          </small>
        </div>
        <div className="qa-mini">
          <b>{stats.inactive}</b>
          <small>inactive</small>
        </div>
      </div>

      <div className="qa-filters">
        <SearchBox value={f.q} onChange={(q) => setF((s) => ({ ...s, q }))} placeholder="Search questions, prompts or facts" />
        <select value={f.kind} onChange={(e) => setF((s) => ({ ...s, kind: e.target.value }))} aria-label="Type">
          <option value="">All types</option>
          {KINDS.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <select value={f.active} onChange={(e) => setF((s) => ({ ...s, active: e.target.value }))} aria-label="Active">
          <option value="">Active and inactive</option>
          <option value="yes">Active only</option>
          <option value="no">Inactive only</option>
        </select>
      </div>

      <Card pad={false}>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <p className="qa-error qa-pad">{error.message}</p>
        ) : !rows.length ? (
          <Empty icon={HelpCircle} title="No questions here yet" text="Add them one by one or paste a CSV with Bulk import.">
            <Btn kind="primary" icon={Plus} onClick={() => setEdit({ ...BLANK })}>
              Add question
            </Btn>
          </Empty>
        ) : (
          <div className="qa-table-wrap">
            <table className="qa-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Type</th>
                  <th>Answer</th>
                  <th>Asked</th>
                  <th>Active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const KI = KIND_ICON[r.kind || 'truefalse']
                  return (
                    <tr key={r.id} className={r.active ? '' : 'is-off'}>
                      <td>
                        <span className="qa-q-cell">
                          {r.image ? <img src={r.image} alt="" className="qa-q-img" /> : <span className="qa-q-emoji">{r.emoji}</span>}
                          <span>
                            <b>{r.item}</b>
                            {r.fact && <small>{r.fact}</small>}
                          </span>
                        </span>
                      </td>
                      <td className="qa-nowrap">
                        <span className="qa-kind-pill">
                          <KI size={13} /> {KIND_LABEL[r.kind || 'truefalse']}
                        </span>
                        <small className="qa-block qa-muted">{r.type}</small>
                      </td>
                      <td>{answerCell(r)}</td>
                      <td>{r.asked}</td>
                      <td>
                        <Toggle checked={r.active} onChange={() => toggle(r)} label="" />
                      </td>
                      <td className="qa-right qa-nowrap">
                        <button type="button" className="qa-icon-btn" onClick={() => openEdit(r)} aria-label="Edit">
                          <Pencil size={15} />
                        </button>
                        <button type="button" className="qa-icon-btn is-danger" onClick={() => remove(r)} aria-label="Delete">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!edit} wide onClose={() => setEdit(null)} title={edit?.id ? 'Edit question' : 'New question'} footer={<><Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn kind="primary" busy={busy} onClick={save}>Save question</Btn></>}>
        {edit && <Editor edit={edit} setEdit={setEdit} game={game} busy={busy} />}
      </Modal>

      <Modal
        open={importing}
        wide
        onClose={() => setImporting(false)}
        title="Bulk import questions"
        footer={
          <>
            <Btn onClick={() => setImporting(false)}>Cancel</Btn>
            <Btn kind="primary" icon={Upload} busy={busy} disabled={!preview.rows?.length} onClick={runImport}>
              Import {preview.rows?.length || 0} questions
            </Btn>
          </>
        }
      >
        <div className="qa-import-help">
          <p className="qa-muted">
            Paste a CSV from Google Sheets or Excel with a header row. Columns: <code>item, kind, answer, options, fact, type, emoji, prompt, image</code> (+ <code>tolerance, min, max, unit</code> for numbers). Separate options with <code>|</code>. Same question text = update.
          </p>
          <table className="qa-table is-compact">
            <tbody>
              <tr>
                <td>truefalse</td>
                <td>answer = yes / no</td>
              </tr>
              <tr>
                <td>choice</td>
                <td>options = A | B | C | D, answer = the correct option (or its number)</td>
              </tr>
              <tr>
                <td>multi</td>
                <td>options = A | B | C | D, answer = A | C</td>
              </tr>
              <tr>
                <td>text</td>
                <td>answer = Budapest | Buda-Pest (all accepted spellings)</td>
              </tr>
              <tr>
                <td>number</td>
                <td>answer = 1974, tolerance = 2 (or answer = 1974±2)</td>
              </tr>
              <tr>
                <td>order</td>
                <td>options in the correct order, answer empty</td>
              </tr>
            </tbody>
          </table>
        </div>
        <textarea
          className="qa-code"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            'item,kind,answer,options,fact\nRubik\'s Cube,truefalse,yes,,Invented by Ernő Rubik\nCapital of Hungary?,choice,Budapest,Vienna | Budapest | Prague | Rome,\nWhich are Hungarian inventions?,multi,Ballpoint pen | Rubik\'s Cube,Ballpoint pen | Telephone | Rubik\'s Cube | Radio,\nLongest river in Hungary?,text,Tisza,,\nYear Hungary joined the EU?,number,2004,,\nOldest to newest,order,,Árpád | Matthias Corvinus | Franz Joseph,'
          }
        />
        <label className="qa-file">
          <Upload size={14} /> Or choose a .csv file
          <input type="file" accept=".csv,.txt,.json" onChange={(e) => e.target.files[0]?.text().then(setText)} />
        </label>
        {preview.error ? (
          <p className="qa-error">{preview.error}</p>
        ) : preview.rows?.length ? (
          <div className="qa-table-wrap qa-import-preview">
            <table className="qa-table is-compact">
              <tbody>
                {preview.rows.slice(0, 10).map((r, i) => (
                  <tr key={i}>
                    <td>
                      <span className="qa-kind-pill">{KIND_LABEL[r.kind]}</span>
                    </td>
                    <td>{r.item}</td>
                    <td className="qa-muted">
                      {r.kind === 'truefalse'
                        ? r.answer
                          ? yes
                          : no
                        : r.kind === 'choice'
                          ? r.options?.[r.solution.index] ?? <span className="qa-error">no match</span>
                          : r.kind === 'multi'
                            ? r.solution.indices.map((x) => r.options[x]).join(', ') || <span className="qa-error">none marked</span>
                            : r.kind === 'text'
                              ? r.solution.accepted.join(' / ')
                              : r.kind === 'number'
                                ? `${r.solution.value ?? '?'}${r.solution.tolerance ? ` ±${r.solution.tolerance}` : ''}`
                                : r.options?.join(' → ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length > 10 && <p className="qa-muted small qa-pad">…and {preview.rows.length - 10} more</p>}
          </div>
        ) : null}
      </Modal>

      {editGame && game && <GameEditor game={game} categories={cat.data.categories} onClose={() => setEditGame(false)} onSaved={() => (setEditGame(false), cat.reload())} />}
    </>
  )
}
