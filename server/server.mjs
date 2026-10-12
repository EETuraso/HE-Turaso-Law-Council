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

const hashPassword = (password, salt) => pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')

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

const readUsers = () => {
  ensureUserStore()
  return JSON.parse(readFileSync(storagePath, 'utf8'))
}

const writeUsers = (users) => {
  writeFileSync(storagePath, JSON.stringify(users, null, 2), 'utf8')
}

const readCases = () => {
  mkdirSync(dataDir, { recursive: true })
  if (!existsSync(casesPath)) writeFileSync(casesPath, '[]', 'utf8')
  return JSON.parse(readFileSync(casesPath, 'utf8'))
}

const writeCases = (cases) => {
  writeFileSync(casesPath, JSON.stringify(cases, null, 2), 'utf8')
}

const readConsultations = () => {
  mkdirSync(dataDir, { recursive: true })
  if (!existsSync(consultationsPath)) writeFileSync(consultationsPath, '[]', 'utf8')
  return JSON.parse(readFileSync(consultationsPath, 'utf8'))
}

const writeConsultations = (consultations) => {
  writeFileSync(consultationsPath, JSON.stringify(consultations, null, 2), 'utf8')
}

const findUserByEmail = (email) => {
  const users = readUsers()
  return users.find((user) => user.email.toLowerCase() === String(email || '').trim().toLowerCase()) || null
}

const verifyPassword = (password, user) => {
  if (!user || !user.passwordHash || !user.passwordSalt) return false
  const expected = Buffer.from(user.passwordHash, 'hex')
  const actual = Buffer.from(hashPassword(password, user.passwordSalt), 'hex')
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}

const makeToken = (userId, role) => {
  const tokenId = randomBytes(18).toString('hex')
  const signature = createHmac('sha256', secret).update(`${userId}:${role}:${tokenId}`).digest('hex')
  const token = `${tokenId}.${signature}`
  sessions.set(token, { id: userId, role })
  return token
}

