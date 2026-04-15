Cronograma para migração para Supabase (estimado 2-3 semanas) IGNORAR POR ENQUANTO:

Semana 1: Planejamento e Setup

Criar conta no Supabase
Criar projeto e configurar banco PostgreSQL
Definir schema do banco (tabelas para cada caderneta)
Criar tabelas baseadas na estrutura atual das planilhas
Configurar Row Level Security (RLS)
Testar conexão do backend com Supabase
Semana 2: Migração de Backend

Instalar cliente Supabase no backend
Substituir chamadas Google Sheets API por Supabase client
Adaptar syncService para usar Supabase em vez de planilhas
Atualizar conflictService para trabalhar com Supabase
Migrar validações backend (Joi) para Supabase constraints
Testar operações CRUD no backend
Semana 3: Frontend e Deploy

Atualizar frontend para usar novo endpoint do backend (se necessário)
Testar fluxo completo (frontend → backend → Supabase)
Migrar dados existentes das planilhas para Supabase
Deploy do backend atualizado no Vercel
Monitorar e ajustar performance