# ListaRegistros Refactor Proposal

## Problem Statement

The current `ListaRegistros` component has hardcoded field orders and display logic for each caderneta. This makes it difficult to:
- Add new cadernetas
- Modify display logic for existing cadernetas
- Maintain consistency across different cadernetas
- Test display configurations independently

Each caderneta requires modifying the component with large conditional blocks, leading to:
- Large, hard-to-maintain component files
- Duplicated logic across cadernetas
- Tight coupling between display logic and component
- Difficult to visualize the structure of each caderneta

## Proposed Solution: Configuration-Based Display

Move all caderneta-specific display logic into configuration files, making `ListaRegistros` a generic renderer that reads from these configs.

## Architecture

### 1. Configuration Types

```typescript
// config/registroDisplayConfig.ts

interface FieldConfig {
  key: string
  label?: string  // Override default label from LABELS_BY_CADERNETA
  section: string
  colSpan?: 1 | 2  // Column span in grid (default: 1)
  priority?: number  // Order within section (default: 0)
  format?: (value: unknown, registro: Registro) => string  // Custom formatter
  condition?: (registro: Registro) => boolean  // Conditional display
  icon?: string  // Optional icon for the field
}

interface SectionConfig {
  title: string
  order: number  // Display order
  icon?: string  // Section icon
  colSpan?: 1 | 2  // Default colSpan for fields in this section
}

interface CadernetaDisplayConfig {
  sections: SectionConfig[]
  fieldConfig: Record<string, FieldConfig>
  hiddenFields?: string[]  // Fields to never display
  specialComponents?: Record<string, (registro: Registro) => ReactNode>  // Custom renderers
  defaultFormatter?: (key: string, value: unknown) => string  // Caderneta-wide formatter
}
```

### 2. Configuration Example: Pastagens

```typescript
// config/cadernetas/pastagens.ts

import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const pastagensConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'IDENTIFICAÇÃO', order: 1, icon: '👤' },
    { title: 'PASTO SAÍDA', order: 2, icon: '🌾' },
    { title: 'PASTO ENTRADA', order: 3, icon: '🌾' },
    { title: 'QUANTIDADE DE ANIMAIS', order: 4, icon: '🐄' },
    { title: 'AVALIAÇÃO', order: 5, icon: '⭐' },
  ],

  fieldConfig: {
    // Identificação
    manejador: { 
      key: 'manejador', 
      section: 'IDENTIFICAÇÃO', 
      priority: 1,
      colSpan: 2
    },

    // Pasto Saída
    pastoSaida: { 
      key: 'pastoSaida', 
      section: 'PASTO SAÍDA', 
      priority: 1,
      colSpan: 2
    },
    pastoSaidaAreaUtil: { 
      key: 'pastoSaidaAreaUtil', 
      section: 'PASTO SAÍDA', 
      priority: 2,
      format: (v) => `${v} ha`
    },
    pastoSaidaEspecie: { 
      key: 'pastoSaidaEspecie', 
      section: 'PASTO SAÍDA', 
      priority: 3
    },
    avaliacaoSaida: { 
      key: 'avaliacaoSaida', 
      section: 'PASTO SAÍDA', 
      priority: 4
    },
    tempoOcupacao: { 
      key: 'tempoOcupacao', 
      section: 'PASTO SAÍDA', 
      priority: 5
    },

    // Pasto Entrada
    pastoEntrada: { 
      key: 'pastoEntrada', 
      section: 'PASTO ENTRADA', 
      priority: 1,
      colSpan: 2
    },
    pastoEntradaAreaUtil: { 
      key: 'pastoEntradaAreaUtil', 
      section: 'PASTO ENTRADA', 
      priority: 2,
      format: (v) => `${v} ha`
    },
    pastoEntradaEspecie: { 
      key: 'pastoEntradaEspecie', 
      section: 'PASTO ENTRADA', 
      priority: 3
    },
    avaliacaoEntrada: { 
      key: 'avaliacaoEntrada', 
      section: 'PASTO ENTRADA', 
      priority: 4
    },
    tempoVedacao: { 
      key: 'tempoVedacao', 
      section: 'PASTO ENTRADA', 
      priority: 5
    },

    // Quantidade de Animais
    numeroLote: { 
      key: 'numeroLote', 
      section: 'QUANTIDADE DE ANIMAIS', 
      priority: 1,
      colSpan: 2
    },
    gadoContado: { 
      key: 'gadoContado', 
      section: 'QUANTIDADE DE ANIMAIS', 
      priority: 2,
      colSpan: 2
    },
    totalAnimais: { 
      key: 'totalAnimais', 
      section: 'QUANTIDADE DE ANIMAIS', 
      priority: 3,
      colSpan: 2,
      format: (v) => `${v} animais`,
      condition: (r) => r.totalAnimais > 0
    },
    vaca: { 
      key: 'vaca', 
      section: 'QUANTIDADE DE ANIMAIS', 
      priority: 4,
      condition: (r) => r.gadoContado === 'Sim' && Number(r.vaca) > 0
    },
    touro: { 
      key: 'touro', 
      section: 'QUANTIDADE DE ANIMAIS', 
      priority: 5,
      condition: (r) => r.gadoContado === 'Sim' && Number(r.touro) > 0
    },
    // ... other animal categories

    // Avaliação
    escoreGado: { 
      key: 'escoreGado', 
      section: 'AVALIAÇÃO', 
      priority: 1,
      colSpan: 2
    },
  },

  hiddenFields: ['n_cabecas', 'qtd_bezerros', 'googleRowId', 'version', 'lastModified', 'syncStatus'],
}
```

