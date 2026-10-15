import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, ValidationMessage } from '../../components/ui'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import FormFooter from '../../components/cadernetas/FormFooter'
import EvidenciaProblema from '../../components/cadernetas/EvidenciaProblema'
import BannerRascunho from '../../components/BannerRascunho'
import ObservacaoAtrasoModal from '../../components/ObservacaoAtrasoModal'
import { salvarRegistro } from '../../services/api'
import { getCachedCadastroData, getSetoresCached, getPendencias5SCached } from '../../services/cadastroCache'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { SECOES_5S, TOTAL_ITENS_5S, CHAVES_ITENS_5S, calcularResultado5S } from '../../utils/auditoria5sItens'
import { validateAuditoria5s } from '../../utils/validation'
import { Pendencia5S, SituacaoPendencia5S, diasEntre } from '../../utils/pendencias5s'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { useSalvarRegistro } from '../../hooks/useSalvarRegistro'
import { RootState } from '../../store/store'

// NA (não se aplica) é gravado como 'NA' e aparece como hífen; fica fora do percentual de conformidade.
const NOTA_OPTIONS = [0, 1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))

const RESPOSTA_OPTIONS = [
  { value: 'C', label: 'C', tone: 'success' as const },
  { value: 'N', label: 'N', tone: 'danger' as const },
  { value: 'NA', label: '–' },
]

interface FormState {
  data: string
  setor: string
  setorId: string
  responsavel: string
  itens: Record<string, string>
  observacoes: Record<string, string>
  // Evidência de cada item N: observação (obrigatória) e foto (opcional)
  naoConformidades: Record<string, { observacao: string; fotoBase64: string }>
  // Resposta a cada pendência anterior do setor (chave do item -> resolvida | mantida)
  pendencias: Record<string, SituacaoPendencia5S | ''>
  notaGeral: number | null
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  setor: '',
  setorId: '',
  responsavel: '',
  itens: {},
  observacoes: {},
  naoConformidades: {},
  pendencias: {},
  notaGeral: null,
})

interface SetorOpcao {
  id: string
  nome: string
}

