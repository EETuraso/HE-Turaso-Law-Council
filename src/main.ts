import './style.css'
import { createAdminWorkspace, type AdminDashboardData } from './admin-dashboard'

type PublicPage = 'home' | 'about' | 'chamber' | 'services' | 'insights' | 'contact'
type Page = PublicPage | 'portal' | 'admin'
const page = (document.body.dataset.page || 'home') as Page
const apiBase = import.meta.env.VITE_API_BASE || (location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'http://127.0.0.1:4000/api/v1' : '/api/v1')
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

const header = `<header class="site-header"><a class="brand" href="index.html" aria-label="Henry E Turaso Law Council home"><span class="brand-mark">§</span><span class="brand-text"><strong data-public-principal>Henry E Turaso</strong><small data-public-council-label>Law Council</small></span></a><button class="menu-toggle" aria-label="Open navigation" aria-expanded="false">☰</button><nav class="site-nav" aria-label="Primary navigation"><a href="index.html">Home</a><a href="${links.about}">About</a><a href="${links.services}">Practice Areas</a><a href="${links.chamber}">The Chamber</a><a href="${links.insights}">Insights</a><a href="${links.contact}#contact-info">Get in Touch</a><a href="${links.portal}">Client Portal</a><a class="nav-consult" href="${links.contact}#consultation">Book Consultation</a></nav></header>`
const footer = `<footer class="site-footer section-shell"><a class="brand" href="index.html"><span class="brand-mark">§</span><span class="brand-text"><strong data-public-principal>Henry E Turaso</strong><small data-public-council-label>Law Council</small></span></a><p data-public-tagline>Professional legal services. Thoughtfully delivered.</p><span class="copyright">© ${new Date().getFullYear()} <span data-public-council-name>Henry E Turaso Law Council</span></span></footer>`
const trustBand = `<section class="trust-band"><div class="section-shell trust-grid"><div class="trust-intro"><span class="eyebrow">The standard we keep</span><h2>Good counsel is <em>personal.</em></h2></div><div class="trust-point"><strong>01</strong><h3>Confidential by nature</h3><p>Your information is handled with discretion, care and respect.</p></div><div class="trust-point"><strong>02</strong><h3>Clear by design</h3><p>We communicate in plain language, so you can decide with confidence.</p></div><div class="trust-point"><strong>03</strong><h3>Steady in practice</h3><p>Thoughtful preparation and disciplined advocacy from first call to resolution.</p></div></div></section>`
const newsSection = `<section class="news-feed section-shell" id="nigeria-news"><div class="section-heading"><div><div class="section-label">05 <span>From Nigeria</span></div><h2>News <em>briefing.</em></h2></div><a class="text-link" href="https://news.google.com/search?q=Nigeria&hl=en-NG&gl=NG&ceid=NG%3Aen" target="_blank" rel="noopener noreferrer">View all Nigeria news <span>↗</span></a></div><div class="news-grid" id="news-grid"><article class="news-card news-loading"><span class="eyebrow">Loading latest stories</span><p>Fetching current headlines from Nigeria.</p></article></div></section>`

const clientPortalPage = `
  <section class="page-hero section-shell"><div class="section-label">For new and existing clients</div><h1>Your matter,<br><em>within reach.</em></h1><p>Sign in to review cases assigned to your account and their upcoming hearings.</p></section>
  <section class="client-login section-shell" id="client-login">
    <div class="login-copy"><div class="section-label">Client access <span>Secure sign in</span></div><h2>Welcome back<br><em>to your matter.</em></h2><p>Use your registered email and password to access your client dashboard.</p></div>
    <div class="auth-panel">
      <form class="login-form" id="client-login-form"><label>Email address<input name="client-email" type="email" required autocomplete="email" placeholder="you@example.com"></label><label>Password<input name="client-password" type="password" required autocomplete="current-password" placeholder="Enter your password"></label><button class="button button-gold" type="submit">Sign in <span>↗</span></button><button class="text-button toggle-auth" id="show-client-signup" type="button">Create a client account</button><p class="form-note" role="status"></p></form>
      <form class="login-form signup-form" id="client-signup-form" hidden><span class="eyebrow">Start a secure client account</span><label>Full name<input name="client-name" type="text" required autocomplete="name" maxlength="120" placeholder="Your full name"></label><label>Legal activity<select name="client-legal-activity" required><option value="" disabled selected>Choose the help you need</option><option>Land and property</option><option>Litigation</option><option>Corporate law</option><option>Family law</option><option>Legal documentation</option><option>Legal advisory</option><option>Other</option></select></label><label>Phone number (optional)<input name="client-phone" type="tel" autocomplete="tel" maxlength="40" placeholder="Your phone number"></label><label>Email address<input name="client-signup-email" type="email" required autocomplete="email" maxlength="254" placeholder="you@example.com"></label><label>Password<input name="client-signup-password" type="password" required autocomplete="new-password" minlength="8" placeholder="Create a password (8+ characters)"></label><label>Confirm password<input name="client-signup-confirm" type="password" required autocomplete="new-password" minlength="8" placeholder="Confirm your password"></label><button class="button button-gold" type="submit">Create account <span>→</span></button><button class="text-button toggle-auth" id="return-to-login" type="button">Already registered? Sign in</button><p class="form-note signup-note" role="status"></p></form>
      <div class="case-dashboard" id="case-dashboard" hidden><div class="dashboard-top"><span>CLIENT DASHBOARD</span><span class="status-dot">● SIGNED IN</span></div><div id="client-account-details"></div><div id="client-approval-status"></div><h3>Your matters</h3><div id="case-details"></div><button class="text-link dashboard-logout" id="dashboard-logout" type="button">Sign out <span>↗</span></button></div>
    </div>
  </section>
`

