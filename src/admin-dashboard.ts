export type AdminCase = {
  id: string
  caseNumber: string
  title: string
  caseType: string
  court: string
  status: string
  description?: string
  clientEmail?: string
  hearings: Array<{ hearingDate: string; purpose?: string; status: string }>
  notes: Array<{ id: string; body: string; createdAt: string }>
  documents: Array<{ id: string; title: string; fileName: string; mimeType?: string; createdAt: string }>
}

export type AdminDashboardData = {
  admin?: { firstName?: string; lastName?: string; email?: string }
  stats: { activeCases: number; upcomingHearings: number; totalClients: number; totalDocuments: number }
  cases: AdminCase[]
  clients: Array<{ name: string; email: string; status: string }>
  consultations: Array<{ reference: string; name: string; email: string; phone: string; practiceArea: string; preferredDate: string; preferredTime: string; message: string; status: string; createdAt: string }>
}

type AdminView = 'overview' | 'cases' | 'clients' | 'hearings' | 'documents' | 'messages' | 'consultations' | 'analytics' | 'settings' | 'case-detail'

const labels: Record<AdminView, string> = {
  overview: 'Overview', cases: 'Cases', clients: 'Clients', hearings: 'Hearings', documents: 'Documents',
  messages: 'Messages', consultations: 'Consultations', analytics: 'Analytics', settings: 'Settings', 'case-detail': 'Case details'
}

const escapeHTML = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character)
const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
const dateLabel = (value: string, includeTime = false) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date not set' : date.toLocaleString([], includeTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' })
}

