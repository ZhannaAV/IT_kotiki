import dotenv from 'dotenv'
import cors from 'cors'
import type { ViteDevServer } from 'vite'
import { createServer as createViteServer } from 'vite'
import { createProxyMiddleware } from 'http-proxy-middleware'
import express from 'express'
import * as path from 'path'
import * as fs from 'fs'
import router from './routes'
import { dbConnect } from './db'
import { authMiddleware } from './middlewares/authMiddleware'

dotenv.config()

async function startServer() {
  const app = express()

  await dbConnect()

  app.use(
    cors({
      credentials: true,
      origin: [`http://localhost:${process.env.CLIENT_PORT}`],
    })
  )
  app.use('/api/forum', authMiddleware, router)

  const port = Number(process.env.SERVER_PORT) || 3000

  const isDev = () => process.env.NODE_ENV === 'development'

  let vite: ViteDevServer | undefined
  const distPath = path.dirname(require.resolve('client/dist/index.html'))
  const clientPath = path.dirname(require.resolve('client'))
  const ssrDistPath = require.resolve('client/dist-ssr/client.cjs')

  if (isDev()) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      root: clientPath,
      appType: 'custom',
    })
    app.use(vite.middlewares)
  }

  app.use(
    '/api/v2',
    createProxyMiddleware({
      changeOrigin: true,
      cookieDomainRewrite: {
        '*': '',
      },
      target: 'https://ya-praktikum.tech/api/v2',
    })
  )

  if (!isDev()) {
    app.use('/assets', express.static(path.resolve(distPath, 'assets')))
    app.use('/', express.static(path.resolve(clientPath, 'public')))
  }

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl

    try {
      let template: string
      let render: (url: string) => Promise<{
        html: string
        initialState: Record<string, unknown>
        cookie: string
      }>

      if (isDev() && vite) {
        template = fs.readFileSync(
          path.resolve(clientPath, 'index.html'),
          'utf-8'
        )
        template = await vite.transformIndexHtml(url, template)
        render = await vite
          .ssrLoadModule(path.resolve(clientPath, 'ssr.tsx'))
          .then(module => module.render)
      } else {
        template = fs.readFileSync(
          path.resolve(distPath, 'index.html'),
          'utf-8'
        )
        render = (await import(ssrDistPath)).render
      }

      const { html: appHtml, initialState } = await render(url)

      const html = template
        .replace(`<!--ssr-outlet-->`, appHtml)
        .replace(
          `<!--ssr-initial-state-->`,
          `<script>window.APP_INITIAL_STATE = ${JSON.stringify(
            initialState
          )}</script>`
        )

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (e) {
      next(e)
    }
  })

  app.listen(port, () => {
    console.log(`  ➜ 🎸 Server is listening on port: ${port}`)
  })
}

startServer()
