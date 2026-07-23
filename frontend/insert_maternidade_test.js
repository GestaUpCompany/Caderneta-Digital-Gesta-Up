// Script para inserir 8 registros de maternidade de teste no IndexedDB
// Cole no console do navegador (F12) enquanto o app estiver aberto
// Os registros usam a data de hoje (23/07/2026) com diferentes cenários

(async () => {
  const DB_NAME = 'cadernetas-digitais'
  const STORE = 'maternidade'

  const now = new Date().toISOString()

  // Helper para gerar UUID v4
  const uuid = () => crypto.randomUUID()

  // Helper para gerar timestamp atual
  const ts = () => new Date().toISOString()

  const vinculoGemeos = uuid() // vinculo entre os 3 registros de gêmeos

  const registros = [
    {
      id: uuid(),
      data: '23/07/2026 08:30',
      pasto: 'Pasto A',
      pastoId: null,
      lote: 'Lote 1',
      loteId: null,
      pesoCria: 42.0,
      idProvisorioCria: 'PROV-001',
      idBrincoCria: null,
      idChipCria: null,
      tratamento: 'Colostro, Vacina',
      tipoParto: ['Normal'],
      observacaoParto: null,
      sexo: 'Macho',
      raca: 'Nelore',
      idManejoMae: null,
      idBrincoMae: null,
      idChipMae: null,
      individuoIdMae: null,
      individuoIdCria: null,
      categoriaMae: null,
      escoreMatriz: null,
      docilidadeMatriz: null,
      partoVinculoId: null,
      version: 1,
      lastModified: ts(),
      syncStatus: 'synced',
    },
    {
      id: uuid(),
      data: '23/07/2026 09:15',
      pasto: 'Pasto A',
      pastoId: null,
      lote: 'Lote 1',
      loteId: null,
      pesoCria: 38.5,
      idProvisorioCria: 'PROV-002',
      idBrincoCria: null,
      idChipCria: null,
      tratamento: 'Colostro',
      tipoParto: ['Normal'],
      observacaoParto: null,
      sexo: 'Fêmea',
      raca: 'Nelore',
      idManejoMae: null,
      idBrincoMae: null,
      idChipMae: null,
      individuoIdMae: null,
      individuoIdCria: null,
      categoriaMae: null,
      escoreMatriz: null,
      docilidadeMatriz: null,
      partoVinculoId: null,
      version: 1,
      lastModified: ts(),
      syncStatus: 'synced',
    },
    {
      id: uuid(),
      data: '23/07/2026 10:00',
      pasto: 'Pasto B',
      pastoId: null,
      lote: 'Lote 2',
      loteId: null,
      pesoCria: 45.0,
      idProvisorioCria: 'PROV-003',
      idBrincoCria: null,
      idChipCria: null,
      tratamento: 'Colostro, Vacina',
      tipoParto: ['Gêmeos'],
      observacaoParto: null,
      sexo: 'Macho',
      raca: 'Gir',
      idManejoMae: null,
      idBrincoMae: null,
      idChipMae: null,
      individuoIdMae: null,
      individuoIdCria: null,
      categoriaMae: null,
      escoreMatriz: null,
      docilidadeMatriz: null,
      partoVinculoId: vinculoGemeos,
      version: 1,
      lastModified: ts(),
      syncStatus: 'synced',
    },
    {
      id: uuid(),
      data: '23/07/2026 10:00',
      pasto: 'Pasto B',
      pastoId: null,
      lote: 'Lote 2',
      loteId: null,
      pesoCria: 43.0,
      idProvisorioCria: 'PROV-004',
      idBrincoCria: null,
      idChipCria: null,
      tratamento: 'Colostro',
      tipoParto: ['Gêmeos'],
      observacaoParto: null,
      sexo: 'Fêmea',
      raca: 'Gir',
      idManejoMae: null,
      idBrincoMae: null,
      idChipMae: null,
      individuoIdMae: null,
      individuoIdCria: null,
      categoriaMae: null,
      escoreMatriz: null,
      docilidadeMatriz: null,
      partoVinculoId: vinculoGemeos,
      version: 1,
      lastModified: ts(),
      syncStatus: 'synced',
    },
    {
      id: uuid(),
      data: '23/07/2026 11:20',
      pasto: 'Pasto C',
      pastoId: null,
      lote: 'Lote 3',
      loteId: null,
      pesoCria: 35.0,
      idProvisorioCria: 'PROV-005',
      idBrincoCria: null,
      idChipCria: null,
      tratamento: 'Colostro',
      tipoParto: ['Gêmeos'],
      observacaoParto: null,
      sexo: 'Macho',
      raca: 'Nelore',
      idManejoMae: null,
      idBrincoMae: null,
      idChipMae: null,
      individuoIdMae: null,
      individuoIdCria: null,
      categoriaMae: null,
      escoreMatriz: null,
      docilidadeMatriz: null,
      partoVinculoId: vinculoGemeos,
      version: 1,
      lastModified: ts(),
      syncStatus: 'synced',
    },
    {
      id: uuid(),
      data: '23/07/2026 11:20',
      pasto: 'Pasto C',
      pastoId: null,
      lote: 'Lote 3',
      loteId: null,
      pesoCria: null,
      idProvisorioCria: null,
      idBrincoCria: null,
      idChipCria: null,
      tratamento: null,
      tipoParto: ['Gêmeos', 'Natimorto'],
      observacaoParto: '2ª cria natimorta',
      sexo: null,
      raca: null,
      idManejoMae: null,
      idBrincoMae: null,
      idChipMae: null,
      individuoIdMae: null,
      individuoIdCria: null,
      categoriaMae: null,
      escoreMatriz: null,
      docilidadeMatriz: null,
      partoVinculoId: vinculoGemeos,
      version: 1,
      lastModified: ts(),
      syncStatus: 'synced',
    },
    {
      id: uuid(),
      data: '23/07/2026 14:00',
      pasto: 'Pasto D',
      pastoId: null,
      lote: 'Lote 4',
      loteId: null,
      pesoCria: 39.0,
      idProvisorioCria: 'PROV-006',
      idBrincoCria: null,
      idChipCria: null,
      tratamento: 'Colostro, Vacina, Iodo',
      tipoParto: ['Distócico'],
      observacaoParto: null,
      sexo: 'Macho',
      raca: 'Brahman',
      idManejoMae: null,
      idBrincoMae: null,
      idChipMae: null,
      individuoIdMae: null,
      individuoIdCria: null,
      categoriaMae: null,
      escoreMatriz: null,
      docilidadeMatriz: null,
      partoVinculoId: null,
      version: 1,
      lastModified: ts(),
      syncStatus: 'synced',
    },
    {
      id: uuid(),
      data: '23/07/2026 15:30',
      pasto: 'Pasto D',
      pastoId: null,
      lote: 'Lote 4',
      loteId: null,
      pesoCria: 41.0,
      idProvisorioCria: 'PROV-007',
      idBrincoCria: null,
      idChipCria: null,
      tratamento: 'Colostro, Vacina',
      tipoParto: ['Cesárea'],
      observacaoParto: null,
      sexo: 'Fêmea',
      raca: 'Brahman',
      idManejoMae: null,
      idBrincoMae: null,
      idChipMae: null,
      individuoIdMae: null,
      individuoIdCria: null,
      categoriaMae: null,
      escoreMatriz: null,
      docilidadeMatriz: null,
      partoVinculoId: null,
      version: 1,
      lastModified: ts(),
      syncStatus: 'synced',
    },
  ]

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 21)

    request.onsuccess = (event) => {
      const db = event.target.result
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)

      let inseridos = 0
      registros.forEach((registro) => {
        const req = store.put(registro)
        req.onsuccess = () => {
          inseridos++
          if (inseridos === registros.length) {
            console.log(`✅ ${inseridos} registros de maternidade inseridos no IndexedDB!`)
            console.log('Recarregue a página para ver os registros na lista.')
            resolve(inseridos)
          }
        }
        req.onerror = () => {
          console.error('❌ Erro ao inserir registro:', req.error)
          reject(req.error)
        }
      })
    }

    request.onerror = () => {
      console.error('❌ Erro ao abrir IndexedDB:', request.error)
      reject(request.error)
    }
  })
})()
