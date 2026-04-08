import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { sheetsRouter } from './controllers/sheetsController'
import { syncRouter } from './controllers/syncController'
import versionRouter from './controllers/versionController'
import { securityHeaders, requestLogger, errorHandler } from './middleware/security'
import { logger } from './utils/logger'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json({ limit: '10mb' }))
app.use(securityHeaders)
app.use(requestLogger)

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:5174,https://gestaupcompany.github.io').split(',')
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some((o) => origin.startsWith(o.trim()))) {
      callback(null, true)
    } else {
      callback(new Error(`Origem não permitida: ${origin}`))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
})

const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: { error: 'Limite de sincronização excedido. Aguarde 5 minutos.' },
})

app.use('/api', standardLimiter)
app.use('/api/sheets', sheetsRouter)
app.use('/api/sync', strictLimiter, syncRouter)
app.use('/api', versionRouter)

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
  })
})

app.use(errorHandler)

app.listen(PORT, () => {
  logger.info(`🚀 Backend Cadernetas Digitais rodando na porta ${PORT}`)
  logger.info(`📊 Health check: http://localhost:${PORT}/api/health`)
  logger.info(`🔗 Sheets API: http://localhost:${PORT}/api/sheets`)
  logger.info(`🔄 Sync API: http://localhost:${PORT}/api/sync`)
})

export default app
