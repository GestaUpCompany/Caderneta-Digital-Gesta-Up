import { useState, useEffect, useMemo } from 'react'
import SearchableModal from './ui/SearchableModal'
import { Input } from './ui'
import { getIndividuos, buscarIndividuoPorIdGenerico } from '../services/supabaseService'

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
  required = false,
  showAnimalCard = true,
  disabled = false,
}: AnimalIdentifierProps) {
  const [individuos, setIndividuos] = useState<AnimalData[]>([])
  const [loading, setLoading] = useState(false)
  const [hasIndividuos, setHasIndividuos] = useState<boolean | null>(null)
  const [animalEncontrado, setAnimalEncontrado] = useState<AnimalData | null>(null)

  // Check if there are any individuos for this fazenda
  useEffect(() => {
    setIndividuos([])
    setAnimalEncontrado(null)
    setHasIndividuos(null)
    if (!fazendaId) return
    let cancelled = false
    setLoading(true)
    getIndividuos(fazendaId, 100)
      .then((data) => {
        if (cancelled) return
        const list = (data as AnimalData[]) || []
        setIndividuos(list)
        const hasFormalIds = list.some(i => i.id_manejo || i.id_brinco || i.id_chip)
        setHasIndividuos(hasFormalIds)
      })
      .catch((err) => {
        console.error('Erro ao carregar individuos:', err)
        if (!cancelled) setHasIndividuos(false)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [fazendaId])

  const handleFieldChange = async (field: 'idManejo' | 'idBrinco' | 'idChip', value: string) => {
    if (!value || value.trim() === '') {
      onChange({ idManejo: '', idBrinco: '', idChip: '', individuoId: null, animalData: null })
      setAnimalEncontrado(null)
      return
    }

    // Try to find in pre-loaded list (only formal IDs, not id_provisorio_cria)
    const found = individuos.find((i) => {
      if (field === 'idManejo') return i.id_manejo === value
      if (field === 'idBrinco') return i.id_brinco === value
      return i.id_chip === value
    })

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

    // Only do on-demand API search if there are individuos loaded (searchable mode)
    // In free input mode, skip API calls on every keystroke — onBlur handles it
    if (individuos.length > 0) {
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
    }

    // Manual entry — not found anywhere (or no individuos to search)
    setAnimalEncontrado(null)
    onChange({
      idManejo: field === 'idManejo' ? value : valueManejo,
      idBrinco: field === 'idBrinco' ? value : valueBrinco,
      idChip: field === 'idChip' ? value : valueChip,
      individuoId: null,
      animalData: null,
    })
  }

  const handleInputBlur = async (value: string) => {
    if (!value || value.trim() === '') return
    // Try on-demand search when user finishes typing
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
      }
    } catch (err) {
      console.error('Erro na busca on-demand:', err)
    }
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
    status: ''
  } : null)

  const renderSearchable = hasIndividuos === true

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
              setAnimalEncontrado(null)
              onChange({
                idManejo: manejo || '',
                idBrinco: brinco || '',
                idChip: chip || '',
                individuoId: null,
                animalData: null,
              })
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
              setAnimalEncontrado(null)
              onChange({
                idManejo: manejo || '',
                idBrinco: brinco || '',
                idChip: chip || '',
                individuoId: null,
                animalData: null,
              })
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
              setAnimalEncontrado(null)
              onChange({
                idManejo: manejo || '',
                idBrinco: brinco || '',
                idChip: chip || '',
                individuoId: null,
                animalData: null,
              })
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
