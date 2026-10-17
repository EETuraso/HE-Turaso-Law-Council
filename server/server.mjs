import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes, createHmac, pbkdf2Sync, timingSafeEqual } from 'node:crypto'

const port = Number(process.env.API_PORT || 4000)
const secret = process.env.API_SECRET
if (!secret) throw new Error('API_SECRET must be set in the environment before starting the API.')
const rootDir = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const dataDir = join(rootDir, 'server', 'data')
const storagePath = join(dataDir, 'users.json')
const casesPath = join(dataDir, 'cases.json')
const consultationsPath = join(dataDir, 'consultations.json')
const documentsDir = join(dataDir, 'documents')
const sessions = new Map()
const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '')
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
const useSupabase = Boolean(supabaseUrl && supabaseKey)

const supabaseRequest = async (path, options = {}) => {
  if (!useSupabase) throw new Error('Supabase is not configured.')
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  })
  const body = await response.text()
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}): ${body || response.statusText}`)
  return body ? JSON.parse(body) : null
}

const tableRows = async (table) => supabaseRequest(`/rest/v1/${table}?select=payload`, { headers: { Accept: 'application/json' } })
const upsertRows = async (table, rows) => {
  if (!rows.length) return
  await supabaseRequest(`/rest/v1/${table}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows)
  })
}

const tokenHash = (token) => createHmac('sha256', secret).update(token).digest('hex')

const hashPassword = (password, salt) => pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')

const defaultAdminSettings = () => ({
  councilName: 'Henry E Turaso Law Council',
  principalName: 'Henry E Turaso',
  tagline: 'Legal services and representation',
  chamberName: 'Besite Malamre Clinic',
  officeAddress: 'Jimeta, Yola, Adamawa State, Nigeria',
  contactEmail: String(process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  contactPhone: '',
  appointmentPolicy: 'By appointment',
  timezone: 'Africa/Lagos',
  timeFormat: '12',
  siteContent: { overrides: [], theme: { gold: '#c6a15b', deep: '#0b2227', ink: '#102d31', muted: '#647275', paper: '#f8f7f3', sand: '#ece8df', line: '#d8d9d3', font: 'Manrope' } },
  notificationFrom: String(process.env.NOTIFICATION_FROM || '').trim(),
  remindersEnabled: true,
  reminder48Enabled: true,
  reminder24Enabled: true
})

const getAdminSettings = (admin) => {
  const defaults = defaultAdminSettings()
  const saved = admin?.settings || {}
  return {
    ...defaults,
    ...saved,
    siteContent: {
      ...defaults.siteContent,
      ...(saved.siteContent || {}),
      overrides: Array.isArray(saved.siteContent?.overrides) ? saved.siteContent.overrides : defaults.siteContent.overrides,
      theme: { ...defaults.siteContent.theme, ...(saved.siteContent?.theme || {}) }
    }
  }
}

const ensureUserStore = () => {
  mkdirSync(dataDir, { recursive: true })
  if (!existsSync(storagePath)) {
    const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
    const password = process.env.ADMIN_PASSWORD || ''
    if (!email || !password) {
      throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD to initialize the administrator account.')
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      throw new Error('ADMIN_EMAIL must be valid and ADMIN_PASSWORD must contain at least 8 characters.')
    }

    const admin = {
      id: 'admin-001',
      firstName: 'Henry',
      lastName: 'Turaso',
      email,
      phone: '',
      role: 'ADMIN',
      passwordSalt: randomBytes(16).toString('hex'),
      passwordHash: '',
      createdAt: new Date().toISOString()
    }

    admin.passwordHash = hashPassword(password, admin.passwordSalt)
    writeFileSync(storagePath, JSON.stringify([admin], null, 2), 'utf8')
  }
}

const readUsers = async () => {
  if (useSupabase) {
    const rows = await tableRows('law_users')
    const users = rows.map((row) => row.payload)
    if (!users.length) {
      const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
      const password = process.env.ADMIN_PASSWORD || ''
      if (!email || password.length < 8) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD to initialize the administrator account.')
      const admin = { id: 'admin-001', firstName: 'Henry', lastName: 'Turaso', email, phone: '', role: 'ADMIN', passwordSalt: randomBytes(16).toString('hex'), createdAt: new Date().toISOString() }
      admin.passwordHash = hashPassword(password, admin.passwordSalt)
      await writeUsers([admin])
      return [admin]
    }
    return users
  }
  ensureUserStore()
  return JSON.parse(readFileSync(storagePath, 'utf8'))
}

const writeUsers = async (users) => {
  if (useSupabase) return upsertRows('law_users', users.map((payload) => ({ id: payload.id, email: payload.email, role: payload.role, payload })))
  writeFileSync(storagePath, JSON.stringify(users, null, 2), 'utf8')
}

const readCases = async () => {
  if (useSupabase) return (await tableRows('law_cases')).map((row) => row.payload)
  mkdirSync(dataDir, { recursive: true })
  if (!existsSync(casesPath)) writeFileSync(casesPath, '[]', 'utf8')
  return JSON.parse(readFileSync(casesPath, 'utf8'))
}

const writeCases = async (cases) => {
  if (useSupabase) return upsertRows('law_cases', cases.map((payload) => ({ id: payload.id, case_number: payload.caseNumber, client_email: payload.clientEmail || null, payload })))
  writeFileSync(casesPath, JSON.stringify(cases, null, 2), 'utf8')
}

const readConsultations = async () => {
  if (useSupabase) return (await tableRows('law_consultations')).map((row) => row.payload)
  mkdirSync(dataDir, { recursive: true })
  if (!existsSync(consultationsPath)) writeFileSync(consultationsPath, '[]', 'utf8')
  return JSON.parse(readFileSync(consultationsPath, 'utf8'))
}

const writeConsultations = async (consultations) => {
  if (useSupabase) return upsertRows('law_consultations', consultations.map((payload) => ({ reference: payload.reference, payload })))
  writeFileSync(consultationsPath, JSON.stringify(consultations, null, 2), 'utf8')
}

const findUserByEmail = async (email) => {
  const users = await readUsers()
  return users.find((user) => user.email.toLowerCase() === String(email || '').trim().toLowerCase()) || null
}

const verifyPassword = (password, user) => {
  if (!user || !user.passwordHash || !user.passwordSalt) return false
  const expected = Buffer.from(user.passwordHash, 'hex')
  const actual = Buffer.from(hashPassword(password, user.passwordSalt), 'hex')
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}

const safeStringEqual = (left, right) => {
  const leftBytes = Buffer.from(String(left || ''))
  const rightBytes = Buffer.from(String(right || ''))
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes)
}