export default function Auditoria5sPage() {
  const navigate = useNavigate()
  const { usuario, fazendaId, controleAcessoHabilitado, funcionarioCadernetas, funcionarioNome } = useSelector(
    (state: RootState) => state.config
  )
  const { salvando, salvar, showObservacaoModal, horariosModal, onConfirmarObservacao, onCancelarObservacao } =
    useSalvarRegistro('auditoria-5s')
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'auditoria-5s', makeInitial })

  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [setores, setSetores] = useState<SetorOpcao[]>([])
  const [setoresCarregados, setSetoresCarregados] = useState(false)
  const [funcionarios, setFuncionarios] = useState<string[]>([])
  // Itens N de auditorias anteriores deste setor ainda não resolvidos
  const [pendenciasAbertas, setPendenciasAbertas] = useState<Pendencia5S[]>([])
  // null = ainda não consultado; false = histórico do servidor não lido (offline sem cache)
  const [pendenciasVerificadas, setPendenciasVerificadas] = useState<boolean | null>(null)
  const [carregandoPendencias, setCarregandoPendencias] = useState(false)
  const [campoFotoAtual, setCampoFotoAtual] = useState<string | null>(null)
  const [campoVozAtual, setCampoVozAtual] = useState<string | null>(null)
  const baseVozRef = useRef('')

  const { capturandoFoto, fotoErro, capturarFoto, fotoInputRef, handleFileInputChange } = usePhotoGps({ comGps: false })
  const { ouvindo: ouvindoVoz, erro: vozErro, toggle: toggleVoz, parar: pararVoz } = useVoiceInput()

  // Com controle de acesso por funcionário (RBAC) ativo, o responsável é quem está logado.
  // Sem RBAC, ou sem nome do funcionário, escolhe-se na lista de funcionários.
  const responsavelLogado = controleAcessoHabilitado && funcionarioCadernetas.length > 0 ? funcionarioNome : ''
  const responsavel = responsavelLogado || form.responsavel

  // Setores e funcionários: cache local primeiro (funciona offline)
  useEffect(() => {
    let cancelado = false
    const carregar = async () => {
      try {
        const cache = await getCachedCadastroData()
        if (!cancelado && cache?.funcionarios) setFuncionarios(cache.funcionarios)
      } catch (error) {
        console.error('[Auditoria5sPage] Erro ao carregar funcionários:', error)
      }
      try {
        if (fazendaId) {
          const lista = await getSetoresCached(fazendaId)
          if (!cancelado) setSetores((lista || []).map((s: any) => ({ id: s.id, nome: s.nome })))
        }
      } catch (error) {
        console.error('[Auditoria5sPage] Erro ao carregar setores:', error)
      } finally {
        if (!cancelado) setSetoresCarregados(true)
      }
    }
    carregar()
    return () => {
      cancelado = true
    }
  }, [fazendaId])

  useEffect(() => {
    return eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      if (data && Array.isArray(data.funcionarios)) setFuncionarios(data.funcionarios)
    })
  }, [])

  // Pendências do setor selecionado: cache primeiro (inclui auditorias deste aparelho ainda não sincronizadas) e revalida com timeout
  useEffect(() => {
    let cancelado = false
    setPendenciasAbertas([])
    setPendenciasVerificadas(null)
    if (!form.setor || !fazendaId) {
      setCarregandoPendencias(false)
      return
    }
    setCarregandoPendencias(true)
    getPendencias5SCached(fazendaId, form.setorId || null, form.setor)
      .then(({ resultado, verificado }) => {
        if (cancelado) return
        setPendenciasAbertas(resultado.abertas)
        setPendenciasVerificadas(verificado)
      })
      .catch((error) => {
        if (cancelado) return
        console.warn('[Auditoria5sPage] Pendências do setor indisponíveis:', error)
        setPendenciasVerificadas(false)
      })
      .finally(() => {
        if (!cancelado) setCarregandoPendencias(false)
      })
    return () => {
      cancelado = true
    }
  }, [form.setor, form.setorId, fazendaId])

  const naoConformidades = form.naoConformidades ?? {}
  const respostasPendencia = form.pendencias ?? {}
  const pendenciasPorChave = useMemo(
    () => Object.fromEntries(pendenciasAbertas.map((p) => [p.chave, p])) as Record<string, Pendencia5S>,
    [pendenciasAbertas]
  )
  const chavesPendentes = pendenciasAbertas.map((p) => p.chave)
  const pendenciasSemResposta = pendenciasAbertas.filter((p) => !respostasPendencia[p.chave])

  const resultado = useMemo(() => calcularResultado5S(form.itens), [form.itens])
  // Itens decididos pela pergunta de pendência não contam como "para responder"
  const faltam = CHAVES_ITENS_5S.filter((c) => !form.itens[c] && !pendenciasPorChave[c]).length

  const validacao = validateAuditoria5s({ ...form, responsavel, pendenciasAbertas: chavesPendentes })
  const isValid = validacao.isValid && !carregandoPendencias
  const itensSemObservacao = validacao.errors.filter((e) => e.field.startsWith('obs_')).length

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Trocar de setor descarta as respostas das pendências do anterior (e os itens que elas definiram)
  const handleSetor = (nome: string) =>
    setForm((prev) => {
      if (prev.setor === nome) return prev
      const respondidas = Object.keys(prev.pendencias ?? {})
      const itens = { ...prev.itens }
      const evidencias = { ...(prev.naoConformidades ?? {}) }
      respondidas.forEach((c) => {
        delete itens[c]
        delete evidencias[c]
      })
      return { ...prev, setor: nome, setorId: setores.find((s) => s.nome === nome)?.id || '', itens, naoConformidades: evidencias, pendencias: {} }
    })

  // Só item N carrega evidência: mudar para C/– descarta observação e foto
  const setResposta = (chave: string) => (valor: string) =>
    setForm((prev) => {
      const evidencias = { ...(prev.naoConformidades ?? {}) }
      if (valor === 'N') evidencias[chave] = evidencias[chave] ?? { observacao: '', fotoBase64: '' }
      else delete evidencias[chave]
      return { ...prev, itens: { ...prev.itens, [chave]: valor }, naoConformidades: evidencias }
    })

  // Responder uma pendência define o item: ainda pendente = N (herda a evidência anterior); resolvida = C.
  const responderPendencia = (chave: string, situacao: SituacaoPendencia5S) =>
    setForm((prev) => {
      const evidencias = { ...(prev.naoConformidades ?? {}) }
      if (situacao === 'mantida') evidencias[chave] = evidencias[chave] ?? { observacao: '', fotoBase64: '' }
      else delete evidencias[chave]
      return {
        ...prev,
        pendencias: { ...(prev.pendencias ?? {}), [chave]: situacao },
        itens: { ...prev.itens, [chave]: situacao === 'mantida' ? 'N' : 'C' },
        naoConformidades: evidencias,
      }
    })

  const setEvidencia = (chave: string, parcial: Partial<{ observacao: string; fotoBase64: string }>) =>
    setForm((prev) => {
      const atual = (prev.naoConformidades ?? {})[chave] ?? { observacao: '', fotoBase64: '' }
      return { ...prev, naoConformidades: { ...(prev.naoConformidades ?? {}), [chave]: { ...atual, ...parcial } } }
    })

  const handleTirarFoto = async (chave: string) => {
    setCampoFotoAtual(chave)
    const base64 = await capturarFoto()
    // Nativo retorna a foto aqui; no web o retorno vem pelo input file hidden
    if (base64) setEvidencia(chave, { fotoBase64: base64 })
  }

  const handleFotoInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const result = await handleFileInputChange(e)
    if (result?.fotoBase64 && campoFotoAtual) setEvidencia(campoFotoAtual, { fotoBase64: result.fotoBase64 })
  }

  // Ditado: o texto parcial é acrescentado ao que já existia quando a gravação começou (dá para falar mais de uma vez)
  const handleFalar = async (chave: string) => {
    if (ouvindoVoz) {
      await pararVoz()
      if (campoVozAtual === chave) return
    }
    setCampoVozAtual(chave)
    baseVozRef.current = (naoConformidades[chave]?.observacao || '').trim()
    await toggleVoz((parcial) => {
      setEvidencia(chave, { observacao: baseVozRef.current ? `${baseVozRef.current} ${parcial}` : parcial })
    })
  }

  const setObservacao = (secaoId: string, texto: string) =>
    setForm((prev) => ({ ...prev, observacoes: { ...prev.observacoes, [secaoId]: texto } }))

  const pendenciaTexto = (() => {
    if (!form.setor) return 'Falta escolher o setor'
    if (!responsavel) return 'Falta escolher o responsável'
    if (carregandoPendencias) return 'Buscando pendências do setor...'
    if (pendenciasSemResposta.length > 0) {
      const n = pendenciasSemResposta.length
      return `Falta responder ${n} ${n === 1 ? 'pendência anterior' : 'pendências anteriores'} do setor`
    }
    if (itensSemObservacao > 0) return `Falta descrever ${itensSemObservacao} ${itensSemObservacao === 1 ? 'não conformidade' : 'não conformidades'}`
    if (faltam > 0) return `Faltam ${faltam} ${faltam === 1 ? 'item' : 'itens'} para responder`
    if (form.notaGeral === null || form.notaGeral === undefined) return 'Falta dar a nota do setor'
    return undefined
  })()

  const executarSalvamento = async () => {
    setErrors([])
    if (!isValid) return

    const observacoes = Object.fromEntries(
      Object.entries(form.observacoes)
        .map(([secao, texto]) => [secao, texto.trim()])
        .filter(([, texto]) => texto)
    )

    // Evidência só dos itens N; o item que veio de pendência "ainda pendente" leva o marcador com a data de origem
    const evidencias = Object.fromEntries(
      CHAVES_ITENS_5S.filter((chave) => form.itens[chave] === 'N').map((chave) => {
        const ev = naoConformidades[chave]
        const pendencia = pendenciasPorChave[chave]
        return [
          chave,
          {
            observacao: (ev?.observacao || '').trim(),
            fotoBase64: ev?.fotoBase64 || undefined,
            ...(pendencia && respostasPendencia[chave] ? { pendencia: { situacao: respostasPendencia[chave], desde: pendencia.desde } } : {}),
          },
        ]
      })
    )

    const result = await salvarRegistro('auditoria-5s', {
      data: form.data,
      usuario,
      setor: form.setor,
      setorId: form.setorId || null,
      responsavel,
      itens: form.itens,
      naoConformidades: Object.keys(evidencias).length > 0 ? evidencias : null,
      pendencias: Object.keys(respostasPendencia).length > 0 ? respostasPendencia : null,
      pendenciasAbertas: chavesPendentes,
      notaGeral: form.notaGeral,
      observacoes: Object.keys(observacoes).length > 0 ? observacoes : null,
      totalItens: resultado.totalItens,
      totalConformes: resultado.conformes,
      totalNaoConformes: resultado.naoConformes,
      percentualConformidade: resultado.percentual,
    })

    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      limparRascunho()
    }
  }

  const handleLimpar = () => {
    limparRascunho()
    setErrors([])
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/modulos/checklists')
  }

  return (
    <>
      <CadernetaLayout
        title="AUDITORIA 5S"
        cadernetaId="auditoria-5s"
        dateContent={<DatePicker value={form.data} onChange={(v) => setForm((prev) => ({ ...prev, data: v }))} variant="header" compact inline maxDate={todayBR()} />}
      >
        <BannerRascunho visible={rascunhoRestaurado} onConfirmar={confirmarRascunho} onDescartar={descartarRascunho} />
        {errors.length > 0 && <ValidationMessage errors={errors.filter((e) => !e.field.includes('_'))} />}

        <CadernetaSection titulo="Identificação" required>
          {setores.length > 0 ? (
            <SearchableModal
              label={<span>Setor <span className="text-red-500">*</span></span>}
              value={form.setor}
              onChange={handleSetor}
              error={getError('setor')}
              options={setores.map((s) => s.nome)}
              placeholder="Selecione o setor..."
              id="setor"
              name="setor"
            />
          ) : (
            <Input
              label="SETOR"
              placeholder={setoresCarregados ? 'Nenhum setor neste aparelho. Conecte à internet e atualize os dados' : 'Carregando...'}
              value={form.setor}
              onChange={() => {}}
              error={getError('setor')}
              disabled
            />
          )}

          {responsavelLogado ? (
            <InfoStrip tone="neutral" icon="👤">Responsável: {responsavelLogado}</InfoStrip>
          ) : funcionarios.length > 0 ? (
            <SearchableModal
              label={<span>Responsável <span className="text-red-500">*</span></span>}
              value={form.responsavel}
              onChange={(v) => setForm((prev) => ({ ...prev, responsavel: v }))}
              error={getError('responsavel')}
              options={funcionarios}
              placeholder="Buscar funcionário..."
              id="responsavel"
              name="responsavel"
            />
          ) : (
            <Input
              label="RESPONSÁVEL"
              placeholder="Nenhum funcionário neste aparelho. Conecte à internet e atualize os dados"
              value={form.responsavel}
              onChange={() => {}}
              error={getError('responsavel')}
              disabled
            />
          )}

          <InfoStrip tone="neutral" icon="ℹ️">
            C = Conforme · N = Não conforme · – = Não se aplica (não entra no percentual)
          </InfoStrip>

          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <span className="text-sm font-bold text-gray-600">RESPONDIDOS</span>
            <span className="text-lg font-extrabold text-gray-900">
              {resultado.respondidos}/{TOTAL_ITENS_5S}
              {resultado.percentual !== null && <span className="ml-2 text-sm font-bold text-gray-500">{resultado.percentual}% conforme</span>}
            </span>
          </div>
        </CadernetaSection>

        {form.setor && (carregandoPendencias || pendenciasAbertas.length > 0 || pendenciasVerificadas === false) && (
          <CadernetaSection titulo="Pendências anteriores" required={pendenciasAbertas.length > 0}>
            {carregandoPendencias ? (
              <p className="py-2 text-center text-sm text-gray-500">Buscando pendências do setor...</p>
            ) : (
              <>
                {pendenciasAbertas.length > 0 && (
                  <p className="-mt-2 text-sm text-gray-500">
                    Estes itens foram marcados como não conformes em auditorias anteriores deste setor. Informe se já foram resolvidos.
                  </p>
                )}
                {pendenciasVerificadas === false && (
                  <InfoStrip tone="warning" icon="⚠️">
                    Pendências não verificadas com o servidor neste aparelho. Conecte à internet e atualize os dados.
                  </InfoStrip>
                )}
                {pendenciasAbertas.map((p) => {
                  const dias = diasEntre(p.desde, new Date().toISOString())
                  return (
                    <div key={p.chave} className="flex flex-col gap-2 rounded-xl border-2 border-amber-300 bg-amber-50/60 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-extrabold leading-tight text-amber-900">
                          {p.secao}: {p.label}
                        </span>
                        <span className="shrink-0 text-xs font-bold text-amber-800">
                          desde {new Date(p.desde).toLocaleDateString('pt-BR')} · {dias === 0 ? 'hoje' : `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`}
                        </span>
                      </div>
                      {p.ocorrencias > 1 && <p className="text-xs font-semibold text-amber-800">Marcado em {p.ocorrencias} auditorias seguidas</p>}
                      {p.observacao && <p className="text-sm text-gray-700">“{p.observacao}”</p>}
                      {p.fotoUrl && (
                        <img
                          src={p.fotoUrl}
                          alt={`Foto anterior: ${p.label}`}
                          className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                      <ChoiceGrid
                        options={[
                          { value: 'resolvida', label: 'RESOLVIDO', icon: '✓', tone: 'success' },
                          { value: 'mantida', label: 'AINDA PENDENTE', icon: '✗', tone: 'danger' },
                        ]}
                        value={respostasPendencia[p.chave] || ''}
                        onChange={(v) => responderPendencia(p.chave, v as SituacaoPendencia5S)}
                        cols={2}
                        dataField={`pendencia_${p.chave}`}
                      />
                      {getError(`pendencia_${p.chave}`) && <p className="text-sm font-semibold text-red-700">{getError(`pendencia_${p.chave}`)}</p>}
                      {respostasPendencia[p.chave] === 'mantida' && (
                        <EvidenciaProblema
                          observacao={naoConformidades[p.chave]?.observacao || ''}
                          onObservacao={(texto) => setEvidencia(p.chave, { observacao: texto })}
                          dataField={`obs_${p.chave}`}
                          foto={naoConformidades[p.chave]?.fotoBase64 || ''}
                          onTirarFoto={() => handleTirarFoto(p.chave)}
                          onRemoverFoto={() => setEvidencia(p.chave, { fotoBase64: '' })}
                          capturandoFoto={capturandoFoto && campoFotoAtual === p.chave}
                          fotoErro={campoFotoAtual === p.chave ? fotoErro : null}
                          ouvindo={ouvindoVoz && campoVozAtual === p.chave}
                          onFalar={() => handleFalar(p.chave)}
                          vozErro={campoVozAtual === p.chave ? vozErro : null}
                          aviso="Ainda pendente. A observação anterior é mantida; acrescente uma nova se quiser (opcional)."
                        />
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </CadernetaSection>
        )}

        {SECOES_5S.map((secao, indice) => {
          const res = resultado.secoes.find((s) => s.id === secao.id)
          return (
            <CadernetaSection
              key={secao.id}
              numero={indice + 1}
              titulo={secao.titulo}
              required
              right={res && res.conformes + res.naoConformes > 0 ? <span className="text-xs font-extrabold text-gray-500">{res.percentual}%</span> : undefined}
            >
              {secao.itens.map((item, i) => {
                // Item com pendência anterior é decidido pela pergunta acima: resolvido some daqui, pendente aparece como N fixo
                const pendencia = pendenciasPorChave[item.chave]
                if (pendencia && respostasPendencia[item.chave] !== 'mantida') return null
                const resposta = form.itens[item.chave] || ''
                return (
                  <div key={item.chave} className="flex flex-col gap-2">
                    <p className="text-[15px] font-bold leading-snug text-gray-900">
                      {i + 1}) {item.texto}
                      {pendencia && <span className="ml-2 text-xs font-semibold text-red-700">(pendência anterior: ainda não conforme)</span>}
                    </p>
                    {!pendencia && (
                      <ChoiceGrid
                        options={RESPOSTA_OPTIONS}
                        value={resposta}
                        onChange={setResposta(item.chave)}
                        cols={3}
                        dataField={item.chave}
                      />
                    )}
                    {getError(item.chave) && <p className="text-sm font-semibold text-red-700">{getError(item.chave)}</p>}
                    {!pendencia && resposta === 'N' && (
                      <EvidenciaProblema
                        obrigatoria
                        observacao={naoConformidades[item.chave]?.observacao || ''}
                        onObservacao={(texto) => setEvidencia(item.chave, { observacao: texto })}
                        erroObservacao={getError(`obs_${item.chave}`)}
                        dataField={`obs_${item.chave}`}
                        foto={naoConformidades[item.chave]?.fotoBase64 || ''}
                        onTirarFoto={() => handleTirarFoto(item.chave)}
                        onRemoverFoto={() => setEvidencia(item.chave, { fotoBase64: '' })}
                        capturandoFoto={capturandoFoto && campoFotoAtual === item.chave}
                        fotoErro={campoFotoAtual === item.chave ? fotoErro : null}
                        ouvindo={ouvindoVoz && campoVozAtual === item.chave}
                        onFalar={() => handleFalar(item.chave)}
                        vozErro={campoVozAtual === item.chave ? vozErro : null}
                        aviso={item.negativa}
                      />
                    )}
                  </div>
                )
              })}
              <Input
                label="OBSERVAÇÕES GERAIS DO PILAR"
                placeholder="Observações (opcional)"
                value={form.observacoes[secao.id] || ''}
                onChange={(e) => setObservacao(secao.id, e.target.value)}
              />
            </CadernetaSection>
          )
        })}

        <CadernetaSection numero={SECOES_5S.length + 1} titulo="Nota do setor" required>
          <p className="-mt-2 text-sm text-gray-500">De 0 (muito ruim) a 5 (excelente). Independe do percentual de conformidade.</p>
          <ChoiceGrid
            options={NOTA_OPTIONS}
            value={form.notaGeral === null || form.notaGeral === undefined ? '' : String(form.notaGeral)}
            onChange={(v) => setForm((prev) => ({ ...prev, notaGeral: Number(v) }))}
            cols={6}
            size="sm"
            dataField="notaGeral"
          />
          {getError('notaGeral') && <p className="text-sm font-semibold text-red-700">{getError('notaGeral')}</p>}
        </CadernetaSection>

        <input ref={fotoInputRef} type="file" accept="image/*" capture="environment" onChange={handleFotoInput} className="hidden" />

        <FormFooter
          onSalvar={() => salvar(executarSalvamento)}
          onLimpar={handleLimpar}
          salvando={salvando}
          disabled={!isValid}
          formValido={isValid}
          pendenciaTexto={pendenciaTexto}
        />
      </CadernetaLayout>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Auditoria 5S"
        registro={registroSalvo}
        caderneta="auditoria-5s"
      />

      <ObservacaoAtrasoModal
        isOpen={showObservacaoModal}
        onClose={async (observacao) => {
          if (observacao !== undefined) {
            await onConfirmarObservacao(observacao)
          } else {
            onCancelarObservacao()
          }
        }}
        horarioProgramado={horariosModal.programado}
        horarioRegistro={horariosModal.registro}
      />
    </>
  )
}
