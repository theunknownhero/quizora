// Audit log: every admin action, who did it and when.
import { Fragment, useState } from 'react'
import { ScrollText, ChevronDown, ChevronRight } from 'lucide-react'
import { PageHead, Card, Btn, SearchBox, Loading, Empty, useAsync } from '../ui.jsx'
import * as api from '../api.js'

export default function AuditPage() {
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(100)
  const [open, setOpen] = useState(null)
  const { data, loading, error } = useAsync(() => api.auditLog({ q, limit }), [q, limit])
  return (
    <>
      <PageHead title="Audit log" sub="Every change made in the admin panel." icon={ScrollText} />
      <div className="ad-filters">
        <SearchBox value={q} onChange={setQ} placeholder="Filter by action (e.g. user.ban, game.save)" />
      </div>
      <Card pad={false}>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <p className="ad-error ad-pad">{error.message}</p>
        ) : !data.length ? (
          <Empty icon={ScrollText} title="Nothing logged yet" />
        ) : (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th />
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                {data.map((a) => (
                  <Fragment key={a.id}>
                    <tr className="is-click" onClick={() => setOpen(open === a.id ? null : a.id)}>
                      <td>{open === a.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                      <td title={api.fmt(a.at)}>{api.ago(a.at)}</td>
                      <td>{a.actor || 'system'}</td>
                      <td>
                        <code>{a.action}</code>
                      </td>
                      <td>{a.target_user || <span className="ad-muted">{a.target?.slice(0, 40)}</span>}</td>
                    </tr>
                    {open === a.id && (
                      <tr className="ad-detail-row">
                        <td colSpan={5}>
                          <pre>{JSON.stringify(a.details, null, 2)}</pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {data?.length === limit && (
        <div className="ad-pager">
          <Btn onClick={() => setLimit((l) => l + 100)}>Load more</Btn>
        </div>
      )}
    </>
  )
}
