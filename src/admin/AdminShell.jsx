import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../portal/AuthProvider'
import { supabase } from '../lib/supabaseClient'
import PortalShell from '../shared/PortalShell'

const NAV = [
  { to: '/admin', label: 'Clients' },
  { to: '/admin/queue', label: 'Review', showBadge: true },
  { to: '/admin/settings', label: 'Settings' },
]

// Shared admin chrome: nav + live pending-review badge (refreshes per route).
export function AdminShell({ title, children }) {
  const { signOut } = useAuth()
  const [badge, setBadge] = useState(0)
  const location = useLocation()

  useEffect(() => {
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setBadge(count || 0))
  }, [location])

  return (
    <PortalShell title={title} nav={NAV} onSignOut={signOut} badge={badge}>
      {children}
    </PortalShell>
  )
}
