import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { AdminShell } from '../AdminShell'
import { PageHeader, quietBtn } from '../adminUi'
import { Btn, TextArea, Spinner, emptyNote, softPanel, fmtDateTime, fmtShortDate } from '../../shared/ui'

const KIND_LABEL = {
  agreement: 'Signed agreement',
  intake: 'Intake form',
  party_member: 'Party profile',
}
const KIND_TAB = { agreement: 'agreement', intake: 'intake', party_member: 'intake' }

export default function Queue() {
  const [items, setItems] = useState(null)
  const [asking, setAsking] = useState(null) // submission id awaiting a message
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('submissions')
      .select('*, clients ( id, full_name, event_date )')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    setItems(data || [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function decide(sub, status, msg) {
    await supabase.from('submissions').update({ status, message: msg || null }).eq('id', sub.id)
    setAsking(null)
    setMessage('')
    load()
  }

  // group by client for a calm queue
  const groups = []
  for (const item of items || []) {
    let g = groups.find((x) => x.clientId === item.client_id)
    if (!g) {
      g = { clientId: item.client_id, client: item.clients, items: [] }
      groups.push(g)
    }
    g.items.push(item)
  }

  return (
    <AdminShell title="Review">
      <PageHeader
        eyebrow="Review"
        title="Waiting on you"
        intro="Everything clients submit lands here first. Approve it and it appears in their portal as confirmed."
      />
      {!items ? (
        <Spinner />
      ) : items.length === 0 ? (
        <p className={emptyNote}>All caught up — nothing is waiting on you.</p>
      ) : (
        <div className="flex flex-col gap-12">
          {groups.map((g) => {
            const firstName = (g.client?.full_name || '').split(' ')[0] || 'her'
            return (
              <section key={g.clientId}>
                <div className="flex items-end justify-between gap-3 flex-wrap mb-3">
                  <div className="min-w-0">
                    <Link
                      to={`/admin/clients/${g.clientId}`}
                      className="font-heading text-xl text-dark hover:text-gold transition-colors"
                    >
                      {g.client?.full_name || 'Client'}
                    </Link>
                    {g.client?.event_date && (
                      <p className="text-xs text-faint mt-0.5">{fmtShortDate(g.client.event_date)}</p>
                    )}
                  </div>
                  {g.items.length > 1 && (
                    <Btn
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        for (const it of g.items) await decide(it, 'approved')
                      }}
                    >
                      Approve all ({g.items.length})
                    </Btn>
                  )}
                </div>
                <div className="border-t border-line">
                  {g.items.map((item) => (
                    <div key={item.id} className="py-4 border-b border-line">
                      <div className="flex items-center justify-between gap-x-4 gap-y-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="text-sm text-dark">{KIND_LABEL[item.kind]}</p>
                          <p className="text-xs text-faint mt-0.5">Submitted {fmtDateTime(item.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap -ml-3 sm:ml-0">
                          <Link to={`/admin/clients/${g.clientId}?tab=${KIND_TAB[item.kind]}`} className={quietBtn}>
                            View
                          </Link>
                          <button
                            type="button"
                            className={quietBtn}
                            aria-expanded={asking === item.id}
                            onClick={() => {
                              setAsking(asking === item.id ? null : item.id)
                              setMessage('')
                            }}
                          >
                            Request changes
                          </button>
                          <Btn variant="solid" size="sm" className="ml-2" onClick={() => decide(item, 'approved')}>
                            Approve
                          </Btn>
                        </div>
                      </div>
                      {asking === item.id && (
                        <div className={`${softPanel} mt-4 px-5 py-5 flex flex-col gap-4`}>
                          <TextArea
                            label={`Message to ${firstName}`}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="e.g. Could you add a clearer selfie in daylight?"
                          />
                          <p className="text-xs text-faint -mt-2">She’ll see this note in her portal.</p>
                          <div className="flex items-center gap-2">
                            <Btn
                              size="sm"
                              disabled={!message.trim()}
                              onClick={() => decide(item, 'changes_requested', message)}
                            >
                              Send request
                            </Btn>
                            <button type="button" className={quietBtn} onClick={() => setAsking(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </AdminShell>
  )
}
