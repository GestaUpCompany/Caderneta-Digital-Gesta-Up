"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityHeaders = securityHeaders;
exports.requestLogger = requestLogger;
exports.errorHandler = errorHandler;
const logger_1 = require("../utils/logger");
function securityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
}
function requestLogger(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const message = `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`;
        if (res.statusCode >= 400) {
            logger_1.logger.warn(message);
        }
        else {
            logger_1.logger.info(message);
        }
    });
    next();
}
function errorHandler(err, req, res, _next) {
    logger_1.logger.error(`Erro não tratado: ${err.message}\n${err.stack}`);
    if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message,
        stack: err.stack,
    });
}
