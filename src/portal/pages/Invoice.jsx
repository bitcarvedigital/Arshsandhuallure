import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, authedDownload } from '../../lib/supabaseClient'
import { useAuth } from '../AuthProvider'
import PortalShell from '../../shared/PortalShell'
import { Btn, Spinner, ErrorNote, emptyNote } from '../../shared/ui'
import InvoiceView from '../../shared/booking/InvoiceView'

const NAV = [
  { to: '/portal', label: 'Journey' },
  { to: '/portal/docs', label: 'Documents' },
  { to: '/portal/settings', label: 'Settings' },
]

export default function Invoice() {
  const { id } = useParams()
  const { signOut } = useAuth()
  const [invoice, setInvoice] = useState(undefined)
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => setInvoice(data || null))
  }, [id])

  return (
    <PortalShell title={invoice?.number ? `Invoice ${invoice.number}` : 'Invoice'} nav={NAV} onSignOut={signOut}>
      <div className="mb-6 print:hidden">
        <Link to="/portal/retainer" className="inline-block py-3 -my-3 text-[11px] tracking-[0.2em] uppercase text-faint hover:text-gold transition-colors">
          ← Payments
        </Link>
      </div>
      {invoice === undefined ? (
        <Spinner />
      ) : !invoice ? (
        <p className={emptyNote}>This invoice isn’t available — please ask Arsh if you need a copy.</p>
      ) : (
        <>
          <InvoiceView invoice={invoice} />
          <div className="flex flex-col sm:flex-row sm:justify-center gap-3 mt-8 print:hidden">
            <Btn
              className="w-full sm:w-auto"
              onClick={async () => {
                setErr('')
                try {
                  await authedDownload('/api/invoice', { action: 'download', invoiceId: invoice.id }, `${invoice.number}.pdf`)
                } catch (e) {
                  setErr(e.message)
                }
              }}
            >
              Download PDF
            </Btn>
            <Btn variant="outline" onClick={() => window.print()} className="w-full sm:w-auto">Print</Btn>
          </div>
          <div role="status" aria-live="polite" className="text-center print:hidden">
            <ErrorNote>{err}</ErrorNote>
          </div>
        </>
      )}
    </PortalShell>
  )
}