### 3. Configuration Example: Maternidade

```typescript
// config/cadernetas/maternidade.ts

export const maternidadeConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'INFORMAÇÕES BÁSICAS', order: 1, icon: '📋' },
    { title: 'IDENTIFICAÇÃO DA MÃE', order: 2, icon: '🐄' },
    { title: 'IDENTIFICAÇÃO DA CRIA', order: 3, icon: '👶' },
    { title: 'TRATAMENTO', order: 4, icon: '💊' },
  ],

  fieldConfig: {
    // Informações Básicas
    pasto: { key: 'pasto', section: 'INFORMAÇÕES BÁSICAS', priority: 1 },
    lote: { key: 'lote', section: 'INFORMAÇÕES BÁSICAS', priority: 2 },

    // Identificação da Mãe
    idBrincoMae: { 
      key: 'idBrincoMae', 
      section: 'IDENTIFICAÇÃO DA MÃE', 
      priority: 1,
      colSpan: 2
    },
    idChipMae: { 
      key: 'idChipMae', 
      section: 'IDENTIFICAÇÃO DA MÃE', 
      priority: 2,
      colSpan: 2
    },
    categoriaMae: { 
      key: 'categoriaMae', 
      section: 'IDENTIFICAÇÃO DA MÃE', 
      priority: 3
    },
    escoreMatriz: { 
      key: 'escoreMatriz', 
      section: 'IDENTIFICAÇÃO DA MÃE', 
      priority: 4
    },

    // Identificação da Cria
    pesoCria: { 
      key: 'pesoCria', 
      section: 'IDENTIFICAÇÃO DA CRIA', 
      priority: 1,
      format: (v) => `${v} kg`
    },
    idProvisorioCria: { 
      key: 'idProvisorioCria', 
      section: 'IDENTIFICAÇÃO DA CRIA', 
      priority: 2
    },
    idBrincoCria: { 
      key: 'idBrincoCria', 
      section: 'IDENTIFICAÇÃO DA CRIA', 
      priority: 3
    },
    idChipCria: { 
      key: 'idChipCria', 
      section: 'IDENTIFICAÇÃO DA CRIA', 
      priority: 4
    },
    sexo: { 
      key: 'sexo', 
      section: 'IDENTIFICAÇÃO DA CRIA', 
      priority: 5
    },
    raca: { 
      key: 'raca', 
      section: 'IDENTIFICAÇÃO DA CRIA', 
      priority: 6
    },

    // Tratamento
    tratamento: { 
      key: 'tratamento', 
      section: 'TRATAMENTO', 
      priority: 1,
      colSpan: 2,
      format: (v) => Array.isArray(v) ? v.join(', ') : v
    },
    tipoParto: { 
      key: 'tipoParto', 
      section: 'TRATAMENTO', 
      priority: 2
    },
  },

  specialComponents: {
    diagnosticos: (registro) => {
      if (!registro.diagnosticos) return null
      return (
        <div className="col-span-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">DIAGNÓSTICOS</p>
          {Object.entries(registro.diagnosticos).map(([key, data]) => {
            if (data.valor) {
              return (
                <div key={key} className="text-base font-semibold text-gray-900">
                  {key}: {data.valor === 'S' ? 'Sim' : 'Não'}
                  {data.observacao && <span className="text-sm"> ({data.observacao})</span>}
                </div>
              )
            }
            return null
          })}
        </div>
      )
    }
  },

  hiddenFields: ['googleRowId', 'version', 'lastModified', 'syncStatus'],
}
```

