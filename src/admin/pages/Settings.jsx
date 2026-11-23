// Site settings: announcement bar, feature switches, maintenance mode, prize button, XP events and home page text.
import { useEffect, useState } from 'react'
import { Settings as SettingsIcon, Megaphone, Power, Wrench, Gift, Zap, Home, Save, Info, PartyPopper, AlertTriangle } from 'lucide-react'
import { PageHead, Card, Btn, Field, Toggle, Loading, useAsync } from '../ui.jsx'
import * as api from '../api.js'
import { useApp } from '../../state/AppState.jsx'

function Section({ k, title, icon, sub, data, render, onSaved, id }) {
  const { pushToast, reloadSite } = useApp()
  const [v, setV] = useState(data[k])
  const [busy, setBusy] = useState(false)
  useEffect(() => setV(data[k]), [data, k])
  const dirty = JSON.stringify(v) !== JSON.stringify(data[k])
  const save = async () => {
    setBusy(true)
    try {
      await api.setSetting(k, v)
      await reloadSite()
      pushToast({ emoji: '✅', title: 'Saved', text: `${title} updated on the live site` })
      onSaved()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Settings', text: e.message })
    } finally {
      setBusy(false)
    }
  }
  const set = (field) => (val) => setV((s) => ({ ...s, [field]: val }))
  return (
    <div id={id}>
      <Card title={title} icon={icon} actions={<Btn kind="primary" size="sm" icon={Save} busy={busy} disabled={!dirty} onClick={save}>{dirty ? 'Save' : 'Saved'}</Btn>}>
        {sub && <p className="qa-muted small">{sub}</p>}
        {v && render(v, set)}
      </Card>
    </div>
  )
}

const TONES = [
  ['info', 'Info', Info],
  ['success', 'Good news', PartyPopper],
  ['warning', 'Warning', AlertTriangle],
  ['promo', 'Promo (bold)', Megaphone],
]

