import './style.css'
import { createAdminWorkspace, type AdminDashboardData } from './admin-dashboard'

type PublicPage = 'home' | 'about' | 'chamber' | 'services' | 'insights' | 'contact'
type Page = PublicPage | 'portal' | 'admin'
const page = (document.body.dataset.page || 'home') as Page
const apiBase = 'http://127.0.0.1:4000/api/v1'
const links = { about: 'about.html', services: 'practice-areas.html', chamber: 'chamber.html', insights: 'insights.html', contact: 'contact.html', portal: 'client-portal.html' }
const services = [
  ['01', 'Litigation', 'Civil and criminal disputes, court representation, and strategic advocacy.'],
  ['02', 'Corporate Law', 'Practical legal guidance for contracts, business operations, and governance.'],
  ['03', 'Family Law', 'Sensitive support for divorce, custody, matrimonial and domestic concerns.'],
  ['04', 'Property Law', 'Clear advice on ownership, transactions, title recording and property disputes.'],
  ['05', 'Legal Documentation', 'Preparation and review of legal agreements, deeds and documentation.'],
  ['06', 'Legal Advisory', 'Confidential counsel tailored to individuals, founders and organizations.']
]
const insights = [
  ['01', 'Understanding your legal rights', 'A clear starting point for making informed decisions.', 'https://nigerialii.org/legislation/', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=85', 'A justice scale and law books representing legal rights'],
  ['02', 'The importance of legal documentation', 'Why precise agreements protect relationships and value.', 'https://nigerialii.org/doc/documents-and-guidelines', 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=85', 'A person reviewing and signing legal documents'],
  ['03', 'What to expect during a court hearing', 'A practical guide to preparing for the next step.', 'https://supremecourt.gov.ng/daily-causelist', 'https://images.unsplash.com/photo-1589216532372-1c2a367900d9?auto=format&fit=crop&w=1200&q=85', 'A courthouse setting representing a court hearing']
]
const serviceCards = services.map(([number, title, description]) => `<article class="service-card"><span class="card-number">${number}</span><h3>${title}</h3><p>${description}</p><a href="${links.contact}">Learn more <span>→</span></a></article>`).join('')
const insightCards = insights.map(([number, title, description, source, image, imageAlt]) => `<article class="insight-card"><div class="insight-art"><img src="${image}" alt="${imageAlt}" loading="lazy" decoding="async" width="1200" height="800"></div><div><span class="eyebrow">Legal insight ${number}</span><h3><a href="${source}" target="_blank" rel="noopener noreferrer">${title} <span class="external-mark">↗</span></a></h3><p>${description}</p><a href="${links.contact}" class="inline-link">Discuss this topic <span>→</span></a></div></article>`).join('')

const header = `<header class="site-header"><a class="brand" href="index.html" aria-label="Henry E Turaso Law Council home"><span class="brand-mark">§</span><span class="brand-text"><strong>Henry E Turaso</strong><small>Law Council</small></span></a><button class="menu-toggle" aria-label="Open navigation" aria-expanded="false">☰</button><nav class="site-nav" aria-label="Primary navigation"><a href="index.html">Home</a><a href="${links.about}">About</a><a href="${links.services}">Practice Areas</a><a href="${links.chamber}">The Chamber</a><a href="${links.insights}">Insights</a><a href="${links.contact}#contact-info">Get in Touch</a><a href="${links.portal}">Client Portal</a><a class="nav-consult" href="${links.contact}#consultation">Book Consultation</a></nav></header>`
const footer = `<footer class="site-footer section-shell"><a class="brand" href="index.html"><span class="brand-mark">§</span><span class="brand-text"><strong>Henry E Turaso</strong><small>Law Council</small></span></a><p>Professional legal services.<br>Thoughtfully delivered.</p><span class="copyright">© ${new Date().getFullYear()} Henry E Turaso Law Council</span></footer>`
const trustBand = `<section class="trust-band"><div class="section-shell trust-grid"><div class="trust-intro"><span class="eyebrow">The standard we keep</span><h2>Good counsel is <em>personal.</em></h2></div><div class="trust-point"><strong>01</strong><h3>Confidential by nature</h3><p>Your information is handled with discretion, care and respect.</p></div><div class="trust-point"><strong>02</strong><h3>Clear by design</h3><p>We communicate in plain language, so you can decide with confidence.</p></div><div class="trust-point"><strong>03</strong><h3>Steady in practice</h3><p>Thoughtful preparation and disciplined advocacy from first call to resolution.</p></div></div></section>`
const newsSection = `<section class="news-feed section-shell" id="nigeria-news"><div class="section-heading"><div><div class="section-label">05 <span>From Nigeria</span></div><h2>News <em>briefing.</em></h2></div><a class="text-link" href="https://news.google.com/search?q=Nigeria&hl=en-NG&gl=NG&ceid=NG%3Aen" target="_blank" rel="noopener noreferrer">View all Nigeria news <span>↗</span></a></div><div class="news-grid" id="news-grid"><article class="news-card news-loading"><span class="eyebrow">Loading latest stories</span><p>Fetching current headlines from Nigeria.</p></article></div></section>`

const clientPortalPage = `
  <section class="page-hero section-shell"><div class="section-label">For existing clients</div><h1>Your matter,<br><em>within reach.</em></h1><p>Sign in to review cases assigned to your account and their upcoming hearings.</p></section>
  <section class="client-login section-shell" id="client-login">
    <div class="login-copy"><div class="section-label">Client access <span>Secure sign in</span></div><h2>Welcome back<br><em>to your matter.</em></h2><p>Use your registered email and password to access your client dashboard.</p></div>
    <div class="auth-panel">
      <form class="login-form" id="client-login-form"><label>Email address<input name="client-email" type="email" required autocomplete="email" placeholder="you@example.com"></label><label>Password<input name="client-password" type="password" required autocomplete="current-password" placeholder="Enter your password"></label><button class="button button-gold" type="submit">Sign in <span>↗</span></button><button class="text-button toggle-auth" id="show-client-signup" type="button">Create a client account</button><p class="form-note" role="status"></p></form>
      <form class="login-form signup-form" id="client-signup-form" hidden><label>Full name<input name="client-name" type="text" required autocomplete="name" maxlength="120" placeholder="Your full name"></label><label>Phone number<input name="client-phone" type="tel" required autocomplete="tel" maxlength="40" placeholder="Your phone number"></label><label>Email address<input name="client-signup-email" type="email" required autocomplete="email" maxlength="254" placeholder="you@example.com"></label><label>Password<input name="client-signup-password" type="password" required autocomplete="new-password" minlength="8" placeholder="Create a password (8+ characters)"></label><label>Confirm password<input name="client-signup-confirm" type="password" required autocomplete="new-password" minlength="8" placeholder="Confirm your password"></label><button class="button button-gold" type="submit">Create account <span>↗</span></button><button class="text-button toggle-auth" id="return-to-login" type="button">Already registered? Sign in</button><p class="form-note signup-note" role="status"></p></form>
      <div class="case-dashboard" id="case-dashboard" hidden><div class="dashboard-top"><span>CLIENT DASHBOARD</span><span class="status-dot">● SIGNED IN</span></div><div id="client-account-details"></div><h3>Your matters</h3><div id="case-details"></div><button class="text-link dashboard-logout" id="dashboard-logout" type="button">Sign out <span>↗</span></button></div>
    </div>
  </section>
`

const pages: Record<PublicPage | 'admin', string> = {
  home: `<section class="hero home-hero section-shell"><div class="hero-copy reveal"><p class="eyebrow">Counsel with clarity</p><h1>Professional Legal<br><em>Representation.</em><br>Trusted Counsel.</h1><p class="hero-intro">Strategic, practical and discreet legal services for individuals, families and organizations seeking confident guidance.</p><div class="hero-actions"><a class="button button-gold" href="${links.contact}#consultation">Book a consultation <span>↗</span></a><a class="text-link" href="${links.services}">Explore practice areas <span>→</span></a></div></div><div class="hero-visual reveal" aria-hidden="true"><div class="hero-figure"></div></div><div class="hero-meta"><span>01 / 04</span><span>Besite Malamre Clinic · Jimeta, Yola</span></div></section><section class="section-shell service-strip"><div class="service-strip-copy"><div class="section-label">02 <span>Our approach</span></div><h2>Measured advice.<br><em>Meaningful</em> action.</h2></div><div class="service-strip-text"><p>The law can feel complex. Our role is to make your position clear, your options understood and your next step considered.</p><a class="text-link" href="${links.chamber}">Meet the chamber <span>→</span></a></div></section><section class="section-shell service-overview"><div class="section-heading narrow"><div><div class="section-label">03 <span>Our legal focus</span></div><h2>Core legal <em>services.</em></h2></div></div><div class="service-grid">${serviceCards}</div></section><section class="about-band"><div class="section-shell about-layout"><div class="about-visual"></div><div class="about-copy"><div class="section-label">Our Barrister</div><h2>Henry Edmond<br><em>Turaso.</em></h2><p>Barrister Henry Edmond Turaso leads the council's client-focused practice, grounded in discretion, diligence and clear communication.</p><div class="about-list"><span>Client-first service</span><span>Strategic advocacy</span><span>Clear legal guidance</span></div><a class="button button-gold" href="${links.about}">About the council <span>↗</span></a></div></div></section>${trustBand}${newsSection}`,
  about: `<section class="page-hero section-shell"><div class="section-label">About the council</div><h1>Clear counsel.<br><em>Personal commitment.</em></h1><p>Henry E Turaso Law Council provides practical legal guidance shaped around each client's needs, with discretion and clear communication at every step.</p></section><section class="section-shell barrister-profile"><div class="barrister-monogram" aria-hidden="true"><span>HET</span><i>§</i></div><div class="barrister-copy"><div class="section-label">Our Barrister</div><h2>Henry Edmond<br><em>Turaso.</em></h2><p class="barrister-title">Barrister · Henry E Turaso Law Council</p><p>Barrister Henry Edmond Turaso leads the council's work with a considered, client-focused approach. The practice is built on careful preparation, direct communication and respect for the confidentiality of each matter.</p></div></section>${trustBand}`,
  chamber: `<section class="page-hero section-shell"><div class="section-label">The Chamber</div><h1>Measured advice.<br><em>Meaningful action.</em></h1><p>A professional practice committed to accessible, confidential and client-focused legal service at Besite Malamre Clinic, Jimeta, Yola.</p></section><section class="section-shell story-block"><div class="story-card large"><div class="story-image chamber-image"></div></div><div class="story-card text-card"><div class="section-label">Our philosophy</div><h2>Measured advice.<br><em>Meaningful action.</em></h2><p>The law can feel complex. Our role is to make your position clear, your options understood and your next step considered.</p><p>Henry E Turaso Law Council is a professional practice committed to accessible, confidential and client-focused legal service.</p></div></section>${trustBand}<section class="section-shell chamber-insights"><div class="section-heading"><div><div class="section-label">From the council</div><h2>Latest legal <em>insights.</em></h2></div><a class="text-link" href="${links.insights}">All legal insights <span>→</span></a></div><div class="insight-grid">${insightCards}</div></section>`,
  services: `<section class="page-hero section-shell"><div class="section-label">03 <span>What we do</span></div><h1>Practice<br><em>areas.</em></h1><p>Focused expertise for the decisions that matter most.</p></section><section class="section-shell service-overview"><div class="service-grid large-grid">${serviceCards}</div></section>`,
  insights: `<section class="page-hero section-shell"><div class="section-label">04 <span>From the council</span></div><h1>Legal<br><em>insights.</em></h1><p>Clear starting points for making informed decisions.</p></section><section class="section-shell insights-wrap"><div class="insight-grid">${insightCards}</div></section>`,
  contact: `<section class="page-hero section-shell"><div class="section-label">Contact</div><h1>Contact the<br><em>council.</em></h1><p>Reach Henry E Turaso Law Council by email or visit the Chamber at Besite Malamre Clinic, Jimeta, Yola, Adamawa State.</p></section><section class="section-shell contact-info" id="contact-info"><div><span class="eyebrow">Office</span><p>Besite Malamre Clinic<br>Jimeta, Yola, Adamawa State, Nigeria</p></div><div><span class="eyebrow">Email</span><p><a href="mailto:emmanuelturaso@gmail.com">emmanuelturaso@gmail.com</a></p></div><div><span class="eyebrow">Appointments</span><p>By appointment</p></div></section><section class="section-shell consultation-section" id="consultation"><div class="consultation-heading"><span class="eyebrow">Appointment request</span><h2>Book a <em>consultation.</em></h2><p>Send your preferred time and the council will contact you to confirm availability. Submitting this form does not confirm an appointment.</p></div><form class="consultation-form" id="consultation-form"><label>Full name<input name="name" required autocomplete="name" maxlength="120" placeholder="Your full name"></label><label>Email address<input name="email" type="email" required autocomplete="email" maxlength="254" placeholder="you@example.com"></label><label>Phone number<input name="phone" type="tel" required autocomplete="tel" maxlength="40" placeholder="Your phone number"></label><label>Practice area<select name="practiceArea" required><option value="" disabled selected>Select a practice area</option>${services.map(([, title]) => `<option>${title}</option>`).join('')}</select></label><label>Preferred date<input name="preferredDate" type="date" required></label><label>Preferred time<input name="preferredTime" type="time" required></label><label class="consultation-message">Briefly describe what you need<textarea name="message" rows="4" maxlength="2000" placeholder="Share a short summary; avoid including confidential details at this stage."></textarea></label><button class="button button-gold" type="submit">Send consultation request <span>↗</span></button><p class="form-note consultation-note" role="status" aria-live="polite"></p></form></section><section class="section-shell chamber-map"><div class="map-heading"><div><span class="eyebrow">Visit the Chamber</span><h2>Besite Malamre Clinic,<br><em>Jimeta, Yola.</em></h2></div><div class="map-actions"><a class="button button-gold" href="https://www.google.com/maps/dir/?api=1&destination=Besite%20Malamre%20Clinic%2C%20Jimeta%2C%20Yola%2C%20Adamawa%20State%2C%20Nigeria" target="_blank" rel="noopener noreferrer">Need Direction? <span>↗</span></a></div></div><iframe class="chamber-map-frame" src="https://maps.google.com/maps?q=Besite%20Malamre%20Clinic%2C%20Jimeta%2C%20Yola%2C%20Adamawa%20State%2C%20Nigeria&output=embed" title="Map showing Besite Malamre Clinic, Jimeta, Yola, Adamawa State, Nigeria" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></section>`,
  admin: `<section class="admin-area admin-page"><form class="admin-login" id="admin-login-form"><a class="brand admin-login-brand" href="index.html"><span class="brand-mark">§</span><span class="brand-text"><strong>Henry E Turaso</strong><small>Law Council</small></span></a><div class="section-label">Administrator access <span>Secure sign in</span></div><label>Email address<input name="admin-email" type="email" required placeholder="admin@henryturasolaw.com"></label><label>Password<input name="admin-password" type="password" required placeholder="Enter your password"></label><button class="button button-gold" type="submit">Open admin dashboard <span>→</span></button><p class="form-note" role="status"></p></form><div class="admin-dashboard" id="admin-dashboard" hidden><aside class="admin-sidebar"><div class="admin-brand"><span class="brand-mark">§</span><span>Henry E Turaso<small>COUNCIL ADMIN</small></span></div><div class="admin-user"><span class="admin-avatar">HT</span><span>Henry Turaso<small>Administrator</small></span></div><nav class="admin-nav" aria-label="Admin sections"><button class="is-active" type="button" data-admin-nav="overview">Overview</button><button type="button" data-admin-nav="cases">Cases</button><button type="button" data-admin-nav="clients">Clients</button><button type="button" data-admin-nav="hearings">Hearings</button><button type="button" data-admin-nav="documents">Documents</button><button type="button" data-admin-nav="messages">Messages</button><button type="button" data-admin-nav="consultations">Consultations</button><button type="button" data-admin-nav="reports">Reports</button><button type="button" data-admin-nav="settings">Settings</button></nav><button class="admin-signout" id="admin-logout" type="button">Sign out</button></aside><div class="admin-main"><header class="admin-topbar"><div><span class="eyebrow">COUNCIL WORKSPACE</span><span id="admin-view-label">Overview</span></div><span class="admin-secure">SECURE SESSION</span></header><div class="admin-view-content" id="admin-view-content" aria-live="polite"></div></div></div></section>`
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = page === 'admin'
  ? `<main id="top">${pages.admin}</main>`
  : `${header}<main id="top">${page === 'portal' ? clientPortalPage : pages[page] || pages.home}</main>${footer}`
const menuToggle = document.querySelector<HTMLButtonElement>('.menu-toggle')
const nav = document.querySelector<HTMLElement>('.site-nav')
if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => { const open = nav.classList.toggle('is-open'); menuToggle.setAttribute('aria-expanded', String(open)) })
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => { nav.classList.remove('is-open'); menuToggle.setAttribute('aria-expanded', 'false') }))
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character)
const newsGrid = document.querySelector<HTMLDivElement>('#news-grid')
const newsFallback = `<article class="news-card"><span class="eyebrow">Nigeria news</span><h3><a href="https://www.google.com/search?q=Nigeria+latest+news" target="_blank" rel="noopener noreferrer">Read the latest Nigeria headlines ↗</a></h3><p>Open a live search for current national stories.</p></article><article class="news-card"><span class="eyebrow">Business and economy</span><h3><a href="https://www.google.com/search?q=Nigeria+business+news" target="_blank" rel="noopener noreferrer">Nigeria business news ↗</a></h3><p>Follow current reporting on Nigeria's economy.</p></article><article class="news-card"><span class="eyebrow">Law and public affairs</span><h3><a href="https://www.google.com/search?q=Nigeria+law+public+affairs+news" target="_blank" rel="noopener noreferrer">Law and public affairs ↗</a></h3><p>Browse reporting on courts and public institutions.</p></article><article class="news-card"><span class="eyebrow">Judiciary</span><h3><a href="https://www.google.com/search?q=Nigeria+judiciary+court+news" target="_blank" rel="noopener noreferrer">Nigerian judiciary updates ↗</a></h3><p>Follow developments from courts and the justice system.</p></article><article class="news-card"><span class="eyebrow">Public policy</span><h3><a href="https://www.google.com/search?q=Nigeria+public+policy+news" target="_blank" rel="noopener noreferrer">Policy and governance ↗</a></h3><p>Read current coverage of government and public policy.</p></article><article class="news-card"><span class="eyebrow">Society</span><h3><a href="https://www.google.com/search?q=Nigeria+education+health+community+news" target="_blank" rel="noopener noreferrer">Education, health and communities ↗</a></h3><p>Explore reporting on issues affecting communities across Nigeria.</p></article>`
const loadNigeriaNews = async () => {
  if (!newsGrid) return
  const feedUrl = encodeURIComponent('https://news.google.com/rss/search?q=Nigeria&hl=en-NG&gl=NG&ceid=NG:en')
  try {
    const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${feedUrl}`)
    if (!response.ok) throw new Error('News feed unavailable')
    const result = await response.json() as { items?: Array<{ title: string; link: string; pubDate: string }> }
    const stories = (result.items || []).slice(0, 6)
    if (!stories.length) throw new Error('No stories available')
    newsGrid.innerHTML = stories.map((story) => `<article class="news-card"><span class="eyebrow">Nigeria news · ${escapeHtml(new Date(story.pubDate).toLocaleDateString())}</span><h3><a href="${encodeURI(story.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(story.title)} ↗</a></h3><p>Latest reporting from Nigeria, provided through Google News.</p></article>`).join('')
  } catch { newsGrid.innerHTML = newsFallback }
}
loadNigeriaNews()

