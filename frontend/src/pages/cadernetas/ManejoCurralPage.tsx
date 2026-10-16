import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { v4 as uuidv4 } from 'uuid'
import { CheckCircle2, Pencil, Trash2 } from 'lucide-react'
import CadernetaLayout from '../../components/CadernetaLayout'
import AnimalIdentifier from '../../components/AnimalIdentifier'
import { Button, Input, Select } from '../../components/ui'
import { salvarRegistro } from '../../services/api'
import { getLotes } from '../../services/supabaseService'
import { getCachedCadastroData, getLoteByNomeCached, getRacasCached } from '../../services/cadastroCache'
import { lerRascunho, limparRascunho, salvarRascunho } from '../../services/indexedDB'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import {
  faltaParaAnimalNovo,
  linhaVazia,
  novaLinha,
  resumirLinha,
  type LinhaManejo,
  type MotivoTroca,
} from '../../utils/manejoCurral'

interface SessaoManejo {
  id: string
  iniciadaEm: string
  observacao: string
  linhas: LinhaManejo[]
}

interface LoteItem {
  id: string
  nome: string
}

const CATEGORIAS = [
  'Bezerro ao Pé', 'Bezerra ao Pé', 'Garrote', 'Garrota', 'Novilho', 'Novilha',
  'Boi Magro', 'Boi Gordo', 'Vaca Parida', 'Vaca Vazia', 'Touro',
]

const MOTIVOS: { value: string; label: string }[] = [
  { value: '', label: 'Não informar' },
  { value: 'definitivo', label: 'Brinco definitivo (era provisório)' },
  { value: 'perdido', label: 'Brinco perdido' },
  { value: 'trocado', label: 'Brinco trocado' },
]

const novaSessao = (): SessaoManejo => ({ id: uuidv4(), iniciadaEm: new Date().toISOString(), observacao: '', linhas: [] })

