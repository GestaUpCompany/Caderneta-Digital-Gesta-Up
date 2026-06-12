/**
 * Configuração de acesso por feature e fazenda.
 * Adicione os IDs das fazendas que devem ter acesso a cada funcionalidade.
 * Fazendas não listadas verão a tela de "Em Breve".
 */

export type FeatureKey =
  | 'entrada-insumos'
  | 'saida-insumos'
  | 'leitura-cocho'

export const FEATURE_ACCESS: Record<FeatureKey, string[]> = {
  'entrada-insumos': ['d649c65e-16ab-4b77-a84b-df937aa41cc3'],
  'saida-insumos': ['d649c65e-16ab-4b77-a84b-df937aa41cc3'],
  'leitura-cocho': ['d649c65e-16ab-4b77-a84b-df937aa41cc3'],
}
