import { Routes, Route } from 'react-router-dom'
import PartyForm from './PartyForm'
import PartyDone from './PartyDone'

// Public, token-gated — no auth code in this chunk.
export default function PartyApp() {
  return (
    <Routes>
      <Route index element={<PartyForm />} />
      <Route path="done" element={<PartyDone />} />
    </Routes>
  )
}
