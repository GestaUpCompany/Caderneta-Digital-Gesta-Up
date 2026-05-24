import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const limpezaConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'DADOS DA LIMPEZA', order: 1, icon: '🧹' },
  ],
  fieldConfig: {
    numeroEquipe: { key: 'numeroEquipe', section: 'DADOS DA LIMPEZA', priority: 1 },
    setor: { key: 'setor', section: 'DADOS DA LIMPEZA', priority: 2 },
    local: { key: 'local', section: 'DADOS DA LIMPEZA', priority: 3 },
    horaInicio: { key: 'horaInicio', section: 'DADOS DA LIMPEZA', priority: 4 },
    horaFinal: { key: 'horaFinal', section: 'DADOS DA LIMPEZA', priority: 5 },
    limpezaRealizada: {
      key: 'limpezaRealizada', section: 'DADOS DA LIMPEZA', priority: 6, colSpan: 2,
      format: (v) => {
        if (!Array.isArray(v)) return String(v)
        const labelMap: Record<string, string> = {
          capina: 'Capina', grama: 'Grama', herbicida: 'Herbicida', veiculo: 'Veículo',
          moto: 'Moto', trator: 'Trator', implemento: 'Implemento', barracao: 'Barracão',
          curral: 'Curral', banheiros: 'Banheiros', sede: 'Sede', alojamento: 'Alojamento',
          pocilga: 'Pocilga', galinheiro: 'Galinheiro', aprisco: 'Aprisco', baias: 'Baias',
          tanque: 'Tanque', jardins: 'Jardins', oficina: 'Oficina', corredores: 'Corredores',
          aceiros: 'Aceiros', entrada: 'Entrada', pista: 'Pista', reservatorio: 'Reservatório',
          poda_arvores: 'Poda Árvores', lixo_recolhido: 'Lixo Recolhido', patio: 'Pátio',
          rocada: 'Roçada', horta: 'Horta',
        }
        return (v as string[]).map(x => labelMap[x] || x).join(', ')
      }
    },
    observacao: { key: 'observacao', section: 'DADOS DA LIMPEZA', priority: 7, colSpan: 2 },
  },
  hiddenFields: [],
}
