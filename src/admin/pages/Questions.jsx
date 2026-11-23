// Questions for one quiz: list, search, add/edit, (de)activate, delete, bulk import (CSV / JSON) and CSV export.
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { HelpCircle, Plus, Pencil, Trash2, Upload, Download, ArrowLeft, Check, X, Settings2 } from 'lucide-react'
import { PageHead, Card, Btn, Pill, Modal, Field, Toggle, Loading, Empty, SearchBox, useAsync } from '../ui.jsx'
import * as api from '../api.js'
import { useApp } from '../../state/AppState.jsx'
import { GameEditor } from './Games.jsx'

const BLANK = { item: '', type: 'General', emoji: '❓', answer: true, fact: '', active: true }

// Accepts CSV with a header row (item, answer, type, emoji, fact) or a JSON array.
function parseImport(text) {
  const t = text.trim()
  if (!t) return []
  const truthy = (v) => /^(1|true|yes|y|igen|ja|si|sí|sim|ano|da)$/i.test(String(v).trim())
  if (t.startsWith('[')) {
    return JSON.parse(t).map((r) => ({ item: r.item, answer: typeof r.answer === 'boolean' ? r.answer : truthy(r.answer), type: r.type, emoji: r.emoji, fact: r.fact }))
  }
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
  const idx = (k) => head.indexOf(k)
  if (idx('item') < 0 || idx('answer') < 0) throw new Error('CSV needs at least “item” and “answer” columns')
  return rows
    .filter((r) => r.some((c) => c.trim()))
    .map((r) => ({
      item: r[idx('item')]?.trim(),
      answer: truthy(r[idx('answer')]),
      ...(idx('type') >= 0 && r[idx('type')] ? { type: r[idx('type')].trim() } : {}),
      ...(idx('emoji') >= 0 && r[idx('emoji')] ? { emoji: r[idx('emoji')].trim() } : {}),
      ...(idx('fact') >= 0 ? { fact: r[idx('fact')]?.trim() || '' } : {}),
    }))
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

export default function QuestionsPage() {
  const { slug } = useParams()
  const { pushToast } = useApp()
  const cat = useAsync(() => api.catalog(), [slug])
  const game = cat.data?.games.find((g) => g.slug === slug)
  const [f, setF] = useState({ q: '', active: '' })
  const { data, loading, error, reload } = useAsync(() => api.listQuestions(slug, { q: f.q, active: f.active === '' ? null : f.active === 'yes', limit: 500 }), [slug, f.q, f.active])
  const [edit, setEdit] = useState(null)
  const [importing, setImporting] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [editGame, setEditGame] = useState(false)

  const rows = data?.rows || []
  const stats = useMemo(() => {
    const act = rows.filter((r) => r.active)
    return { active: act.length, yes: act.filter((r) => r.answer).length, inactive: rows.length - act.length }
  }, [rows])
  const preview = useMemo(() => {
    try {
      return { rows: parseImport(text) }
    } catch (e) {
      return { error: e.message }
    }
  }, [text])

  const save = async () => {
    setBusy(true)
    try {
      await api.saveQuestion({ ...edit, game_slug: slug })
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
      pushToast({ emoji: '✅', title: 'Imported', text: `${res.new} new, ${res.updated} updated` })
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
    const lines = ['item,answer,type,emoji,fact,active', ...rows.map((r) => [r.item, r.answer, r.type, r.emoji, r.fact, r.active].map(csvCell).join(','))]
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
    a.download = `${slug}-questions.csv`
    a.click()
  }

  const yes = game?.yes_label || 'True'
  const no = game?.no_label || 'False'

  return (
    <>
      <Link to="/admin/games" className="qa-link qa-back">
        <ArrowLeft size={14} /> All games
      </Link>
      <PageHead title={game ? `${game.emoji} ${game.title}` : slug} sub={game ? `${game.prompt} · answers: ${yes} / ${no}` : 'Questions'} icon={HelpCircle}>
        {game && (
          <Btn icon={Settings2} onClick={() => setEditGame(true)}>
            Quiz settings
          </Btn>
        )}
        <Btn icon={Download} onClick={exportCsv} disabled={!rows.length}>
          Export CSV
        </Btn>
        <Btn icon={Upload} onClick={() => setImporting(true)}>
          Bulk import
        </Btn>
        <Btn kind="primary" icon={Plus} onClick={() => setEdit({ ...BLANK })}>
          Add question
        </Btn>
      </PageHead>

      <div className="qa-stats is-3">
        <div className="qa-mini">
          <b>{stats.active}</b>
          <small>active questions{game ? ` (round uses ${game.questions})` : ''}</small>
        </div>
        <div className="qa-mini">
          <b>
            {stats.yes} / {stats.active - stats.yes}
          </b>
          <small>
            “{yes}” / “{no}” answers {stats.active && Math.abs(stats.yes / stats.active - 0.5) > 0.2 ? '· unbalanced' : '· balanced'}
          </small>
        </div>
        <div className="qa-mini">
          <b>{stats.inactive}</b>
          <small>inactive (never asked)</small>
        </div>
      </div>

      <div className="qa-filters">
        <SearchBox value={f.q} onChange={(q) => setF((s) => ({ ...s, q }))} placeholder="Search question or fact" />
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
          <Empty icon={HelpCircle} title="No questions yet" text="Add them one by one or paste a CSV with Bulk import.">
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
                {rows.map((r) => (
                  <tr key={r.id} className={r.active ? '' : 'is-off'}>
                    <td>
                      <span className="qa-q-cell">
                        <span className="qa-q-emoji">{r.emoji}</span>
                        <span>
                          <b>{r.item}</b>
                          {r.fact && <small>{r.fact}</small>}
                        </span>
                      </span>
                    </td>
                    <td>{r.type}</td>
                    <td>{r.answer ? <Pill tone="green">{yes}</Pill> : <Pill tone="red">{no}</Pill>}</td>
                    <td>{r.asked}</td>
                    <td>
                      <Toggle checked={r.active} onChange={() => toggle(r)} label="" />
                    </td>
                    <td className="qa-right qa-nowrap">
                      <button type="button" className="qa-icon-btn" onClick={() => setEdit(r)} aria-label="Edit">
                        <Pencil size={15} />
                      </button>
                      <button type="button" className="qa-icon-btn is-danger" onClick={() => remove(r)} aria-label="Delete">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit question' : 'New question'} footer={<><Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn kind="primary" busy={busy} onClick={save}>Save</Btn></>}>
        {edit && (
          <div className="qa-form">
            <Field label="Question (the thing players judge)" span={2}>
              <input value={edit.item} onChange={(e) => setEdit({ ...edit, item: e.target.value })} placeholder="Rubik’s Cube" autoFocus />
            </Field>
            <Field label="Correct answer">
              <div className="seg qa-seg">
                <button type="button" className={edit.answer ? 'is-on' : ''} onClick={() => setEdit({ ...edit, answer: true })}>
                  <Check size={14} /> {yes}
                </button>
                <button type="button" className={!edit.answer ? 'is-on' : ''} onClick={() => setEdit({ ...edit, answer: false })}>
                  <X size={14} /> {no}
                </button>
              </div>
            </Field>
            <Field label="Emoji">
              <input value={edit.emoji} onChange={(e) => setEdit({ ...edit, emoji: e.target.value })} maxLength={8} />
            </Field>
            <Field label="Type / topic" hint="e.g. Food, Invention, Celebrity">
              <input value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })} />
            </Field>
            <div className="qa-field">
              <Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Active" hint="Inactive questions are never asked" />
            </div>
            <Field label="Fun fact (shown after answering)" span={2}>
              <textarea rows={3} value={edit.fact} onChange={(e) => setEdit({ ...edit, fact: e.target.value })} placeholder="Invented in 1974 by Hungarian architect Ernő Rubik." />
            </Field>
          </div>
        )}
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
        <p className="qa-muted">
          Paste a CSV (from Google Sheets or Excel) with a header row: <code>item, answer, type, emoji, fact</code>. Answer can be yes/no, true/false or 1/0. A question with the same text is updated instead of duplicated. JSON arrays work too.
        </p>
        <textarea className="qa-code" rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder={'item,answer,type,emoji,fact\nRubik\'s Cube,yes,Invention,🧊,Invented by Ernő Rubik in 1974\nCroissant,no,Food,🥐,Popularised in France'} />
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
                {preview.rows.slice(0, 8).map((r, i) => (
                  <tr key={i}>
                    <td>{r.emoji}</td>
                    <td>{r.item}</td>
                    <td>{r.answer ? <Pill tone="green">{yes}</Pill> : <Pill tone="red">{no}</Pill>}</td>
                    <td className="qa-muted">{r.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length > 8 && <p className="qa-muted small qa-pad">…and {preview.rows.length - 8} more</p>}
          </div>
        ) : null}
      </Modal>

      {editGame && game && <GameEditor game={game} categories={cat.data.categories} onClose={() => setEditGame(false)} onSaved={() => (setEditGame(false), cat.reload())} />}
    </>
  )
}
