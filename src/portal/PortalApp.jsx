import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, RequireClient } from './AuthProvider'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Agreement from './pages/Agreement'
import Payments from './pages/Payments'
import Intake from './pages/Intake'
import MemberEdit from './pages/MemberEdit'
import PartyLink from './pages/PartyLink'
import Docs from './pages/Docs'
import DocView from './pages/DocView'
import Settings from './pages/Settings'

export default function PortalApp() {
  return (
    <AuthProvider mode="client">
      <Routes>
        <Route path="login" element={<Login />} />
        <Route path="reset" element={<ResetPassword />} />
        <Route index element={<RequireClient><Dashboard /></RequireClient>} />
        <Route path="agreement" element={<RequireClient><Agreement /></RequireClient>} />
        <Route path="retainer" element={<RequireClient><Payments /></RequireClient>} />
        <Route path="intake" element={<RequireClient><Intake /></RequireClient>} />
        <Route path="intake/member/:memberId" element={<RequireClient><MemberEdit /></RequireClient>} />
        <Route path="party-link" element={<RequireClient><PartyLink /></RequireClient>} />
        <Route path="docs" element={<RequireClient><Docs /></RequireClient>} />
        <Route path="docs/:docType" element={<RequireClient><DocView /></RequireClient>} />
        <Route path="settings" element={<RequireClient><Settings /></RequireClient>} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    </AuthProvider>
  )
}