const chamberMap = `<section class="section-shell chamber-map"><div class="map-heading"><div><span class="eyebrow">Visit the Chamber</span><h2>Besite Malamre Clinic,<br><em>Jimeta, Yola.</em></h2></div><div class="map-actions"><a class="button button-gold" href="https://www.google.com/maps/dir/?api=1&destination=Besite%20Malamre%20Clinic%2C%20Jimeta%2C%20Yola%2C%20Adamawa%20State%2C%20Nigeria" target="_blank" rel="noopener noreferrer">Need Direction? <span>↗</span></a></div></div><iframe class="chamber-map-frame" src="https://maps.google.com/maps?q=Besite%20Malamre%20Clinic%2C%20Jimeta%2C%20Yola%2C%20Adamawa%20State%2C%20Nigeria&output=embed" title="Map showing Besite Malamre Clinic, Jimeta, Yola, Adamawa State, Nigeria" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></section>`
const pages: Record<PublicPage | 'admin', string> = {
  home: `<section class="hero home-hero section-shell"><div class="hero-copy reveal"><p class="eyebrow">Counsel with clarity</p><h1>Professional Legal<br><em>Representation.</em><br>Trusted Counsel.</h1><p class="hero-intro">Strategic, practical and discreet legal services for individuals, families and organizations seeking confident guidance.</p><div class="hero-actions"><a class="button button-gold" href="${links.contact}#consultation">Book a consultation <span>↗</span></a><a class="text-link" href="${links.services}">Explore practice areas <span>→</span></a></div></div><div class="hero-visual reveal" aria-hidden="true"><div class="hero-figure"></div></div><div class="hero-meta"><span>01 / 04</span><span>Besite Malamre Clinic · Jimeta, Yola</span></div></section><section class="section-shell service-strip"><div class="service-strip-copy"><div class="section-label">02 <span>Our approach</span></div><h2>Measured advice.<br><em>Meaningful</em> action.</h2></div><div class="service-strip-text"><p>The law can feel complex. Our role is to make your position clear, your options understood and your next step considered.</p><a class="text-link" href="${links.chamber}">Meet the chamber <span>→</span></a></div></section><section class="section-shell service-overview"><div class="section-heading narrow"><div><div class="section-label">03 <span>Our legal focus</span></div><h2>Core legal <em>services.</em></h2></div></div><div class="service-grid">${serviceCards}</div></section><section class="about-band"><div class="section-shell about-layout"><div class="about-visual"></div><div class="about-copy"><div class="section-label">Our Barrister</div><h2>Henry Edmond<br><em>Turaso.</em></h2><p>Barrister Henry Edmond Turaso leads the council's client-focused practice, grounded in discretion, diligence and clear communication.</p><div class="about-list"><span>Client-first service</span><span>Strategic advocacy</span><span>Clear legal guidance</span></div><a class="button button-gold" href="${links.about}">About the council <span>↗</span></a></div></div></section>${trustBand}${newsSection}`,
  about: `<section class="page-hero section-shell"><div class="section-label">About the council</div><h1>Clear counsel.<br><em>Personal commitment.</em></h1><p>Henry E Turaso Law Council provides practical legal guidance shaped around each client's needs, with discretion and clear communication at every step.</p></section><section class="section-shell barrister-profile"><div class="barrister-monogram" aria-hidden="true"><span>HET</span><i>§</i></div><div class="barrister-copy"><div class="section-label">Our Barrister</div><h2>Henry Edmond<br><em>Turaso.</em></h2><p class="barrister-title">Barrister · Henry E Turaso Law Council</p><p>Barrister Henry Edmond Turaso leads the council's work with a considered, client-focused approach. The practice is built on careful preparation, direct communication and respect for the confidentiality of each matter.</p></div></section>${trustBand}`,
  chamber: `<section class="page-hero section-shell"><div class="section-label">The Chamber</div><h1>Measured advice.<br><em>Meaningful action.</em></h1><p>A professional practice committed to accessible, confidential and client-focused legal service at Besite Malamre Clinic, Jimeta, Yola.</p></section><section class="section-shell story-block"><div class="story-card large"><div class="story-image chamber-image"></div></div><div class="story-card text-card"><div class="section-label">Our philosophy</div><h2>Measured advice.<br><em>Meaningful action.</em></h2><p>The law can feel complex. Our role is to make your position clear, your options understood and your next step considered.</p><p>Henry E Turaso Law Council is a professional practice committed to accessible, confidential and client-focused legal service.</p></div></section>${chamberMap}${trustBand}<section class="section-shell chamber-insights"><div class="section-heading"><div><div class="section-label">From the council</div><h2>Latest legal <em>insights.</em></h2></div><a class="text-link" href="${links.insights}">All legal insights <span>→</span></a></div><div class="insight-grid">${insightCards}</div></section>`,
  services: `<section class="page-hero section-shell"><div class="section-label">03 <span>What we do</span></div><h1>Practice<br><em>areas.</em></h1><p>Focused expertise for the decisions that matter most.</p></section><section class="section-shell service-overview"><div class="service-grid large-grid">${serviceCards}</div></section>`,
  insights: `<section class="page-hero section-shell"><div class="section-label">04 <span>From the council</span></div><h1>Legal<br><em>insights.</em></h1><p>Clear starting points for making informed decisions.</p></section><section class="section-shell insights-wrap"><div class="insight-grid">${insightCards}</div></section>`,
  contact: `<section class="page-hero section-shell"><div class="section-label">Contact</div><h1>Contact the<br><em>council.</em></h1><p>Reach Henry E Turaso Law Council by email or visit the Chamber at Besite Malamre Clinic, Jimeta, Yola, Adamawa State.</p></section><section class="section-shell contact-info" id="contact-info"><div><span class="eyebrow">Office</span><p data-public-office-address>Besite Malamre Clinic, Jimeta, Yola, Adamawa State, Nigeria</p></div><div><span class="eyebrow">Email</span><p><a data-public-contact-email href="mailto:emmanuelturaso@gmail.com">emmanuelturaso@gmail.com</a></p><p><a data-public-contact-phone></a></p></div><div><span class="eyebrow">Appointments</span><p data-public-appointment-policy>By appointment</p></div></section><section class="section-shell consultation-section" id="consultation"><div class="consultation-heading"><span class="eyebrow">Appointment request</span><h2>Book a <em>consultation.</em></h2><p>Send your preferred time and the council will contact you to confirm availability. Submitting this form does not confirm an appointment.</p></div><form class="consultation-form" id="consultation-form"><label>Full name<input name="name" required autocomplete="name" maxlength="120" placeholder="Your full name"></label><label>Email address<input name="email" type="email" required autocomplete="email" maxlength="254" placeholder="you@example.com"></label><label>Phone number<input name="phone" type="tel" required autocomplete="tel" maxlength="40" placeholder="Your phone number"></label><label>Practice area<select name="practiceArea" required><option value="" disabled selected>Select a practice area</option>${services.map(([, title]) => `<option>${title}</option>`).join('')}</select></label><label>Preferred date<input name="preferredDate" type="date" required></label><label>Preferred time<input name="preferredTime" type="time" required></label><label class="consultation-message">Briefly describe what you need<textarea name="message" rows="4" maxlength="2000" placeholder="Share a short summary; avoid including confidential details at this stage."></textarea></label><button class="button button-gold" type="submit">Send consultation request <span>↗</span></button><p class="form-note consultation-note" role="status" aria-live="polite"></p></form></section>`,
  admin: `<section class="admin-area admin-page"><form class="admin-login" id="admin-login-form"><a class="brand admin-login-brand" href="index.html"><span class="brand-mark">§</span><span class="brand-text"><strong data-public-principal>Henry E Turaso</strong><small data-public-council-label>Law Council</small></span></a><div class="section-label">Administrator access <span>Secure sign in</span></div><label>Email address<input name="admin-email" type="email" required placeholder="admin@henryturasolaw.com"></label><label>Password<input name="admin-password" type="password" required placeholder="Enter your password"></label><button class="button button-gold" type="submit">Open admin dashboard <span>→</span></button><p class="form-note" role="status"></p></form><div class="admin-dashboard" id="admin-dashboard" hidden><aside class="admin-sidebar"><div class="admin-brand"><span class="brand-mark">§</span><span><strong data-admin-council-name>Henry E Turaso Law Council</strong><small>COUNCIL ADMIN</small></span></div><div class="admin-user"><span class="admin-avatar">HT</span><span><strong data-admin-user-name>Henry Turaso</strong><small>Administrator</small></span></div><nav class="admin-nav" aria-label="Admin sections"><button class="is-active" type="button" data-admin-nav="overview">Overview</button><button type="button" data-admin-nav="cases">Cases</button><button type="button" data-admin-nav="clients">Clients</button><button type="button" data-admin-nav="hearings">Hearings</button><button type="button" data-admin-nav="documents">Documents</button><button type="button" data-admin-nav="messages">Messages</button><button type="button" data-admin-nav="consultations">Consultations</button><button type="button" data-admin-nav="reports">Reports</button><button type="button" data-admin-nav="settings">Settings</button></nav><button class="admin-signout" id="admin-logout" type="button">Sign out</button></aside><div class="admin-main"><header class="admin-topbar"><div><span class="eyebrow">COUNCIL WORKSPACE</span><span id="admin-view-label">Overview</span></div><div id="admin-clock" class="admin-clock-widget" aria-label="Current time"><svg class="admin-analog-clock" viewBox="0 0 100 100" role="img" aria-label="Analog clock"><circle cx="50" cy="50" r="46"/><path d="M50 8v5M50 87v5M8 50h5M87 50h5"/><line data-clock-hour x1="50" y1="50" x2="50" y2="29"/><line data-clock-minute x1="50" y1="50" x2="50" y2="19"/><line data-clock-second x1="50" y1="54" x2="50" y2="14"/><circle class="clock-pin" cx="50" cy="50" r="2.5"/></svg><div class="admin-clock-readout"><time data-clock-digital></time><time data-clock-date></time></div></div><span class="admin-secure">SECURE SESSION</span></header><div class="admin-view-content" id="admin-view-content" aria-live="polite"></div></div></div></section>`
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = page === 'admin'
  ? `<main id="top">${pages.admin}</main>`
  : `${header}<main id="top">${page === 'portal' ? clientPortalPage : pages[page] || pages.home}</main>${footer}`
const applySiteContent = (siteContent: { overrides?: Array<Record<string, unknown>>; theme?: Record<string, string> }) => {
  const theme = siteContent.theme || {}
  const cssColors: Record<string, string> = { gold: '--gold', deep: '--deep', ink: '--ink', muted: '--muted', paper: '--paper', sand: '--sand', line: '--line' }
  for (const [key, variable] of Object.entries(cssColors)) if (/^#[0-9a-fA-F]{6}$/.test(theme[key] || '')) document.documentElement.style.setProperty(variable, theme[key])
  if (['Manrope', 'Arial', 'Georgia', 'system-ui'].includes(theme.font)) document.body.style.fontFamily = theme.font
  for (const rule of siteContent.overrides || []) {
    if (typeof rule.selector !== 'string' || (typeof rule.page === 'string' && rule.page !== page)) continue
    try {
      document.querySelectorAll<HTMLElement>(rule.selector).forEach((element) => {
        for (const field of ['text', 'alt', 'title', 'placeholder', 'content', 'ariaLabel'] as const) if (typeof rule[field] === 'string') {
          if (field === 'text' && rule.replaceText === true) element.textContent = rule[field] as string
          else if (field === 'text') {
            const directText = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE)
            if (directText) directText.textContent = rule[field] as string
            else element.insertBefore(document.createTextNode(rule[field] as string), element.firstChild)
          } else element.setAttribute(field === 'ariaLabel' ? 'aria-label' : field, rule[field] as string)
        }
        if (typeof rule.value === 'string' && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) element.value = rule.value
        for (const field of ['href', 'src'] as const) if (typeof rule[field] === 'string') {
          const value = rule[field] as string
          if (value && /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(value)) element.setAttribute(field, value)
          else if (!value) element.removeAttribute(field)
        }
        if (typeof rule.background === 'string') {
          const imageValue = /^https?:\/\//i.test(rule.background) ? 'url("' + rule.background.replace(/["\\]/g, '') + '")' : 'none'
          element.style.backgroundImage = imageValue
          if (element.classList.contains('hero')) element.style.setProperty('--site-editor-background-image', imageValue)
        }
        if (typeof rule.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(rule.color)) element.style.color = rule.color
        if (typeof rule.backgroundColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(rule.backgroundColor)) element.style.backgroundColor = rule.backgroundColor
        if (typeof rule.hidden === 'boolean') element.hidden = rule.hidden
      })
    } catch { /* Ignore a bad selector and continue applying website settings. */ }
  }
}
const loadPublicSettings = async () => {
  if (page === 'admin') return
  try {
    const response = await fetch(apiBase + '/settings/public')
    if (!response.ok) return
    const result = await response.json() as { settings?: { councilName?: string; principalName?: string; tagline?: string; officeAddress?: string; contactEmail?: string; contactPhone?: string; appointmentPolicy?: string; siteContent?: { overrides?: Array<Record<string, unknown>>; theme?: Record<string, string> } } }
    const settings = result.settings
    if (!settings) return
    if (settings.siteContent && !new URLSearchParams(location.search).has('visualClean')) applySiteContent(settings.siteContent)
    document.querySelectorAll<HTMLElement>('[data-public-principal]').forEach((node) => { node.textContent = settings.principalName || '' })
    document.querySelectorAll<HTMLElement>('[data-public-council-name]').forEach((node) => { node.textContent = settings.councilName || '' })
    document.querySelectorAll<HTMLElement>('[data-public-council-label]').forEach((node) => { node.textContent = (settings.councilName || '').replace(settings.principalName || '', '').trim() })
    document.querySelectorAll<HTMLElement>('[data-public-tagline]').forEach((node) => { node.textContent = settings.tagline || '' })
    const address = document.querySelector<HTMLElement>('[data-public-office-address]')
    if (address) address.textContent = settings.officeAddress || ''
    const email = document.querySelector<HTMLAnchorElement>('[data-public-contact-email]')
    if (email && settings.contactEmail) { email.href = 'mailto:' + settings.contactEmail; email.textContent = settings.contactEmail }
    const phone = document.querySelector<HTMLAnchorElement>('[data-public-contact-phone]')
    if (phone) {
      if (settings.contactPhone) { phone.href = 'tel:' + settings.contactPhone.replace(/[^+0-9]/g, ''); phone.textContent = settings.contactPhone }
      else phone.parentElement?.remove()
    }
    const appointment = document.querySelector<HTMLElement>('[data-public-appointment-policy]')
    if (appointment) appointment.textContent = settings.appointmentPolicy || ''
    if (settings.siteContent && !new URLSearchParams(location.search).has('visualClean')) applySiteContent(settings.siteContent)
  } catch { /* Keep the static profile if the settings API is temporarily unavailable. */ }
}
const visualEditorMode = new URLSearchParams(location.search).get('visualEditor') === '1'
if (visualEditorMode) {
  document.documentElement.classList.add('visual-edit-mode')
  let selectedVisualElement: HTMLElement | null = null
  const elementSelector = (element: HTMLElement) => {
    if (element.id) return `#${CSS.escape(element.id)}`
    const segments: string[] = []
    let current: HTMLElement | null = element
    while (current && current !== document.body) {
      if (current.id) { segments.unshift(`#${CSS.escape(current.id)}`); break }
      const tag = current.tagName.toLowerCase()
      const siblings = current.parentElement ? Array.from(current.parentElement.children).filter((child) => child.tagName === current!.tagName) : []
      segments.unshift(`${tag}:nth-of-type(${siblings.indexOf(current) + 1})`)
      current = current.parentElement
    }
    return `body > ${segments.join(' > ')}`
  }
  const applyVisualRule = (rule: Record<string, unknown>) => applySiteContent({ overrides: [rule] })
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window.parent || event.origin !== location.origin || !event.data) return
    if (event.data.type === 'SITE_EDITOR_RULES' && Array.isArray(event.data.rules)) {
      applySiteContent({ overrides: event.data.rules, theme: event.data.theme })
      event.data.rules.forEach(applyVisualRule)
    }
    if (event.data.type === 'SITE_EDITOR_RULE' && event.data.rule) applyVisualRule(event.data.rule)
    if (event.data.type === 'SITE_EDITOR_THEME') applySiteContent({ overrides: [], theme: event.data.theme })
    if (event.data.type === 'SITE_EDITOR_SHOW_HIDDEN') document.documentElement.classList.toggle('site-editor-show-hidden', Boolean(event.data.enabled))
  })
  document.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const element = target.closest<HTMLElement>('h1,h2,h3,h4,h5,p,a,button,img,video,iframe,section,article,header,footer,nav,label,input,textarea,select,li,span,em,strong,small,.brand,.hero-visual,.story-image')
    if (!element) return
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation()
    if (selectedVisualElement) selectedVisualElement.removeAttribute('data-site-editor-selected')
    selectedVisualElement = element
    element.setAttribute('data-site-editor-selected', 'true')
    const tag = element.tagName.toLowerCase()
    const imageElement = ['img', 'iframe', 'video', 'source'].includes(tag)
    const computed = getComputedStyle(element)
    const hexColor = (value: string, fallback: string) => {
      if (value.startsWith('#')) return value.slice(0, 7)
      const rgb = value.match(/\d+/g)?.slice(0, 3).map((part) => Number(part).toString(16).padStart(2, '0'))
      return rgb?.length === 3 ? `#${rgb.join('')}` : fallback
    }
    const backgroundMatch = computed.backgroundImage.match(/url\(["']?(.*?)["']?\)/)
    const valueField = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
    const directText = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE)
    const editableText = valueField || (!imageElement && !['iframe', 'video'].includes(tag) && (element.children.length === 0 || Boolean(directText)))
    const text = valueField ? (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value : element.children.length ? directText?.textContent?.trim() || '' : element.innerText.trim()
    window.parent.postMessage({
      type: 'SITE_EDITOR_SELECTED', page, selector: elementSelector(element), tag,
      text, valueField, editableText, replaceText: element.children.length === 0, placeholder: element.getAttribute('placeholder') || '', href: element.getAttribute('href') || '', src: imageElement ? element.getAttribute('src') || '' : backgroundMatch?.[1] || '',
      mediaField: imageElement ? 'src' : 'background', canLink: ['a', 'area'].includes(tag), canAlt: imageElement, canPlaceholder: ['input', 'textarea'].includes(tag), alt: element.getAttribute('alt') || '',
      color: hexColor(computed.color, '#102d31'), backgroundColor: hexColor(computed.backgroundColor, '#ffffff'), hidden: element.hidden
    }, location.origin)
  }, true)
  void loadPublicSettings().finally(() => window.parent.postMessage({ type: 'SITE_EDITOR_READY', page }, location.origin))
} else void loadPublicSettings()

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
  try {
    const response = await fetch(`${apiBase}/news/nigeria`)
    if (!response.ok) throw new Error('News feed unavailable')
    const result = await response.json() as { items?: Array<{ title: string; link: string; pubDate: string }> }
    const stories = (result.items || []).slice(0, 6)
    if (!stories.length) throw new Error('No stories available')
    newsGrid.innerHTML = stories.map((story) => `<article class="news-card"><span class="eyebrow">Nigeria news · ${escapeHtml(new Date(story.pubDate).toLocaleDateString())}</span><h3><a href="${escapeHtml(story.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(story.title)} ↗</a></h3><p>Latest reporting from Nigeria, provided through Google News.</p></article>`).join('')
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
  client: { firstName: string; lastName: string; email: string; phone?: string; legalActivity?: string; approvalStatus?: string }
  cases: Array<{ id: string; caseNumber: string; title: string; caseType: string; court: string; status: string; hearings: Array<{ hearingDate: string; purpose?: string; status: string }>; documents: Array<{ id: string; title: string; fileName: string; createdAt: string }>; messages: Array<{ id: string; senderRole: string; senderName: string; body: string; createdAt: string }> }>
}