export const createAdminWorkspace = (root: HTMLElement, options: { apiBase: string; tokenKey: string }) => {
  let data: AdminDashboardData | null = null
  let view: AdminView = 'overview'
  let selectedCaseId = ''
  const reportsButton = root.querySelector<HTMLButtonElement>('[data-admin-nav="reports"]')
  if (reportsButton) {
    reportsButton.dataset.adminNav = 'analytics'
    reportsButton.textContent = 'Analytics'
  }

  const authorizedRequest = async (path: string, body?: unknown) => {
    const token = localStorage.getItem(options.tokenKey)
    const response = await fetch(`${options.apiBase}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || 'The request could not be completed.')
    return result
  }

  const downloadDocument = async (id: string, fileName: string) => {
    const token = localStorage.getItem(options.tokenKey)
    const response = await fetch(`${options.apiBase}/admin/documents/${encodeURIComponent(id)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!response.ok) throw new Error('Unable to download this document.')
    const contentType = response.headers.get('content-type') || ''
    const target = contentType.includes('application/json') ? (await response.json() as { url: string }).url : URL.createObjectURL(await response.blob())
    const link = document.createElement('a')
    link.href = target
    link.download = fileName
    if (contentType.includes('application/json')) link.target = '_blank'
    link.click()
    if (target.startsWith('blob:')) URL.revokeObjectURL(target)
  }

  const fileAsBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(new Error('Unable to read the selected file.'))
    reader.readAsDataURL(file)
  })

  const refresh = async () => {
    data = await authorizedRequest('/admin/dashboard') as AdminDashboardData
    render()
  }

  const caseRow = (item: AdminCase) => `
    <button class="admin-case-row" type="button" data-open-case="${escapeHTML(item.id)}">
      <span class="admin-case-number">${escapeHTML(item.caseNumber)}</span>
      <span class="admin-case-main"><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.caseType)} · ${escapeHTML(item.court)}</small></span>
      <span class="admin-status-pill">${escapeHTML(item.status)}</span>
    </button>
  `

  const consultationRow = (item: AdminDashboardData['consultations'][number], compact = false) => `
    <article class="admin-consultation-row">
      <div class="admin-consultation-head"><span>${escapeHTML(item.reference)}</span><select aria-label="Update consultation status" data-consultation-status="${escapeHTML(item.reference)}">${['PENDING', 'CONTACTED', 'CONFIRMED', 'DECLINED'].map((status) => `<option ${item.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></div>
      <strong>${escapeHTML(item.name)} · ${escapeHTML(item.practiceArea)}</strong>
      <p>${escapeHTML(item.preferredDate)} at ${escapeHTML(item.preferredTime)} · ${escapeHTML(item.phone)} · ${escapeHTML(item.email)}</p>
      ${!compact && item.message ? `<p class="admin-message-copy">${escapeHTML(item.message)}</p>` : ''}
    </article>
  `

  const countBy = <T,>(items: T[], getLabel: (item: T) => string) => {
    const totals = items.reduce<Record<string, number>>((result, item) => {
      const label = getLabel(item).trim() || 'Unspecified'
      result[label] = (result[label] || 0) + 1
      return result
    }, {})
    return Object.entries(totals).sort((left, right) => right[1] - left[1])
  }

  const barChart = (title: string, description: string, rows: Array<[string, number]>) => {
    const maximum = Math.max(1, ...rows.map(([, total]) => total))
    return `<section class="admin-panel admin-chart"><span class="eyebrow">${escapeHTML(description)}</span><h2>${escapeHTML(title)}</h2>${rows.length ? rows.map(([label, total]) => `<div class="admin-chart-row"><div class="admin-chart-label"><span>${escapeHTML(label)}</span><strong>${total}</strong></div><div class="admin-chart-track"><span style="width:${Math.max(4, Math.round((total / maximum) * 100))}%"></span></div></div>`).join('') : '<p class="admin-empty">No data available yet.</p>'}</section>`
  }

  const renderOverview = () => {
    if (!data) return ''
    const hearings = data.cases.flatMap((item) => item.hearings.map((hearing) => ({ ...hearing, caseTitle: item.title }))).sort((left, right) => left.hearingDate.localeCompare(right.hearingDate))
    const greeting = data.admin?.firstName ? `Good morning,<br><em>${escapeHTML(data.admin.firstName)}.</em>` : 'Council<br><em>overview.</em>'
    const caseStatuses = countBy(data.cases, (item) => item.status)
    const consultationStatuses = countBy(data.consultations, (item) => item.status)
    return `
      <div class="admin-view-heading"><div><span class="eyebrow">Council overview</span><h1>${greeting}</h1><p>Your matters and client activity at a glance.</p></div><button class="admin-primary-action" type="button" data-admin-view="cases" data-show-case-form>+ New case</button></div>
      <div class="admin-stats">
        <article class="admin-stat"><span>Active cases</span><b>${data.stats.activeCases}</b><small>Currently in progress</small></article>
        <article class="admin-stat"><span>Upcoming hearings</span><b>${data.stats.upcomingHearings}</b><small>Scheduled across matters</small></article>
        <article class="admin-stat"><span>Clients</span><b>${data.stats.totalClients}</b><small>Registered accounts</small></article>
        <article class="admin-stat"><span>Documents</span><b>${data.stats.totalDocuments}</b><small>Attached to cases</small></article>
      </div>
      <div class="admin-dashboard-grid admin-analytics-preview">${barChart('Cases by status', 'MATTER DISTRIBUTION', caseStatuses)}${barChart('Consultations by status', 'CLIENT REQUESTS', consultationStatuses)}</div>
      <div class="admin-analytics-link"><span>Want a broader picture?</span><button class="admin-link-button" type="button" data-admin-view="analytics">View analytics →</button></div>
      <div class="admin-dashboard-grid">
        <section class="admin-panel"><div class="admin-panel-heading"><div><span class="eyebrow">Matter tracking</span><h2>Recent cases</h2></div><button class="admin-link-button" type="button" data-admin-view="cases">All cases →</button></div>${data.cases.length ? data.cases.slice(0, 5).map(caseRow).join('') : '<p class="admin-empty">No cases have been created.</p>'}</section>
        <section class="admin-panel"><div class="admin-panel-heading"><div><span class="eyebrow">Client requests</span><h2>Consultations</h2></div><button class="admin-link-button" type="button" data-admin-view="consultations">All requests →</button></div>${data.consultations.length ? data.consultations.slice(0, 4).map((item) => consultationRow(item, true)).join('') : '<p class="admin-empty">No consultation requests yet.</p>'}</section>
        <section class="admin-panel"><div class="admin-panel-heading"><div><span class="eyebrow">Court schedule</span><h2>Upcoming hearings</h2></div><button class="admin-link-button" type="button" data-admin-view="hearings">View schedule →</button></div>${hearings.length ? hearings.slice(0, 4).map((item) => `<div class="admin-hearing-row"><time>${escapeHTML(dateLabel(item.hearingDate))}</time><div><strong>${escapeHTML(item.caseTitle)}</strong><small>${escapeHTML(item.purpose || 'Hearing')} · ${escapeHTML(item.status)}</small></div></div>`).join('') : '<p class="admin-empty">No hearings are scheduled.</p>'}</section>
        <section class="admin-panel"><div class="admin-panel-heading"><div><span class="eyebrow">People</span><h2>Recent clients</h2></div><button class="admin-link-button" type="button" data-admin-view="clients">All clients →</button></div>${data.clients.length ? data.clients.slice(0, 5).map((client) => `<div class="admin-client-row"><span class="admin-avatar">${escapeHTML(initials(client.name))}</span><div><strong>${escapeHTML(client.name)}</strong><small>${escapeHTML(client.email)}</small></div><span class="admin-status-pill">${escapeHTML(client.status)}</span></div>`).join('') : '<p class="admin-empty">No client accounts have been registered.</p>'}</section>
      </div>
    `
  }

  const renderCases = () => `
    <div class="admin-view-heading"><div><span class="eyebrow">Matter management</span><h1>Cases</h1><p>Track active matters, hearing dates and case notes.</p></div><button class="admin-primary-action" type="button" data-toggle-case-form>+ New case</button></div>
    <form class="admin-create-case" id="admin-create-case-form" hidden><h2>Create case</h2><div class="admin-form-grid"><label>Case title<input name="title" required maxlength="160"></label><label>Practice area<input name="caseType" required maxlength="100"></label><label>Court<input name="court" required maxlength="160"></label><label>Client email (optional)<input name="clientEmail" type="email"></label></div><label>Case summary<textarea name="description" rows="3" maxlength="2000"></textarea></label><button class="admin-primary-action" type="submit">Save case</button><p class="admin-inline-note" role="status"></p></form>
    <section class="admin-panel"><div class="admin-toolbar"><input id="admin-case-search" type="search" placeholder="Search case number, title, or court"><span>${data?.cases.length || 0} cases</span></div><div id="admin-cases-list">${data?.cases.length ? data.cases.map(caseRow).join('') : '<p class="admin-empty">No cases have been created.</p>'}</div></section>
  `

  const renderCaseDetail = () => {
    const item = data?.cases.find((record) => record.id === selectedCaseId)
    if (!item || !data) return renderCases()
    const client = data.clients.find((record) => record.email.toLowerCase() === (item.clientEmail || '').toLowerCase())
    return `
      <div class="admin-view-heading"><div><button class="admin-back-button" type="button" data-admin-view="cases">← Cases</button><span class="eyebrow">${escapeHTML(item.caseNumber)}</span><h1>${escapeHTML(item.title)}</h1><p>${escapeHTML(item.caseType)} · ${escapeHTML(item.status)}</p></div><span class="admin-status-pill">${escapeHTML(item.status)}</span></div>
      <div class="admin-case-detail-grid">
        <section class="admin-panel">
          <span class="eyebrow">Matter summary</span><h2>Case details</h2>
          <dl class="admin-detail-list"><div><dt>Court</dt><dd>${escapeHTML(item.court)}</dd></div><div><dt>Client</dt><dd>${client ? `${escapeHTML(client.name)} · ${escapeHTML(client.email)}` : escapeHTML(item.clientEmail || 'Not assigned')}</dd></div><div><dt>Next hearing</dt><dd>${item.hearings[0] ? escapeHTML(dateLabel(item.hearings[0].hearingDate, true)) : 'Not scheduled'}</dd></div><div><dt>Description</dt><dd>${escapeHTML(item.description || 'No case summary added.')}</dd></div></dl>
          <div class="admin-timeline"><h3>Case timeline</h3>${item.hearings.length ? item.hearings.map((hearing) => `<div class="admin-timeline-item"><time>${escapeHTML(dateLabel(hearing.hearingDate))}</time><span>${escapeHTML(hearing.purpose || 'Hearing')} · ${escapeHTML(hearing.status)}</span></div>`).join('') : '<p class="admin-empty">No timeline events have been recorded.</p>'}</div>
          <form class="admin-note-form" id="admin-case-hearing-form"><label>Add hearing date and time<input name="hearingDate" type="datetime-local" required></label><label>Purpose<input name="purpose" required maxlength="120" placeholder="Mention, hearing, ruling"></label><button class="admin-primary-action" type="submit">Schedule hearing</button><p class="admin-inline-note" role="status"></p></form>
        </section>
        <section class="admin-panel"><span class="eyebrow">Matter activity</span><h2>Recent documents</h2>${item.documents.length ? item.documents.map((document) => `<div class="admin-document-row"><div><strong>${escapeHTML(document.title)}</strong><small>${escapeHTML(document.fileName)}</small></div><button class="admin-link-button" type="button" data-download-document="${escapeHTML(document.id)}" data-file-name="${escapeHTML(document.fileName)}">Download</button></div>`).join('') : '<p class="admin-empty">No documents attached to this case.</p>'}<form class="admin-note-form" id="admin-case-document-form"><label>Upload a case document<input name="documentFile" type="file" accept=".pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png" required></label><label>Document title<input name="title" required maxlength="160" placeholder="Document title"></label><button class="admin-primary-action" type="submit">Upload document</button><p class="admin-inline-note" role="status"></p></form><h2 class="admin-subheading">Case notes</h2>${item.notes.length ? item.notes.map((note) => `<article class="admin-note"><p>${escapeHTML(note.body)}</p><small>${escapeHTML(dateLabel(note.createdAt, true))}</small></article>`).join('') : '<p class="admin-empty">No notes recorded.</p>'}<form class="admin-note-form" id="admin-case-note-form"><label>Add case note<textarea name="body" required rows="3" maxlength="2000" placeholder="Record an internal case update"></textarea></label><button class="admin-primary-action" type="submit">Add note</button><p class="admin-inline-note" role="status"></p></form></section>
      </div>
    `
  }

  const render = () => {
    if (!data) return
    root.querySelectorAll<HTMLButtonElement>('[data-admin-nav]').forEach((button) => button.classList.toggle('is-active', button.dataset.adminNav === (view === 'case-detail' ? 'cases' : view)))
    const label = root.querySelector<HTMLElement>('#admin-view-label')
    const content = root.querySelector<HTMLElement>('#admin-view-content')
    if (label) label.textContent = labels[view]
    if (!content) return
    const hearings = data.cases.flatMap((item) => item.hearings.map((hearing) => ({ ...hearing, caseId: item.id, caseNumber: item.caseNumber, caseTitle: item.title }))).sort((left, right) => left.hearingDate.localeCompare(right.hearingDate))
    const documents = data.cases.flatMap((item) => item.documents.map((document) => ({ ...document, caseNumber: item.caseNumber, caseTitle: item.title })))
    const messages = data.consultations.filter((item) => item.message.trim())
    if (view === 'overview') content.innerHTML = renderOverview()
    else if (view === 'cases') content.innerHTML = renderCases()
    else if (view === 'case-detail') content.innerHTML = renderCaseDetail()
    else if (view === 'clients') content.innerHTML = `<div class="admin-view-heading"><div><span class="eyebrow">Client directory</span><h1>Clients</h1><p>Registered client accounts and their contact details.</p></div></div><section class="admin-panel"><div class="admin-toolbar"><input id="admin-client-search" type="search" placeholder="Search clients or email"><span>${data.clients.length} clients</span></div><div id="admin-clients-list">${data.clients.length ? data.clients.map((client) => `<article class="admin-directory-row"><span class="admin-avatar">${escapeHTML(initials(client.name))}</span><div><strong>${escapeHTML(client.name)}</strong><small>${escapeHTML(client.email)}</small></div><span class="admin-status-pill">${escapeHTML(client.status)}</span></article>`).join('') : '<p class="admin-empty">No registered clients yet.</p>'}</div></section>`
    else if (view === 'hearings') content.innerHTML = `<div class="admin-view-heading"><div><span class="eyebrow">Court calendar</span><h1>Hearings</h1><p>Scheduled hearings linked to active matters.</p></div></div><section class="admin-panel">${hearings.length ? hearings.map((hearing) => `<div class="admin-hearing-row"><time>${escapeHTML(dateLabel(hearing.hearingDate, true))}</time><div><strong>${escapeHTML(hearing.caseTitle)}</strong><small>${escapeHTML(hearing.caseNumber)} · ${escapeHTML(hearing.purpose || 'Hearing')} · ${escapeHTML(hearing.status)}</small></div><button class="admin-link-button" type="button" data-open-case="${escapeHTML(hearing.caseId)}">Open case →</button></div>`).join('') : '<p class="admin-empty">No hearings are scheduled.</p>'}</section>`
    else if (view === 'documents') content.innerHTML = `<div class="admin-view-heading"><div><span class="eyebrow">Matter records</span><h1>Documents</h1><p>Download files attached to council cases.</p></div></div><section class="admin-panel">${documents.length ? documents.map((document) => `<div class="admin-document-row"><div><strong>${escapeHTML(document.title)}</strong><small>${escapeHTML(document.caseNumber)} · ${escapeHTML(document.caseTitle)} · ${escapeHTML(document.fileName)}</small></div><button class="admin-link-button" type="button" data-download-document="${escapeHTML(document.id)}" data-file-name="${escapeHTML(document.fileName)}">Download</button></div>`).join('') : '<p class="admin-empty">No documents are attached to cases yet. Upload a file from a case detail view.</p>'}</section>`
    else if (view === 'messages') content.innerHTML = `<div class="admin-view-heading"><div><span class="eyebrow">Client correspondence</span><h1>Messages</h1><p>Messages included with consultation requests.</p></div></div><section class="admin-panel">${messages.length ? messages.map((item) => `<article class="admin-message-row"><div><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.email)} · ${escapeHTML(item.reference)} · ${escapeHTML(item.status)}</small></div><p>${escapeHTML(item.message)}</p></article>`).join('') : '<p class="admin-empty">No client messages have been received.</p>'}</section>`
    else if (view === 'consultations') content.innerHTML = `<div class="admin-view-heading"><div><span class="eyebrow">Appointment requests</span><h1>Consultations</h1><p>Review preferred slots and update each request. Appointments remain unconfirmed until the council contacts the client.</p></div></div><section class="admin-panel">${data.consultations.length ? data.consultations.map((item) => consultationRow(item)).join('') : '<p class="admin-empty">No consultation requests yet.</p>'}</section>`
    else if (view === 'analytics') content.innerHTML = `<div class="admin-view-heading"><div><span class="eyebrow">Workspace performance</span><h1>Analytics</h1><p>Live breakdowns calculated from cases, hearings, clients, documents, and consultation requests.</p></div></div><div class="admin-stats"><article class="admin-stat"><span>Total cases</span><b>${data.cases.length}</b><small>All recorded matters</small></article><article class="admin-stat"><span>Active cases</span><b>${data.stats.activeCases}</b><small>Currently in progress</small></article><article class="admin-stat"><span>Registered clients</span><b>${data.clients.length}</b><small>Client accounts</small></article><article class="admin-stat"><span>Pending consultations</span><b>${data.consultations.filter((item) => item.status === 'PENDING').length}</b><small>Awaiting review</small></article><article class="admin-stat"><span>Upcoming hearings</span><b>${data.stats.upcomingHearings}</b><small>Scheduled events</small></article><article class="admin-stat"><span>Case documents</span><b>${data.stats.totalDocuments}</b><small>Uploaded files</small></article></div><div class="admin-dashboard-grid admin-analytics-grid">${barChart('Cases by status', 'MATTER DISTRIBUTION', countBy(data.cases, (item) => item.status))}${barChart('Cases by practice area', 'PRACTICE MIX', countBy(data.cases, (item) => item.caseType))}${barChart('Consultations by status', 'REQUEST PIPELINE', countBy(data.consultations, (item) => item.status))}${barChart('Hearings by purpose', 'COURT CALENDAR', countBy(data.cases.flatMap((item) => item.hearings), (item) => item.purpose || 'Hearing'))}</div>`
    else content.innerHTML = `<div class="admin-view-heading"><div><span class="eyebrow">Workspace profile</span><h1>Settings</h1><p>Office information used across the public site.</p></div></div><section class="admin-panel admin-settings-grid"><div><span class="eyebrow">Practice</span><strong>Henry E Turaso Law Council</strong><small>Legal services and representation</small></div><div><span class="eyebrow">Chamber</span><strong>Besite Malamre Clinic</strong><small>Jimeta, Yola, Adamawa State, Nigeria</small></div><div><span class="eyebrow">Contact</span><strong>emmanuelturaso@gmail.com</strong><small>Appointments by arrangement</small></div></section>`
  }

  const setView = (nextView: AdminView) => {
    view = nextView
    if (nextView !== 'case-detail') selectedCaseId = ''
    render()
  }

  root.addEventListener('click', async (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const navButton = target.closest<HTMLButtonElement>('[data-admin-nav]')
    if (navButton) {
      setView(navButton.dataset.adminNav as AdminView)
      return
    }
    const viewButton = target.closest<HTMLButtonElement>('[data-admin-view]')
    if (viewButton) {
      setView(viewButton.dataset.adminView as AdminView)
      if (viewButton.hasAttribute('data-show-case-form')) root.querySelector<HTMLFormElement>('#admin-create-case-form')?.removeAttribute('hidden')
      return
    }
    const caseButton = target.closest<HTMLButtonElement>('[data-open-case]')
    if (caseButton) {
      selectedCaseId = caseButton.dataset.openCase || ''
      view = 'case-detail'
      render()
      return
    }
    const documentButton = target.closest<HTMLButtonElement>('[data-download-document]')
    if (documentButton) {
      try { await downloadDocument(documentButton.dataset.downloadDocument || '', documentButton.dataset.fileName || 'case-document') }
      catch (error) { window.alert(error instanceof Error ? error.message : 'Unable to download this document.') }
      return
    }
    if (target.closest('[data-toggle-case-form]')) root.querySelector<HTMLFormElement>('#admin-create-case-form')?.toggleAttribute('hidden')
  })

  root.addEventListener('input', (event) => {
    const input = event.target
    if (!(input instanceof HTMLInputElement)) return
    if (input.id === 'admin-case-search' && data) {
      const query = input.value.trim().toLowerCase()
      const list = root.querySelector<HTMLDivElement>('#admin-cases-list')
      if (list) list.innerHTML = data.cases.filter((item) => `${item.caseNumber} ${item.title} ${item.court}`.toLowerCase().includes(query)).map(caseRow).join('') || '<p class="admin-empty">No matching cases.</p>'
    }
    if (input.id === 'admin-client-search' && data) {
      const query = input.value.trim().toLowerCase()
      const list = root.querySelector<HTMLDivElement>('#admin-clients-list')
      if (list) list.innerHTML = data.clients.filter((item) => `${item.name} ${item.email}`.toLowerCase().includes(query)).map((client) => `<article class="admin-directory-row"><span class="admin-avatar">${escapeHTML(initials(client.name))}</span><div><strong>${escapeHTML(client.name)}</strong><small>${escapeHTML(client.email)}</small></div><span class="admin-status-pill">${escapeHTML(client.status)}</span></article>`).join('') || '<p class="admin-empty">No matching clients.</p>'
    }
  })

  root.addEventListener('change', async (event) => {
    const select = event.target
    if (!(select instanceof HTMLSelectElement) || !select.dataset.consultationStatus) return
    try {
      await authorizedRequest(`/admin/consultations/${encodeURIComponent(select.dataset.consultationStatus)}/status`, { status: select.value })
      await refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to update request status.')
    }
  })

  root.addEventListener('submit', async (event) => {
    const form = event.target
    if (!(form instanceof HTMLFormElement) || !['admin-create-case-form', 'admin-case-note-form', 'admin-case-hearing-form', 'admin-case-document-form'].includes(form.id)) return
    event.preventDefault()
    const note = form.querySelector<HTMLParagraphElement>('.admin-inline-note')
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')
    if (submit) submit.disabled = true
    if (note) note.textContent = 'Saving...'
    try {
      let path = '/admin/cases'
      let body: unknown = Object.fromEntries(new FormData(form).entries())
      if (form.id === 'admin-case-note-form') path = `/admin/cases/${encodeURIComponent(selectedCaseId)}/notes`
      if (form.id === 'admin-case-hearing-form') path = `/admin/cases/${encodeURIComponent(selectedCaseId)}/hearings`
      if (form.id === 'admin-case-document-form') {
        const fileInput = form.elements.namedItem('documentFile') as HTMLInputElement
        const file = fileInput.files?.[0]
        if (!file) throw new Error('Select a document first.')
        path = `/admin/cases/${encodeURIComponent(selectedCaseId)}/documents`
        body = { title: (form.elements.namedItem('title') as HTMLInputElement).value, fileName: file.name, mimeType: file.type, fileData: await fileAsBase64(file) }
      }
      await authorizedRequest(path, body)
      await refresh()
      if (form.id === 'admin-create-case-form') view = 'cases'
      render()
    } catch (error) {
      if (note) note.textContent = error instanceof Error ? error.message : 'Unable to save changes.'
      if (submit) submit.disabled = false
    }
  })

  return {
    render(nextData: AdminDashboardData) {
      data = nextData
      render()
    },
    reset() {
      view = 'overview'
      selectedCaseId = ''
      data = null
    }
  }
}
