import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const pages = [
  'index.html',
  'about.html',
  'chamber.html',
  'practice-areas.html',
  'insights.html',
  'contact.html',
  'client-portal.html',
  'admin.html'
]

export default defineConfig({
  // GitHub Pages serves this repository beneath its name; Vercel serves at /
  base: process.env.GITHUB_ACTIONS ? '/HE-Turaso-Law-Council/' : '/',
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map((page) => [page.replace('.html', ''), resolve(process.cwd(), page)]))
    }
  }
})
