import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { AdminShell } from '../AdminShell'
import { Btn, TextArea, Spinner, DiamondRule, SectionHeading, MicroLabel } from '../../shared/ui'

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
      <SectionHeading eyebrow="Review Queue" title="Waiting on you" className="mb-2" />
      <p className="text-sm text-[#7A6355] max-w-lg">
        Everything clients submit lands here first. Approve it and it appears in their portal as confirmed.
      </p>
      <DiamondRule className="my-8" />
      {!items ? (
        <Spinner />
      ) : items.length === 0 ? (
        <p className="text-sm text-[#A89080] border border-dashed border-[#C8B8AC] p-10 text-center">
          All caught up — nothing waiting. ✨
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((g) => (
            <div key={g.clientId}>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <Link to={`/admin/clients/${g.clientId}`} className="font-heading text-xl text-dark hover:text-gold transition-colors">
                  {g.client?.full_name || 'Client'}
                </Link>
                {g.items.length > 1 && (
                  <Btn
                    variant="gold"
                    className="!px-4 !py-2"
                    onClick={async () => {
                      for (const it of g.items) await decide(it, 'approved')
                    }}
                  >
                    Approve all ({g.items.length})
                  </Btn>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {g.items.map((item) => (
                  <div key={item.id} className="border border-[#C8B8AC] bg-[#FBF8F4] p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm text-dark">{KIND_LABEL[item.kind]}</p>
                        <p className="text-xs text-[#8A7A70] mt-0.5">
                          {new Date(item.created_at).toLocaleString('en-CA')}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Link to={`/admin/clients/${g.clientId}?tab=${KIND_TAB[item.kind]}`}>
                          <Btn variant="outline" className="!px-4 !py-2">View</Btn>
                        </Link>
                        <Btn variant="gold" className="!px-4 !py-2" onClick={() => decide(item, 'approved')}>
                          Approve
                        </Btn>
                        <Btn
                          variant="outline"
                          className="!px-4 !py-2"
                          onClick={() => {
                            setAsking(asking === item.id ? null : item.id)
                            setMessage('')
                          }}
                        >
                          Request changes
                        </Btn>
                      </div>
                    </div>
                    {asking === item.id && (
                      <div className="mt-4 border-t border-[#EFE6DA] pt-4 flex flex-col gap-3">
                        <MicroLabel>She’ll see this note in her portal</MicroLabel>
                        <TextArea
                          label="Your message"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="e.g. Could you add a clearer selfie in daylight?"
                        />
                        <Btn
                          variant="outline"
                          className="self-start"
                          disabled={!message.trim()}
                          onClick={() => decide(item, 'changes_requested', message)}
                        >
                          Send request
                        </Btn>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  )
}
