#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Criar servidor MCP
const server = new Server(
  {
    name: 'supabase-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Listar ferramentas disponíveis
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'listar_fazendas',
        description: 'Lista todas as fazendas cadastradas no Supabase',
        inputSchema: {
          type: 'object',
          properties: {
            ativo: {
              type: 'boolean',
              description: 'Filtrar apenas fazendas ativas (opcional)',
            },
          },
        },
      },
      {
        name: 'obter_fazenda_por_acesso_id',
        description: 'Obtém uma fazenda pelo seu acesso_id',
        inputSchema: {
          type: 'object',
          properties: {
            acesso_id: {
              type: 'string',
              description: 'ID de acesso da fazenda',
            },
          },
          required: ['acesso_id'],
        },
      },
      {
        name: 'listar_pastos',
        description: 'Lista todos os pastos de uma fazenda',
        inputSchema: {
          type: 'object',
          properties: {
            fazenda_id: {
              type: 'string',
              description: 'ID da fazenda (UUID)',
            },
            ativo: {
              type: 'boolean',
              description: 'Filtrar apenas pastos ativos (opcional)',
            },
          },
          required: ['fazenda_id'],
        },
      },
      {
        name: 'listar_lotes',
        description: 'Lista todos os lotes de uma fazenda',
        inputSchema: {
          type: 'object',
          properties: {
            fazenda_id: {
              type: 'string',
              description: 'ID da fazenda (UUID)',
            },
            ativo: {
              type: 'boolean',
              description: 'Filtrar apenas lotes ativos (opcional)',
            },
          },
          required: ['fazenda_id'],
        },
      },
      {
        name: 'listar_registros_maternidade',
        description: 'Lista registros de maternidade de uma fazenda',
        inputSchema: {
          type: 'object',
          properties: {
            fazenda_id: {
              type: 'string',
              description: 'ID da fazenda (UUID)',
            },
            data_inicio: {
              type: 'string',
              description: 'Data de início (YYYY-MM-DD, opcional)',
            },
            data_fim: {
              type: 'string',
              description: 'Data de fim (YYYY-MM-DD, opcional)',
            },
          },
          required: ['fazenda_id'],
        },
      },
      {
        name: 'criar_fazenda',
        description: 'Cria uma nova fazenda',
        inputSchema: {
          type: 'object',
          properties: {
            acesso_id: {
              type: 'string',
              description: 'ID de acesso único para a fazenda',
            },
            nome: {
              type: 'string',
              description: 'Nome da fazenda',
            },
            cnpj: {
              type: 'string',
              description: 'CNPJ da fazenda (opcional)',
            },
            endereco: {
              type: 'string',
              description: 'Endereço (opcional)',
            },
            telefone: {
              type: 'string',
              description: 'Telefone (opcional)',
            },
            email: {
              type: 'string',
              description: 'Email (opcional)',
            },
          },
          required: ['acesso_id', 'nome'],
        },
      },
      {
        name: 'criar_pasto',
        description: 'Cria um novo pasto para uma fazenda',
        inputSchema: {
          type: 'object',
          properties: {
            fazenda_id: {
              type: 'string',
              description: 'ID da fazenda (UUID)',
            },
            nome: {
              type: 'string',
              description: 'Nome do pasto',
            },
            area_util_ha: {
              type: 'number',
              description: 'Área útil em hectares (opcional)',
            },
            especie: {
              type: 'string',
              description: 'Espécie de pastagem (opcional)',
            },
            altura_entrada_cm: {
              type: 'number',
              description: 'Altura de entrada em cm (opcional)',
            },
            altura_saida_cm: {
              type: 'number',
              description: 'Altura de saída em cm (opcional)',
            },
          },
          required: ['fazenda_id', 'nome'],
        },
      },
      {
        name: 'criar_lote',
        description: 'Cria um novo lote para uma fazenda',
        inputSchema: {
          type: 'object',
          properties: {
            fazenda_id: {
              type: 'string',
              description: 'ID da fazenda (UUID)',
            },
            nome: {
              type: 'string',
              description: 'Nome do lote',
            },
            n_cabecas: {
              type: 'integer',
              description: 'Número de cabeças (opcional)',
            },
            categorias: {
              type: 'string',
              description: 'Categorias (opcional)',
            },
            peso_vivo_kg: {
              type: 'number',
              description: 'Peso vivo em kg (opcional)',
            },
            qtd_bezerros: {
              type: 'integer',
              description: 'Quantidade de bezerros (opcional)',
            },
          },
          required: ['fazenda_id', 'nome'],
        },
      },
    ],
  };
});

