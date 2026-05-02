"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const versionRouter = (0, express_1.Router)();
// Informações da versão atual
const CURRENT_VERSION = {
    version: '1.0.0',
    downloadUrl: 'https://github.com/GestaUpCompany/Caderneta-Digital-Gesta-Up/releases/latest',
    changelog: [
        'Versão inicial do aplicativo',
        'Funcionalidades completas de cadernetas',
        'Sincronização com Google Sheets',
        'Suporte offline'
    ],
    mandatory: false,
    releaseDate: '2026-04-08'
};
versionRouter.get('/version', (req, res) => {
    try {
        console.log('API /version chamada de:', req.headers.origin);
        res.json({
            success: true,
            data: CURRENT_VERSION
        });
    }
    catch (error) {
        console.error('Erro na API /version:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter informações da versão'
        });
    }
});
// Endpoint para atualizar informações de versão (admin)
versionRouter.post('/version', (req, res) => {
    try {
        const { version, downloadUrl, changelog, mandatory } = req.body;
        // Validar dados
        if (!version || !downloadUrl) {
            return res.status(400).json({
                success: false,
                error: 'Versão e URL de download são obrigatórios'
            });
        }
        // Em produção, isso viria de um banco de dados
        // Por agora, apenas retornamos sucesso
        res.json({
            success: true,
            message: 'Versão atualizada com sucesso',
            data: {
                version,
                downloadUrl,
                changelog: changelog || [],
                mandatory: mandatory || false,
                releaseDate: new Date().toISOString().split('T')[0]
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar versão'
        });
    }
});
exports.default = versionRouter;
