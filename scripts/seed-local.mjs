// Seed the LOCAL Supabase stack with the two admin users.
//   node scripts/seed-local.mjs
// Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
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

const ADMINS = [
  { email: 'arsh@local.test', password: 'local-admin-arsh-1' },
  { email: 'bhagesh@local.test', password: 'local-admin-bhagesh-1' },
]

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

for (const a of ADMINS) {
  const { data, error } = await admin.auth.admin.createUser({
    email: a.email,
    password: a.password,
    email_confirm: true,
  })
  if (error) {
    console.log(`skip ${a.email}: ${error.message}`)
    continue
  }
  const { error: insErr } = await admin.from('admins').insert({ user_id: data.user.id, email: a.email })
  console.log(insErr ? `admins row failed for ${a.email}: ${insErr.message}` : `admin seeded: ${a.email}`)
}
console.log('done')