### 4. Configuration Example: Almoxarifado (Complex Data)

```typescript
// config/cadernetas/almoxarifado.ts

export const almoxarifadoConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'DADOS DA RETIRADA', order: 1, icon: '📦' },
    { title: 'ITENS', order: 2, icon: '🔧' },
  ],

  fieldConfig: {
    quemEntregou: { 
      key: 'quemEntregou', 
      section: 'DADOS DA RETIRADA', 
      priority: 1,
      colSpan: 2
    },
    quemPegou: { 
      key: 'quemPegou', 
      section: 'DADOS DA RETIRADA', 
      priority: 2,
      colSpan: 2
    },
    observacao: { 
      key: 'observacao', 
      section: 'DADOS DA RETIRADA', 
      priority: 3,
      colSpan: 2
    },
  },

  specialComponents: {
    itens: (registro) => {
      if (!registro.itens || !Array.isArray(registro.itens)) return null
      return (
        <div className="col-span-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">ITENS</p>
          {registro.itens.map((item, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-2 mb-2">
              <p className="text-sm font-semibold text-gray-900">
                {index + 1}. {item.tipo}
              </p>
              <p className="text-sm text-gray-700">Quantidade: {item.quantidade}</p>
              {item.setor && <p className="text-sm text-gray-700">Setor: {item.setor}</p>}
              {item.necessitaDevolucao === 'S' && (
                <p className="text-sm text-orange-600">Devolução: Sim ({item.prazoDevolucao})</p>
              )}
            </div>
          ))}
        </div>
      )
    }
  },

  hiddenFields: ['googleRowId', 'version', 'lastModified', 'syncStatus'],
}
```

### 5. Central Configuration Registry

```typescript
// config/registroDisplayConfig.ts

import { CadernetaDisplayConfig } from './types'
import { pastagensConfig } from './cadernetas/pastagens'
import { maternidadeConfig } from './cadernetas/maternidade'
import { rodeioConfig } from './cadernetas/rodeio'
import { bebedourosConfig } from './cadernetas/bebedouros'
// ... import other configs

export const CADERNETA_DISPLAY_CONFIG: Record<CadernetaStore, CadernetaDisplayConfig> = {
  pastagens: pastagensConfig,
  maternidade: maternidadeConfig,
  rodeio: rodeioConfig,
  bebedouros: bebedourosConfig,
  // ... other cadernetas
}
```

### 6. Updated ListaRegistros Component