const makeToken = async (userId, role) => {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  if (useSupabase) {
    await supabaseRequest('/rest/v1/law_sessions', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ token_hash: tokenHash(token), user_id: userId, role, expires_at: expiresAt }) })
  } else sessions.set(token, { id: userId, role, expiresAt })
  return token
}

const getSessionUser = async (request) => {
  const authHeader = request.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return null
  if (useSupabase) {
    const rows = await supabaseRequest(`/rest/v1/law_sessions?token_hash=eq.${tokenHash(token)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=user_id,role&limit=1`)
    return rows[0] ? { id: rows[0].user_id, role: rows[0].role } : null
  }
  const session = sessions.get(token)
  if (session && Date.parse(session.expiresAt) > Date.now()) return session
  if (session) sessions.delete(token)
  return null
}

const json = (response, status, body) => {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  })
  response.end(JSON.stringify(body))
}

const readBody = async (request, maxBytes = 1024 * 1024) => {
  const chunks = []
  let byteLength = 0
  for await (const chunk of request) {
    byteLength += chunk.length
    if (byteLength > maxBytes) {
      const error = new Error('Request body exceeds the allowed size.')
      error.statusCode = 413
      throw error
    }
    chunks.push(chunk)
  }
  const value = Buffer.concat(chunks).toString('utf8')
  return value ? JSON.parse(value) : {}
}

const sanitizeClient = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone || '',
  role: user.role
})

const serializeClient = ({ id, firstName, lastName, email, phone, role = 'CLIENT' }) => ({
  id,
  firstName,
  lastName,
  email,
  phone,
  role
})

const toClientDashboard = async (user) => ({
  client: sanitizeClient(user),
  cases: (await readCases()).filter((item) => item.clientEmail?.toLowerCase() === user.email.toLowerCase())
})

const escapeEmailHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])

