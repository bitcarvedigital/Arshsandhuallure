import { supabaseAdmin } from '../_lib/supabaseAdmin.js'
import { send } from '../_lib/http.js'

// Daily Vercel Cron. A Supabase free-tier project pauses after ~7 days with
// no activity; one trivial query a day keeps it awake. Vercel sends
// `Authorization: Bearer $CRON_SECRET` on the schedule — nothing else may call it.
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers['authorization'] !== `Bearer ${secret}`) {
    return send(res, 401, { error: 'Unauthorized' })
  }
  const { error } = await supabaseAdmin().from('app_settings').select('key').limit(1)
  return send(res, error ? 500 : 200, { ok: !error, at: new Date().toISOString() })
}
