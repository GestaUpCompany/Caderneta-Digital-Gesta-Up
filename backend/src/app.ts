import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { sheetsRouter } from './controllers/sheetsController'
import { logger } from './utils/logger'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:5174').split(',')
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some((o) => origin.startsWith(o.trim()))) {
      callback(null, true)
    } else {
      callback(new Error(`Origem não permitida: ${origin}`))
    }
  },
  methods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['Content-Type'],
}))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
})
app.use('/api', limiter)

app.use('/api/sheets', sheetsRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  logger.info(`Backend rodando na porta ${PORT}`)
})

export default app