const sendReminderEmail = async ({ to, recipientName, offsetHours, caseRecord, hearing, from, timeZone }) => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !from) {
    const error = new Error('Email delivery is not configured. Set the Resend API key and sender address.')
    error.statusCode = 503
    throw error
  }
  const hearingDate = new Date(hearing.hearingDate)
  const formattedDate = new Intl.DateTimeFormat('en-NG', { dateStyle: 'full', timeStyle: 'short', timeZone: timeZone || 'Africa/Lagos' }).format(hearingDate)
  const safe = {
    name: escapeEmailHtml(recipientName || 'Client'),
    caseNumber: escapeEmailHtml(caseRecord.caseNumber),
    title: escapeEmailHtml(caseRecord.title),
    court: escapeEmailHtml(caseRecord.court),
    purpose: escapeEmailHtml(hearing.purpose || 'Hearing'),
    date: escapeEmailHtml(formattedDate)
  }
  const subject = `Hearing reminder (${offsetHours} hours): ${caseRecord.caseNumber}`
  const text = `This is a reminder that ${safe.purpose} for ${caseRecord.caseNumber} — ${caseRecord.title} is scheduled in about ${offsetHours} hours.\nCourt: ${caseRecord.court}\nDate and time: ${formattedDate}.`
  const html = `<p>Hello ${safe.name},</p><p>This is a reminder that <strong>${safe.purpose}</strong> for <strong>${safe.caseNumber} — ${safe.title}</strong> is scheduled in about ${offsetHours} hours.</p><p><strong>Court:</strong> ${safe.court}<br><strong>Date and time:</strong> ${safe.date} (West Africa Time)</p><p>Please contact the council if you have questions.</p>`
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
    signal: AbortSignal.timeout(10000)
  })
  if (!response.ok) {
    const error = new Error('The email provider could not deliver a hearing reminder.')
    error.statusCode = 502
    throw error
  }
}

const sendDueHearingReminders = async (now = Date.now()) => {
  if (!process.env.RESEND_API_KEY) {
    const error = new Error('Email reminders are not configured. Set RESEND_API_KEY.')
    error.statusCode = 503
    throw error
  }
  const barristerEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  if (!barristerEmail) {
    const error = new Error('ADMIN_EMAIL must be set before sending hearing reminders.')
    error.statusCode = 503
    throw error
  }
  const [cases, users] = await Promise.all([readCases(), readUsers()])
  const admin = users.find((user) => user.role === 'ADMIN')
  const settings = getAdminSettings(admin)
  if (!settings.remindersEnabled) return { checked: 0, sent: 0, failed: 0, disabled: true }
  const from = String(settings.notificationFrom || process.env.NOTIFICATION_FROM || '').trim()
  if (!from) {
    const error = new Error('Set a verified sender address in admin settings or Vercel.')
    error.statusCode = 503
    throw error
  }
  const timeZone = settings.timezone || 'Africa/Lagos'
  const offsets = [
    ...(settings.reminder48Enabled ? [48] : []),
    ...(settings.reminder24Enabled ? [24] : [])
  ]
  const usersByEmail = new Map(users.map((user) => [String(user.email || '').toLowerCase(), user]))
  let checked = 0
  let sent = 0
  let failed = 0

  for (const caseRecord of cases) {
    for (const hearing of caseRecord.hearings || []) {
      if (hearing.status !== 'SCHEDULED') continue
      const hearingTime = Date.parse(hearing.hearingDate)
      if (!Number.isFinite(hearingTime) || hearingTime <= now) continue
      checked += 1
      const hoursUntil = (hearingTime - now) / (60 * 60 * 1000)
      const clientEmail = String(caseRecord.clientEmail || '').trim().toLowerCase()
      const client = usersByEmail.get(clientEmail)
      const recipientGroups = new Map()
      const addRecipient = (role, email) => {
        const normalized = String(email || '').trim().toLowerCase()
        if (!normalized) return
        const group = recipientGroups.get(normalized) || { email: normalized, roles: [] }
        group.roles.push(role)
        recipientGroups.set(normalized, group)
      }
      addRecipient('barrister', barristerEmail)
      addRecipient('client', clientEmail)

      for (const offsetHours of offsets) {
        if (hoursUntil > offsetHours) continue
        hearing.remindersSent = hearing.remindersSent || {}
        const reminder = hearing.remindersSent[String(offsetHours)] || {}
        for (const group of recipientGroups.values()) {
          const pendingRoles = group.roles.filter((role) => !reminder[`${role}SentAt`])
          if (!pendingRoles.length) continue
          try {
            const recipientName = group.roles.includes('client') ? client?.firstName || 'Client' : 'Barrister'
            await sendReminderEmail({ to: group.email, recipientName, offsetHours, caseRecord, hearing, from, timeZone })
            const sentAt = new Date(now).toISOString()
            for (const role of pendingRoles) reminder[`${role}SentAt`] = sentAt
            hearing.remindersSent[String(offsetHours)] = reminder
            await writeCases(cases)
            sent += pendingRoles.length
          } catch {
            failed += pendingRoles.length
          }
        }
      }
    }
  }
  return { checked, sent, failed }
}

const createClientRecord = ({ firstName, lastName, email, phone, password }) => {
  const salt = randomBytes(16).toString('hex')

  return {
    id: `client-${Date.now()}-${randomBytes(6).toString('hex')}`,
    firstName: String(firstName || '').trim(),
    lastName: String(lastName || '').trim(),
    email: String(email || '').trim().toLowerCase(),
    phone: String(phone || '').trim(),
    role: 'CLIENT',
    passwordSalt: salt,
    passwordHash: hashPassword(String(password), salt),
    createdAt: new Date().toISOString()
  }
}

