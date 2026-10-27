import { describe, expect, it } from 'vitest'
import { FAZENDA_DE_TESTES_ID, marmitaDetalhadaLiberada } from './constants'
import {
  chaveEmpresa,
  destinatarioDoDetalhe,
  detalheParaGrade,
  divisaoMarmitas,
  empresaVazia,
  empresasDosDetalhes,
  erroDoDetalhe,
  gradeVazia,
  inteiroDe,
  normalizarEmpresa,
  paraDetalhe,
  pendenciaGrade,
  resumoRefeicoes,
  totaisDetalhe,
  type GradeMarmitasForm,
} from './cantinaMarmitas'

const grade = (): GradeMarmitasForm => ({
  interna: { cafe_manha: '', lanche: '', almoco: '30', jantar: '20' },
  terceirizadas: [
    { id: 'a', empresa: ' Construtora   Silva ', cafe_manha: '', lanche: '', almoco: '12', jantar: '5' },
  ],
})

describe('marmitaDetalhadaLiberada', () => {
  it('só a fazenda de testes vê a grade; as demais seguem com o formulário atual', () => {
    expect(marmitaDetalhadaLiberada(FAZENDA_DE_TESTES_ID)).toBe(true)
    expect(marmitaDetalhadaLiberada('outra-fazenda')).toBe(false)
    expect(marmitaDetalhadaLiberada(null)).toBe(false)
    expect(marmitaDetalhadaLiberada(undefined)).toBe(false)
  })
})

describe('inteiroDe', () => {
  it('converte texto do Stepper em inteiro >= 0', () => {
    expect(inteiroDe('12')).toBe(12)
    expect(inteiroDe('')).toBe(0)
    expect(inteiroDe('abc')).toBe(0)
    expect(inteiroDe('-3')).toBe(0)
    expect(inteiroDe('2,7')).toBe(2)
  })
})

describe('normalizarEmpresa / chaveEmpresa', () => {
  it('remove espaços sobrando', () => {
    expect(normalizarEmpresa('  Construtora   Silva ')).toBe('Construtora Silva')
  })
  it('agrupa ignorando maiúsculas, acentos e espaços', () => {
    expect(chaveEmpresa('Construtora  Silva')).toBe(chaveEmpresa(' construtora silva '))
    expect(chaveEmpresa('Mão de Obra')).toBe(chaveEmpresa('mao de obra'))
  })
})

describe('paraDetalhe / totaisDetalhe', () => {
  it('soma interna, terceirizada, total e por refeição', () => {
    const t = totaisDetalhe(paraDetalhe(grade()))
    expect(t.internas).toBe(50)
    expect(t.terceirizadas).toBe(17)
    expect(t.geral).toBe(67)
    expect(t.porRefeicao).toEqual({ cafe_manha: 0, lanche: 0, almoco: 42, jantar: 25 })
  })

  it('normaliza o nome da empresa e descarta linhas sem quantidade', () => {
    const g = grade()
    g.terceirizadas.push(empresaVazia())
    const d = paraDetalhe(g)
    expect(d.terceirizadas).toHaveLength(1)
    expect(d.terceirizadas[0].empresa).toBe('Construtora Silva')
  })

  it('junta a mesma empresa digitada de formas diferentes', () => {
    const g = grade()
    g.terceirizadas.push({ id: 'b', empresa: 'construtora silva', cafe_manha: '3', lanche: '', almoco: '', jantar: '' })
    const d = paraDetalhe(g)
    expect(d.terceirizadas).toHaveLength(1)
    expect(d.terceirizadas[0]).toMatchObject({ empresa: 'Construtora Silva', cafe_manha: 3, almoco: 12, jantar: 5 })
  })

  it('mantém empresas diferentes separadas', () => {
    const g = grade()
    g.terceirizadas.push({ id: 'b', empresa: 'Elétrica Sol', cafe_manha: '', lanche: '', almoco: '4', jantar: '' })
    expect(paraDetalhe(g).terceirizadas.map((t) => t.empresa)).toEqual(['Construtora Silva', 'Elétrica Sol'])
  })
})

