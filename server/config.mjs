export const runtimeConfiguration = (env = process.env) => {
  const secret = String(env.API_SECRET || '').trim()
  const adminEmail = String(env.ADMIN_EMAIL || '').trim().toLowerCase()
  const adminPassword = String(env.ADMIN_PASSWORD || '')
  const supabaseUrl = String(env.SUPABASE_URL || '').trim().replace(/\/$/, '')
  const supabaseKey = String(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const hosted = Boolean(env.VERCEL)
  const localStorage = env.API_STORAGE === 'local' && !hosted
  const useSupabase = !localStorage && Boolean(supabaseUrl && supabaseKey)
  const issues = []
  if (secret.length < 32) issues.push('API_SECRET must contain at least 32 characters.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) issues.push('ADMIN_EMAIL must be a valid email address.')
  if (adminPassword.length < 12) issues.push('ADMIN_PASSWORD must contain at least 12 characters.')
  if (env.API_STORAGE && !['local', 'supabase'].includes(env.API_STORAGE)) issues.push('API_STORAGE must be local or supabase.')
  if (hosted && env.API_STORAGE === 'local') issues.push('Vercel requires Supabase persistence; local file storage is unavailable.')
  if (!localStorage && (hosted || supabaseUrl || supabaseKey || env.API_STORAGE === 'supabase')) {
    if (!supabaseUrl) issues.push('SUPABASE_URL is missing.')
    if (!supabaseKey || supabaseKey === '[SENSITIVE]') issues.push('SUPABASE_SECRET_KEY is missing or contains a Vercel placeholder.')
    try { if (new URL(supabaseUrl).protocol !== 'https:') throw new Error() }
    catch { if (supabaseUrl) issues.push('SUPABASE_URL must be a valid HTTPS URL.') }
  }
  return { secret, adminEmail, adminPassword, supabaseUrl, supabaseKey, useSupabase, hosted, issues, storage: useSupabase ? 'supabase' : 'local', aiConfigured: /^sk-\S+$/.test(String(env.OPENAI_API_KEY || '').trim()) }
}
