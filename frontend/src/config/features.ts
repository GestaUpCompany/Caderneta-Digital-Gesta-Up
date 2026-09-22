/**
 * Configuração de acesso por feature e fazenda.
 * Adicione os IDs das fazendas que devem ter acesso a cada funcionalidade.
 * Fazendas não listadas verão a tela de "Em Breve".
 */

export type FeatureKey =
  | 'entrada-insumos'
  | 'saida-insumos'
  | 'leitura-cocho'

const FAZENDAS_COM_INSUMOS = [
  'd649c65e-16ab-4b77-a84b-df937aa41cc3',
  'd3965505-74d5-4af7-9858-f773d2e8aab3',
]

export const FEATURE_ACCESS: Record<FeatureKey, string[]> = {
  'entrada-insumos': FAZENDAS_COM_INSUMOS,
  'saida-insumos': FAZENDAS_COM_INSUMOS,
  'leitura-cocho': [
    'd649c65e-16ab-4b77-a84b-df937aa41cc3',
    'd8900758-1e41-4855-a55e-17f8e00fea7e',
  ],
}
