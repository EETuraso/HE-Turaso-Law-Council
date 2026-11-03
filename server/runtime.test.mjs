import test from 'node:test'
import assert from 'node:assert/strict'
import { runtimeConfiguration } from './config.mjs'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { join, resolve, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import { randomBytes, pbkdf2Sync } from 'node:crypto'

const basic = { API_SECRET: 'a'.repeat(64), ADMIN_EMAIL: 'admin@example.invalid', ADMIN_PASSWORD: 'new-password-test-only' }

test('deployment configuration rejects partial cloud credentials and local storage on Vercel', () => {
  const partial = runtimeConfiguration({ ...basic, VERCEL: '1', SUPABASE_URL: 'https://test.supabase.co' })
  assert.ok(partial.issues.some((issue) => issue.includes('SUPABASE_SECRET_KEY')))
  const placeholder = runtimeConfiguration({ ...basic, VERCEL: '1', SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SECRET_KEY: '[SENSITIVE]' })
  assert.ok(placeholder.issues.some((issue) => issue.includes('placeholder')))
  const local = runtimeConfiguration({ ...basic, API_STORAGE: 'local', SUPABASE_URL: 'https://test.supabase.co' })
  assert.deepEqual(local.issues, [])
  assert.equal(local.useSupabase, false)
  assert.ok(runtimeConfiguration({ ...basic, VERCEL: '1', API_STORAGE: 'local' }).issues.length > 0)
  const cloud = runtimeConfiguration({ ...basic, VERCEL: '1', SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SECRET_KEY: 'test-only-new-key', SUPABASE_SERVICE_ROLE_KEY: 'test-only-old-key' })
  assert.deepEqual(cloud.issues, [])
  assert.equal(cloud.supabaseKey, 'test-only-new-key')
})

const passwordUser = (id, email, role, password) => {
  const salt = randomBytes(16).toString('hex')
  return { id, email, role, firstName: id, lastName: 'Test', passwordSalt: salt, passwordHash: pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex') }
}

const start = async (t, extra = {}, users = []) => {
  const dataDir = await mkdtemp(join(tmpdir(), 'law-council-test-'))
  await writeFile(join(dataDir, 'users.json'), JSON.stringify(users))
  const child = spawn(process.execPath, ['server/server.mjs'], { cwd: process.cwd(), env: { ...process.env, ...basic, VERCEL: '', API_PORT: '0', API_STORAGE: 'local', API_DATA_DIR: dataDir, OPENAI_API_KEY: '', SUPABASE_URL: '', SUPABASE_SECRET_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '', ...extra }, stdio: ['ignore', 'pipe', 'pipe'] })
  t.after(async () => {
    child.kill()
    if (resolve(dataDir).startsWith(resolve(tmpdir()) + '\\') || resolve(dataDir).startsWith(resolve(tmpdir()) + '/')) {
      assert.ok(basename(dataDir).startsWith('law-council-test-'))
      await rm(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
    } else throw new Error('Refusing to remove unexpected test directory')
  })
  const base = await new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error('Test server did not start')), 15000)
    child.once('error', reject)
    child.stdout.on('data', (chunk) => { const match = String(chunk).match(/http:\/\/127\.0\.0\.1:(\d+)/); if (match) { clearTimeout(timer); resolveReady(`http://127.0.0.1:${match[1]}/api/v1`) } })
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Test server exited early (${code})`)) })
  })
  const request = async (path, body, token) => {
    const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) })
    return { status: response.status, body: await response.json() }
  }
  return { request, dataDir }
}

test('incomplete Supabase setup returns 503 without creating local records', { timeout: 20000 }, async (t) => {
  const { request } = await start(t, { API_STORAGE: 'supabase', SUPABASE_URL: 'https://test.supabase.co' })
  const health = await request('/health')
  assert.equal(health.status, 503)
  assert.equal(health.body.status, 'not_configured')
  assert.equal((await request('/admin/login', { email: basic.ADMIN_EMAIL, password: basic.ADMIN_PASSWORD })).status, 503)
})

test('password rotation, staff confidentiality and task approval workflow', { timeout: 30000 }, async (t) => {
  const oldPassword = 'old-password-test-only'
  const clientPassword = 'client-password-test-only'
  const { request, dataDir } = await start(t, {}, [passwordUser('admin-001', basic.ADMIN_EMAIL, 'ADMIN', oldPassword), passwordUser('client-001', 'client@example.invalid', 'CLIENT', clientPassword)])
  assert.equal((await request('/health')).status, 200)
  assert.equal((await request('/admin/login', { email: basic.ADMIN_EMAIL, password: oldPassword })).status, 401)
  assert.equal((await request('/auth/login', { email: basic.ADMIN_EMAIL, password: oldPassword })).status, 401)
  const login = await request('/admin/login', { email: basic.ADMIN_EMAIL, password: basic.ADMIN_PASSWORD })
  assert.equal(login.status, 200)
  const adminToken = login.body.accessToken
  assert.equal((await request('/auth/login', { email: 'client@example.invalid', password: clientPassword })).status, 200)
  assert.equal(JSON.parse(await readFile(join(dataDir, 'users.json'), 'utf8')).length, 2)
  const created = await request('/admin/cases', { title: 'Test matter', court: 'Test court', caseType: 'Civil', clientEmail: 'client@example.invalid' }, adminToken)
  assert.equal(created.status, 201)
  const staffPassword = 'staff-temporary-password'
  const staff = await request('/admin/staff', { firstName: 'Test', lastName: 'Lawyer', email: 'staff@example.invalid', role: 'ASSOCIATE_LAWYER', password: staffPassword }, adminToken)
  assert.equal(staff.status, 201)
  assert.equal((await request(`/admin/staff/${staff.body.staff.id}/case-access`, { caseIds: [created.body.case.id] }, adminToken)).status, 200)
  const task = await request('/admin/tasks', { title: 'Review papers', instructions: 'Prepare a draft for review.', assigneeIds: [staff.body.staff.id], caseId: created.body.case.id, dueAt: new Date(Date.now() + 86400000).toISOString() }, adminToken)
  assert.equal(task.status, 201)
  const staffLogin = await request('/admin/login', { email: 'staff@example.invalid', password: staffPassword })
  assert.equal(staffLogin.body.user.mustChangePassword, true)
  const staffToken = staffLogin.body.accessToken
  const gated = await request('/staff/dashboard', undefined, staffToken)
  assert.equal(gated.body.cases.length, 0)
  assert.equal(gated.body.tasks.length, 0)
  assert.equal((await request('/admin/dashboard', undefined, staffToken)).status, 403)
  assert.equal((await request('/auth/password', { currentPassword: staffPassword, newPassword: 'new-staff-password-test-only' }, staffToken)).status, 200)
  const allowed = await request('/staff/dashboard', undefined, staffToken)
  assert.equal(allowed.body.cases.length, 1)
  assert.equal(allowed.body.tasks.length, 1)
  assert.equal((await request('/admin/tasks', {}, staffToken)).status, 403)
  assert.equal((await request('/staff/tasks/status', { taskId: 'another-task', status: 'ACCEPTED' }, staffToken)).status, 404)
  const taskId = task.body.task.id
  for (const status of ['ACCEPTED', 'IN_PROGRESS', 'SUBMITTED_FOR_APPROVAL']) assert.equal((await request('/staff/tasks/status', { taskId, status, note: 'Draft ready.' }, staffToken)).status, 200)
  assert.equal((await request(`/admin/tasks/${taskId}/review`, { decision: 'REVISION_REQUIRED' }, adminToken)).status, 400)
  assert.equal((await request(`/admin/tasks/${taskId}/review`, { decision: 'REVISION_REQUIRED', feedback: 'Verify the filing date.' }, adminToken)).status, 200)
  for (const status of ['IN_PROGRESS', 'SUBMITTED_FOR_APPROVAL']) assert.equal((await request('/staff/tasks/status', { taskId, status, note: 'Verified.' }, staffToken)).status, 200)
  const approved = await request(`/admin/tasks/${taskId}/review`, { decision: 'APPROVED' }, adminToken)
  assert.equal(approved.body.task.status, 'APPROVED')
  assert.equal(approved.body.task.history.length, 8)
  assert.equal((await request('/staff/tasks/status', { taskId, status: 'IN_PROGRESS' }, staffToken)).status, 400)
  assert.equal((await request('/admin/staff/' + staff.body.staff.id + '/status', { active: false }, adminToken)).status, 200)
  assert.equal((await request('/staff/dashboard', undefined, staffToken)).status, 401)
  const head = await request('/admin/staff', { firstName: 'Test', lastName: 'Head', email: 'head@example.invalid', role: 'HEAD_LAWYER', password: staffPassword }, adminToken)
  assert.equal(head.status, 201)
  const headLogin = await request('/admin/login', { email: 'head@example.invalid', password: staffPassword })
  assert.equal((await request('/admin/dashboard', undefined, headLogin.body.accessToken)).status, 403)
  assert.equal((await request('/auth/password', { currentPassword: staffPassword, newPassword: 'new-head-password-test-only' }, headLogin.body.accessToken)).status, 200)
  assert.equal((await request('/admin/dashboard', undefined, headLogin.body.accessToken)).status, 200)
  assert.equal((await request('/ai/chat', { assistant: 'public', messages: [{ role: 'user', content: 'Hello' }] })).status, 503)
  assert.equal((await request('/ai/chat', { assistant: 'client', messages: [{ role: 'user', content: 'My case' }] })).status, 403)
})