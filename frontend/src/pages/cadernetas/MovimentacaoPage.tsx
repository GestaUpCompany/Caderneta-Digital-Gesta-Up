import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, ValidationMessage, SearchableModal } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { saveRegistro as saveRegistroIDB } from '../../services/indexedDB'
import { generateId, generateVersion, getCurrentTimestamp } from '../../utils/generateId'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import CadernetaHeader from '../../components/CadernetaHeader'
import {
  getCachedCadastroData,
  getLoteByNomeCached,
  getLoteDetalhesComCategoriasCached,
  getFazendasDoMesmoGrupoCached,
  getLotesAtivosCached,
} from '../../services/cadastroCache'
import { transferirLoteEntreFazendas } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'

const MOTIVOS = [
  { value: 'Consumo', label: 'CONSUMO', icon: '🍖' },
  { value: 'Saída', label: 'SAÍDA', icon: '📤' },
  { value: 'Entrevero', label: 'ENTREVERO', icon: '🔀' },
  { value: 'Doação', label: 'DOAÇÃO', icon: '🎁' },
]

const TIPO_SAIDA = [
  { value: 'Enfermaria', label: 'Enfermaria', icon: '' },
  { value: 'Apartação', label: 'Apartação', icon: '' },
  { value: 'Refugo de Cocho', label: 'Refugo de Cocho', icon: '' },
  { value: 'Venda', label: 'Venda', icon: '' },
  { value: 'Transferência', label: 'Transferência', icon: '🔄' },
]

const TIPO_ENTRADA = [
  { value: 'Compras', label: 'Compras', icon: '' },
  { value: 'Apartação', label: 'Apartação', icon: '' },
  { value: 'Refugo de Cocho', label: 'Refugo de Cocho', icon: '' },
]

// Função para processar categorias com diferentes delimitadores
function processarCategorias(categorias: string): string[] {
  if (!categorias) return []
  // Separar por: vírgula+espaço, vírgula, ponto+espaço, ponto, ponto e vírgula+espaço, ponto e vírgula
  const regex = /[,.;]+\s*/
  return categorias
    .split(regex)
    .map(c => c.trim())
    .filter(c => c.length > 0)
}

interface FormState {
  data: string
  loteOrigem: string
  loteOrigemId: string
  loteDestino: string
  loteDestinoId: string
  cabecasPorCategoria: Record<string, string>
  motivoMovimentacao: string
  subtipo: string // Enfermaria, Apartação, Refugo de Cocho, Compras, Transferência
  brinco: string
  chip: string
  causaObservacao: string
  fazendaDestinoId: string
  fazendaDestinoNome: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  loteOrigem: '',
  loteOrigemId: '',
  loteDestino: '',
  loteDestinoId: '',
  cabecasPorCategoria: {},
  motivoMovimentacao: '',
  subtipo: '',
  brinco: '',
  chip: '',
  causaObservacao: '',
  fazendaDestinoId: '',
  fazendaDestinoNome: '',
})