describe('detalheParaGrade / divisaoMarmitas', () => {
  it('ida e volta entre grade e detalhe preserva as quantidades', () => {
    const detalhe = paraDetalhe(grade())
    expect(paraDetalhe(detalheParaGrade(detalhe))).toEqual(detalhe)
  })
  it('resume a divisão para as listas e some quando não há detalhe', () => {
    expect(divisaoMarmitas(paraDetalhe(grade()))).toBe('50 int. + 17 terc.')
    expect(divisaoMarmitas(null)).toBe('')
  })
})

describe('resumoRefeicoes', () => {
  it('lista só as refeições com quantidade', () => {
    expect(resumoRefeicoes({ cafe_manha: 0, lanche: 0, almoco: 30, jantar: 20 })).toBe('Almoço 30 · Jantar 20')
    expect(resumoRefeicoes({ cafe_manha: 0, lanche: 0, almoco: 0, jantar: 0 })).toBe('—')
  })
})

describe('destinatarioDoDetalhe', () => {
  it('lista as empresas ou usa "Funcionários" quando só há internas', () => {
    expect(destinatarioDoDetalhe(paraDetalhe(grade()))).toBe('Construtora Silva')
    const soInterna = gradeVazia()
    soInterna.interna.almoco = '10'
    expect(destinatarioDoDetalhe(paraDetalhe(soInterna))).toBe('Funcionários')
  })
})

describe('pendenciaGrade', () => {
  it('exige pelo menos uma marmita', () => {
    expect(pendenciaGrade(gradeVazia())).toMatch(/pelo menos uma refeição/)
  })
  it('exige empresa quando a linha terceirizada tem quantidade', () => {
    const g = gradeVazia()
    g.terceirizadas.push({ ...empresaVazia(), almoco: '5' })
    expect(pendenciaGrade(g)).toBe('Informe a empresa terceirizada')
  })
  it('aceita só internas e grade completa', () => {
    const g = gradeVazia()
    g.interna.almoco = '8'
    expect(pendenciaGrade(g)).toBeUndefined()
    expect(pendenciaGrade(grade())).toBeUndefined()
  })
})

describe('erroDoDetalhe', () => {
  it('aceita o detalhe gerado pelo formulário', () => {
    expect(erroDoDetalhe(paraDetalhe(grade()))).toBeNull()
  })
  it('rejeita ausente, quantidade inválida, empresa vazia e total zero', () => {
    expect(erroDoDetalhe(null)).not.toBeNull()
    expect(erroDoDetalhe({ interna: { cafe_manha: 1.5, lanche: 0, almoco: 0, jantar: 0 }, terceirizadas: [] })).toMatch(/inválidas/)
    const semEmpresa = paraDetalhe(grade())
    semEmpresa.terceirizadas[0].empresa = '  '
    expect(erroDoDetalhe(semEmpresa)).toBe('Informe a empresa terceirizada')
    expect(erroDoDetalhe(paraDetalhe(gradeVazia()))).toMatch(/pelo menos uma refeição/)
  })
})

describe('empresasDosDetalhes', () => {
  it('lista nomes distintos, sem repetir variações de grafia', () => {
    const a = paraDetalhe(grade())
    const b = paraDetalhe({ interna: gradeVazia().interna, terceirizadas: [{ id: 'x', empresa: 'CONSTRUTORA SILVA', cafe_manha: '1', lanche: '', almoco: '', jantar: '' }, { id: 'y', empresa: 'Álamo Serviços', cafe_manha: '2', lanche: '', almoco: '', jantar: '' }] })
    expect(empresasDosDetalhes([a, b, null, {}])).toEqual(['Álamo Serviços', 'Construtora Silva'])
  })
})