const getSessionUser = (request) => {
  const authHeader = request.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  return token ? sessions.get(token) || null : null
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

const toClientDashboard = (user) => ({
  client: sanitizeClient(user),
  cases: readCases().filter((item) => item.clientEmail?.toLowerCase() === user.email.toLowerCase())
})

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

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    })
    return response.end()
  }

  try {
    if (request.method === 'GET' && request.url === '/api/v1/health') {
      return json(response, 200, { status: 'ok', service: 'henry-turaso-law-council-api' })
    }

    if (request.method === 'POST' && request.url === '/api/v1/consultations') {
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

      const consultations = readConsultations()
      consultations.unshift(consultation)
      writeConsultations(consultations)
      return json(response, 201, { reference: consultation.reference, status: consultation.status })
    }

    const consultationStatusRoute = request.url.match(/^\/api\/v1\/admin\/consultations\/([^/]+)\/status$/)
    if (request.method === 'POST' && consultationStatusRoute) {
      const session = getSessionUser(request)
      if (!session || session.role !== 'ADMIN') return json(response, 403, { message: 'Administrator access required.' })
      const reference = decodeURIComponent(consultationStatusRoute[1])
      const { status } = await readBody(request)
      if (!['PENDING', 'CONTACTED', 'CONFIRMED', 'DECLINED'].includes(status)) {
        return json(response, 400, { message: 'Choose a valid consultation status.' })
      }
      const consultations = readConsultations()
      const consultation = consultations.find((item) => item.reference === reference)
      if (!consultation) return json(response, 404, { message: 'Consultation request not found.' })
      consultation.status = status
      consultation.updatedAt = new Date().toISOString()
      writeConsultations(consultations)
      return json(response, 200, { consultation })
    }

    if (request.method === 'POST' && request.url === '/api/v1/admin/cases') {
      const session = getSessionUser(request)
      if (!session || session.role !== 'ADMIN') return json(response, 403, { message: 'Administrator access required.' })
      const body = await readBody(request)
      const title = String(body.title || '').trim()
      const caseType = String(body.caseType || '').trim()
      const court = String(body.court || '').trim()
      const clientEmail = String(body.clientEmail || '').trim().toLowerCase()
      const description = String(body.description || '').trim()
      if (!title || !caseType || !court) return json(response, 400, { message: 'Case title, practice area, and court are required.' })
      if ([title, caseType, court, description].some((value) => value.length > 2000)) return json(response, 400, { message: 'A case field exceeds the allowed length.' })
      if (clientEmail && !readUsers().some((user) => user.role === 'CLIENT' && user.email.toLowerCase() === clientEmail)) {
        return json(response, 400, { message: 'No registered client matches that email.' })
      }
      const cases = readCases()
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
      writeCases(cases)
      return json(response, 201, { case: caseRecord })
    }

    const caseHearingsRoute = request.url.match(/^\/api\/v1\/admin\/cases\/([^/]+)\/hearings$/)
    if (request.method === 'POST' && caseHearingsRoute) {
      const session = getSessionUser(request)
      if (!session || session.role !== 'ADMIN') return json(response, 403, { message: 'Administrator access required.' })
      const caseId = decodeURIComponent(caseHearingsRoute[1])
      const body = await readBody(request)
      const purpose = String(body.purpose || '').trim()
      const hearingDate = new Date(String(body.hearingDate || ''))
      if (!purpose || purpose.length > 120 || Number.isNaN(hearingDate.getTime()) || hearingDate < new Date()) {
        return json(response, 400, { message: 'Enter a valid future hearing date and purpose.' })
      }
      const cases = readCases()
      const caseRecord = cases.find((item) => item.id === caseId)
      if (!caseRecord) return json(response, 404, { message: 'Case not found.' })
      caseRecord.hearings = Array.isArray(caseRecord.hearings) ? caseRecord.hearings : []
      const hearing = { id: randomBytes(8).toString('hex'), hearingDate: hearingDate.toISOString(), purpose, status: 'SCHEDULED' }
      caseRecord.hearings.push(hearing)
      caseRecord.hearings.sort((left, right) => left.hearingDate.localeCompare(right.hearingDate))
      writeCases(cases)
      return json(response, 201, { hearing })
    }

    const caseDocumentsRoute = request.url.match(/^\/api\/v1\/admin\/cases\/([^/]+)\/documents$/)
    if (request.method === 'POST' && caseDocumentsRoute) {
      const session = getSessionUser(request)
      if (!session || session.role !== 'ADMIN') return json(response, 403, { message: 'Administrator access required.' })
      const caseId = decodeURIComponent(caseDocumentsRoute[1])
      const body = await readBody(request, 7 * 1024 * 1024)
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
      if (!fileBytes.length || fileBytes.length > 5 * 1024 * 1024) {
        return json(response, 413, { message: 'Documents must be smaller than 5 MB.' })
      }
      const cases = readCases()
      const caseRecord = cases.find((item) => item.id === caseId)
      if (!caseRecord) return json(response, 404, { message: 'Case not found.' })
      mkdirSync(documentsDir, { recursive: true })
      const id = randomBytes(12).toString('hex')
      const storageName = `${id}${allowedTypes[mimeType]}`
      writeFileSync(join(documentsDir, storageName), fileBytes)
      const document = { id, title, fileName, mimeType, storageName, createdAt: new Date().toISOString() }
      caseRecord.documents = Array.isArray(caseRecord.documents) ? caseRecord.documents : []
      caseRecord.documents.unshift(document)
      writeCases(cases)
      return json(response, 201, { document: { id, title, fileName, mimeType, createdAt: document.createdAt } })
    }

    const documentDownloadRoute = request.url.match(/^\/api\/v1\/admin\/documents\/([^/]+)$/)
    if (request.method === 'GET' && documentDownloadRoute) {
      const session = getSessionUser(request)
      if (!session || session.role !== 'ADMIN') return json(response, 403, { message: 'Administrator access required.' })
      const documentId = decodeURIComponent(documentDownloadRoute[1])
      const document = readCases().flatMap((item) => item.documents || []).find((item) => item.id === documentId)
      if (!document) return json(response, 404, { message: 'Document not found.' })
      const fileBytes = readFileSync(join(documentsDir, document.storageName))
      const downloadName = document.fileName.replace(/[\r\n\"]+/g, '_')
      response.writeHead(200, {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Content-Length': fileBytes.length,
        'Access-Control-Allow-Origin': '*'
      })
      return response.end(fileBytes)
    }

    const caseNotesRoute = request.url.match(/^\/api\/v1\/admin\/cases\/([^/]+)\/notes$/)
    if (request.method === 'POST' && caseNotesRoute) {
      const session = getSessionUser(request)
      if (!session || session.role !== 'ADMIN') return json(response, 403, { message: 'Administrator access required.' })
      const caseId = decodeURIComponent(caseNotesRoute[1])
      const body = String((await readBody(request)).body || '').trim()
      if (!body || body.length > 2000) return json(response, 400, { message: 'Enter a case note of up to 2,000 characters.' })
      const cases = readCases()
      const caseRecord = cases.find((item) => item.id === caseId)
      if (!caseRecord) return json(response, 404, { message: 'Case not found.' })
      caseRecord.notes = Array.isArray(caseRecord.notes) ? caseRecord.notes : []
      const note = { id: randomBytes(8).toString('hex'), body, createdAt: new Date().toISOString() }
      caseRecord.notes.unshift(note)
      writeCases(cases)
      return json(response, 201, { note })
    }

    if (request.method === 'POST' && request.url === '/api/v1/client/signup') {
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

      const users = readUsers()
      if (users.some((user) => user.email.toLowerCase() === email)) {
        return json(response, 409, { message: 'An account already exists for this email address.' })
      }

      const newClient = createClientRecord({ firstName, lastName, email, phone, password })
      users.push(newClient)
      writeUsers(users)

      return json(response, 201, {
        accessToken: makeToken(newClient.id, 'CLIENT'),
        user: serializeClient(newClient)
      })
    }

    if (request.method === 'POST' && request.url === '/api/v1/auth/login') {
      const body = await readBody(request)
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const user = findUserByEmail(email)

      if (!user || !verifyPassword(password, user)) {
        return json(response, 401, { message: 'Invalid email or password.' })
      }

      return json(response, 200, {
        accessToken: makeToken(user.id, user.role),
        user: sanitizeClient(user)
      })
    }

    if (request.method === 'POST' && request.url === '/api/v1/admin/login') {
      const body = await readBody(request)
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const user = findUserByEmail(email)

      if (!user || user.role !== 'ADMIN' || !verifyPassword(password, user)) {
        return json(response, 401, { message: 'Invalid admin email or password.' })
      }

      return json(response, 200, {
        accessToken: makeToken(user.id, 'ADMIN'),
        user: sanitizeClient(user)
      })
    }

    if (request.method === 'POST' && request.url === '/api/v1/auth/logout') {
      const token = (request.headers.authorization || '').startsWith('Bearer ')
        ? (request.headers.authorization || '').slice(7)
        : ''
      if (token) sessions.delete(token)
      return json(response, 200, { message: 'Signed out.' })
    }

    if (request.method === 'GET' && request.url === '/api/v1/client/dashboard') {
      const session = getSessionUser(request)
      if (!session || session.role !== 'CLIENT') {
        return json(response, 401, { message: 'Authentication required.' })
      }

      const client = readUsers().find((user) => user.id === session.id && user.role === 'CLIENT')
      if (!client) {
        return json(response, 404, { message: 'Client not found.' })
      }

      return json(response, 200, toClientDashboard(client))
    }

    if (request.method === 'GET' && request.url === '/api/v1/admin/dashboard') {
      const session = getSessionUser(request)
      if (!session || session.role !== 'ADMIN') {
        return json(response, 403, { message: 'Administrator access required.' })
      }

      const users = readUsers()
      const clients = users.filter((user) => user.role === 'CLIENT').map((user) => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        status: 'ACTIVE'
      }))
      const cases = readCases()
      const consultations = readConsultations()
      const totalDocuments = cases.reduce((total, item) => total + (item.documents || []).length, 0)

      const adminUser = users.find((user) => user.id === session.id)

      return json(response, 200, {
        admin: adminUser ? sanitizeClient(adminUser) : null,
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
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Law Council API listening on http://127.0.0.1:${port}`)
})
