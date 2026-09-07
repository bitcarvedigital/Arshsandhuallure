// Seed a PRODUCTION Supabase project: the two studio logins + business settings.
// Run AFTER migrations are applied:  node scripts/seed-prod.mjs
// Reads .env.production.local. Idempotent — safe to re-run.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'

const ROOT = resolve(new URL('..', import.meta.url).pathname)
const envPath = join(ROOT, '.env.production.local')
if (!existsSync(envPath)) {
  console.error('Missing .env.production.local')
  process.exit(1)
}
const env = {}
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, '')
}

const missing = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ARSH_ADMIN_EMAIL',
  'ARSH_ADMIN_PASSWORD',
  'BHAGESH_ADMIN_EMAIL',
  'BHAGESH_ADMIN_PASSWORD',
].filter((k) => !env[k] || env[k].includes('PASTE_HERE'))
if (missing.length) {
  console.error('Still needs filling in .env.production.local: ' + missing.join(', '))
  process.exit(1)
}

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// --- the two studio logins ---------------------------------------------------
for (const [emailKey, pwKey] of [
  ['ARSH_ADMIN_EMAIL', 'ARSH_ADMIN_PASSWORD'],
  ['BHAGESH_ADMIN_EMAIL', 'BHAGESH_ADMIN_PASSWORD'],
]) {
  const email = env[emailKey].toLowerCase()
  const password = env[pwKey]

  // does an auth user already exist for this email?
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 })
  let user = (list?.users || []).find((u) => (u.email || '').toLowerCase() === email)

  if (user) {
    await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true })
    console.log(`admin exists, password reset: ${email}`)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) {
      console.error(`FAILED creating ${email}: ${error.message}`)
      continue
    }
    user = data.user
    console.log(`admin created: ${email}`)
  }

  const { error: rowErr } = await admin
    .from('admins')
    .upsert({ user_id: user.id, email }, { onConflict: 'user_id' })
  if (rowErr) console.error(`  admins row failed: ${rowErr.message}`)
  else console.log(`  → admin privileges granted`)
}

// --- business settings -------------------------------------------------------
const settings = [
  { key: 'etransfer_email', value: env.ETRANSFER_EMAIL || 'arshsandhuallure@gmail.com' },
  { key: 'notification_email', value: env.NOTIFICATION_EMAIL || 'arshsandhuallure@gmail.com' },
]
for (const s of settings) {
  const { error } = await admin.from('app_settings').upsert(s, { onConflict: 'key' })
  console.log(`setting ${s.key} = ${s.value}${error ? ' FAILED: ' + error.message : ' ✓'}`)
}

// --- sanity checks -----------------------------------------------------------
const { count: adminCount } = await admin.from('admins').select('*', { count: 'exact', head: true })
const { data: terms } = await admin.from('agreement_terms').select('version')
const { data: buckets } = await admin.storage.listBuckets()
const bucket = (buckets || []).find((b) => b.id === 'client-uploads')

console.log('\n--- production readiness ---')
console.log(`admins:            ${adminCount}`)
console.log(`agreement terms:   ${(terms || []).length ? 'v' + terms.map((t) => t.version).join(', v') : 'MISSING — migrations not applied?'}`)
console.log(`uploads bucket:    ${bucket ? (bucket.public ? 'PUBLIC — WRONG, must be private' : 'private ✓') : 'MISSING'}`)