export default function MovimentacaoPage() {
  const navigate = useNavigate()
  const { usuario, fazenda, fazendaId, logoUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [lotesPastoMap, setLotesPastoMap] = useState<Record<string, string>>({})
  const [frigorificosDisponiveis, setFrigorificosDisponiveis] = useState<string[]>([])
  const [fornecedoresDisponiveis, setFornecedoresDisponiveis] = useState<string[]>([])
  const [detalhesLoteOrigem, setDetalhesLoteOrigem] = useState<any>(null)
  const [fazendasDoGrupo, setFazendasDoGrupo] = useState<{ id: string; nome: string }[]>([])

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: val } as FormState))
  }

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const setCabecasCategoria = (categoria: string, valor: string) => {
    // Trava: impedir valor maior que o disponível na categoria
    const cat = detalhesLoteOrigem?.categorias_raw?.find((c: any) => c.categoria === categoria)
    const max = cat?.quant_atual ?? 0
    const num = Number(valor)
    if (valor !== '' && !isNaN(num) && num > max) {
      setForm((p) => ({ ...p, cabecasPorCategoria: { ...p.cabecasPorCategoria, [categoria]: String(max) } }))
      return
    }
    setForm((p) => ({ ...p, cabecasPorCategoria: { ...p.cabecasPorCategoria, [categoria]: valor } }))
  }

  const totalCabecas = Object.values(form.cabecasPorCategoria).reduce(
    (sum, val) => sum + (Number(val) || 0),
    0
  )

  // Lógica para definir destino automaticamente baseado no motivo
  useEffect(() => {
    if (!form.motivoMovimentacao) {
      setForm((p) => ({ ...p, loteDestino: '', subtipo: '' }))
      return
    }

    switch (form.motivoMovimentacao) {
      case 'Consumo':
        setForm((p) => ({ ...p, loteDestino: 'Cantina', subtipo: '' }))
        break
      case 'Saída':
        // Limpar destino e subtipo para que o usuário selecione
        setForm((p) => ({ ...p, loteDestino: '', subtipo: '' }))
        break
      case 'Entrada':
        // Limpar destino e subtipo para que o usuário selecione
        setForm((p) => ({ ...p, loteDestino: '', subtipo: '' }))
        break
      case 'Abate':
      case 'Entrevero':
      case 'Doação':
        // Para esses casos, limpar o destino para que o usuário selecione
        setForm((p) => ({ ...p, loteDestino: '', subtipo: '' }))
        break
      default:
        break
    }
  }, [form.motivoMovimentacao])

  // Carregar pastos e lotes do cache global, com fallback para Supabase
  useEffect(() => {
    const loadData = async () => {
      if (fazendaId) {
        const { lotes, lotesPastoMap: mapa } = await getLotesAtivosCached(fazendaId)
        setLotesDisponiveis(lotes)
        setLotesPastoMap(mapa)
      }
      const cache = await getCachedCadastroData()
      if (cache) {
        setFrigorificosDisponiveis(cache.frigorificos || [])
        setFornecedoresDisponiveis(cache.fornecedores || [])
      }

      // Carregar fazendas do mesmo grupo (para Transferência entre fazendas)
      if (fazendaId) {
        try {
          const fazendas = await getFazendasDoMesmoGrupoCached(fazendaId)
          setFazendasDoGrupo(fazendas || [])
        } catch (error) {
          // Erro silencioso: se a fazenda não tem grupo_id, a função retorna []
          setFazendasDoGrupo([])
        }
      }
    }
    loadData()
  }, [fazendaId])

  // Escutar atualizações do cache de cadastro
  useEffect(() => {
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      console.log('[MovimentacaoPage] Cache atualizado, recarregando dados')
      if (data) {
        setLotesDisponiveis(data.lotes || [])
        setLotesPastoMap(data.lotesPastoMap || {})
        setFrigorificosDisponiveis(data.frigorificos || [])
        setFornecedoresDisponiveis(data.fornecedores || [])
      }
    })

    return unsubscribe
  }, [])

  // Buscar detalhes do lote origem quando selecionado
  useEffect(() => {
    async function carregarDetalhesLoteOrigem() {
      if (!form.loteOrigem || !fazendaId) {
        setDetalhesLoteOrigem(null)
        setForm(prev => ({ ...prev, loteOrigemId: '', cabecasPorCategoria: {} }))
        return
      }

      try {
        const lote = await getLoteByNomeCached(fazendaId, form.loteOrigem)
        if (lote) {
          // Buscar detalhes de categorias do lote
          const categoriasDetalhes = await getLoteDetalhesComCategoriasCached(lote.id)
          
          // Combinar dados do lote com dados de categorias
          setDetalhesLoteOrigem({
            ...lote,
            categorias: categoriasDetalhes.categorias,
            categorias_raw: categoriasDetalhes.categorias_raw || [],
            n_cabecas: categoriasDetalhes.quant_atual,
            peso_vivo_kg: categoriasDetalhes.peso_vivo_kg,
            qtd_bezerros: categoriasDetalhes.qtd_bezerros
          })
          // Armazenar o ID do lote origem
          setForm(prev => ({ ...prev, loteOrigemId: lote.id }))
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do lote origem:', error)
        setDetalhesLoteOrigem(null)
        setForm(prev => ({ ...prev, loteOrigemId: '' }))
      }
    }

    carregarDetalhesLoteOrigem()
  }, [form.loteOrigem, fazendaId])

  // Buscar ID do lote destino quando selecionado (se for um lote)
  useEffect(() => {
    async function carregarLoteDestinoId() {
      if (!form.loteDestino || !fazendaId) {
        setForm(prev => ({ ...prev, loteDestinoId: '' }))
        return
      }

      // Verificar se o destino é um lote (está na lista de lotes disponíveis)
      const isLote = lotesDisponiveis.includes(form.loteDestino)
      
      if (!isLote) {
        // Não é um lote (pode ser Cantina, frigorifico, fornecedor, etc.)
        setForm(prev => ({ ...prev, loteDestinoId: '' }))
        return
      }

      try {
        const lote = await getLoteByNomeCached(fazendaId, form.loteDestino)
        if (lote) {
          setForm(prev => ({ ...prev, loteDestinoId: lote.id }))
        }
      } catch (error) {
        console.error('Erro ao carregar ID do lote destino:', error)
        setForm(prev => ({ ...prev, loteDestinoId: '' }))
      }
    }

    carregarLoteDestinoId()
  }, [form.loteDestino, fazendaId, lotesDisponiveis])

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    try {
      // Pré-validação: motivo é obrigatório (exceto Doação que tem fluxo próprio)
      if (!form.motivoMovimentacao) {
        setErrors([{ field: 'motivoMovimentacao', message: 'Selecione o motivo da movimentação' }])
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      // Pré-validação: lote origem é obrigatório (exceto Doação)
      if (form.motivoMovimentacao !== 'Doação' && !form.loteOrigem) {
        setErrors([{ field: 'loteOrigem', message: 'Selecione o lote de origem' }])
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      // Destino final: loteDestino do seletor, com ajuste por motivo/subtipo
      let destinoFinal = form.loteDestino

      // Ajustar destino padrão baseado no motivo/subtipo
      if (form.motivoMovimentacao === 'Consumo') {
        if (!destinoFinal || destinoFinal === '') {
          destinoFinal = 'Cantina'
        }
      } else if (form.motivoMovimentacao === 'Saída') {
        if (form.subtipo === 'Enfermaria' || form.subtipo === 'Venda') {
          if (!destinoFinal || destinoFinal === '') {
            destinoFinal = form.subtipo
          }
        }
      }

      // Validar que destino não está vazio (exceto Transferência, que tem fluxo próprio)
      if (form.motivoMovimentacao !== 'Saída' || form.subtipo !== 'Transferência') {
        if (!destinoFinal || destinoFinal.trim() === '') {
          setErrors([{ field: 'loteDestino', message: 'Selecione o destino da movimentação' }])
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
      }

      // Caso especial: Doação não exige lote nem cabeças
      if (form.motivoMovimentacao === 'Doação') {
        const result = await salvarRegistro('movimentacao', {
          data: form.data,
          responsavel: usuario,
          usuario: usuario,
          loteOrigem: form.loteOrigem,
          loteOrigemId: form.loteOrigemId,
          loteDestino: destinoFinal,
          loteDestinoId: form.loteDestinoId,
          numeroCabecas: 0,
          maxCabecasLote: null,
          categoria: null,
          motivoMovimentacao: form.motivoMovimentacao,
          subtipo: form.subtipo || null,
          brinco: form.brinco,
          chip: form.chip,
          causaObservacao: form.causaObservacao,
        })

        if (!result.success && result.errors) {
          setErrors(result.errors)
          scrollToFirstError(result.errors)
        } else {
          setRegistroSalvo(result.registro)
          setShowSuccessModal(true)
          setForm(makeInitial())
        }
        return
      }

      // Caso especial: Transferência entre fazendas do mesmo grupo
      if (form.motivoMovimentacao === 'Saída' && form.subtipo === 'Transferência') {
        if (!form.fazendaDestinoId) {
          setErrors([{ field: 'fazendaDestinoId', message: 'Selecione a fazenda de destino' }])
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }

        // Coletar categorias com quantidade > 0 (reusa mesma lógica abaixo)
        const categoriasRawTransf = detalhesLoteOrigem?.categorias_raw || []
        const categoriasParaTransferir = categoriasRawTransf
          .map((cat: any) => ({
            categoria: cat.categoria,
            numeroCabecas: Number(form.cabecasPorCategoria[cat.categoria] || 0),
            maxCabecas: cat.quant_atual || 0,
          }))
          .filter((c: any) => c.numeroCabecas > 0)

        if (categoriasParaTransferir.length === 0) {
          setErrors([{ field: 'cabecasPorCategoria', message: 'Informe pelo menos uma quantidade de cabeças por categoria' }])
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }

        const excedeTransf = categoriasParaTransferir.find((c: any) => c.numeroCabecas > c.maxCabecas)
        if (excedeTransf) {
          const msg = `Quantidade de ${excedeTransf.categoria} (${excedeTransf.numeroCabecas}) excede o disponível no lote (${excedeTransf.maxCabecas})`
          setErrors([{ field: `cabecas_${excedeTransf.categoria}`, message: msg }])
          scrollToFirstError([{ field: `cabecas_${excedeTransf.categoria}`, message: msg }])
          return
        }

        try {
          const result = await transferirLoteEntreFazendas(
            form.loteOrigemId,
            form.fazendaDestinoId,
            categoriasParaTransferir.map((c: any) => ({ categoria: c.categoria, numero_cabecas: c.numeroCabecas })),
            usuario
          )

          if (!result.success) {
            setErrors([{ field: 'general', message: result.error || 'Erro ao transferir lote' }])
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
          }

          // Salvar registro local no IndexedDB para aparecer na lista de movimentações
          // syncStatus='synced' para não tentar sincronizar de novo (a RPC já fez tudo)
          try {
            const registroLocal = {
              id: generateId(),
              data: `${form.data} ${new Date().toTimeString().slice(0, 5)}`,
              loteOrigem: form.loteOrigem,
              loteOrigemId: form.loteOrigemId,
              loteDestino: result.lote_destino_nome || form.fazendaDestinoNome,
              loteDestinoId: result.lote_destino_id || '',
              motivoMovimentacao: 'Transferencia',
              subtipo: 'Saida',
              numeroCabecas: result.total_cabecas || 0,
              categoria: categoriasParaTransferir.map((c: any) => c.categoria).join(', '),
              usuario: usuario,
              responsavel: usuario,
              brinco: '',
              chip: '',
              causaObservacao: `Transferência para ${result.fazenda_destino_nome}. Lote criado: ${result.lote_destino_nome}.`,
              syncStatus: 'synced' as const,
              version: generateVersion(),
              lastModified: getCurrentTimestamp(),
              supabaseId: result.lote_destino_id,
            }
            await saveRegistroIDB('movimentacao', registroLocal as any)
          } catch (err) {
            console.error('[MovimentacaoPage] Erro ao salvar registro local da transferência:', err)
          }

          setRegistroSalvo({
            tipo: 'transferencia',
            loteDestinoNome: result.lote_destino_nome,
            fazendaDestinoNome: result.fazenda_destino_nome,
            totalCabecas: result.total_cabecas,
            transferenciaTotal: result.transferencia_total,
          })
          setShowSuccessModal(true)
          setForm(makeInitial())
        } catch (error: any) {
          console.error('[MovimentacaoPage] Erro na transferência:', error)
          setErrors([{ field: 'general', message: error?.message || 'Erro ao transferir lote. Tente novamente.' }])
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
        return
      }

      // Coletar categorias com quantidade > 0
      const categoriasRaw = detalhesLoteOrigem?.categorias_raw || []
      const categoriasParaMover = categoriasRaw
        .map((cat: any) => ({
          categoria: cat.categoria,
          numeroCabecas: Number(form.cabecasPorCategoria[cat.categoria] || 0),
          maxCabecas: cat.quant_atual || 0,
        }))
        .filter((c: any) => c.numeroCabecas > 0)

      if (categoriasParaMover.length === 0) {
        setErrors([{ field: 'cabecasPorCategoria', message: 'Informe pelo menos uma quantidade de cabeças por categoria' }])
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      // Validar que nenhuma categoria excede o disponível
      const excedeDisponivel = categoriasParaMover.find((c: any) => c.numeroCabecas > c.maxCabecas)
      if (excedeDisponivel) {
        const msg = `Quantidade de ${excedeDisponivel.categoria} (${excedeDisponivel.numeroCabecas}) excede o disponível no lote (${excedeDisponivel.maxCabecas})`
        setErrors([{ field: `cabecas_${excedeDisponivel.categoria}`, message: msg }])
        scrollToFirstError([{ field: `cabecas_${excedeDisponivel.categoria}`, message: msg }])
        return
      }

      // Validar brinco/chip apenas se o total for exatamente 1 cabeça
      if (totalCabecas === 1 && !form.brinco.trim() && !form.chip.trim()) {
        setErrors([{ field: 'brinco', message: 'Brinco ou Chip é obrigatório quando for 1 cabeça' }])
        scrollToFirstError([{ field: 'brinco', message: 'Brinco ou Chip é obrigatório quando for 1 cabeça' }])
        return
      }

      // Criar um registro de movimentação por categoria
      const resultados: { success: boolean; errors?: any[]; registro?: any }[] = []
      for (const c of categoriasParaMover) {
        const result = await salvarRegistro('movimentacao', {
          data: form.data,
          responsavel: usuario,
          usuario: usuario,
          loteOrigem: form.loteOrigem,
          loteOrigemId: form.loteOrigemId,
          loteDestino: destinoFinal,
          loteDestinoId: form.loteDestinoId,
          numeroCabecas: c.numeroCabecas,
          maxCabecasLote: c.maxCabecas,
          categoria: c.categoria,
          motivoMovimentacao: form.motivoMovimentacao,
          subtipo: form.subtipo || null,
          brinco: totalCabecas === 1 ? form.brinco : '',
          chip: totalCabecas === 1 ? form.chip : '',
          causaObservacao: form.causaObservacao,
        })
        resultados.push(result)
        if (!result.success && result.errors) break
      }

      const falhou = resultados.find(r => !r.success)
      if (falhou && falhou.errors) {
        setErrors(falhou.errors)
        scrollToFirstError(falhou.errors)
      } else {
        const ultimoRegistro = resultados[resultados.length - 1]?.registro
        setRegistroSalvo(ultimoRegistro)
        setShowSuccessModal(true)
        setForm(makeInitial())
      }
    } catch (error) {
      console.error('[MovimentacaoPage] Erro ao salvar:', error)
      setErrors([{ field: 'general', message: 'Erro ao salvar registro. Tente novamente.' }])
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSalvando(false)
    }
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <CadernetaHeader title="MOVIMENTAÇÃO" cadernetaId="movimentacao" />

      {/* Logos não sticky */}
      <div className="bg-[#1a3a2a] text-white px-4 py-5">
        <div className="flex items-center justify-center gap-8 desktop-form-container">
          <FarmLogo
            farmName={fazenda}
            logoUrl={logoUrl}
            type="both"
            size="medium"
          />
        </div>
      </div>

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8 desktop-form-container">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="section-title">1. DADOS PRINCIPAIS</h2>
            <div className="flex items-center gap-2 shrink-0">
              {usuario && (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 font-semibold bg-gray-100 rounded-full px-3 py-1 whitespace-nowrap">
                  <span>👤</span>
                  <span>{usuario}</span>
                </span>
              )}
              <DatePicker value={form.data} onChange={(val) => setForm((p) => ({ ...p, data: val }))} error={getError('data')} compact inline />
            </div>
          </div>
          {lotesDisponiveis.length > 0 ? (
            <SearchableModal
              label="PASTO/LOTE"
              value={form.loteOrigem}
              onChange={(val) => setForm((p) => ({ ...p, loteOrigem: val }))}
              error={getError('loteOrigem')}
              options={lotesDisponiveis}
              secondaryText={(lote) => lotesPastoMap[lote] || ''}
              placeholder="Buscar pasto ou lote..."
              id="loteOrigem"
              name="loteOrigem"
            />
          ) : (
            <Input
              label="PASTO/LOTE"
              placeholder="Carregando..."
              value={form.loteOrigem}
              onChange={setInput('loteOrigem')}
              error={getError('loteOrigem')}
              inputMode="numeric"
              disabled
              id="loteOrigem"
            />
          )}
          {detalhesLoteOrigem && (
            <LoteDetalhesCard detalhes={detalhesLoteOrigem} processarCategorias={processarCategorias} />
          )}
        </div>

        {/* Seção 2: Quantificação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. QUANTIFICAÇÃO</h2>
          {detalhesLoteOrigem?.categorias_raw && detalhesLoteOrigem.categorias_raw.length > 0 ? (
            <>
              {getError('cabecasPorCategoria') && (
                <p className="text-base font-semibold text-red-700">⚠️ {getError('cabecasPorCategoria')}</p>
              )}
              {detalhesLoteOrigem.categorias_raw.map((cat: any) => (
                <div key={cat.categoria} className="flex flex-col gap-1">
                  <Input
                    label={`${cat.categoria.toUpperCase()} (Disp.: ${cat.quant_atual || 0})`}
                    placeholder="Ex: 25"
                    value={form.cabecasPorCategoria[cat.categoria] || ''}
                    onChange={(e) => setCabecasCategoria(cat.categoria, e.target.value)}
                    error={getError(`cabecas_${cat.categoria}`)}
                    inputMode="numeric"
                    type="number"
                    min="0"
                    max={String(cat.quant_atual || 0)}
                  />
                </div>
              ))}
              {totalCabecas > 0 && (
                <p className="text-sm text-gray-500">
                  Total a movimentar: {totalCabecas} cabeças
                </p>
              )}
              {/* Identificação - apenas se total for 1 cabeça */}
              {totalCabecas === 1 && (
                <>
                  <Input
                    label="BRINCO"
                    placeholder="Ex: 2023-145"
                    value={form.brinco}
                    onChange={setInput('brinco')}
                  />
                  <Input
                    label="CHIP"
                    placeholder="Ex: 123456789"
                    value={form.chip}
                    onChange={setInput('chip')}
                  />
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 italic">
              {form.loteOrigem ? 'Nenhuma categoria encontrada neste lote.' : 'Selecione um lote para ver as categorias disponíveis.'}
            </p>
          )}
        </div>

        {/* Seção 3: Motivo da Movimentação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. MOTIVO DA MOVIMENTAÇÃO</h2>
          <Radio
            name="motivoMovimentacao"
            options={MOTIVOS}
            value={form.motivoMovimentacao}
            onChange={(val) => setForm((p) => ({ ...p, motivoMovimentacao: val }))}
            error={getError('motivoMovimentacao')}
            gridCols={2}
          />
          {form.motivoMovimentacao ? (
            <>
              {form.motivoMovimentacao === 'Consumo' ? (
                <>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-lg font-bold text-gray-900">DESTINO: CANTINA</p>
                  </div>
                  <Input
                    label="CAUSA / OBSERVAÇÃO:"
                    placeholder="Descreva detalhes da movimentação"
                    value={form.causaObservacao}
                    onChange={setInput('causaObservacao')}
                  />
                </>
              ) : form.motivoMovimentacao === 'Abate' ? (
                <>
                  {frigorificosDisponiveis.length > 0 ? (
                    <SearchableModal
                      label="SELECIONE O FRIGORÍFICO:"
                      value={form.loteDestino}
                      onChange={(val) => setForm((p) => ({ ...p, loteDestino: val }))}
                      error={getError('loteDestino')}
                      options={frigorificosDisponiveis}
                      placeholder="Buscar frigorífico..."
                      id="loteDestino"
                      name="loteDestino"
                    />
                  ) : (
                    <Input
                      label="SELECIONE O FRIGORÍFICO:"
                      placeholder="Carregando..."
                      value={form.loteDestino}
                      onChange={setInput('loteDestino')}
                      error={getError('loteDestino')}
                      disabled
                      id="loteDestino"
                    />
                  )}
                  <Input
                    label="CAUSA / OBSERVAÇÃO:"
                    placeholder="Descreva detalhes da movimentação"
                    value={form.causaObservacao}
                    onChange={setInput('causaObservacao')}
                  />
                </>
              ) : form.motivoMovimentacao === 'Saída' ? (
                <>
                  <Radio
                    name="subtipo"
                    options={TIPO_SAIDA}
                    value={form.subtipo}
                    onChange={(val) => setForm((p) => ({ ...p, subtipo: val, loteDestino: '' }))}
                    error={getError('subtipo')}
                    direction="vertical"
                  />
                  {form.subtipo === 'Apartação' || form.subtipo === 'Refugo de Cocho' ? (
                    <>
                      {lotesDisponiveis.length > 0 ? (
                        <SearchableModal
                          label="SELECIONE O PASTO/LOTE:"
                          value={form.loteDestino}
                          onChange={(val) => setForm((p) => ({ ...p, loteDestino: val }))}
                          error={getError('loteDestino')}
                          options={lotesDisponiveis.filter(l => l !== form.loteOrigem)}
                          secondaryText={(lote) => lotesPastoMap[lote] || ''}
                          placeholder="Buscar pasto ou lote..."
                          id="loteDestino"
                          name="loteDestino"
                        />
                      ) : (
                        <Input
                          label="SELECIONE O LOTE:"
                          placeholder="Carregando..."
                          value={form.loteDestino}
                          onChange={setInput('loteDestino')}
                          error={getError('loteDestino')}
                          disabled
                          id="loteDestino"
                        />
                      )}
                      <Input
                        label="CAUSA / OBSERVAÇÃO:"
                        placeholder="Descreva detalhes da movimentação"
                        value={form.causaObservacao}
                        onChange={setInput('causaObservacao')}
                      />
                    </>
                  ) : form.subtipo === 'Transferência' ? (
                    <>
                      {fazendasDoGrupo.length > 0 ? (
                        <SearchableModal
                          label="SELECIONE A FAZENDA DE DESTINO:"
                          value={form.fazendaDestinoNome}
                          onChange={(val) => {
                            const fazenda = fazendasDoGrupo.find(f => f.nome === val)
                            setForm((p) => ({ ...p, fazendaDestinoNome: val, fazendaDestinoId: fazenda?.id || '' }))
                          }}
                          error={getError('fazendaDestinoId')}
                          options={fazendasDoGrupo.map(f => f.nome)}
                          placeholder="Buscar fazenda..."
                          id="fazendaDestino"
                          name="fazendaDestino"
                        />
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          Esta fazenda não pertence a nenhum grupo. A transferência entre fazendas requer que a fazenda atual faça parte de um grupo.
                        </p>
                      )}
                      <div className="p-4 bg-blue-50 rounded-xl">
                        <p className="text-sm text-blue-900">
                          <strong>Transferência entre fazendas:</strong> o lote será criado na fazenda de destino com os mesmos dados cadastrais (peso, categoria, dados financeiros), sem plano nutricional. Se todas as cabeças forem transferidas, o lote origem será inativado.
                        </p>
                      </div>
                    </>
                  ) : null}
                </>
              ) : form.motivoMovimentacao === 'Entrada' ? (
                <>
                  <Radio
                    name="subtipo"
                    options={TIPO_ENTRADA}
                    value={form.subtipo}
                    onChange={(val) => setForm((p) => ({ ...p, subtipo: val, loteDestino: '' }))}
                    error={getError('subtipo')}
                    gridCols={3}
                  />
                  {form.subtipo === 'Compras' ? (
                    <>
                      {fornecedoresDisponiveis.length > 0 ? (
                        <SearchableModal
                          label="SELECIONE O FORNECEDOR:"
                          value={form.loteDestino}
                          onChange={(val) => setForm((p) => ({ ...p, loteDestino: val }))}
                          error={getError('loteDestino')}
                          options={fornecedoresDisponiveis}
                          placeholder="Buscar fornecedor..."
                          id="loteDestino"
                          name="loteDestino"
                        />
                      ) : (
                        <Input
                          label="SELECIONE O FORNECEDOR:"
                          placeholder="Carregando..."
                          value={form.loteDestino}
                          onChange={setInput('loteDestino')}
                          error={getError('loteDestino')}
                          disabled
                          id="loteDestino"
                        />
                      )}
                      <Input
                        label="CAUSA / OBSERVAÇÃO:"
                        placeholder="Descreva detalhes da movimentação"
                        value={form.causaObservacao}
                        onChange={setInput('causaObservacao')}
                      />
                    </>
                  ) : form.subtipo === 'Apartação' || form.subtipo === 'Refugo de Cocho' ? (
                    <>
                      {lotesDisponiveis.length > 0 ? (
                        <SearchableModal
                          label="SELECIONE O PASTO/LOTE:"
                          value={form.loteDestino}
                          onChange={(val) => setForm((p) => ({ ...p, loteDestino: val }))}
                          error={getError('loteDestino')}
                          options={lotesDisponiveis.filter(l => l !== form.loteOrigem)}
                          secondaryText={(lote) => lotesPastoMap[lote] || ''}
                          placeholder="Buscar pasto ou lote..."
                          id="loteDestino"
                          name="loteDestino"
                        />
                      ) : (
                        <Input
                          label="SELECIONE O LOTE:"
                          placeholder="Carregando..."
                          value={form.loteDestino}
                          onChange={setInput('loteDestino')}
                          error={getError('loteDestino')}
                          disabled
                          id="loteDestino"
                        />
                      )}
                      <Input
                        label="CAUSA / OBSERVAÇÃO:"
                        placeholder="Descreva detalhes da movimentação"
                        value={form.causaObservacao}
                        onChange={setInput('causaObservacao')}
                      />
                    </>
                  ) : null}
                </>
              ) : form.motivoMovimentacao === 'Entrevero' ? (
                <>
                  {lotesDisponiveis.length > 0 ? (
                    <SearchableModal
                      label="SELECIONE UM DESTINO:"
                      value={form.loteDestino}
                      onChange={(val) => setForm((p) => ({ ...p, loteDestino: val }))}
                      error={getError('loteDestino')}
                      options={lotesDisponiveis.filter(l => l !== form.loteOrigem)}
                      secondaryText={(lote) => lotesPastoMap[lote] || ''}
                      placeholder="Buscar destino..."
                    />
                  ) : (
                    <Input
                      label="SELECIONE UM DESTINO:"
                      placeholder="Carregando..."
                      value={form.loteDestino}
                      onChange={setInput('loteDestino')}
                      error={getError('loteDestino')}
                      disabled
                    />
                  )}
                  <Input
                    label="CAUSA / OBSERVAÇÃO:"
                    placeholder="Descreva detalhes da movimentação"
                    value={form.causaObservacao}
                    onChange={setInput('causaObservacao')}
                  />
                </>
              ) : form.motivoMovimentacao === 'Doação' ? (
                <>
                  <Input
                    label="OBSERVAÇÃO:"
                    placeholder="Descreva detalhes da doação (opcional)"
                    value={form.causaObservacao}
                    onChange={setInput('causaObservacao')}
                  />
                </>
              ) : null}
            </>
          ) : (
            <div>
              <p className="text-lg font-bold text-gray-900 mb-2">SELECIONE UM DESTINO:</p>
              <p className="text-sm text-gray-500 italic">Escolha uma das opções acima primeiro...</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾">
            SALVAR
          </Button>
          <Button onClick={() => setForm(makeInitial())} variant="secondary" icon="🧹">
            LIMPAR
          </Button>
        </div>
      </main>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName={registroSalvo?.tipo === 'transferencia' ? 'Transferência' : 'Movimentação'}
        registro={registroSalvo}
        caderneta={registroSalvo?.tipo === 'transferencia' ? undefined : 'movimentacao'}
      />
    </div>
  )
}