const consultationForm = document.querySelector<HTMLFormElement>('#consultation-form')
if (consultationForm) {
  const dateInput = consultationForm.elements.namedItem('preferredDate') as HTMLInputElement
  dateInput.min = new Date().toISOString().slice(0, 10)
  consultationForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const note = form.querySelector<HTMLParagraphElement>('.consultation-note')!
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!
    note.textContent = 'Sending your consultation request...'; submit.disabled = true
    try {
      const response = await fetch(`${apiBase}/consultations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to submit your request.')
      note.textContent = `Request ${result.reference} received. The council will contact you to confirm availability.`
      form.reset(); dateInput.min = new Date().toISOString().slice(0, 10)
    } catch (error) { note.textContent = error instanceof Error ? error.message : 'Unable to submit your request.' }
    finally { submit.disabled = false }
  })
}

const clientLoginForm = document.querySelector<HTMLFormElement>('#client-login-form')
const clientSignupForm = document.querySelector<HTMLFormElement>('#client-signup-form')
const clientDashboard = document.querySelector<HTMLElement>('#case-dashboard')
const clientTokenKey = 'henry-turaso-access-token'
type ClientDashboardData = {
  client: { firstName: string; lastName: string; email: string; phone?: string }
  cases: Array<{ id: string; caseNumber: string; title: string; caseType: string; court: string; status: string; hearings: Array<{ hearingDate: string; purpose?: string; status: string }> }>
}

const showClientAuth = (mode: 'login' | 'signup') => {
  if (!clientLoginForm || !clientSignupForm) return
  clientLoginForm.hidden = mode !== 'login'
  clientSignupForm.hidden = mode !== 'signup'
}

const renderClientDashboard = (data: ClientDashboardData) => {
  if (!clientDashboard || !clientLoginForm || !clientSignupForm) return
  const accountDetails = document.querySelector<HTMLDivElement>('#client-account-details')!
  const caseDetails = document.querySelector<HTMLDivElement>('#case-details')!
  accountDetails.innerHTML = `<p class="client-account-name">${escapeHtml(`${data.client.firstName} ${data.client.lastName}`)}</p><p class="client-account-email">${escapeHtml(data.client.email)}</p>`
  caseDetails.innerHTML = data.cases.length
    ? data.cases.map((item) => `<article class="client-matter"><div class="client-matter-heading"><span>${escapeHtml(item.caseNumber)}</span><span class="client-case-status">${escapeHtml(item.status)}</span></div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.caseType)} · ${escapeHtml(item.court)}</p><div class="client-hearing"><span>Next hearing</span><strong>${item.hearings[0] ? `${escapeHtml(new Date(item.hearings[0].hearingDate).toLocaleString())}${item.hearings[0].purpose ? ` · ${escapeHtml(item.hearings[0].purpose)}` : ''}` : 'To be scheduled'}</strong></div></article>`).join('')
    : '<p class="form-note">No matters are currently assigned to this account. Contact the council if you expected a case to appear here.</p>'
  clientDashboard.hidden = false
  clientLoginForm.hidden = true
  clientSignupForm.hidden = true
}

const loadClientDashboard = async (token: string) => {
  const response = await fetch(`${apiBase}/client/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
  const result = await response.json()
  if (!response.ok) throw new Error(result.message || 'Unable to load the client dashboard.')
  renderClientDashboard(result as ClientDashboardData)
}

