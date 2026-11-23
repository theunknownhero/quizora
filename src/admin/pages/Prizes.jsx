// Prize claims: external (real-world) tournament prizes waiting to be sent, with winner contact details.
import { useState } from 'react'
import { Gift, Mail, CheckCircle2, Undo2, Copy } from 'lucide-react'
import { PageHead, Card, Btn, Pill, Loading, Empty, useAsync } from '../ui.jsx'
import * as api from '../api.js'
import { useApp } from '../../state/AppState.jsx'

export default function PrizesPage() {
  const { can, pushToast } = useApp()
  const [status, setStatus] = useState('pending')
  const { data, loading, error, reload } = useAsync(() => api.listPrizes(status || null), [status])
  const mark = async (p, s) => {
    try {
      await api.setPrize(p.tournament_id, p.user_id, s)
      pushToast({ emoji: '✅', title: 'Prizes', text: s === 'sent' ? `Marked as sent to ${p.username}` : 'Moved back to pending' })
      reload()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Prizes', text: e.message })
    }
  }
  return (
    <>
      <PageHead title="Prize claims" sub="Real-world prizes from tournaments (tiers marked “External”). Send them, then mark them as sent." icon={Gift} />
      <div className="ad-filters">
        <div className="seg ad-seg">
          {[
            ['pending', 'To send'],
            ['sent', 'Sent'],
            ['', 'All'],
          ].map(([k, l]) => (
            <button key={k} type="button" className={status === k ? 'is-on' : ''} onClick={() => setStatus(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <Card pad={false}>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <p className="ad-error ad-pad">{error.message}</p>
        ) : !data.length ? (
          <Empty icon={Gift} title={status === 'pending' ? 'Nothing to send' : 'No prizes here'} text="Winners of external prizes show up here when a tournament’s results are final." />
        ) : (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Winner</th>
                  <th>Tournament</th>
                  <th>Place</th>
                  <th>Prize</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={`${p.tournament_id}${p.user_id}`}>
                    <td>
                      <b>{p.username}</b>
                      {p.email ? (
                        <small className="ad-block">
                          <a href={`mailto:${p.email}?subject=${encodeURIComponent(`Your Quizora prize: ${p.title}`)}`} className="ad-link">
                            <Mail size={12} /> {p.email}
                          </a>{' '}
                          <button type="button" className="ad-icon-btn is-xs" onClick={() => navigator.clipboard.writeText(p.email)} aria-label="Copy email">
                            <Copy size={11} />
                          </button>
                        </small>
                      ) : (
                        <small className="ad-block ad-muted">email hidden for your role</small>
                      )}
                    </td>
                    <td>
                      {p.title}
                      <small className="ad-block ad-muted">ended {api.fmtDay(p.ended)}</small>
                    </td>
                    <td>#{p.rank}</td>
                    <td>{p.prize}</td>
                    <td>
                      <Pill tone={p.status === 'sent' ? 'green' : 'gold'}>{p.status}</Pill>
                    </td>
                    <td className="ad-right">
                      {can('prizes') &&
                        (p.status === 'pending' ? (
                          <Btn size="sm" kind="primary" icon={CheckCircle2} onClick={() => mark(p, 'sent')}>
                            Mark sent
                          </Btn>
                        ) : (
                          <Btn size="sm" icon={Undo2} onClick={() => mark(p, 'pending')}>
                            Undo
                          </Btn>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
