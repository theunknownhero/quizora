// Categories: create, rename, recolor, regroup, reorder, hide or delete the topics that organize the site.
import { useMemo, useState } from 'react'
import { Tags, Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink } from 'lucide-react'
import { PageHead, Card, Btn, Pill, Modal, Field, Toggle, Loading, SearchBox, useAsync } from '../ui.jsx'
import * as api from '../api.js'
import { useApp } from '../../state/AppState.jsx'
import { groups } from '../../data/categories.js'

const BLANK = { id: '', name: '', emoji: '✨', grp: 'knowledge', color: '#a78bfa', blurb: '', sort: 500, visible: true }
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

export default function CategoriesPage() {
  const { pushToast, reloadSite } = useApp()
  const { data, loading, error, reload } = useAsync(() => api.catalog(), [])
  const [edit, setEdit] = useState(null)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const cats = useMemo(() => (data?.categories || []).filter((c) => !q || `${c.name} ${c.id}`.toLowerCase().includes(q.toLowerCase())), [data, q])

  const save = async (c = edit) => {
    setBusy(true)
    try {
      await api.saveCategory({ ...c, id: c.id || slugify(c.name) })
      await reloadSite()
      setEdit(null)
      reload()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Categories', text: e.message })
    } finally {
      setBusy(false)
    }
  }
  const remove = async (c) => {
    if (!window.confirm(`Delete “${c.name}”? It will be removed from ${c.games} game(s).`)) return
    try {
      await api.deleteCategory(c.id)
      await reloadSite()
      reload()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Categories', text: e.message })
    }
  }

  return (
    <>
      <PageHead title="Categories" sub="Topics used on the home page, category pages and game cards." icon={Tags}>
        <Btn kind="primary" icon={Plus} onClick={() => setEdit({ ...BLANK })}>
          New category
        </Btn>
      </PageHead>
      <div className="ad-filters">
        <SearchBox value={q} onChange={setQ} placeholder="Search categories" />
      </div>
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <p className="ad-error">{error.message}</p>
      ) : (
        groups.map((gr) => {
          const list = cats.filter((c) => c.grp === gr.id)
          if (!list.length) return null
          return (
            <Card key={gr.id} title={`${gr.emoji} ${gr.id[0].toUpperCase() + gr.id.slice(1)} (${list.length})`} pad={false}>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <tbody>
                    {list.map((c) => (
                      <tr key={c.id} className={c.visible ? '' : 'is-off'}>
                        <td>
                          <span className="ad-cat-cell">
                            <span className="ad-cat-swatch" style={{ background: c.color }}>
                              {c.emoji}
                            </span>
                            <span>
                              <b>{c.name}</b>
                              <small>{c.blurb}</small>
                            </span>
                          </span>
                        </td>
                        <td className="ad-muted">/{c.id}</td>
                        <td>
                          <Pill>{c.games} games</Pill>
                        </td>
                        <td>{c.visible ? <Pill tone="green">visible</Pill> : <Pill>hidden</Pill>}</td>
                        <td className="ad-right ad-nowrap">
                          <a className="ad-icon-btn" href={`/category/${c.id}`} target="_blank" rel="noopener noreferrer" aria-label="Open page">
                            <ExternalLink size={15} />
                          </a>
                          <button type="button" className="ad-icon-btn" onClick={() => save({ ...c, visible: !c.visible })} aria-label={c.visible ? 'Hide' : 'Show'}>
                            {c.visible ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                          <button type="button" className="ad-icon-btn" onClick={() => setEdit(c)} aria-label="Edit">
                            <Pencil size={15} />
                          </button>
                          <button type="button" className="ad-icon-btn is-danger" onClick={() => remove(c)} aria-label="Delete">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )
        })
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id && data?.categories.some((c) => c.id === edit.id) ? `Edit ${edit.name}` : 'New category'} footer={<><Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn kind="primary" busy={busy} onClick={() => save()}>Save</Btn></>}>
        {edit && (
          <div className="ad-form">
            <Field label="Name" span={2}>
              <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus />
            </Field>
            <Field label="ID (URL)" hint={`/category/${edit.id || slugify(edit.name) || '…'}`}>
              <input value={edit.id} onChange={(e) => setEdit({ ...edit, id: slugify(e.target.value) })} disabled={data?.categories.some((c) => c.id === edit.id && edit.id)} />
            </Field>
            <Field label="Emoji">
              <input value={edit.emoji} onChange={(e) => setEdit({ ...edit, emoji: e.target.value })} maxLength={8} />
            </Field>
            <Field label="Group">
              <select value={edit.grp} onChange={(e) => setEdit({ ...edit, grp: e.target.value })}>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.emoji} {g.id}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Color">
              <input type="color" value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })} />
            </Field>
            <Field label="Short description" span={2}>
              <input value={edit.blurb} onChange={(e) => setEdit({ ...edit, blurb: e.target.value })} maxLength={140} />
            </Field>
            <Field label="Sort order" hint="Lower shows first">
              <input type="number" value={edit.sort} onChange={(e) => setEdit({ ...edit, sort: Number(e.target.value) })} />
            </Field>
            <div className="ad-field">
              <Toggle checked={edit.visible} onChange={(v) => setEdit({ ...edit, visible: v })} label="Visible on site" />
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