export const handler = async (request, response) => {
  const requestUrl = new URL(request.url || '/', 'http://localhost')
  const forwardedPath = requestUrl.searchParams.get('__route')
  const requestPath = forwardedPath
    ? `/api/v1/${forwardedPath.replace(/^\/+/, '')}`
    : requestUrl.pathname
  const apiPath = requestPath.startsWith('/api/v1/') || requestPath === '/api/v1'
    ? requestPath
    : `/api/v1${requestPath.startsWith('/') ? requestPath : `/${requestPath}`}`

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    })
    return response.end()
  }

  try {
    if (request.method === 'GET' && apiPath === '/api/v1/health') {
      return json(response, 200, { status: 'ok', service: 'henry-turaso-law-council-api' })
    }

    if (request.method === 'GET' && apiPath === '/api/v1/cron/hearing-reminders') {
      const expected = String(process.env.CRON_SECRET || '')
      const authorization = String(request.headers.authorization || '')
      const provided = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
      if (expected.length < 32) return json(response, 503, { message: 'The reminder trigger is not configured with a valid secret.' })
      const expectedBytes = Buffer.from(expected)
      const providedBytes = Buffer.from(provided)
      if (expectedBytes.length !== providedBytes.length || !timingSafeEqual(expectedBytes, providedBytes)) {
        return json(response, 401, { message: 'Authentication required.' })
      }
      const result = await sendDueHearingReminders()
      return json(response, result.failed ? 502 : 200, result)
    }


    if (request.method === 'GET' && apiPath === '/api/v1/settings/public') {
      const admin = (await readUsers()).find((user) => user.role === 'ADMIN')
      const settings = getAdminSettings(admin)
      return json(response, 200, { settings: {
        councilName: settings.councilName,
        principalName: settings.principalName,
        tagline: settings.tagline,
        chamberName: settings.chamberName,
        officeAddress: settings.officeAddress,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        appointmentPolicy: settings.appointmentPolicy,
        timezone: settings.timezone,
        timeFormat: settings.timeFormat,
        siteContent: settings.siteContent
      } })
    }

    if (request.method === 'POST' && apiPath === '/api/v1/consultations') {
      const body = await readBody(request)
      const name = String(body.name || '').trim()
      const email = String(body.email || '').trim().toLowerCase()
      const phone = String(body.phone || '').trim()
      const practiceArea = String(body.practiceArea || '').trim()
      const preferredDate = String(body.preferredDate || '').trim()
      const preferredTime = String(body.preferredTime || '').trim()
      const message = String(body.message || '').trim()

      if (!name || !email || !phone || !practiceArea || !preferredDate || !preferredTime) {
        return json(response, 400, { message: 'Complete each required field before submitting.' })
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json(response, 400, { message: 'Enter a valid email address.' })
      }

      const requestedAt = new Date(`${preferredDate}T${preferredTime}:00`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || !/^\d{2}:\d{2}$/.test(preferredTime) || Number.isNaN(requestedAt.getTime()) || requestedAt < new Date()) {
        return json(response, 400, { message: 'Choose a valid future date and time.' })
      }

      if (name.length > 120 || email.length > 254 || phone.length > 40 || message.length > 2000) {
        return json(response, 400, { message: 'One or more fields exceed the allowed length.' })
      }

      const consultation = {
        reference: `CONS-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`,
        name,
        email,
        phone,
        practiceArea,
        preferredDate,
        preferredTime,
        message,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      }

      const consultations = await readConsultations()
      consultations.unshift(consultation)
      await writeConsultations(consultations)
      return json(response, 201, { reference: consultation.reference, status: consultation.status })
    }


    if (request.method === 'POST' && apiPath === '/api/v1/admin/settings') {
      const session = await getSessionUser(request)
      if (!session || session.role !== 'ADMIN') return json(response, 403, { message: 'Administrator access required.' })
      const body = await readBody(request)
      const users = await readUsers()
      const admin = users.find((user) => user.id === session.id && user.role === 'ADMIN')
      if (!admin) return json(response, 404, { message: 'Administrator account not found.' })
      const current = getAdminSettings(admin)
      const textFields = ['councilName', 'principalName', 'tagline', 'chamberName', 'officeAddress', 'contactEmail', 'contactPhone', 'appointmentPolicy', 'timezone', 'notificationFrom']
      const settings = { ...current }
      for (const field of textFields) {
        if (typeof body[field] !== 'string') return json(response, 400, { message: 'Provide all text settings.' })
        settings[field] = body[field].trim()
      }
      for (const field of ['remindersEnabled', 'reminder48Enabled', 'reminder24Enabled']) {
        if (typeof body[field] !== 'boolean') return json(response, 400, { message: 'Reminder options must be enabled or disabled.' })
        settings[field] = body[field]
      }
      if (!['12', '24'].includes(body.timeFormat)) return json(response, 400, { message: 'Choose 12-hour or 24-hour time.' })
      settings.timeFormat = body.timeFormat
      const siteContent = body.siteContent
      if (!siteContent || typeof siteContent !== 'object' || Array.isArray(siteContent) || !Array.isArray(siteContent.overrides) || siteContent.overrides.length > 250 || !siteContent.theme || typeof siteContent.theme !== 'object' || Array.isArray(siteContent.theme)) {
        return json(response, 400, { message: 'Provide valid website content settings.' })
      }
      const allowedOverrideFields = new Set(['selector', 'page', 'text', 'replaceText', 'href', 'src', 'background', 'alt', 'title', 'placeholder', 'content', 'ariaLabel', 'value', 'hidden', 'color', 'backgroundColor'])
      const safeUrl = (value) => /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(value) && !/^javascript:/i.test(value)
      for (const override of siteContent.overrides) {
        if (!override || typeof override !== 'object' || Array.isArray(override) || Object.keys(override).some((key) => !allowedOverrideFields.has(key)) || typeof override.selector !== 'string' || !override.selector.trim() || override.selector.length > 240 || (override.page !== undefined && !['home', 'about', 'services', 'chamber', 'insights', 'contact', 'portal'].includes(override.page))) {
          return json(response, 400, { message: 'Each website content rule needs a valid selector and supported fields.' })
        }
        for (const field of ['text', 'href', 'src', 'background', 'alt', 'title', 'placeholder', 'content', 'ariaLabel', 'value']) {
          if (override[field] !== undefined && (typeof override[field] !== 'string' || override[field].length > 3000)) return json(response, 400, { message: 'A website content value is invalid or too long.' })
        }
        for (const field of ['href', 'src', 'background']) {
          if (override[field] && !safeUrl(override[field])) return json(response, 400, { message: 'Website links and images must use a safe URL.' })
        }
        if (override.replaceText !== undefined && typeof override.replaceText !== 'boolean') return json(response, 400, { message: 'Website text settings must be true or false.' })
        for (const field of ['color', 'backgroundColor']) if (override[field] !== undefined && (typeof override[field] !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(override[field]))) return json(response, 400, { message: 'Choose valid website colors.' })
        if (override.hidden !== undefined && typeof override.hidden !== 'boolean') return json(response, 400, { message: 'Website visibility settings must be true or false.' })
      }
      const theme = siteContent.theme
      const allowedThemeColors = ['gold', 'deep', 'ink', 'muted', 'paper', 'sand', 'line']
      if (allowedThemeColors.some((field) => typeof theme[field] !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(theme[field])) || !['Manrope', 'Arial', 'Georgia', 'system-ui'].includes(theme.font)) {
        return json(response, 400, { message: 'Choose valid theme colors and a supported font.' })
      }
      if (JSON.stringify(siteContent).length > 100000) return json(response, 400, { message: 'Website content settings exceed the 100 KB limit.' })
      settings.siteContent = { overrides: siteContent.overrides, theme: { ...theme } }
      const maxLengths = { councilName: 120, principalName: 120, tagline: 240, chamberName: 160, officeAddress: 300, contactEmail: 254, contactPhone: 40, appointmentPolicy: 240, timezone: 64, notificationFrom: 254 }
      if (Object.entries(maxLengths).some(([field, max]) => settings[field].length > max)) {
        return json(response, 400, { message: 'One or more settings exceed the allowed length.' })
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contactEmail)) {
        return json(response, 400, { message: 'Enter a valid public contact email.' })
      }
      if (settings.notificationFrom) {
        const senderAddress = settings.notificationFrom.match(/<([^<>]+)>/)?.[1] || settings.notificationFrom
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderAddress)) {
          return json(response, 400, { message: 'Enter a valid sender address.' })
        }
      }
      try { new Intl.DateTimeFormat('en', { timeZone: settings.timezone }) }
      catch { return json(response, 400, { message: 'Choose a valid time zone.' }) }
      admin.settings = settings
      await writeUsers(users)
      return json(response, 200, { settings })
    }

    const consultationStatusRoute = apiPath.match(/^\/api\/v1\/admin\/consultations\/([^/]+)\/status$/)
    if (request.method === 'POST' && consultationStatusRoute) {
      const session = await getSessionUser(request)
      if (!session || session.role !== 'ADMIN') return json(response, 403, { message: 'Administrator access required.' })
      const reference = decodeURIComponent(consultationStatusRoute[1])
      const { status } = await readBody(request)
      if (!['PENDING', 'CONTACTED', 'CONFIRMED', 'DECLINED'].includes(status)) {
        return json(response, 400, { message: 'Choose a valid consultation status.' })
      }
      const consultations = await readConsultations()
      const consultation = consultations.find((item) => item.reference === reference)
      if (!consultation) return json(response, 404, { message: 'Consultation request not found.' })
      consultation.status = status
      consultation.updatedAt = new Date().toISOString()
      await writeConsultations(consultations)
      return json(response, 200, { consultation })
    }

    if (request.method === 'POST' && apiPath === '/api/v1/admin/cases') {
      const session = await getSessionUser(request)
      if (!session || session.role !== 'ADMIN') return json(response, 403, { message: 'Administrator access required.' })
      const body = await readBody(request)
      const title = String(body.title || '').trim()
      const caseType = String(body.caseType || '').trim()
      const court = String(body.court || '').trim()
      const clientEmail = String(body.clientEmail || '').trim().toLowerCase()
      const description = String(body.description || '').trim()
      if (!title || !caseType || !court) return json(response, 400, { message: 'Case title, practice area, and court are required.' })
      if ([title, caseType, court, description].some((value) => value.length > 2000)) return json(response, 400, { message: 'A case field exceeds the allowed length.' })
      if (clientEmail && !(await readUsers()).some((user) => user.role === 'CLIENT' && user.email.toLowerCase() === clientEmail)) {
        return json(response, 400, { message: 'No registered client matches that email.' })
      }
      const cases = await readCases()
      const caseRecord = {
        id: `case-${Date.now()}-${randomBytes(5).toString('hex')}`,
        caseNumber: `HET-${new Date().getFullYear()}-${String(cases.length + 1).padStart(5, '0')}`,
        title,
        caseType,
        court,
        status: 'ACTIVE',
        description,
        clientEmail,
        hearings: [],
        notes: [],
        documents: [],
        createdAt: new Date().toISOString()
      }
      cases.unshift(caseRecord)
      await writeCases(cases)
      return json(response, 201, { case: caseRecord })
    }

    const caseHearingsRoute = apiPath.match(/^\/api\/v1\/admin\/cases\/([^/]+)\/hearings$/)
    if (request.method === 'POST' && caseHearingsRoute) {
      const session = await getSessionUser(request)
      if (!session || session.role !== 'ADMIN') return json(response, 403, { message: 'Administrator access required.' })
      const caseId = decodeURIComponent(caseHearingsRoute[1])
      const body = await readBody(request)
      const purpose = String(body.purpose || '').trim()
      const hearingDate = new Date(String(body.hearingDate || ''))
      if (!purpose || purpose.length > 120 || Number.isNaN(hearingDate.getTime()) || hearingDate < new Date()) {
        return json(response, 400, { message: 'Enter a valid future hearing date and purpose.' })
      }
      const cases = await readCases()
      const caseRecord = cases.find((item) => item.id === caseId)
      if (!caseRecord) return json(response, 404, { message: 'Case not found.' })
      caseRecord.hearings = Array.isArray(caseRecord.hearings) ? caseRecord.hearings : []
      const hearing = { id: randomBytes(8).toString('hex'), hearingDate: hearingDate.toISOString(), purpose, status: 'SCHEDULED' }
      caseRecord.hearings.push(hearing)
      caseRecord.hearings.sort((left, right) => left.hearingDate.localeCompare(right.hearingDate))
      await writeCases(cases)
      return json(response, 201, { hearing })
    }

    const caseDocumentsRoute = apiPath.match(/^\/api\/v1\/admin\/cases\/([^/]+)\/documents$/)
    if (request.method === 'POST' && caseDocumentsRoute) {
      const session = await getSessionUser(request)
      if (!session || session.role !== 'ADMIN') return json(response, 403, { message: 'Administrator access required.' })
      const caseId = decodeURIComponent(caseDocumentsRoute[1])
      const body = await readBody(request, 4.2 * 1024 * 1024)
      const title = String(body.title || '').trim()
      const fileName = String(body.fileName || '').trim().replace(/[\\/\r\n\"]+/g, '_').slice(0, 180)
      const mimeType = String(body.mimeType || '').trim().toLowerCase()
      const allowedTypes = {
        'application/pdf': '.pdf',
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
      }
      const encodedFile = String(body.fileData || '').replace(/^data:[^,]+,/, '')
      if (!title || title.length > 160 || !fileName || !allowedTypes[mimeType] || !/^[A-Za-z0-9+/]+={0,2}$/.test(encodedFile)) {
        return json(response, 400, { message: 'Provide a title and a valid PDF, Word, JPG, or PNG file.' })
      }
      const fileBytes = Buffer.from(encodedFile, 'base64')
      if (!fileBytes.length || fileBytes.length > 3 * 1024 * 1024) {
        return json(response, 413, { message: 'Documents must be 3 MB or smaller.' })
      }
      const cases = await readCases()
      const caseRecord = cases.find((item) => item.id === caseId)
      if (!caseRecord) return json(response, 404, { message: 'Case not found.' })
      const id = randomBytes(12).toString('hex')
      const storageName = `${id}${allowedTypes[mimeType]}`
      if (useSupabase) {
        await supabaseRequest(`/storage/v1/object/law-documents/${storageName}`, { method: 'POST', headers: { 'Content-Type': mimeType, 'x-upsert': 'false' }, body: fileBytes })
      } else {
        mkdirSync(documentsDir, { recursive: true })
        writeFileSync(join(documentsDir, storageName), fileBytes)
      }
      const document = { id, title, fileName, mimeType, storageName, createdAt: new Date().toISOString() }
      caseRecord.documents = Array.isArray(caseRecord.documents) ? caseRecord.documents : []
      caseRecord.documents.unshift(document)
      await writeCases(cases)
      return json(response, 201, { document: { id, title, fileName, mimeType, createdAt: document.createdAt } })
    }

    const documentDownloadRoute = apiPath.match(/^\/api\/v1\/admin\/documents\/([^/]+)$/)
    if (request.method === 'GET' && documentDownloadRoute) {
      const session = await getSessionUser(request)
      if (!session || session.role !== 'ADMIN') return json(response, 403, { message: 'Administrator access required.' })
      const documentId = decodeURIComponent(documentDownloadRoute[1])
      const document = (await readCases()).flatMap((item) => item.documents || []).find((item) => item.id === documentId)
      if (!document) return json(response, 404, { message: 'Document not found.' })
      if (useSupabase) {
        const result = await supabaseRequest(`/storage/v1/object/sign/law-documents/${document.storageName}`, { method: 'POST', body: JSON.stringify({ expiresIn: 60 }) })
        const signedURL = String(result.signedURL || '')
        const url = signedURL.startsWith('http')
          ? signedURL
          : `${supabaseUrl}/storage/v1${signedURL.startsWith('/') ? signedURL : `/${signedURL}`}`
        return json(response, 200, { url })
      }
      const fileBytes = readFileSync(join(documentsDir, document.storageName))
      const downloadName = document.fileName.replace(/[\r\n\"]+/g, '_')
      response.writeHead(200, { 'Content-Type': document.mimeType, 'Content-Disposition': `attachment; filename="${downloadName}"`, 'Content-Length': fileBytes.length, 'Access-Control-Allow-Origin': '*' })
      return response.end(fileBytes)
    }

    const caseNotesRoute = apiPath.match(/^\/api\/v1\/admin\/cases\/([^/]+)\/notes$/)
    if (request.method === 'POST' && caseNotesRoute) {
      const session = await getSessionUser(request)
      if (!session || session.role !== 'ADMIN') return json(response, 403, { message: 'Administrator access required.' })
      const caseId = decodeURIComponent(caseNotesRoute[1])
      const body = String((await readBody(request)).body || '').trim()
      if (!body || body.length > 2000) return json(response, 400, { message: 'Enter a case note of up to 2,000 characters.' })
      const cases = await readCases()
      const caseRecord = cases.find((item) => item.id === caseId)
      if (!caseRecord) return json(response, 404, { message: 'Case not found.' })
      caseRecord.notes = Array.isArray(caseRecord.notes) ? caseRecord.notes : []
      const note = { id: randomBytes(8).toString('hex'), body, createdAt: new Date().toISOString() }
      caseRecord.notes.unshift(note)
      await writeCases(cases)
      return json(response, 201, { note })
    }

    if (request.method === 'POST' && apiPath === '/api/v1/client/signup') {
      const body = await readBody(request)
      const fullName = String(body.name || `${body.firstName || ''} ${body.lastName || ''}`.trim()).trim()
      const firstName = String(body.firstName || fullName.split(/\s+/)[0] || '').trim()
      const lastName = String(body.lastName || fullName.split(/\s+/).slice(1).join(' ') || 'Client').trim()
      const email = String(body.email || '').trim().toLowerCase()
      const phone = String(body.phone || '').trim()
      const password = String(body.password || '')

      if (!firstName || !lastName || !email || !phone || !password) {
        return json(response, 400, { message: 'Please complete every required field.' })
      }

      if (password.length < 8) {
        return json(response, 400, { message: 'Use at least 8 characters for your password.' })
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json(response, 400, { message: 'Enter a valid email address.' })
      }

      const users = await readUsers()
      if (users.some((user) => user.email.toLowerCase() === email)) {
        return json(response, 409, { message: 'An account already exists for this email address.' })
      }

      const newClient = createClientRecord({ firstName, lastName, email, phone, password })
      users.push(newClient)
      await writeUsers(users)

      return json(response, 201, {
        accessToken: await makeToken(newClient.id, 'CLIENT'),
        user: serializeClient(newClient)
      })
    }

    if (request.method === 'POST' && apiPath === '/api/v1/auth/login') {
      const body = await readBody(request)
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const user = await findUserByEmail(email)

      if (!user || !verifyPassword(password, user)) {
        return json(response, 401, { message: 'Invalid email or password.' })
      }

      return json(response, 200, {
        accessToken: await makeToken(user.id, user.role),
        user: sanitizeClient(user)
      })
    }

    if (request.method === 'POST' && apiPath === '/api/v1/admin/login') {
      const body = await readBody(request)
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const user = await findUserByEmail(email)

      if (!user || user.role !== 'ADMIN') {
        return json(response, 401, { message: 'Invalid admin email or password.' })
      }

      if (!verifyPassword(password, user)) {
        const configuredEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
        const configuredPassword = process.env.ADMIN_PASSWORD || ''
        if (email !== configuredEmail || !configuredPassword || !safeStringEqual(password, configuredPassword)) {
          return json(response, 401, { message: 'Invalid admin email or password.' })
        }

        // Repair a stale database hash only after the configured admin password succeeds.
        user.passwordSalt = randomBytes(16).toString('hex')
        user.passwordHash = hashPassword(configuredPassword, user.passwordSalt)
        await writeUsers([user])
      }

      return json(response, 200, {
        accessToken: await makeToken(user.id, 'ADMIN'),
        user: sanitizeClient(user)
      })
    }

    if (request.method === 'POST' && apiPath === '/api/v1/auth/logout') {
      const token = (request.headers.authorization || '').startsWith('Bearer ')
        ? (request.headers.authorization || '').slice(7)
        : ''
      if (token) {
        if (useSupabase) await supabaseRequest(`/rest/v1/law_sessions?token_hash=eq.${tokenHash(token)}`, { method: 'DELETE' })
        else sessions.delete(token)
      }
      return json(response, 200, { message: 'Signed out.' })
    }

    if (request.method === 'GET' && apiPath === '/api/v1/client/dashboard') {
      const session = await getSessionUser(request)
      if (!session || session.role !== 'CLIENT') {
        return json(response, 401, { message: 'Authentication required.' })
      }

      const client = (await readUsers()).find((user) => user.id === session.id && user.role === 'CLIENT')
      if (!client) {
        return json(response, 404, { message: 'Client not found.' })
      }

      return json(response, 200, await toClientDashboard(client))
    }

    if (request.method === 'GET' && apiPath === '/api/v1/admin/dashboard') {
      const session = await getSessionUser(request)
      if (!session || session.role !== 'ADMIN') {
        return json(response, 403, { message: 'Administrator access required.' })
      }

      const users = await readUsers()
      const clients = users.filter((user) => user.role === 'CLIENT').map((user) => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        status: 'ACTIVE'
      }))
      const cases = await readCases()
      const consultations = await readConsultations()
      const totalDocuments = cases.reduce((total, item) => total + (item.documents || []).length, 0)

      const adminUser = users.find((user) => user.id === session.id)
      const settings = getAdminSettings(adminUser)

      return json(response, 200, {
        admin: adminUser ? sanitizeClient(adminUser) : null,
        settings,
        integrations: {
          emailConfigured: Boolean(process.env.RESEND_API_KEY && (settings.notificationFrom || process.env.NOTIFICATION_FROM)),
          cronConfigured: String(process.env.CRON_SECRET || '').length >= 32
        },
        stats: {
          activeCases: cases.filter((item) => item.status === 'ACTIVE').length,
          upcomingHearings: cases.reduce((total, item) => total + (item.hearings || []).filter((hearing) => hearing.status === 'SCHEDULED').length, 0),
          totalClients: clients.length,
          totalDocuments
        },
        cases,
        clients,
        consultations
      })
    }

    return json(response, 404, { message: 'Route not found.' })
  } catch (error) {
    return json(response, error?.statusCode || 400, { message: error instanceof Error ? error.message : 'Request failed.' })
  }
}

if (!process.env.VERCEL) {
  const server = createServer(handler)
  server.listen(port, '0.0.0.0', () => console.log(`Law Council API listening on http://127.0.0.1:${port}`))
}
