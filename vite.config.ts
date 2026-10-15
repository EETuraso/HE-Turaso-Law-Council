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
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map((page) => [page.replace('.html', ''), resolve(process.cwd(), page)]))
    }
  }
})
