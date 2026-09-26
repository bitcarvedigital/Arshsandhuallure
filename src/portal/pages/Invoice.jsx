import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, authedDownload } from '../../lib/supabaseClient'
import { useAuth } from '../AuthProvider'
import PortalShell from '../../shared/PortalShell'
import { Btn, Spinner, ErrorNote } from '../../shared/ui'
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
        <Link to="/portal/retainer" className="text-xs tracking-[0.2em] uppercase text-[#8A7A70] hover:text-gold">
          ← Payments
        </Link>
      </div>
      {invoice === undefined ? (
        <Spinner />
      ) : !invoice ? (
        <p className="text-sm text-[#A89080] border border-dashed border-[#C8B8AC] p-8 text-center">This invoice isn’t available.</p>
      ) : (
        <>
          <InvoiceView invoice={invoice} />
          <div className="flex flex-wrap gap-3 justify-center mt-8 print:hidden">
            <Btn
              variant="gold"
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
            <Btn variant="outline" onClick={() => window.print()}>Print</Btn>
          </div>
          <ErrorNote>{err}</ErrorNote>
        </>
      )}
    </PortalShell>
  )
}
