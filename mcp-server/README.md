# MCP Server - Supabase

Servidor MCP (Model Context Protocol) para interagir com o Supabase do projeto Caderneta Digital Gesta-Up.

## Instalação

```bash
cd mcp-server
npm install
```

## Configuração

1. Copie o arquivo `.env.example` para `.env`
2. Preencha com suas credenciais do Supabase

```bash
cp .env.example .env
```

Edite o `.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

## Uso

### Executar o servidor

```bash
npm start
```

### Executar em modo desenvolvimento (com auto-reload)

```bash
npm run dev
```

## Ferramentas Disponíveis

### Fazendas

- `listar_fazendas` - Lista todas as fazendas
- `obter_fazenda_por_acesso_id` - Obtém fazenda pelo acesso_id
- `criar_fazenda` - Cria nova fazenda

### Cadastros

- `listar_pastos` - Lista pastos de uma fazenda
- `criar_pasto` - Cria novo pasto
- `listar_lotes` - Lista lotes de uma fazenda
- `criar_lote` - Cria novo lote

### Registros

- `listar_registros_maternidade` - Lista registros de maternidade

## Integração com AI

Este servidor MCP pode ser usado com modelos de AI que suportam o protocolo MCP para interagir com o banco de dados Supabase de forma estruturada e segura.

## Segurança

- Usa anon key do Supabase (não expõe service role key)
- RLS (Row Level Security) do Supabase restringe acesso
- Validação de fazenda_id em todas as queries
