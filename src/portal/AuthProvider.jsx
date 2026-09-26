import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Spinner } from '../shared/ui'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

// Which portal an account belongs to: a studio admin (admins table) and/or a
// client (a clients row bound to the login). Each login page only accepts its
// own kind of account — nothing ever routes across portals.
export async function resolveRole(userId) {
  if (!userId) return { isAdmin: false, client: null }
  const [{ data: client }, { data: isAdmin }] = await Promise.all([
    supabase.from('clients').select('*').eq('user_id', userId).maybeSingle(),
    supabase.rpc('is_admin'),
  ])
  return { isAdmin: !!isAdmin, client: client || null }
}

// mode 'client' loads the caller's clients row; mode 'admin' checks admins.
export function AuthProvider({ mode, children }) {
  const [session, setSession] = useState(null)
  const [client, setClient] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const refreshRole = useCallback(async (sess) => {
    if (!sess) {
      setClient(null)
      setIsAdmin(false)
      return
    }
    const role = await resolveRole(sess.user.id)
    setClient(mode === 'client' ? role.client : null)
    setIsAdmin(role.isAdmin)
  }, [mode])

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      setSession(data.session)
      await refreshRole(data.session)
      if (alive) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!alive) return
      setSession(sess)
      await refreshRole(sess)
      if (alive) setLoading(false)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [refreshRole])

  const signOut = useCallback(() => supabase.auth.signOut(), [])
  const reloadClient = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession()
    await refreshRole(s.session)
  }, [refreshRole])

  return (
    <AuthCtx.Provider value={{ mode, session, client, isAdmin, loading, signOut, reloadClient }}>
      {children}
    </AuthCtx.Provider>
  )
}

// A signed-in account of the wrong kind lands on THIS portal's login page with
// a notice — it is never forwarded to the other portal.
export function RequireClient({ children }) {
  const { session, client, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-screen bg-beige"><Spinner /></div>
  if (!session) return <Navigate to="/portal/login" replace state={{ from: location.pathname }} />
  if (!client) return <Navigate to="/portal/login" replace state={{ wrongRole: true }} />
  return children
}

export function RequireAdmin({ children }) {
  const { session, isAdmin, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-screen bg-beige"><Spinner /></div>
  if (!session) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  if (!isAdmin) return <Navigate to="/admin/login" replace state={{ wrongRole: true }} />
  return children
}