export default function SettingsPage() {
  const { data, loading, error, reload } = useAsync(() => api.getSettings(), [])
  useEffect(() => {
    if (data && window.location.hash) document.querySelector(window.location.hash)?.scrollIntoView({ behavior: 'smooth' })
  }, [data])
  if (loading && !data) return <Loading />
  if (error) return <p className="qa-error">{error.message}</p>

  return (
    <>
      <PageHead title="Site settings" sub="Changes go live immediately for everyone (visitors pick them up on their next page load)." icon={SettingsIcon} />
      <div className="qa-grid-2 is-start">
        <Section
          k="announcement"
          title="Announcement bar"
          icon={Megaphone}
          sub="A message at the bottom of every page. Players can dismiss it; changing the text shows it again."
          data={data}
          onSaved={reload}
          render={(v, set) => (
            <div className="qa-form">
              <div className="qa-field span-2">
                <Toggle checked={v.enabled} onChange={set('enabled')} label="Show announcement" />
              </div>
              <Field label="Message" span={2}>
                <input value={v.text} onChange={(e) => set('text')(e.target.value)} maxLength={180} placeholder="Weekend tournament: win a €50 gift card!" />
              </Field>
              <Field label="Button link" hint="Site path (/tournaments) or full URL">
                <input value={v.link} onChange={(e) => set('link')(e.target.value)} placeholder="/tournaments" />
              </Field>
              <Field label="Button text">
                <input value={v.link_label} onChange={(e) => set('link_label')(e.target.value)} placeholder="Join now" />
              </Field>
              <Field label="Style" span={2}>
                <div className="seg qa-seg">
                  {TONES.map(([k, l, I]) => (
                    <button key={k} type="button" className={v.tone === k ? 'is-on' : ''} onClick={() => set('tone')(k)}>
                      <I size={14} /> {l}
                    </button>
                  ))}
                </div>
              </Field>
              {v.text && (
                <div className={`sc-bar is-${v.tone} qa-ann-preview span-2`}>
                  <Megaphone size={18} />
                  <span>{v.text}</span>
                  {v.link && <span className="sc-link">{v.link_label || 'Learn more'}</span>}
                </div>
              )}
            </div>
          )}
        />
        <Section
          k="features"
          title="Features"
          icon={Power}
          sub="Switch parts of the site on or off. Turned-off sections disappear from menus and show a “paused” page (staff can still open them)."
          data={data}
          onSaved={reload}
          render={(v, set) => (
            <div className="qa-toggle-list">
              <Toggle checked={v.signups !== false} onChange={set('signups')} label="New sign-ups" hint="Off: the sign-up form is closed (existing players can log in)" />
              <Toggle checked={v.multiplayer !== false} onChange={set('multiplayer')} label="Multiplayer" hint="Quick match, parties and rooms" />
              <Toggle checked={v.tournaments !== false} onChange={set('tournaments')} label="Tournaments" hint="Tournament pages and the Compete section" />
              <Toggle checked={v.community_tournaments !== false} onChange={set('community_tournaments')} label="Player-made tournaments" hint="Let players create community tournaments" />
              <Toggle checked={v.leaderboards !== false} onChange={set('leaderboards')} label="Leaderboards" />
              <Toggle checked={v.friends !== false} onChange={set('friends')} label="Friends" hint="Friend requests and invites" />
            </div>
          )}
        />
        <Section
          k="xp_event"
          id="xp"
          title="XP event"
          icon={Zap}
          sub="Multiply all XP earned from rounds and rooms, e.g. a Double XP weekend. A badge shows in the menu while it’s live."
          data={data}
          onSaved={reload}
          render={(v, set) => (
            <div className="qa-form">
              <Field label="Multiplier">
                <select value={v.multiplier || 1} onChange={(e) => set('multiplier')(Number(e.target.value))}>
                  <option value={1}>Off (1×)</option>
                  <option value={1.5}>1.5×</option>
                  <option value={2}>2× Double XP</option>
                  <option value={3}>3× Triple XP</option>
                </select>
              </Field>
              <Field label="Label" hint="Shown in the menu badge">
                <input value={v.label || ''} onChange={(e) => set('label')(e.target.value)} placeholder="Double XP weekend" />
              </Field>
              <Field label="Starts (optional)">
                <input type="datetime-local" value={api.toLocalInput(v.starts_at)} onChange={(e) => set('starts_at')(api.fromLocalInput(e.target.value))} />
              </Field>
              <Field label="Ends (optional)">
                <input type="datetime-local" value={api.toLocalInput(v.ends_at)} onChange={(e) => set('ends_at')(api.fromLocalInput(e.target.value))} />
              </Field>
            </div>
          )}
        />
        <Section
          k="prize"
          title="Prize button"
          icon={Gift}
          sub="Where “Claim the Prize” sends players after they win a quiz."
          data={data}
          onSaved={reload}
          render={(v, set) => (
            <div className="qa-form">
              <Field label="Link" span={2}>
                <input value={v.url} onChange={(e) => set('url')(e.target.value)} placeholder="https://…" />
              </Field>
              <Field label="Button text" span={2}>
                <input value={v.label} onChange={(e) => set('label')(e.target.value)} placeholder="Claim the Prize" />
              </Field>
            </div>
          )}
        />
        <Section
          k="home"
          title="Home page"
          icon={Home}
          sub="Override the hero headline and subtitle (leave empty to use the translated defaults). Pick the featured quiz in Games."
          data={data}
          onSaved={reload}
          render={(v, set) => (
            <div className="qa-form">
              <Field label="Hero headline" span={2}>
                <input value={v.hero_title || ''} onChange={(e) => set('hero_title')(e.target.value)} placeholder="Play smarter quizzes" />
              </Field>
              <Field label="Hero subtitle" span={2}>
                <textarea rows={2} value={v.hero_subtitle || ''} onChange={(e) => set('hero_subtitle')(e.target.value)} />
              </Field>
            </div>
          )}
        />
        <Section
          k="maintenance"
          title="Maintenance mode"
          icon={Wrench}
          sub="Shows a “Back soon” page to everyone except staff and stops new rounds. Use it during big changes."
          data={data}
          onSaved={reload}
          render={(v, set) => (
            <div className="qa-form">
              <div className="qa-field span-2">
                <Toggle checked={v.enabled} onChange={set('enabled')} label="Maintenance mode" hint={v.enabled ? 'ON: players see the maintenance page' : 'Off'} />
              </div>
              <Field label="Message" span={2}>
                <textarea rows={2} value={v.message} onChange={(e) => set('message')(e.target.value)} />
              </Field>
            </div>
          )}
        />
      </div>
    </>
  )
}
