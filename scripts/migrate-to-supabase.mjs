import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '')
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your local .env before migrating.')

const request = async (path, options = {}) => {
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: { apikey: key, Authorization: `Bearer ${key}`, ...(options.body && !Buffer.isBuffer(options.body) ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`Supabase returned ${response.status}: ${text || response.statusText}`)
  return text ? JSON.parse(text) : null
}

const readJson = async (name) => {
  try { return JSON.parse(await readFile(join('server', 'data', name), 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return []; throw error }
}

const users = await readJson('users.json')
const cases = await readJson('cases.json')
const consultations = await readJson('consultations.json')

if (users.length) await request('/rest/v1/law_users', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(users.map((payload) => ({ id: payload.id, email: payload.email, role: payload.role, payload }))) })
if (cases.length) await request('/rest/v1/law_cases', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(cases.map((payload) => ({ id: payload.id, case_number: payload.caseNumber, client_email: payload.clientEmail || null, payload }))) })
if (consultations.length) await request('/rest/v1/law_consultations', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(consultations.map((payload) => ({ reference: payload.reference, payload }))) })

const documentsDir = join('server', 'data', 'documents')
let documentsUploaded = 0
try {
  for (const file of await readdir(documentsDir)) {
    const content = await readFile(join(documentsDir, file))
    await request(`/storage/v1/object/law-documents/${encodeURIComponent(file)}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'x-upsert': 'true' }, body: content })
    documentsUploaded++
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

console.log(`Migration complete: ${users.length} users, ${cases.length} cases, ${consultations.length} consultations, ${documentsUploaded} files copied. Local data was left unchanged.`)