```typescript
// components/cadernetas/ListaRegistros.tsx

import { CADERNETA_DISPLAY_CONFIG } from '../../config/registroDisplayConfig'
import { LABELS_BY_CADERNETA } from '../../config/labelConfig'

// ... existing imports

export default function ListaRegistros({ caderneta, titulo, rotaForm }: Props) {
  // ... existing state and logic

  const config = CADERNETA_DISPLAY_CONFIG[caderneta] || {
    sections: [],
    fieldConfig: {},
    hiddenFields: [],
    specialComponents: {}
  }

  const formatFieldValue = (key: string, value: unknown): string => {
    const fieldConfig = config.fieldConfig[key]
    if (fieldConfig?.format) {
      return fieldConfig.format(value, registro)
    }
    if (config.defaultFormatter) {
      return config.defaultFormatter(key, value)
    }
    // Fallback to existing formatter
    return formatFieldValueDefault(key, value)
  }

  // ... existing code

  return (
    // ... existing header and filters

    <div className="flex flex-col gap-3">
      {registrosFiltradosFinal.map((registro) => (
        <div key={registro.id} className="bg-white rounded-2xl p-4 border-2 border-gray-200 shadow-sm">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{statusLabel[registro.syncStatus] ?? '⏳'}</span>
              <span className="text-base font-bold text-gray-800">{registro.data as string}</span>
            </div>
            <span className="text-xs text-gray-400 font-mono">{(registro.id as string).slice(0, 8)}</span>
          </div>

          {/* User */}
          {usuario && (
            <div className="mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">USUÁRIO</p>
              <p className="text-base font-semibold text-gray-900">{usuario}</p>
            </div>
          )}

          {/* Render sections */}
          {config.sections
            .sort((a, b) => a.order - b.order)
            .map((section) => {
              const sectionFields = Object.values(config.fieldConfig)
                .filter(f => f.section === section.title)
                .filter(f => !f.condition || f.condition(registro))
                .sort((a, b) => (a.priority || 0) - (b.priority || 0))

              if (sectionFields.length === 0) return null

              return (
                <div key={section.title} className="mb-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">
                    {section.icon} {section.title}
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {sectionFields.map((field) => {
                      const value = registro[field.key]
                      if (value === null || value === undefined || value === '') return null

                      const label = field.label || LABELS_BY_CADERNETA[caderneta]?.[field.key] || field.key.toUpperCase()

                      return (
                        <div key={field.key} className={field.colSpan === 2 ? 'col-span-2' : ''}>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                            {field.icon && `${field.icon} `}{label}
                          </p>
                          <p className="text-base font-semibold text-gray-900 break-words whitespace-normal">
                            {formatFieldValue(field.key, value)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

          {/* Render special components */}
          {config.specialComponents && Object.entries(config.specialComponents).map(([key, Component]) => (
            <div key={key}>
              <Component registro={registro} />
            </div>
          ))}

          {/* Actions */}
          <div className="flex gap-2 border-t border-gray-100 pt-3">
            <Button onClick={() => handleExcluir(registro.id)} variant="danger" size="sm" icon="🗑️">
              EXCLUIR
            </Button>
            <Button onClick={() => handleCompartilhar(registro)} variant="ghost" size="sm" icon="🔗">
              COMPARTILHAR
            </Button>
          </div>
        </div>
      ))}
    </div>

    // ... existing modals
  )
}
```

## Benefits

1. **Separation of Concerns**: Display logic separated from component logic
2. **Maintainability**: Each caderneta has its own config file
3. **Consistency**: All cadernetas follow the same structure
4. **Testability**: Configs are pure data, easy to test
5. **Extensibility**: Add new cadernetas by adding config, not modifying component
6. **Flexibility**: Custom formatters, conditions, and components per caderneta
7. **Type Safety**: TypeScript can validate configs
8. **Visual Clarity**: Easy to see the structure of each caderneta
9. **Backward Compatible**: Can migrate cadernetas one at a time
10. **Reusability**: Configs can be shared between display and share functions

## Implementation Steps

### Phase 1: Setup (Foundation)
1. Create `config/registroDisplayConfig.ts` with type definitions
2. Create `config/cadernetas/` directory
3. Implement central config registry
4. Update `ListaRegistros` to use config (with fallback to existing logic)

### Phase 2: Migration (One caderneta at a time)
1. Start with a simple caderneta (e.g., `cantina` or `limpeza`)
2. Create config file
3. Test display
4. Fix any issues
5. Move to next caderneta

### Phase 3: Advanced Features
1. Add special components support
2. Add custom formatters
3. Add conditional display
4. Optimize performance

### Phase 4: Cleanup
1. Remove old hardcoded logic from `ListaRegistros`
2. Remove fallback logic
3. Add tests for configs
4. Update documentation

## Migration Strategy

**Option A: Gradual Migration**
- Keep existing logic as fallback
- Migrate cadernetas one at a time
- Test each migration thoroughly
- Remove old logic after all migrated

**Option B: Big Bang**
- Create all configs at once
- Switch to new system
- Fix issues as they arise
- Riskier but faster

**Recommended: Option A** - Gradual migration is safer and allows for testing each caderneta individually.

## Future Enhancements

1. **Config Validation**: Add runtime validation to ensure configs are correct
2. **Config Generator**: Auto-generate config from existing form structure
3. **Visual Config Editor**: UI to edit display configs
4. **A/B Testing**: Test different display configurations
5. **User Customization**: Allow users to customize display per caderneta
6. **Analytics**: Track which fields are most viewed
7. **Responsive Configs**: Different configs for mobile vs desktop
8. **Theme Support**: Configurable colors and styles per caderneta

## Notes

- This refactor focuses on the **display** aspect of `ListaRegistros`
- Filtering and sorting logic can remain as-is or also be moved to config
- The share text generation (`shareUtils.ts`) could also benefit from this approach
- Consider using the same config for both list display and share text generation
