// Live rooms: multiplayer rooms from the last 24 hours, with the option to close one.
import { useEffect } from 'react'
import { Swords, RefreshCw, XCircle, Globe, Lock } from 'lucide-react'
import { PageHead, Card, Btn, Pill, Loading, Empty, useAsync } from '../ui.jsx'
import * as api from '../api.js'
import { useApp } from '../../state/AppState.jsx'
import { games } from '../../data/games.js'

const TONE = { lobby: 'cyan', playing: 'green', finished: 'muted', closed: 'red' }

export default function RoomsPage() {
  const { pushToast } = useApp()
  const { data, loading, error, reload } = useAsync(() => api.listRooms(), [])
  useEffect(() => {
    const t = setInterval(reload, 15000)
    return () => clearInterval(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const close = async (r) => {
    if (!window.confirm(`Close room ${r.code}? Everyone in it will be sent out.`)) return
    try {
      await api.closeRoom(r.id)
      reload()
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Rooms', text: e.message })
    }
  }
  const active = (data || []).filter((r) => ['lobby', 'playing'].includes(r.status)).length
  return (
    <>
      <PageHead title="Live rooms" sub={data ? `${active} open now · ${data.length} in the last 24 hours (auto-refreshes)` : 'Multiplayer rooms'} icon={Swords}>
        <Btn icon={RefreshCw} onClick={reload} busy={loading}>
          Refresh
        </Btn>
      </PageHead>
      <Card pad={false}>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <p className="qa-error qa-pad">{error.message}</p>
        ) : !data.length ? (
          <Empty icon={Swords} title="No rooms in the last 24 hours" />
        ) : (
          <div className="qa-table-wrap">
            <table className="qa-table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Quiz</th>
                  <th>Host</th>
                  <th>Players</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b className="qa-mono">{r.code}</b>
                      <small className="qa-block qa-muted">
                        {r.mode === 'match' ? '1v1 match' : 'Party'} · {r.is_public ? <Globe size={11} /> : <Lock size={11} />} · {api.ago(r.created_at)}
                      </small>
                    </td>
                    <td>{games.find((g) => g.slug === r.game_slug)?.title || r.game_slug}</td>
                    <td>{r.host}</td>
                    <td>{r.players.join(', ') || <span className="qa-muted">empty</span>}</td>
                    <td>{r.total ? `${Math.min(r.current_index + 1, r.total)}/${r.total}` : '—'}</td>
                    <td>
                      <Pill tone={TONE[r.status]}>{r.status}</Pill>
                    </td>
                    <td className="qa-right">
                      {['lobby', 'playing'].includes(r.status) && (
                        <Btn size="sm" kind="danger" icon={XCircle} onClick={() => close(r)}>
                          Close
                        </Btn>
                      )}
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
