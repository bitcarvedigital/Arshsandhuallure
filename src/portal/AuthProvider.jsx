import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Spinner } from '../shared/ui'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

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
    if (mode === 'client') {
      const { data } = await supabase.from('clients').select('*').eq('user_id', sess.user.id).maybeSingle()
      setClient(data || null)
    } else {
      const { data } = await supabase.rpc('is_admin')
      setIsAdmin(!!data)
    }
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
    <AuthCtx.Provider value={{ session, client, isAdmin, loading, signOut, reloadClient }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function RequireClient({ children }) {
  const { session, client, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-screen bg-beige"><Spinner /></div>
  if (!session || !client) {
    return <Navigate to="/portal/login" replace state={{ from: location.pathname }} />
  }
  return children
}

export function RequireAdmin({ children }) {
  const { session, isAdmin, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-beige"><Spinner /></div>
  if (!session || !isAdmin) return <Navigate to="/admin/login" replace />
  return children
}
