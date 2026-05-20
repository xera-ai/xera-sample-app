import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '..', 'docs', 'screenshots')
await mkdir(outDir, { recursive: true })

const baseUrl = process.env.BASE_URL ?? 'http://localhost:5173'

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
})
const page = await ctx.newPage()

async function shot(name, path) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: false })
  console.log(`✓ ${name}.png`)
}

// 1. Login (unauthenticated)
await shot('01-login', '/login')

// Authenticate via API + seed localStorage
const loginRes = await page.evaluate(async (url) => {
  const r = await fetch(`${url}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: 'admin123' }),
  })
  return r.json()
}, baseUrl)

await page.evaluate((data) => {
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
  localStorage.setItem(
    'auth-storage',
    JSON.stringify({
      state: {
        user: data.user,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        isAuthenticated: true,
        isAdmin: data.user.role === 'admin',
      },
      version: 0,
    })
  )
}, loginRes)

// 2. Dashboard
await shot('02-dashboard', '/')

// 3. Projects list
await shot('03-projects', '/projects')

// 4. Project detail (Kanban)
await shot('04-kanban', '/projects/project-1')

// 5. Task detail
await shot('05-task', '/tasks/task-1')

// 6. Admin users
await shot('06-admin', '/admin/users')

await browser.close()
console.log(`\nSaved to ${outDir}`)
