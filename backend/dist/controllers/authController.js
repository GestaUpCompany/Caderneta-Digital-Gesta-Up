"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = __importDefault(require("express"));
const supabase_js_1 = require("@supabase/supabase-js");
const router = express_1.default.Router();
exports.authRouter = router;
// POST /api/auth/login-peao - Faz login do peão e retorna token JWT
router.post('/login-peao', async (req, res) => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceRoleKey) {
            return res.status(500).json({ error: 'Configuração do Supabase não encontrada' });
        }
        const { acesso_id } = req.body;
        if (!acesso_id) {
            return res.status(400).json({ error: 'acesso_id é obrigatório' });
        }
        // Criar cliente Supabase com service role key
        const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceRoleKey);
        // Buscar peão pelo acesso_id da fazenda
        const { data: peao, error: peaoError } = await supabase
            .from('peoes')
            .select('*')
            .eq('fazenda_id', acesso_id)
            .eq('ativo', true)
            .single();
        if (peaoError || !peao) {
            return res.status(404).json({ error: 'Peão não encontrado para esta fazenda' });
        }
        // Fazer login no Supabase Auth com email/senha do peão
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: peao.email,
            password: peao.password,
        });
        if (authError) {
            return res.status(401).json({ error: 'Erro ao fazer login: ' + authError.message });
        }
        // Retornar o token JWT e dados da sessão
        res.json({
            success: true,
            access_token: authData.session.access_token,
            refresh_token: authData.session.refresh_token,
            user: authData.user,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro interno: ' + error.message });
    }
});
