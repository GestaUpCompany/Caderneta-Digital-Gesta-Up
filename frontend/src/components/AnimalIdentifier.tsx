import { useState, useEffect, useMemo } from 'react'
import SearchableModal from './ui/SearchableModal'
import { Input } from './ui'
import { getIndividuos, buscarIndividuoPorIdGenerico } from '../services/supabaseService'
import { getCachedCadastroData } from '../services/cadastroCache'

interface AnimalData {
  id: string
  id_manejo: string | null
  id_brinco: string | null
  id_chip: string | null
  id_provisorio_cria: string | null
  sexo: string
  raca: string
  categoria: string
  classificacao_matriz: string | null
  numero_partos: number | null
  status: string
  data_nascimento: string | null
  lote_atual: string | null
}

function calcularIdade(dataNascimento: string | null): string {
  if (!dataNascimento) return ''
  try {
    const hoje = new Date()
    const nascimento = new Date(dataNascimento)
    if (isNaN(nascimento.getTime())) return ''
    let anos = hoje.getFullYear() - nascimento.getFullYear()
    let meses = hoje.getMonth() - nascimento.getMonth()
    if (meses < 0) {
      anos--
      meses += 12
    }
    const partes: string[] = []
    if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`)
    if (meses > 0) partes.push(`${meses} ${meses === 1 ? 'mês' : 'meses'}`)
    return partes.join(' e ') || '0 mês'
  } catch {
    return ''
  }
}

interface AnimalIdentifierProps {
  fazendaId: string
  label?: string
  valueManejo: string
  valueBrinco: string
  valueChip: string
  onChange: (values: {
    idManejo: string
    idBrinco: string
    idChip: string
    individuoId: string | null
    animalData: AnimalData | null
  }) => void
  onHasIndividuosChange?: (has: boolean | null) => void
  required?: boolean
  showAnimalCard?: boolean
  disabled?: boolean
}

export default function AnimalIdentifier({
  fazendaId,
  label = undefined,
  valueManejo,
  valueBrinco,
  valueChip,
  onChange,
  onHasIndividuosChange,
  required = false,
  showAnimalCard = true,
  disabled = false,
}: AnimalIdentifierProps) {
  const [individuos, setIndividuos] = useState<AnimalData[]>([])
  const [loading, setLoading] = useState(false)
  const [hasIndividuos, setHasIndividuos] = useState<boolean | null>(null)
  const [animalEncontrado, setAnimalEncontrado] = useState<AnimalData | null>(null)

  // Notify parent when hasIndividuos changes
  useEffect(() => {
    onHasIndividuosChange?.(hasIndividuos)
  }, [hasIndividuos, onHasIndividuosChange])

  // Check if there are any individuos for this fazenda
  useEffect(() => {
    setIndividuos([])
    setAnimalEncontrado(null)
    setHasIndividuos(null)
    if (!fazendaId) {
      console.log('[AnimalIdentifier] fazendaId ausente, skip fetch')
      return
    }
    let cancelled = false
    setLoading(true)

    const load = async () => {
      try {
        // Tenta primeiro o cache de cadastro para funcionar offline/rapido
        const cache = await getCachedCadastroData()
        const cachedIndividuos = cache?.individuos || []
        console.log('[AnimalIdentifier] cache de individuos:', cachedIndividuos.length, cachedIndividuos.slice(0, 3))

        if (cachedIndividuos.length > 0) {
          if (cancelled) return
          setIndividuos(cachedIndividuos as AnimalData[])
          const hasFormalIds = cachedIndividuos.some((i: any) => i.id_manejo || i.id_brinco || i.id_chip)
          console.log('[AnimalIdentifier] usando cache. hasFormalIds:', hasFormalIds)
          setHasIndividuos(hasFormalIds)
          setLoading(false)
          // Ainda busca no Supabase em background para atualizar
          getIndividuos(fazendaId, 100)
            .then((data) => {
              if (cancelled) return
              const list = (data as AnimalData[]) || []
              console.log('[AnimalIdentifier] background getIndividuos retornou', list.length, 'individuos')
              setIndividuos(list)
              setHasIndividuos(list.some(i => i.id_manejo || i.id_brinco || i.id_chip))
            })
            .catch((err) => console.error('[AnimalIdentifier] background getIndividuos erro:', err))
          return
        }

        // Fallback: busca direto no Supabase
        console.log('[AnimalIdentifier] iniciando getIndividuos para fazendaId:', fazendaId)
        const data = await getIndividuos(fazendaId, 100)
        if (cancelled) return
        const list = (data as AnimalData[]) || []
        console.log('[AnimalIdentifier] getIndividuos retornou', list.length, 'individuos. Raw sample:', list.slice(0, 3))
        setIndividuos(list)
        const hasFormalIds = list.some(i => i.id_manejo || i.id_brinco || i.id_chip)
        console.log('[AnimalIdentifier] hasFormalIds:', hasFormalIds)
        setHasIndividuos(hasFormalIds)
      } catch (err) {
        console.error('[AnimalIdentifier] Erro ao carregar individuos:', err)
        if (!cancelled) setHasIndividuos(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [fazendaId])

  // Busca um animal na lista pre-carregada a partir de qualquer um dos IDs
  const findAnimalByAnyId = (ids: { manejo?: string; brinco?: string; chip?: string }) => {
    const manejo = ids.manejo?.trim()
    const brinco = ids.brinco?.trim()
    const chip = ids.chip?.trim()
    return individuos.find((i) =>
      (manejo && i.id_manejo === manejo) ||
      (brinco && i.id_brinco === brinco) ||
      (chip && i.id_chip === chip)
    )
  }

  // Atualiza o estado do pai com os dados de um animal, ou limpa se nenhum for encontrado
  const setAnimalFromData = (animal: AnimalData | null) => {
    if (animal) {
      setAnimalEncontrado(animal)
      onChange({
        idManejo: animal.id_manejo || '',
        idBrinco: animal.id_brinco || '',
        idChip: animal.id_chip || '',
        individuoId: animal.id,
        animalData: animal,
      })
    } else {
      setAnimalEncontrado(null)
      onChange({ idManejo: '', idBrinco: '', idChip: '', individuoId: null, animalData: null })
    }
  }

  // Quando o usuario seleciona um ID existente no SearchableModal, preenche todos os
  // campos com os dados do mesmo animal, evitando misturar IDs de animais diferentes
  const handleFieldChange = (field: 'idManejo' | 'idBrinco' | 'idChip', value: string) => {
    if (!value || value.trim() === '') {
      setAnimalFromData(null)
      return
    }

    const found = findAnimalByAnyId({
      manejo: field === 'idManejo' ? value : undefined,
      brinco: field === 'idBrinco' ? value : undefined,
      chip: field === 'idChip' ? value : undefined,
    })

    if (found) {
      setAnimalFromData(found)
    } else {
      // Fallback: ID nao encontrado na lista (nao deveria ocorrer no fluxo normal)
      setAnimalEncontrado(null)
      onChange({
        idManejo: field === 'idManejo' ? value : '',
        idBrinco: field === 'idBrinco' ? value : '',
        idChip: field === 'idChip' ? value : '',
        individuoId: null,
        animalData: null,
      })
    }
  }

  // Faz a busca ao banco somente quando o usuário sai do input (onBlur)
  const handleInputBlur = async (value: string) => {
    if (!value || value.trim() === '') return

    // Primeiro tenta encontrar na lista pré-carregada
    const found = individuos.find((i) =>
      i.id_manejo === value || i.id_brinco === value || i.id_chip === value
    )
    if (found) {
      setAnimalEncontrado(found)
      onChange({
        idManejo: found.id_manejo || '',
        idBrinco: found.id_brinco || '',
        idChip: found.id_chip || '',
        individuoId: found.id,
        animalData: found,
      })
      return
    }

    // Busca on-demand via API só no blur
    try {
      const busca = await buscarIndividuoPorIdGenerico(fazendaId, value)
      if (busca) {
        const animal = busca as AnimalData
        setAnimalEncontrado(animal)
        onChange({
          idManejo: animal.id_manejo || '',
          idBrinco: animal.id_brinco || '',
          idChip: animal.id_chip || '',
          individuoId: animal.id,
          animalData: animal,
        })
        return
      }
    } catch (err) {
      console.error('Erro na busca on-demand:', err)
    }

    // Não encontrado — mantém como entrada manual
    setAnimalEncontrado(null)
  }


  // Filter out calves (they cannot be mothers) - only show individuals with formal IDs
  const eligibleIndividuos = useMemo(() =>
    individuos.filter(i =>
      i.id_manejo || i.id_brinco || i.id_chip
    ), [individuos])

  const manejoOptions = useMemo(() => eligibleIndividuos.map((i) => i.id_manejo).filter(Boolean) as string[], [eligibleIndividuos])
  const brincoOptions = useMemo(() => eligibleIndividuos.map((i) => i.id_brinco).filter(Boolean) as string[], [eligibleIndividuos])
  const chipOptions = useMemo(() => eligibleIndividuos.map((i) => i.id_chip).filter(Boolean) as string[], [eligibleIndividuos])

  const displayAnimal = animalEncontrado || (valueManejo || valueBrinco || valueChip ? {
    id: '',
    id_manejo: valueManejo,
    id_brinco: valueBrinco,
    id_chip: valueChip,
    id_provisorio_cria: null,
    sexo: '',
    raca: '',
    categoria: '',
    classificacao_matriz: null,
    numero_partos: null,
    status: '',
    data_nascimento: null,
    lote_atual: null
  } : null)

  // Log para debug: saber quantos individuos foram carregados e se ha IDs formais
  useEffect(() => {
    console.log('[AnimalIdentifier] fazendaId:', fazendaId, 'hasIndividuos:', hasIndividuos, 'individuos:', individuos.length, 'eligible:', eligibleIndividuos.length)
  }, [fazendaId, hasIndividuos, individuos.length, eligibleIndividuos.length])

  const renderSearchable = !!fazendaId

  return (
    <div className="flex flex-col gap-3">
      {label && (
        <p className="text-sm font-semibold text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </p>
      )}

      {renderSearchable ? (
        <>
          <SearchableModal
            label="ID MANEJO"
            options={manejoOptions}
            value={valueManejo}
            onChange={(val) => handleFieldChange('idManejo', val)}
            onCreateMulti={({ manejo, brinco, chip }) => {
              const found = findAnimalByAnyId({ manejo, brinco, chip })
              if (found) {
                setAnimalFromData(found)
              } else {
                setAnimalEncontrado(null)
                onChange({
                  idManejo: manejo || '',
                  idBrinco: brinco || '',
                  idChip: chip || '',
                  individuoId: null,
                  animalData: null,
                })
              }
            }}
            placeholder={loading ? 'Carregando...' : 'Buscar ID Manejo...'}
            disabled={disabled}
          />
          <SearchableModal
            label="ID BRINCO"
            options={brincoOptions}
            value={valueBrinco}
            onChange={(val) => handleFieldChange('idBrinco', val)}
            onCreateMulti={({ manejo, brinco, chip }) => {
              const found = findAnimalByAnyId({ manejo, brinco, chip })
              if (found) {
                setAnimalFromData(found)
              } else {
                setAnimalEncontrado(null)
                onChange({
                  idManejo: manejo || '',
                  idBrinco: brinco || '',
                  idChip: chip || '',
                  individuoId: null,
                  animalData: null,
                })
              }
            }}
            placeholder={loading ? 'Carregando...' : 'Buscar ID Brinco...'}
            disabled={disabled}
          />
          <SearchableModal
            label="ID CHIP"
            options={chipOptions}
            value={valueChip}
            onChange={(val) => handleFieldChange('idChip', val)}
            onCreateMulti={({ manejo, brinco, chip }) => {
              const found = findAnimalByAnyId({ manejo, brinco, chip })
              if (found) {
                setAnimalFromData(found)
              } else {
                setAnimalEncontrado(null)
                onChange({
                  idManejo: manejo || '',
                  idBrinco: brinco || '',
                  idChip: chip || '',
                  individuoId: null,
                  animalData: null,
                })
              }
            }}
            placeholder={loading ? 'Carregando...' : 'Buscar ID Chip...'}
            disabled={disabled}
          />
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="ID MANEJO"
            placeholder="Ex: M-001"
            value={valueManejo}
            onChange={(e) => handleFieldChange('idManejo', e.target.value)}
            onBlur={(e) => handleInputBlur(e.target.value)}
            disabled={disabled || loading}
          />
          <Input
            label="ID BRINCO"
            placeholder="Ex: 2021-089"
            value={valueBrinco}
            onChange={(e) => handleFieldChange('idBrinco', e.target.value)}
            onBlur={(e) => handleInputBlur(e.target.value)}
            disabled={disabled || loading}
          />
          <Input
            label="ID CHIP"
            placeholder="Número do chip"
            value={valueChip}
            onChange={(e) => handleFieldChange('idChip', e.target.value)}
            onBlur={(e) => handleInputBlur(e.target.value)}
            disabled={disabled || loading}
          />
        </div>
      )}

      {showAnimalCard && displayAnimal && (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 mt-2">
          <p className="text-sm font-semibold text-blue-800 mb-2">DADOS DO ANIMAL</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-gray-500 font-medium">SEXO</p>
              <p className="text-gray-900 font-bold">{displayAnimal.sexo || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">RAÇA</p>
              <p className="text-gray-900 font-bold">{displayAnimal.raca || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">CATEGORIA</p>
              <p className="text-gray-900 font-bold">{displayAnimal.categoria || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">STATUS</p>
              <p className="text-gray-900 font-bold">{displayAnimal.status || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">IDADE</p>
              <p className="text-gray-900 font-bold">{calcularIdade(displayAnimal.data_nascimento) || '—'}</p>
            </div>
            {displayAnimal.numero_partos !== null && (
              <div>
                <p className="text-gray-500 font-medium">PARTOS</p>
                <p className="text-gray-900 font-bold">{displayAnimal.numero_partos}</p>
              </div>
            )}
          </div>
          {!animalEncontrado && (valueManejo || valueBrinco || valueChip) && (
            <p className="text-xs text-amber-600 mt-2 font-medium">
              ⚠️ Animal não encontrado na base. Dados serão inseridos manualmente.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