export default function ManejoCurralPage() {
  const navigate = useNavigate()
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)
  const rascunhoKey = `manejo-curral-${fazendaId}`

  const [sessao, setSessao] = useState<SessaoManejo>(novaSessao())
  const [carregada, setCarregada] = useState(false)
  const [linha, setLinha] = useState<LinhaManejo>(() => novaLinha(uuidv4()))
  const [editandoUid, setEditandoUid] = useState<string | null>(null)
  const [lotes, setLotes] = useState<LoteItem[]>([])
  const [racas, setRacas] = useState<string[]>([])
  const [erros, setErros] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)
  const [concluida, setConcluida] = useState<number | null>(null)

  // Rascunho: a sessão inteira (linhas já feitas e a linha em edição) sobrevive a fechar o app
  useEffect(() => {
    if (!fazendaId) return
    let cancelado = false
    lerRascunho<{ sessao: SessaoManejo; linha: LinhaManejo }>(rascunhoKey)
      .then((r) => {
        if (cancelado) return
        if (r?.sessao) setSessao(r.sessao)
        if (r?.linha) setLinha(r.linha)
      })
      .catch(() => {})
      .finally(() => !cancelado && setCarregada(true))
    return () => {
      cancelado = true
    }
  }, [fazendaId, rascunhoKey])

  useEffect(() => {
    if (!carregada || !fazendaId || concluida !== null) return
    const t = setTimeout(() => {
      salvarRascunho(rascunhoKey, { sessao, linha }).catch((e) => console.error('[ManejoCurral] rascunho:', e))
    }, 400)
    return () => clearTimeout(t)
  }, [sessao, linha, carregada, fazendaId, rascunhoKey, concluida])

  // Lotes e raças (online primeiro, cache offline)
  useEffect(() => {
    if (!fazendaId) return
    let cancelado = false
    const carregar = async () => {
      let dados: any[] = []
      if (navigator.onLine) {
        try {
          dados = (await getLotes(fazendaId)) || []
        } catch {
          dados = []
        }
      }
      if (dados.length === 0) {
        const cache = await getCachedCadastroData()
        const detalhes = await Promise.all((cache?.lotes || []).map((n: string) => getLoteByNomeCached(fazendaId, n)))
        dados = detalhes.filter((l: any) => l && l.ativo !== false && !l.deleted_at)
      }
      if (cancelado) return
      setLotes(
        dados
          .filter((l: any) => l.id && l.nome)
          .map((l: any) => ({ id: l.id as string, nome: l.nome as string }))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      )
      try {
        const r = await getRacasCached(fazendaId)
        if (!cancelado) setRacas((r || []).map((x: any) => x.nome).filter(Boolean))
      } catch {
        /* sem cache de raças */
      }
    }
    carregar()
    return () => {
      cancelado = true
    }
  }, [fazendaId])

  const opcoesLote = useMemo(
    () => [{ value: '', label: 'Não designar lote' }, ...lotes.map((l) => ({ value: l.id, label: l.nome }))],
    [lotes]
  )
  const opcoesRaca = useMemo(() => [{ value: '', label: 'Selecione...' }, ...racas.map((r) => ({ value: r, label: r }))], [racas])

  const set = (patch: Partial<LinhaManejo>) => setLinha((l) => ({ ...l, ...patch }))

  const adicionarLinha = () => {
    if (linhaVazia(linha)) {
      setErros(['Informe o animal, uma identificação nova, o lote ou o peso'])
      return
    }
    const faltas = faltaParaAnimalNovo(linha)
    // Animal não encontrado só vira cadastro novo se vier completo; senão o servidor registraria um conflito
    if (!linha.individuoId && linha.identificadorLido.trim() === '' && faltas.length > 0) {
      setErros([`Animal novo: falta ${faltas.join(', ')}`])
      return
    }
    setErros([])
    setSessao((s) => {
      const existe = s.linhas.some((l) => l.uid === linha.uid)
      return { ...s, linhas: existe ? s.linhas.map((l) => (l.uid === linha.uid ? linha : l)) : [...s.linhas, linha] }
    })
    setEditandoUid(null)
    setLinha(novaLinha(uuidv4()))
  }

  const editarLinha = (uid: string) => {
    const alvo = sessao.linhas.find((l) => l.uid === uid)
    if (!alvo) return
    setLinha(alvo)
    setEditandoUid(uid)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const removerLinha = (uid: string) => {
    setSessao((s) => ({ ...s, linhas: s.linhas.filter((l) => l.uid !== uid) }))
    if (editandoUid === uid) {
      setEditandoUid(null)
      setLinha(novaLinha(uuidv4()))
    }
  }

  const finalizar = async () => {
    if (sessao.linhas.length === 0) {
      setErros(['Registre ao menos um animal'])
      return
    }
    setSalvando(true)
    setErros([])
    const resultado = await salvarRegistro('manejo-curral', {
      id: sessao.id,
      data: todayBR(),
      responsavel: usuario,
      usuario,
      observacao: sessao.observacao,
      iniciadaEm: sessao.iniciadaEm,
      finalizadaEm: new Date().toISOString(),
      linhas: sessao.linhas,
    })
    setSalvando(false)
    if (!resultado.success) {
      setErros((resultado.errors || []).map((e) => e.message))
      return
    }
    await limparRascunho(rascunhoKey).catch(() => {})
    setConcluida(sessao.linhas.length)
  }

  const novaSessaoDepois = () => {
    setSessao(novaSessao())
    setLinha(novaLinha(uuidv4()))
    setConcluida(null)
    setErros([])
  }

  if (!fazendaId) {
    return (
      <CadernetaLayout title="MANEJO DE CURRAL" cadernetaId="manejo-curral" showRegistrosButton={false} onBack={() => navigate('/')}>
        <p className="p-4 text-sm text-gray-600">Configure a fazenda antes de usar esta caderneta.</p>
      </CadernetaLayout>
    )
  }

  if (concluida !== null) {
    return (
      <CadernetaLayout title="MANEJO DE CURRAL" cadernetaId="manejo-curral" showRegistrosButton={false} onBack={() => navigate('/')}>
        <div className="p-4 flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="w-14 h-14 text-green-700" />
          <p className="text-lg font-bold">Sessão salva com {concluida} animal(is)</p>
          <p className="text-sm text-gray-600">
            Os dados ficam no aparelho e são enviados quando houver sinal. A mudança de lote não é aplicada sozinha: o gestor
            confirma no painel.
          </p>
          <Button onClick={novaSessaoDepois}>NOVA SESSÃO</Button>
          <Button variant="secondary" onClick={() => navigate('/')}>
            VOLTAR AO MENU
          </Button>
        </div>
      </CadernetaLayout>
    )
  }

  return (
    <CadernetaLayout title="MANEJO DE CURRAL" cadernetaId="manejo-curral" showRegistrosButton={false} onBack={() => navigate('/')}>
      <div className="p-4 flex flex-col gap-5">
        <p className="text-sm text-gray-600">
          Identifique os animais e escolha o lote de destino. Nada é obrigatório, e o lote só muda depois que o gestor confirmar.
        </p>

        <section className="flex flex-col gap-3">
          <h2 className="font-bold">{editandoUid ? 'Editando animal' : `Animal ${sessao.linhas.length + 1}`}</h2>

          <AnimalIdentifier
            key={linha.uid}
            fazendaId={fazendaId}
            label="1. Qual é o animal? (provisório, brinco, chip ou manejo)"
            valueManejo={linha.lidoManejo}
            valueBrinco={linha.lidoBrinco}
            valueChip={linha.lidoChip}
            showAnimalCard
            mensagemNovoAnimal="ID não encontrado: preencha abaixo para cadastrar como animal novo."
            onChange={({ idManejo, idBrinco, idChip, individuoId, animalData }) => {
              const lido = idManejo || idBrinco || idChip || animalData?.id_provisorio_cria || ''
              setLinha((l) => ({
                ...l,
                individuoId,
                identificadorLido: lido,
                lidoManejo: idManejo,
                lidoBrinco: idBrinco,
                lidoChip: idChip,
                idProvisorioAnterior: animalData?.id_provisorio_cria || '',
                // Animal achado: lote e dados dele vêm do cadastro; animal novo: o peão preenche
                sexo: animalData ? '' : l.sexo,
                categoria: animalData ? '' : l.categoria,
                raca: animalData ? '' : l.raca,
              }))
            }}
          />

          <h3 className="font-semibold text-sm mt-1">2. Identificação nova</h3>
          <Input label="Brinco novo" value={linha.idBrincoNovo} onChange={(e) => set({ idBrincoNovo: e.target.value })} />
          <Input label="Chip novo" value={linha.idChipNovo} onChange={(e) => set({ idChipNovo: e.target.value })} />
          <Input label="ID de manejo novo" value={linha.idManejoNovo} onChange={(e) => set({ idManejoNovo: e.target.value })} />
          <Select
            label="Motivo"
            value={linha.motivoTroca}
            onChange={(e) => set({ motivoTroca: e.target.value as MotivoTroca })}
            options={MOTIVOS}
          />

          <h3 className="font-semibold text-sm mt-1">3. Lote de destino e peso</h3>
          <Select
            label="Lote de destino"
            value={linha.loteDestinoId}
            onChange={(e) => {
              const l = lotes.find((x) => x.id === e.target.value)
              set({ loteDestinoId: e.target.value, loteDestinoNome: l?.nome || '' })
            }}
            options={opcoesLote}
          />
          <Input
            label="Peso (kg, opcional)"
            inputMode="decimal"
            value={linha.pesoKg}
            onChange={(e) => set({ pesoKg: e.target.value })}
            helper="O peso fica só neste animal; não altera o peso do lote."
          />

          {!linha.individuoId && linha.identificadorLido.trim() !== '' && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex flex-col gap-3">
              <p className="text-sm font-medium text-amber-900">
                Animal não encontrado. Para cadastrá-lo como novo, preencha estes dados (se deixar em branco, a linha é
                guardada e o gestor resolve).
              </p>
              <Select
                label="Sexo"
                value={linha.sexo}
                onChange={(e) => set({ sexo: e.target.value as LinhaManejo['sexo'] })}
                options={[{ value: '', label: 'Selecione...' }, { value: 'Macho', label: 'Macho' }, { value: 'Fêmea', label: 'Fêmea' }]}
              />
              <Select
                label="Categoria"
                value={linha.categoria}
                onChange={(e) => set({ categoria: e.target.value })}
                options={[{ value: '', label: 'Selecione...' }, ...CATEGORIAS.map((c) => ({ value: c, label: c }))]}
              />
              <Select label="Raça" value={linha.raca} onChange={(e) => set({ raca: e.target.value })} options={opcoesRaca} />
            </div>
          )}

          <Input label="Observação" value={linha.observacao} onChange={(e) => set({ observacao: e.target.value })} />

          {erros.length > 0 && (
            <ul className="text-sm text-red-700 font-medium list-disc pl-5">
              {erros.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}

          <Button onClick={adicionarLinha}>{editandoUid ? 'SALVAR ALTERAÇÃO' : 'ADICIONAR ANIMAL'}</Button>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-bold">Animais da sessão ({sessao.linhas.length})</h2>
          {sessao.linhas.length === 0 && <p className="text-sm text-gray-500">Nenhum animal ainda.</p>}
          {sessao.linhas.map((l, i) => (
            <div key={l.uid} className="flex items-center gap-2 rounded-lg border border-gray-300 p-3">
              <span className="font-bold w-7 text-gray-500">{i + 1}</span>
              <span className="flex-1 text-sm">{resumirLinha(l)}</span>
              <button type="button" aria-label="Editar" className="p-2" onClick={() => editarLinha(l.uid)}>
                <Pencil className="w-5 h-5" />
              </button>
              <button type="button" aria-label="Excluir" className="p-2 text-red-700" onClick={() => removerLinha(l.uid)}>
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </section>

        <Input
          label="Observação da sessão (opcional)"
          value={sessao.observacao}
          onChange={(e) => setSessao((s) => ({ ...s, observacao: e.target.value }))}
        />

        <Button variant="success" loading={salvando} disabled={sessao.linhas.length === 0} onClick={finalizar}>
          FINALIZAR SESSÃO
        </Button>
      </div>
    </CadernetaLayout>
  )
}