const showClientAuth = (mode: 'login' | 'signup') => {
  if (!clientLoginForm || !clientSignupForm) return
  clientLoginForm.hidden = mode !== 'login'
  clientSignupForm.hidden = mode !== 'signup'
}

const renderClientDashboard = (data: ClientDashboardData) => {
  if (!clientDashboard || !clientLoginForm || !clientSignupForm) return
  const accountDetails = document.querySelector<HTMLDivElement>('#client-account-details')!
  const approval = document.querySelector<HTMLDivElement>('#client-approval-status')!
  const caseDetails = document.querySelector<HTMLDivElement>('#case-details')!
  accountDetails.innerHTML = `<p class="client-account-name">${escapeHtml(`${data.client.firstName} ${data.client.lastName}`)}</p><p class="client-account-email">${escapeHtml(data.client.email)}</p>`
  approval.innerHTML = data.client.approvalStatus === 'PENDING'
    ? `<section class="client-pending-card"><span class="eyebrow">Request received</span><strong>Awaiting council approval</strong><p>Your requested legal activity: <b>${escapeHtml(data.client.legalActivity || 'Not specified')}</b></p><small>Your case number and private chat will appear here after the council approves your matter.</small></section>`
    : ''
  caseDetails.innerHTML = data.cases.length
    ? data.cases.map((item) => `<article class="client-matter"><div class="client-matter-heading"><span>${escapeHtml(item.caseNumber)}</span><span class="client-case-status">${escapeHtml(item.status)}</span></div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.caseType)} · ${escapeHtml(item.court)}</p><div class="client-hearing"><span>Next hearing</span><strong>${item.hearings[0] ? `${escapeHtml(new Date(item.hearings[0].hearingDate).toLocaleString())}${item.hearings[0].purpose ? ` · ${escapeHtml(item.hearings[0].purpose)}` : ''}` : 'To be scheduled'}</strong></div></article>`).join('')
    : '<p class="form-note">No matters are currently assigned to this account. Contact the council if you expected a case to appear here.</p>'
  if (!data.cases.length && data.client.approvalStatus === 'PENDING') caseDetails.innerHTML = '<p class="client-empty-state">Your dashboard is ready. The council will add your case number and private chat after approving your request.</p>'
  data.cases.forEach((item, index) => {
    const matter = caseDetails.children[index]
    if (!(matter instanceof HTMLElement)) return
    matter.insertAdjacentHTML('beforeend', `<section class="client-files"><h4>Case files</h4>${item.documents?.length ? item.documents.map((file) => `<div class="client-file-row"><span><strong>${escapeHtml(file.title)}</strong><small>${escapeHtml(file.fileName)}</small></span><button type="button" class="client-view" data-client-view="${escapeHtml(file.id)}" data-file-name="${escapeHtml(file.fileName)}">View</button><button type="button" class="client-download" data-client-download="${escapeHtml(file.id)}" data-file-name="${escapeHtml(file.fileName)}">Download</button></div>`).join('') : '<p>No case files have been shared yet.</p>'}</section><section class="client-chat"><div class="client-chat-heading"><h4>Private matter chat</h4><span>Linked to your council team</span></div><div class="client-chat-messages">${(item.messages || []).length ? (item.messages || []).map((message) => `<article class="chat-message ${message.senderRole === 'CLIENT' ? 'chat-message-mine' : ''}"><strong>${escapeHtml(message.senderRole === 'CLIENT' ? 'You' : message.senderName)}</strong><p>${escapeHtml(message.body)}</p><time>${escapeHtml(new Date(message.createdAt).toLocaleString())}</time></article>`).join('') : '<p class="client-chat-empty">Send a message to start a private conversation about this matter.</p>'}</div><form class="client-chat-form" data-client-chat="${escapeHtml(item.id)}"><label for="client-chat-${escapeHtml(item.id)}">Message the council</label><textarea id="client-chat-${escapeHtml(item.id)}" name="body" rows="2" maxlength="3000" required placeholder="Write a message…"></textarea><button class="button button-gold" type="submit">Send message <span>→</span></button><p class="form-note" role="status"></p></form></section>`)
  })
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
    const legalActivity = (clientSignupForm.elements.namedItem('client-legal-activity') as HTMLSelectElement).value
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
      const response = await fetch(`${apiBase}/client/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName, lastName: lastNames.join(' ') || 'Client', legalActivity, phone, email, password }) })
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

  clientDashboard.addEventListener('click', async (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const downloadButton = target.closest<HTMLButtonElement>('[data-client-download]')
    const viewButton = target.closest<HTMLButtonElement>('[data-client-view]')
    const button = downloadButton || viewButton
    if (!button) return
    const viewInline = Boolean(viewButton)
    const preview = viewInline ? window.open('about:blank', '_blank') : null
    if (viewInline && !preview) { window.alert('Allow pop-ups to preview this case file.'); return }
    const token = localStorage.getItem(clientTokenKey)
    try {
      const documentId = button.dataset.clientDownload || button.dataset.clientView || ''
      const response = await fetch(`${apiBase}/client/documents/${encodeURIComponent(documentId)}${viewInline ? '?view=1' : ''}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!response.ok) throw new Error('Unable to access this case file.')
      const contentType = response.headers.get('content-type') || ''
      const href = contentType.includes('application/json') ? (await response.json() as { url: string }).url : URL.createObjectURL(await response.blob())
      if (viewInline && preview) { preview.location.href = href; if (href.startsWith('blob:')) window.setTimeout(() => URL.revokeObjectURL(href), 60000); return }
      const link = document.createElement('a')
      link.href = href
      link.download = button.dataset.fileName || 'case-file'
      if (contentType.includes('application/json')) link.target = '_blank'
      link.click()
      if (href.startsWith('blob:')) window.setTimeout(() => URL.revokeObjectURL(href), 60000)
    } catch (error) { preview?.close(); window.alert(error instanceof Error ? error.message : 'Unable to access this case file.') }
  })

  clientDashboard.addEventListener('submit', async (event) => {
    const form = event.target
    if (!(form instanceof HTMLFormElement) || !form.dataset.clientChat) return
    event.preventDefault()
    const token = localStorage.getItem(clientTokenKey)
    const note = form.querySelector<HTMLParagraphElement>('.form-note')
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')
    if (submit) submit.disabled = true
    if (note) note.textContent = 'Sending…'
    try {
      const response = await fetch(`${apiBase}/cases/${encodeURIComponent(form.dataset.clientChat)}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ body: new FormData(form).get('body') }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to send your message.')
      if (token) await loadClientDashboard(token)
    } catch (error) { if (note) note.textContent = error instanceof Error ? error.message : 'Unable to send your message.' }
    finally { if (submit) submit.disabled = false }
  })

  window.setInterval(() => {
    const token = localStorage.getItem(clientTokenKey)
    if (token && !clientDashboard.hidden && !clientDashboard.querySelector('.client-chat-form:focus-within')) loadClientDashboard(token).catch(() => {})
  }, 15000)

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
const readApiResult = async <T,>(response: Response): Promise<T> => {
  const text = await response.text()
  let result: Record<string, unknown> = {}
  try { result = text ? JSON.parse(text) as Record<string, unknown> : {} } catch { /* report a useful fallback below */ }
  if (!response.ok) {
    const message = typeof result.message === 'string' ? result.message : `The server returned ${response.status}. Please try again.`
    throw new Error(message)
  }
  return result as T
}
const restoreAdminSession = async () => {
  const token = localStorage.getItem(adminTokenKey)
  if (!token) return
  const note = adminLoginForm?.querySelector<HTMLParagraphElement>('.form-note')
  const submit = adminLoginForm?.querySelector<HTMLButtonElement>('button[type="submit"]')
  if (submit) submit.disabled = true
  if (note) note.textContent = 'Checking your saved session...'
  try {
    const response = await fetch(`${apiBase}/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
    renderAdminDashboard(await readApiResult<AdminDashboardData>(response))
  } catch {
    localStorage.removeItem(adminTokenKey)
    if (note) note.textContent = 'Your saved session expired. Sign in to continue.'
  } finally { if (submit) submit.disabled = false }
}
if (adminLoginForm && adminDashboard) {
  const restoreSession = restoreAdminSession()
  window.setInterval(() => {
    if (localStorage.getItem(adminTokenKey) && !adminDashboard.querySelector('form:focus-within')) adminWorkspace?.refresh().catch(() => {})
  }, 15000)
  adminLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    await restoreSession
    const form = event.currentTarget as HTMLFormElement
    const email = form.elements.namedItem('admin-email') as HTMLInputElement
    const password = form.elements.namedItem('admin-password') as HTMLInputElement
    const note = form.querySelector<HTMLParagraphElement>('.form-note')!
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!
    note.textContent = 'Signing in...'
    submit.disabled = true
    try {
      const response = await fetch(`${apiBase}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.value.trim().toLowerCase(), password: password.value }) })
      const result = await readApiResult<{ accessToken?: string; user?: { role?: string } }>(response)
      if (!result.accessToken || result.user?.role !== 'ADMIN') throw new Error('This sign-in is for administrator accounts only.')
      const dashboardResponse = await fetch(`${apiBase}/admin/dashboard`, { headers: { Authorization: `Bearer ${result.accessToken}` } })
      const dashboard = await readApiResult<AdminDashboardData>(dashboardResponse)
      localStorage.setItem(adminTokenKey, result.accessToken)
      note.textContent = ''
      renderAdminDashboard(dashboard)
    } catch (error) {
      localStorage.removeItem(adminTokenKey)
      note.textContent = error instanceof Error ? error.message : 'Unable to sign in.'
    } finally { submit.disabled = false }
  })
  document.querySelector<HTMLButtonElement>('#admin-logout')?.addEventListener('click', async () => {
    const token = localStorage.getItem(adminTokenKey)
    if (token) try { await fetch(`${apiBase}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }) } catch { /* local session still clears */ }
    localStorage.removeItem(adminTokenKey); adminWorkspace?.reset(); adminDashboard.hidden = true; adminLoginForm.hidden = false
  })
}
