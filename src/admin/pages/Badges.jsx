// Badges: built-in achievements (read-only) and custom badges you create and hand out (events, beta testers, winners).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, Plus, Pencil, Trash2, Lock, UserPlus } from 'lucide-react'
import { PageHead, Card, Btn, Pill, Modal, Field, Loading, Empty, useAsync } from '../ui.jsx'
import * as api from '../api.js'
import { useApp } from '../../state/AppState.jsx'
import { achievements, tiersStyle } from '../../data/achievements.js'

const BLANK = { name: '', emoji: '🏅', description: '', tier: 'gold' }

export default function BadgesPage() {
  const { pushToast, reloadSite } = useApp()
  const { data, loading, error, reload } = useAsync(() => api.catalog(), [])
  const [edit, setEdit] = useState(null)
  const [busy, setBusy] = useState(false)
  const builtIn = achievements.filter((a) => !a.custom)

  const save = async () => {
    setBusy(true)
    try {
      await api.saveBadge(edit)
      await reloadSite()
      setEdit(null)
      reload()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Badges', text: e.message })
    } finally {
      setBusy(false)
    }
  }
  const remove = async (b) => {
    if (!window.confirm(`Delete “${b.name}”? It will be removed from ${b.holders} player(s).`)) return
    await api.deleteBadge(b.id).catch((e) => pushToast({ emoji: '⚠️', title: 'Badges', text: e.message }))
    await reloadSite()
    reload()
  }

  return (
    <>
      <PageHead title="Badges" sub="Create special badges and award them to players from their profile in Users." icon={Award}>
        <Btn kind="primary" icon={Plus} onClick={() => setEdit({ ...BLANK })}>
          New badge
        </Btn>
      </PageHead>
      <Card title="Custom badges" icon={Award}>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <p className="qa-error">{error.message}</p>
        ) : !data.badges.length ? (
          <Empty icon={Award} title="No custom badges yet" text="Make one for an event, your beta testers or a community champion." />
        ) : (
          <div className="qa-badge-grid">
            {data.badges.map((b) => (
              <div key={b.id} className="qa-badge-card" style={{ '--tier': tiersStyle[b.tier].color }}>
                <span className="qa-badge-big">{b.emoji}</span>
                <b>{b.name}</b>
                <small>{b.description}</small>
                <div className="qa-pills">
                  <Pill tone="gold">{tiersStyle[b.tier].label}</Pill>
                  <Pill>{b.holders} holders</Pill>
                </div>
                <div className="qa-badge-actions">
                  <Link to="/admin/users" className="qa-icon-btn" title="Award from a player’s profile" aria-label="Award">
                    <UserPlus size={15} />
                  </Link>
                  <button type="button" className="qa-icon-btn" onClick={() => setEdit(b)} aria-label="Edit">
                    <Pencil size={15} />
                  </button>
                  <button type="button" className="qa-icon-btn is-danger" onClick={() => remove(b)} aria-label="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title={`Built-in achievements (${builtIn.length})`} icon={Lock}>
        <p className="qa-muted small">Unlocked automatically by playing. Their rules live in the database functions.</p>
        <div className="qa-badge-grid is-small">
          {builtIn.map((a) => (
            <div key={a.id} className="qa-badge-card" style={{ '--tier': tiersStyle[a.tier].color }}>
              <span className="qa-badge-big">{a.emoji}</span>
              <b>{a.name}</b>
              <small>{a.desc}</small>
            </div>
          ))}
        </div>
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Edit ${edit.name}` : 'New badge'} footer={<><Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn kind="primary" busy={busy} onClick={save}>Save</Btn></>}>
        {edit && (
          <div className="qa-form">
            <Field label="Name" span={2}>
              <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Launch Week Hero" autoFocus disabled={!!edit.id} />
            </Field>
            <Field label="Emoji">
              <input value={edit.emoji} onChange={(e) => setEdit({ ...edit, emoji: e.target.value })} maxLength={8} />
            </Field>
            <Field label="Tier (color)">
              <select value={edit.tier} onChange={(e) => setEdit({ ...edit, tier: e.target.value })}>
                {Object.entries(tiersStyle).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description" span={2}>
              <input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="Played during launch week" />
            </Field>
          </div>
        )}
      </Modal>
    </>
  )
}