// Executar ferramentas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'listar_fazendas': {
        let query = supabase.from('fazendas').select('*');
        
        if (args.ativo !== undefined) {
          query = query.eq('ativo', args.ativo);
        }
        
        const { data, error } = await query.order('nome');
        
        if (error) throw error;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'obter_fazenda_por_acesso_id': {
        const { data, error } = await supabase
          .from('fazendas')
          .select('*')
          .eq('acesso_id', args.acesso_id)
          .eq('ativo', true)
          .single();
        
        if (error) throw error;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'listar_pastos': {
        let query = supabase
          .from('pastos')
          .select('*')
          .eq('fazenda_id', args.fazenda_id);
        
        if (args.ativo !== undefined) {
          query = query.eq('ativo', args.ativo);
        }
        
        const { data, error } = await query.order('nome');
        
        if (error) throw error;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'listar_lotes': {
        let query = supabase
          .from('lotes')
          .select('*')
          .eq('fazenda_id', args.fazenda_id);
        
        if (args.ativo !== undefined) {
          query = query.eq('ativo', args.ativo);
        }
        
        const { data, error } = await query.order('nome');
        
        if (error) throw error;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'listar_registros_maternidade': {
        let query = supabase
          .from('registros_maternidade')
          .select('*')
          .eq('fazenda_id', args.fazenda_id)
          .is('deleted_at', null);
        
        if (args.data_inicio) {
          query = query.gte('data', args.data_inicio);
        }
        
        if (args.data_fim) {
          query = query.lte('data', args.data_fim);
        }
        
        const { data, error } = await query.order('data', { ascending: false });
        
        if (error) throw error;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'criar_fazenda': {
        const { data, error } = await supabase
          .from('fazendas')
          .insert({
            acesso_id: args.acesso_id,
            nome: args.nome,
            cnpj: args.cnpj || null,
            endereco: args.endereco || null,
            telefone: args.telefone || null,
            email: args.email || null,
            ativo: true,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        return {
          content: [
            {
              type: 'text',
              text: `Fazenda criada com sucesso: ${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case 'criar_pasto': {
        const { data, error } = await supabase
          .from('pastos')
          .insert({
            fazenda_id: args.fazenda_id,
            nome: args.nome,
            area_util_ha: args.area_util_ha || null,
            especie: args.especie || null,
            altura_entrada_cm: args.altura_entrada_cm || null,
            altura_saida_cm: args.altura_saida_cm || null,
            ativo: true,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        return {
          content: [
            {
              type: 'text',
              text: `Pasto criado com sucesso: ${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case 'criar_lote': {
        const { data, error } = await supabase
          .from('lotes')
          .insert({
            fazenda_id: args.fazenda_id,
            nome: args.nome,
            n_cabecas: args.n_cabecas || null,
            categorias: args.categorias || null,
            peso_vivo_kg: args.peso_vivo_kg || null,
            qtd_bezerros: args.qtd_bezerros || null,
            ativo: true,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        return {
          content: [
            {
              type: 'text',
              text: `Lote criado com sucesso: ${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Ferramenta desconhecida: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Erro: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Iniciar servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server com Supabase iniciado');
}

main().catch((error) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