if (clientLoginForm && clientSignupForm && clientDashboard) {
  document.querySelector<HTMLButtonElement>('#show-client-signup')?.addEventListener('click', () => showClientAuth('signup'))
  document.querySelector<HTMLButtonElement>('#return-to-login')?.addEventListener('click', () => showClientAuth('login'))

  const savedToken = localStorage.getItem(clientTokenKey)
  if (savedToken) loadClientDashboard(savedToken).catch(() => localStorage.removeItem(clientTokenKey))

  clientLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const email = (clientLoginForm.elements.namedItem('client-email') as HTMLInputElement).value.trim().toLowerCase()
    const password = (clientLoginForm.elements.namedItem('client-password') as HTMLInputElement).value
    const note = clientLoginForm.querySelector<HTMLParagraphElement>('.form-note')!
    const submit = clientLoginForm.querySelector<HTMLButtonElement>('button[type="submit"]')!
    note.textContent = 'Signing in...'
    submit.disabled = true
    try {
      const response = await fetch(`${apiBase}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to sign in.')
      if (result.user?.role !== 'CLIENT') throw new Error('This sign-in is for client accounts only.')
      localStorage.setItem(clientTokenKey, result.accessToken)
      await loadClientDashboard(result.accessToken)
    } catch (error) {
      localStorage.removeItem(clientTokenKey)
      note.textContent = error instanceof Error ? error.message : 'Unable to sign in.'
    } finally { submit.disabled = false }
  })

  clientSignupForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const name = (clientSignupForm.elements.namedItem('client-name') as HTMLInputElement).value.trim()
    const phone = (clientSignupForm.elements.namedItem('client-phone') as HTMLInputElement).value.trim()
    const email = (clientSignupForm.elements.namedItem('client-signup-email') as HTMLInputElement).value.trim().toLowerCase()
    const password = (clientSignupForm.elements.namedItem('client-signup-password') as HTMLInputElement).value
    const confirmPassword = (clientSignupForm.elements.namedItem('client-signup-confirm') as HTMLInputElement).value
    const note = clientSignupForm.querySelector<HTMLParagraphElement>('.signup-note')!
    const submit = clientSignupForm.querySelector<HTMLButtonElement>('button[type="submit"]')!
    if (password.length < 8) { note.textContent = 'Use at least 8 characters for your password.'; return }
    if (password !== confirmPassword) { note.textContent = 'Passwords do not match.'; return }
    const [firstName, ...lastNames] = name.split(/\s+/)
    note.textContent = 'Creating your secure account...'
    submit.disabled = true
    try {
      const response = await fetch(`${apiBase}/client/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName, lastName: lastNames.join(' ') || 'Client', phone, email, password }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to create your account.')
      localStorage.setItem(clientTokenKey, result.accessToken)
      await loadClientDashboard(result.accessToken)
      clientSignupForm.reset()
    } catch (error) {
      localStorage.removeItem(clientTokenKey)
      note.textContent = error instanceof Error ? error.message : 'Unable to create your account.'
    } finally { submit.disabled = false }
  })

  document.querySelector<HTMLButtonElement>('#dashboard-logout')?.addEventListener('click', async () => {
    const token = localStorage.getItem(clientTokenKey)
    if (token) try { await fetch(`${apiBase}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }) } catch { /* local sign-out still clears this session */ }
    localStorage.removeItem(clientTokenKey)
    clientDashboard.hidden = true
    clientLoginForm.hidden = false
    clientSignupForm.hidden = true
    clientLoginForm.reset()
  })
}

const adminLoginForm = document.querySelector<HTMLFormElement>('#admin-login-form')
const adminDashboard = document.querySelector<HTMLElement>('#admin-dashboard')
const adminTokenKey = 'henry-turaso-admin-token'
const adminWorkspace = adminDashboard ? createAdminWorkspace(adminDashboard, { apiBase, tokenKey: adminTokenKey }) : null
const renderAdminDashboard = (data: AdminDashboardData) => {
  if (!adminDashboard || !adminLoginForm) return
  adminLoginForm.hidden = true; adminDashboard.hidden = false; adminWorkspace?.render(data)
}
const restoreAdminSession = async () => {
  const token = localStorage.getItem(adminTokenKey)
  if (!token) return
  try {
    const response = await fetch(`${apiBase}/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new Error('Session expired')
    renderAdminDashboard(await response.json())
  } catch { localStorage.removeItem(adminTokenKey) }
}
if (adminLoginForm && adminDashboard) {
  restoreAdminSession()
  adminLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const email = form.elements.namedItem('admin-email') as HTMLInputElement
    const password = form.elements.namedItem('admin-password') as HTMLInputElement
    const note = form.querySelector<HTMLParagraphElement>('.form-note')!
    note.textContent = 'Signing in...'
    try {
      const response = await fetch(`${apiBase}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.value, password: password.value }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to sign in.')
      localStorage.setItem(adminTokenKey, result.accessToken)
      const dashboardResponse = await fetch(`${apiBase}/admin/dashboard`, { headers: { Authorization: `Bearer ${result.accessToken}` } })
      if (!dashboardResponse.ok) throw new Error('Unable to load the admin dashboard.')
      renderAdminDashboard(await dashboardResponse.json())
    } catch (error) { note.textContent = error instanceof Error ? error.message : 'Unable to sign in.' }
  })
  document.querySelector<HTMLButtonElement>('#admin-logout')?.addEventListener('click', async () => {
    const token = localStorage.getItem(adminTokenKey)
    if (token) try { await fetch(`${apiBase}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }) } catch { /* local session still clears */ }
    localStorage.removeItem(adminTokenKey); adminWorkspace?.reset(); adminDashboard.hidden = true; adminLoginForm.hidden = false
  })
}