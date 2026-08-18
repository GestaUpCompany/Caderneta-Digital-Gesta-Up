import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ChevronLeft } from 'lucide-react'
import { RootState } from '../store/store'
import { useRelatorioLote, SECOES_RELATORIO_LOTE } from '../hooks/useRelatorioLote'
import PageLoader from '../components/PageLoader'
import SecaoRelatorio from '../components/relatorios/SecaoRelatorio'
import CadastroCard from '../components/relatorios/CadastroCard'
import EstadoAtualCard from '../components/relatorios/EstadoAtualCard'
import CronologiaTimeline from '../components/relatorios/CronologiaTimeline'
import HistoricoNutricionalCard from '../components/relatorios/HistoricoNutricionalCard'
import OcupacaoTimeline from '../components/relatorios/OcupacaoTimeline'
import MovimentacaoLista from '../components/relatorios/MovimentacaoLista'
import MortalidadeCard from '../components/relatorios/MortalidadeCard'
import ReproducaoCard from '../components/relatorios/ReproducaoCard'
import ConsumoLista from '../components/relatorios/ConsumoLista'
import IndividuosLista from '../components/relatorios/IndividuosLista'

export default function RelatorioLotePage() {
  const navigate = useNavigate()
  const { loteId } = useParams<{ loteId: string }>()
  const { fazendaId } = useSelector((state: RootState) => state.config)
  const { dados, loading, erro, secaoCarregando, secoesCarregadas, carregarSecao } =
    useRelatorioLote(fazendaId, loteId || null)

  const [secaoExpandida, setSecaoExpandida] = useState<string | null>(
    SECOES_RELATORIO_LOTE.CADASTRO
  )

  const toggleSecao = useCallback(
    (nomeSecao: string) => {
      setSecaoExpandida((prev) => (prev === nomeSecao ? null : nomeSecao))
      if (!secoesCarregadas.has(nomeSecao)) {
        carregarSecao(nomeSecao)
      }
    },
    [secoesCarregadas, carregarSecao]
  )

  if (loading) return <PageLoader />

  if (erro) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg text-center max-w-md">
          <span className="text-5xl block mb-3">⚠️</span>
          <p className="text-lg font-bold text-gray-800 mb-2">{erro}</p>
          <button
            onClick={() => navigate('/modulos/relatorios/lote')}
            className="mt-4 bg-[#23503a] text-white font-bold rounded-xl px-6 py-3 min-h-[48px]"
          >
            Voltar para lotes
          </button>
        </div>
      </div>
    )
  }

  if (!dados || dados.success === false) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="bg-purple-50 rounded-2xl p-6 border-2 border-purple-200 text-center max-w-md">
          <span className="text-5xl block mb-3">🐄</span>
          <p className="text-lg font-bold text-purple-800 mb-2">
            {dados?.error || 'Lote não encontrado'}
          </p>
          <button
            onClick={() => navigate('/modulos/relatorios/lote')}
            className="mt-4 bg-[#23503a] text-white font-bold rounded-xl px-6 py-3 min-h-[48px]"
          >
            Voltar para lotes
          </button>
        </div>
      </div>
    )
  }

  const ind = dados.indicadores_consolidados
  const cad = dados.cadastro

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="sticky top-0 z-20 bg-gradient-to-b from-[#23503a] via-[#1d4030] to-[#1a3a2a] text-white shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
        <div className="px-3 py-3 desktop-container">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/20 active:bg-white/25 transition-colors text-white text-xs font-semibold pl-2 pr-3 py-2 min-h-[40px] backdrop-blur-sm"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
              <span>Voltar</span>
            </button>
          </div>
          <h1 className="mt-2 text-xl font-bold leading-tight text-center truncate">
            {cad?.nome || 'Lote'}
          </h1>
          <p className="text-white/75 text-sm text-center">Relatório do Lote</p>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-3 pb-8 desktop-container">
        {/* Cartão de indicadores (sempre visível) */}
        {ind && (
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-500 font-semibold text-sm uppercase">Visão geral</p>
              {ind.ativo ? (
                <span className="text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                  Ativo
                </span>
              ) : (
                <span className="text-sm bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                  INATIVO
                </span>
              )}
            </div>

            {/* Pasto atual em destaque */}
            {cad?.pasto_nome && (
              <div className={`mb-3 rounded-xl p-3 border-2 ${ind.ativo ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📍</span>
                    <div>
                      <p className="text-gray-500 font-semibold text-xs uppercase">Pasto atual</p>
                      <p className="text-gray-900 font-bold text-lg">{cad.pasto_nome}</p>
                    </div>
                  </div>
                  {ind.ativo && (
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-semibold">
                      Ocupado agora
                    </span>
                  )}
                </div>
                {cad.pasto_area_ha !== null && (
                  <p className="text-sm text-gray-500 mt-1 ml-9">{cad.pasto_area_ha} ha</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-500 font-semibold text-sm uppercase">Ganho de peso/dia</p>
                <p className="text-gray-900 font-bold text-xl">
                  {cad?.gmd ? `${cad.gmd} kg` : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 font-semibold text-sm uppercase">Cabeças</p>
                <p className="text-[#3b82f6] font-bold text-xl">{ind.cabecas_atual}</p>
              </div>
              <div>
                <p className="text-gray-500 font-semibold text-sm uppercase">Peso médio</p>
                <p className="text-gray-900 font-bold text-xl">
                  {ind.peso_medio_atual_kg !== null
                    ? `${ind.peso_medio_atual_kg.toFixed(1)} kg`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 font-semibold text-sm uppercase">Idade do lote</p>
                <p className="text-gray-900 font-bold text-xl">{ind.idade_lote_dias} dias</p>
              </div>
            </div>

            {/* Badges de contagem */}
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-semibold">
                ⚰️ {ind.total_mortes} {ind.total_mortes === 1 ? 'morte' : 'mortes'}
              </span>
              {ind.total_partos > 0 && (
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-semibold">
                  👶 {ind.total_partos} partos
                </span>
              )}
              {ind.total_consumo_registros > 0 && (
                <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full font-semibold">
                  🌿 {ind.total_consumo_registros} consumos
                </span>
              )}
              {ind.total_saidas + ind.total_entradas > 0 && (
                <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full font-semibold">
                  🔄 {ind.total_entradas} entradas · {ind.total_saidas} saídas
                </span>
              )}
              {ind.total_pastos_ocupados > 0 && (
                <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full font-semibold">
                  📍 {ind.total_pastos_ocupados} pastos
                </span>
              )}
              {ind.total_transicoes_categoria > 0 && (
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-semibold">
                  🔄 {ind.total_transicoes_categoria} {ind.total_transicoes_categoria === 1 ? 'troca' : 'trocas'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Seções colapsáveis */}
        <SecaoRelatorio
          icone="📋"
          titulo="Cadastro"
          expandida={secaoExpandida === SECOES_RELATORIO_LOTE.CADASTRO}
          onToggle={() => toggleSecao(SECOES_RELATORIO_LOTE.CADASTRO)}
          carregando={secaoCarregando === SECOES_RELATORIO_LOTE.CADASTRO}
        >
          {cad && <CadastroCard cadastro={cad} />}
        </SecaoRelatorio>

        <SecaoRelatorio
          icone="📊"
          titulo="Estado Atual"
          contagem={dados.estado_atual?.categorias_ativas?.length}
          expandida={secaoExpandida === SECOES_RELATORIO_LOTE.ESTADO_ATUAL}
          onToggle={() => toggleSecao(SECOES_RELATORIO_LOTE.ESTADO_ATUAL)}
          carregando={secaoCarregando === SECOES_RELATORIO_LOTE.ESTADO_ATUAL}
        >
          {dados.estado_atual && <EstadoAtualCard estado={dados.estado_atual} />}
        </SecaoRelatorio>

        <SecaoRelatorio
          icone="📍"
          titulo="Pastos por onde passou"
          contagem={dados.linha_tempo_ocupacao?.length ?? ind?.total_pastos_ocupados}
          expandida={secaoExpandida === SECOES_RELATORIO_LOTE.OCUPACAO}
          onToggle={() => toggleSecao(SECOES_RELATORIO_LOTE.OCUPACAO)}
          carregando={secaoCarregando === SECOES_RELATORIO_LOTE.OCUPACAO}
        >
          {dados.linha_tempo_ocupacao && (
            <OcupacaoTimeline ocupacao={dados.linha_tempo_ocupacao} />
          )}
        </SecaoRelatorio>

        <SecaoRelatorio
          icone="🥗"
          titulo="Histórico Nutricional"
          contagem={dados.historico_nutricional?.length}
          expandida={secaoExpandida === SECOES_RELATORIO_LOTE.NUTRICIONAL}
          onToggle={() => toggleSecao(SECOES_RELATORIO_LOTE.NUTRICIONAL)}
          carregando={secaoCarregando === SECOES_RELATORIO_LOTE.NUTRICIONAL}
        >
          {dados.historico_nutricional && (
            <HistoricoNutricionalCard historico={dados.historico_nutricional} />
          )}
        </SecaoRelatorio>

        <SecaoRelatorio
          icone="🌿"
          titulo="Consumo"
          contagem={dados.consumo_suplementacao?.length ?? ind?.total_consumo_registros}
          expandida={secaoExpandida === SECOES_RELATORIO_LOTE.CONSUMO}
          onToggle={() => toggleSecao(SECOES_RELATORIO_LOTE.CONSUMO)}
          carregando={secaoCarregando === SECOES_RELATORIO_LOTE.CONSUMO}
        >
          {dados.consumo_suplementacao && (
            <ConsumoLista consumo={dados.consumo_suplementacao} />
          )}
        </SecaoRelatorio>

        <SecaoRelatorio
          icone="🔄"
          titulo="Movimentações"
          contagem={dados.movimentacoes?.length ??
            (ind ? ind.total_entradas + ind.total_saidas : undefined)}
          expandida={secaoExpandida === SECOES_RELATORIO_LOTE.MOVIMENTACOES}
          onToggle={() => toggleSecao(SECOES_RELATORIO_LOTE.MOVIMENTACOES)}
          carregando={secaoCarregando === SECOES_RELATORIO_LOTE.MOVIMENTACOES}
        >
          {dados.movimentacoes && <MovimentacaoLista movimentacoes={dados.movimentacoes} />}
        </SecaoRelatorio>

        <SecaoRelatorio
          icone="⚰️"
          titulo="Mortes"
          contagem={dados.mortalidade?.total ?? ind?.total_mortes}
          expandida={secaoExpandida === SECOES_RELATORIO_LOTE.MORTALIDADE}
          onToggle={() => toggleSecao(SECOES_RELATORIO_LOTE.MORTALIDADE)}
          carregando={secaoCarregando === SECOES_RELATORIO_LOTE.MORTALIDADE}
        >
          {dados.mortalidade && <MortalidadeCard mortalidade={dados.mortalidade} />}
        </SecaoRelatorio>

        {((ind?.total_partos ?? 0) > 0 ||
          cad?.sistema_producao === 'Cria' ||
          cad?.sistema_producao === 'Recria') && (
          <SecaoRelatorio
            icone="👶"
            titulo="Nascimentos"
            contagem={dados.reproducao?.total_partos ?? ind?.total_partos}
            expandida={secaoExpandida === SECOES_RELATORIO_LOTE.REPRODUCAO}
            onToggle={() => toggleSecao(SECOES_RELATORIO_LOTE.REPRODUCAO)}
            carregando={secaoCarregando === SECOES_RELATORIO_LOTE.REPRODUCAO}
          >
            {dados.reproducao ? (
              <ReproducaoCard reproducao={dados.reproducao} />
            ) : (
              !secaoCarregando && (
                <div className="py-4 text-center">
                  <p className="text-gray-500 font-semibold">Nenhum nascimento registrado</p>
                </div>
              )
            )}
          </SecaoRelatorio>
        )}

        <SecaoRelatorio
          icone="🔄"
          titulo="Trocas de Categoria"
          contagem={dados.cronologia_categorias
            ? (dados.cronologia_categorias.transicoes?.length ?? 0) +
              (dados.cronologia_categorias.categorias_encerradas?.length ?? 0)
            : ind?.total_transicoes_categoria}
          expandida={secaoExpandida === SECOES_RELATORIO_LOTE.CRONOLOGIA}
          onToggle={() => toggleSecao(SECOES_RELATORIO_LOTE.CRONOLOGIA)}
          carregando={secaoCarregando === SECOES_RELATORIO_LOTE.CRONOLOGIA}
        >
          {dados.cronologia_categorias && (
            <CronologiaTimeline cronologia={dados.cronologia_categorias} />
          )}
        </SecaoRelatorio>

        <SecaoRelatorio
          icone="🏷️"
          titulo="Animais do Lote"
          contagem={dados.individuos?.length}
          expandida={secaoExpandida === SECOES_RELATORIO_LOTE.INDIVIDUOS}
          onToggle={() => toggleSecao(SECOES_RELATORIO_LOTE.INDIVIDUOS)}
          carregando={secaoCarregando === SECOES_RELATORIO_LOTE.INDIVIDUOS}
        >
          {dados.individuos && <IndividuosLista individuos={dados.individuos} />}
        </SecaoRelatorio>
      </main>
    </div>
  )
}
