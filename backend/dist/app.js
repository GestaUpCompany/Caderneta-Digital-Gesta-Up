"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const sheetsController_1 = require("./controllers/sheetsController");
const syncController_1 = require("./controllers/syncController");
const suplementacaoController_1 = require("./controllers/suplementacaoController");
const insumosController_1 = require("./controllers/insumosController");
const devicesController_1 = require("./controllers/devicesController");
const pastagensController_1 = require("./controllers/pastagensController");
const authController_1 = require("./controllers/authController");
const versionController_1 = __importDefault(require("./controllers/versionController"));
const security_1 = require("./middleware/security");
const logger_1 = require("./utils/logger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use(express_1.default.json({ limit: '10mb' }));
app.use(security_1.securityHeaders);
app.use(security_1.requestLogger);
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    /^http:\/\/127\.0\.0\.1:\d+$/, // Permite qualquer porta 127.0.0.1
    'https://gestaupcompany.github.io',
    'https://gestaupcompany.github.io/Caderneta-Digital-Gesta-Up'
];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Permitir requests sem origin (como mobile apps ou curl)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.some(allowed => {
            if (allowed instanceof RegExp) {
                return allowed.test(origin);
            }
            return origin.startsWith(allowed);
        })) {
            callback(null, true);
        }
        else {
            console.log('CORS bloqueado para origin:', origin);
            callback(null, false); // Não permitir, mas não lançar erro
        }
    },
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
}));
const standardLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
});
const strictLimiter = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000,
    max: 20,
    message: { error: 'Limite de sincronização excedido. Aguarde 5 minutos.' },
});
app.use('/api', standardLimiter);
app.use('/api/sheets', sheetsController_1.sheetsRouter);
app.use('/api/sync', strictLimiter, syncController_1.syncRouter);
app.use('/api/suplementacao', suplementacaoController_1.suplementacaoRouter);
app.use('/api/insumos', insumosController_1.insumosRouter);
app.use('/api/devices', devicesController_1.devicesRouter);
app.use('/api/pastagens', pastagensController_1.pastagensRouter);
app.use('/api/auth', authController_1.authRouter);
app.use('/api', versionController_1.default);
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
    });
});
app.use(security_1.errorHandler);
app.listen(PORT, () => {
    logger_1.logger.info(`🚀 Backend Cadernetas Digitais rodando na porta ${PORT}`);
    logger_1.logger.info(`📊 Health check: http://localhost:${PORT}/api/health`);
    logger_1.logger.info(`🔗 Sheets API: http://localhost:${PORT}/api/sheets`);
    logger_1.logger.info(`🔄 Sync API: http://localhost:${PORT}/api/sync`);
});
exports.default = app;
