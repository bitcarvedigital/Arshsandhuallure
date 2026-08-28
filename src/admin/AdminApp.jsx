import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, RequireAdmin } from '../portal/AuthProvider'
import Login from '../portal/pages/Login'
import ClientList from './pages/ClientList'
import ClientNew from './pages/ClientNew'
import ClientDetail from './pages/ClientDetail'
import Queue from './pages/Queue'
import AdminSettings from './pages/AdminSettings'

export default function AdminApp() {
  return (
    <AuthProvider mode="admin">
      <Routes>
        <Route path="login" element={<Login admin />} />
        <Route index element={<RequireAdmin><ClientList /></RequireAdmin>} />
        <Route path="clients/new" element={<RequireAdmin><ClientNew /></RequireAdmin>} />
        <Route path="clients/:id" element={<RequireAdmin><ClientDetail /></RequireAdmin>} />
        <Route path="queue" element={<RequireAdmin><Queue /></RequireAdmin>} />
        <Route path="settings" element={<RequireAdmin><AdminSettings /></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AuthProvider>
  )
}
