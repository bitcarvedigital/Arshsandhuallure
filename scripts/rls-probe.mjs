// Adversarial RLS probe — every check must PASS before any deploy.
//   node scripts/rls-probe.mjs
// Needs a seeded local stack with at least one registered client. Creates a
// second throwaway client+user ("Eve") and tries to reach the first one's data.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'

const ROOT = resolve(new URL('..', import.meta.url).pathname)
for (const file of ['.env.local', '.env']) {
  const p = join(ROOT, file)
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
}

const URL_ = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

const svc = createClient(URL_, SERVICE, { auth: { persistSession: false } })
let pass = 0
let fail = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  PASS' : '✗ FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  ok ? pass++ : fail++
}

// --- target: the first existing client (Maddy from the golden path) ---------
const { data: victims } = await svc.from('clients').select('*').not('user_id', 'is', null).limit(1)
const victim = victims?.[0]
if (!victim) {
  console.error('No registered client found — run the golden path first.')
  process.exit(1)
}

// --- Eve: a second registered client -----------------------------------------
const eveEmail = `eve-${Date.now()}@local.test`
const { data: eveClientRow } = await svc
  .from('clients')
  .insert({ full_name: 'Eve Probe', email: eveEmail })
  .select()
  .single()
const { data: eveUser } = await svc.auth.admin.createUser({
  email: eveEmail,
  password: 'eve-probe-12345',
  email_confirm: true,
})
await svc.from('clients').update({ user_id: eveUser.user.id, status: 'active' }).eq('id', eveClientRow.id)

const eve = createClient(URL_, ANON, { auth: { persistSession: false } })
await eve.auth.signInWithPassword({ email: eveEmail, password: 'eve-probe-12345' })
const anon = createClient(URL_, ANON, { auth: { persistSession: false } })

// --- cross-client reads (must all be empty) ---------------------------------
for (const table of ['clients', 'party_members', 'intakes', 'agreements', 'payments', 'client_documents', 'submissions']) {
  const { data } = await eve.from(table).select('*').eq(table === 'clients' ? 'id' : 'client_id', victim.id)
  check(`Eve cannot read ${table} of another client`, (data || []).length === 0, `${(data || []).length} rows`)
}

// --- admin-only / token tables ----------------------------------------------
for (const [client, who] of [[eve, 'Eve'], [anon, 'anon']]) {
  for (const table of ['admin_notes', 'invite_tokens', 'admins']) {
    const { data } = await client.from(table).select('*')
    check(`${who} sees nothing in ${table}`, (data || []).length === 0, `${(data || []).length} rows`)
  }
}
const { data: anonTokens } = await anon.from('party_share_tokens').select('*')
check('anon sees no party tokens', (anonTokens || []).length === 0)

// --- forbidden writes ---------------------------------------------------------
const { error: amtErr } = await eve.from('clients').update({ amount_total: 1 }).eq('id', eveClientRow.id)
check('client cannot change her own quoted amounts', !!amtErr, amtErr?.message?.slice(0, 60))

const { error: agErr, data: agData } = await eve
  .from('agreements')
  .insert({ client_id: eveClientRow.id, snapshot: {}, terms_version: 1, photo_consent: 'agrees', signed_name: 'Eve', agreed: true })
  .select()
check('client cannot self-insert an agreement', !!agErr || !(agData || []).length)

const { error: noteErr } = await eve.from('admin_notes').update({ notes: 'pwned' }).eq('client_id', eveClientRow.id)
const { data: noteAfter } = await svc.from('admin_notes').select('notes').eq('client_id', eveClientRow.id).single()
check('client cannot write admin notes', noteAfter?.notes !== 'pwned', noteErr?.message?.slice(0, 40) || 'silently ignored')

const { data: victimSubs } = await svc
  .from('submissions')
  .select('id, status')
  .eq('client_id', victim.id)
  .eq('status', 'pending')
  .limit(1)
if (victimSubs?.length) {
  await eve.from('submissions').update({ status: 'approved' }).eq('id', victimSubs[0].id)
  const { data: still } = await svc.from('submissions').select('status').eq('id', victimSubs[0].id).single()
  check('client cannot approve another client’s submission', still.status === 'pending')
}

const { error: docErr } = await eve.from('client_documents').update({ visible: true }).eq('client_id', eveClientRow.id)
const { data: docsAfter } = await svc.from('client_documents').select('visible').eq('client_id', eveClientRow.id)
check('client cannot self-reveal documents', (docsAfter || []).every((d) => !d.visible), docErr?.message?.slice(0, 40) || 'silently ignored')

// --- member status escalation --------------------------------------------------
const { data: eveMember } = await svc.from('party_members').select('id').eq('client_id', eveClientRow.id).single()
const { error: escErr } = await eve.from('party_members').update({ status: 'approved' }).eq('id', eveMember.id)
const { data: memberAfter } = await svc.from('party_members').select('status').eq('id', eveMember.id).single()
check('client cannot self-approve a profile', memberAfter.status !== 'approved', escErr?.message?.slice(0, 50) || '')

// --- storage cross-read --------------------------------------------------------
const foreignPath = `${victim.id}/members/x/selfie/probe.jpg`
const { error: storErr } = await eve.storage.from('client-uploads').createSignedUrl(foreignPath, 60)
check('client cannot sign URLs into another client folder', !!storErr)
const { error: storUpErr } = await eve.storage
  .from('client-uploads')
  .upload(`${victim.id}/members/x/selfie/evil.jpg`, new Blob(['x']), { contentType: 'image/jpeg' })
check('client cannot upload into another client folder', !!storUpErr)

// --- API endpoints -------------------------------------------------------------
const API = process.env.APP_BASE_URL || 'http://localhost:5173'
async function post(path, body, headers = {}) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

const bogus = await post('/api/party/info', { token: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' })
check('bogus party token rejected', bogus.json?.valid === false)

const { data: eveSession } = await eve.auth.getSession()
const adminAsEve = await post('/api/admin/create-client', { fullName: 'X', email: 'x@x.com' }, { Authorization: `Bearer ${eveSession.session.access_token}` })
check('client JWT rejected on admin endpoint', adminAsEve.status === 401, `status ${adminAsEve.status}`)

const hookNoSecret = await post('/api/hooks/submission-created', { type: 'INSERT', table: 'submissions', record: { id: 'x' } })
check('webhook without secret rejected', hookNoSecret.status === 401, `status ${hookNoSecret.status}`)

const inviteReuse = await post('/api/invite-info', { token: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' })
check('bogus invite token invalid', inviteReuse.json?.valid === false)

// --- cleanup Eve ---------------------------------------------------------------
await svc.from('clients').delete().eq('id', eveClientRow.id)
await svc.auth.admin.deleteUser(eveUser.user.id)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
