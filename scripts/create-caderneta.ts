#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Types
interface CampoConfig {
  nome: string
  label: string
  tipo: 'texto' | 'numero' | 'data' | 'select' | 'radio' | 'checkbox' | 'textarea'
  obrigatorio: boolean
  opcoes?: string[]
  defaultValue?: any
  transform?: 'number' | 'boolean' | 'string'
  supabaseColumn?: string
  ordemLista?: number
  incluirShare?: boolean
  labelShare?: string
}

interface CadernetaConfig {
  nome: string
  id: string
  label: string
  emoji: string
  cor: string
  sheetName?: string
  disponivel: boolean
  campos: CampoConfig[]
}

// Paths
const FRONTEND_SRC = path.join(__dirname, '../frontend/src')
const FRONTEND_PUBLIC = path.join(__dirname, '../frontend/public')

// Helper functions
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

function camelToPascal(str: string): string {
  return str.replace(/(^\w|_\w)/g, match => match.replace('_', '').toUpperCase())
}

function kebabToPascal(str: string): string {
  return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')
}

function readLine(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer)
    })
  })
}

async function confirm(question: string): Promise<boolean> {
  const answer = await readLine(`${question} (y/n): `)
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes'
}

// Input methods
async function interactiveInput(): Promise<CadernetaConfig> {
  console.log('\n=== Criador de Cadernetas - Modo Interativo ===\n')

  const nome = await readLine('Nome da caderneta (ex: Pesagem): ')
  const id = await readLine('ID da caderneta (kebab-case, ex: pesagem): ')
  const label = await readLine('Label (uppercase, ex: PESAGEM): ')
  const emoji = await readLine('Emoji (ex: ⚖️): ')
  const cor = await readLine('Cor hexadecimal (ex: #8B5CF6): ')
  const sheetName = await readLine('Nome da planilha (opcional, ex: Pesagem): ')
  const disponivel = await confirm('Disponível?')

  const numCampos = parseInt(await readLine('Quantos campos? '), 10)
  const campos: CampoConfig[] = []

  const tipos = ['texto', 'numero', 'data', 'select', 'radio', 'checkbox', 'textarea']

  for (let i = 0; i < numCampos; i++) {
    console.log(`\n--- Campo ${i + 1} ---`)
    const campoNome = await readLine('Nome (camelCase, ex: pesoVivo): ')
    const campoLabel = await readLine('Label (uppercase, ex: PESO VIVO): ')
    
    console.log('\nTipos disponíveis:')
    tipos.forEach((t, idx) => console.log(`  ${idx + 1}. ${t}`))
    const tipoIdx = parseInt(await readLine('Selecione o tipo (número): '), 10) - 1
    const tipo = tipos[tipoIdx] as CampoConfig['tipo']

    const obrigatorio = await confirm('Obrigatório?')
    const ordemLista = parseInt(await readLine('Ordem na lista (número): '), 10)
    const incluirShare = await confirm('Incluir no texto compartilhável?')

    const campo: CampoConfig = {
      nome: campoNome,
      label: campoLabel,
      tipo,
      obrigatorio,
      ordemLista,
      incluirShare
    }

    if (tipo === 'select' || tipo === 'radio' || tipo === 'checkbox') {
      const opcoesStr = await readLine('Opções (separadas por vírgula, ex: Sim,Não): ')
      campo.opcoes = opcoesStr.split(',').map(o => o.trim())
    }

    if (tipo === 'numero') {
      const transform = await confirm('Transformar para número no Supabase?')
      if (transform) campo.transform = 'number'
    }

    campos.push(campo)
  }

  return {
    nome,
    id,
    label,
    emoji,
    cor,
    sheetName: sheetName || undefined,
    disponivel,
    campos
  }
}

function jsonInput(configPath: string): CadernetaConfig {
  const configContent = fs.readFileSync(configPath, 'utf-8')
  return JSON.parse(configContent)
}

function cloneInput(cadernetaId: string): CadernetaConfig {
  // Ler estrutura de caderneta existente
  const pagePath = path.join(FRONTEND_SRC, `pages/cadernetas/${kebabToPascal(cadernetaId)}Page.tsx`)
  const pageContent = fs.readFileSync(pagePath, 'utf-8')
  
  // Extrair campos do FormState interface
  const formStateMatch = pageContent.match(/interface FormState \{([\s\S]*?)\}/)
  if (!formStateMatch) {
    throw new Error('Não foi possível extrair FormState da caderneta')
  }

  const camposStr = formStateMatch[1]
  const campoLines = camposStr.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'))
  
  const campos: CampoConfig[] = []
  campoLines.forEach(line => {
    const match = line.match(/\s*(\w+):\s*(string|number|boolean|\[\])/)
    if (match) {
      const nome = match[1]
      const tipo = match[2]
      
      let tipoCampo: CampoConfig['tipo'] = 'texto'
      if (tipo === 'number') tipoCampo = 'numero'
      else if (nome === 'data') tipoCampo = 'data'
      else if (tipo === 'boolean') tipoCampo = 'radio'
      else if (tipo === 'string[]') tipoCampo = 'checkbox'

      campos.push({
        nome,
        label: nome.toUpperCase(),
        tipo: tipoCampo,
        obrigatorio: nome === 'data',
        ordemLista: campos.length + 1
      })
    }
  })

  // Ler metadados de constants.ts
  const constantsPath = path.join(FRONTEND_SRC, 'utils/constants.ts')
  const constantsContent = fs.readFileSync(constantsPath, 'utf-8')
  
  const cadernetaMatch = constantsContent.match(new RegExp(`id: '${cadernetaId}',[^}]*label: '([^']+)'[^}]*emoji: '([^']+)'[^}]*color: '([^']+)'`))
  if (!cadernetaMatch) {
    throw new Error('Não foi possível extrair metadados da caderneta')
  }

  return {
    nome: await readLine('Nome da nova caderneta: '),
    id: await readLine('ID da nova caderneta (kebab-case): '),
    label: await readLine('Label (uppercase): '),
    emoji: cadernetaMatch[2],
    cor: cadernetaMatch[3],
    disponivel: true,
    campos
  }
}

// Generation functions
function generatePageTemplate(config: CadernetaConfig): string {
  const pascalNome = kebabToPascal(config.id)
  
  // Generate imports based on field types
  let imports = `import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, ValidationMessage } from '../../components/ui'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { getCachedCadastroData } from '../../services/cadastroCache'
import { scrollToFirstError } from '../../utils/scrollToError'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'`

  // Add specific imports based on field types
  const hasRadio = config.campos.some(c => c.tipo === 'radio')
  const hasCheckbox = config.campos.some(c => c.tipo === 'checkbox')
  
  if (hasRadio) imports += `\nimport { Radio } from '../../components/ui'`
  if (hasCheckbox) imports += `\nimport { CheckboxGroup } from '../../components/ui'`

  // Generate option constants for select/radio/checkbox fields
  let optionConstants = ''
  config.campos.forEach(campo => {
    if ((campo.tipo === 'select' || campo.tipo === 'radio' || campo.tipo === 'checkbox') && campo.opcoes) {
      const constantName = campo.nome.toUpperCase()
      optionConstants += `\nconst ${constantName} = [\n`
      campo.opcoes.forEach(op => {
        optionConstants += `  { value: '${op}', label: '${op.toUpperCase()}' },\n`
      })
      optionConstants += `]\n`
    }
  })

  // Generate FormState interface
  let formStateInterface = `interface FormState {\n  data: string\n  usuario: string\n`
  config.campos.forEach(campo => {
    if (campo.nome === 'data' || campo.nome === 'usuario') return
    
    let tipo = 'string'
    if (campo.tipo === 'numero') tipo = 'number'
    else if (campo.tipo === 'checkbox') tipo = 'string[]'
    else if (campo.tipo === 'radio' && campo.opcoes?.length === 2 && campo.opcoes.includes('Sim') && campo.opcoes.includes('Não')) tipo = 'string'
    
    formStateInterface += `  ${campo.nome}: ${tipo}\n`
  })
  formStateInterface += `}`

  // Generate makeInitial function
  let makeInitial = `const makeInitial = (usuario?: string): FormState => ({\n  data: todayBR(),\n  usuario: usuario || '',\n`
  config.campos.forEach(campo => {
    if (campo.nome === 'data' || campo.nome === 'usuario') return
    
    let defaultValue = "''"
    if (campo.tipo === 'numero') defaultValue = '0'
    else if (campo.tipo === 'checkbox') defaultValue = '[]'
    else if (campo.defaultValue !== undefined) defaultValue = typeof campo.defaultValue === 'string' ? `'${campo.defaultValue}'` : String(campo.defaultValue)
    
    formStateInterface += `  ${campo.nome}: ${defaultValue},\n`
  })
  makeInitial += `})`

  // Generate JSX for each field
  let formFields = ''
  config.campos.forEach(campo => {
    const labelVar = `LABELS_BY_CADERNETA['${config.id}'].${campo.nome}`
    
    if (campo.tipo === 'texto') {
      formFields += `          <Input\n            label={${labelVar}}\n            value={form.${campo.nome}}\n            onChange={setInput('${campo.nome}')}\n            error={getError('${campo.nome}')}\n          />\n\n`
    } else if (campo.tipo === 'numero') {
      formFields += `          <Input\n            label={${labelVar}}\n            type="number"\n            value={form.${campo.nome}}\n            onChange={setInput('${campo.nome}')}\n            error={getError('${campo.nome}')}\n          />\n\n`
    } else if (campo.tipo === 'data') {
      formFields += `          <DatePicker\n            label={${labelVar}}\n            value={form.${campo.nome}}\n            onChange={setInput('${campo.nome}')}\n            error={getError('${campo.nome}')}\n          />\n\n`
    } else if (campo.tipo === 'select') {
      const constantName = campo.nome.toUpperCase()
      formFields += `          <SearchableModal\n            label={${labelVar}}\n            value={form.${campo.nome}}\n            options={${constantName}}\n            onSelect={(value) => setForm(prev => ({ ...prev, ${campo.nome}: value }))}\n            error={getError('${campo.nome}')}\n          />\n\n`
    } else if (campo.tipo === 'radio') {
      const constantName = campo.nome.toUpperCase()
      formFields += `          <Radio\n            label={${labelVar}}\n            value={form.${campo.nome}}\n            options={${constantName}}\n            onChange={setInput('${campo.nome}')}\n            error={getError('${campo.nome}')}\n          />\n\n`
    } else if (campo.tipo === 'checkbox') {
      const constantName = campo.nome.toUpperCase()
      formFields += `          <CheckboxGroup\n            label={${labelVar}}\n            value={form.${campo.nome}}\n            options={${constantName}}\n            onChange={(values) => setForm(prev => ({ ...prev, ${campo.nome}: values }))}\n            error={getError('${campo.nome}')}\n          />\n\n`
    } else if (campo.tipo === 'textarea') {
      formFields += `          <Input\n            label={${labelVar}}\n            multiline\n            value={form.${campo.nome}}\n            onChange={setInput('${campo.nome}')}\n            error={getError('${campo.nome}')}\n          />\n\n`
    }
  })

  return `${imports}

const BASE = import.meta.env.BASE_URL
${optionConstants}
${formStateInterface}

${makeInitial}

export default function ${pascalNome}Page() {
  const navigate = useNavigate()
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(() => makeInitial(usuario))
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const validate = (): boolean => {
    const newErrors: { field: string; message: string }[] = []
${config.campos.filter(c => c.obrigatorio).map(c => `    if (!form.${c.nome}) newErrors.push({ field: '${c.nome}', message: '${c.label} é obrigatório' })`).join('\n')}
    setErrors(newErrors)
    if (newErrors.length > 0) {
      scrollToFirstError()
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSalvando(true)
    try {
      const registroSalvo = await salvarRegistro('${config.id}', form)
      setRegistroSalvo(registroSalvo)
      setShowSuccessModal(true)
      eventBus.emit(CADASTRO_CACHE_UPDATED)
    } catch (error) {
      console.error('Erro ao salvar:', error)
    } finally {
      setSalvando(false)
    }
  }

  const handleNovo = () => {
    setForm(makeInitial(usuario))
    setShowSuccessModal(false)
  }

  const handleVoltar = () => {
    navigate('/modulos/cadernetas')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <FarmLogo />
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">${config.label}</h1>
          
          <form onSubmit={handleSubmit}>
${formFields}
            <div className="flex gap-4 mt-6">
              <Button
                type="button"
                onClick={handleVoltar}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="flex-1"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleVoltar}
        onNovo={handleNovo}
        registro={registroSalvo}
      />
      
      <PdfModal registro={registroSalvo} caderneta="${config.id}" />
    </div>
  )
}
`
}

function generateListaPageTemplate(config: CadernetaConfig): string {
  const pascalNome = kebabToPascal(config.id)
  
  return `import ListaRegistros from '../../components/cadernetas/ListaRegistros'

export default function ${pascalNome}ListaPage() {
  return (
    <ListaRegistros
      caderneta="${config.id}"
      titulo="${config.label}"
      rotaForm="/caderneta/${config.id}"
    />
  )
}
`
}

// Main function
async function main() {
  const args = process.argv.slice(2)
  let config: CadernetaConfig

  if (args.includes('--config')) {
    const configPath = args[args.indexOf('--config') + 1]
    config = jsonInput(configPath)
  } else if (args.includes('--clone')) {
    const cloneId = args[args.indexOf('--clone') + 1]
    config = await cloneInput(cloneId)
  } else {
    config = await interactiveInput()
  }

  console.log('\n=== Configuração da Caderneta ===')
  console.log(JSON.stringify(config, null, 2))
  
  const proceed = await confirm('\nProsseguir com a geração?')
  if (!proceed) {
    console.log('Cancelado.')
    process.exit(0)
  }

  // Generate files
  console.log('\n=== Gerando arquivos ===')
  
  // Create Page.tsx
  const pagePath = path.join(FRONTEND_SRC, `pages/cadernetas/${kebabToPascal(config.id)}Page.tsx`)
  const pageContent = generatePageTemplate(config)
  fs.writeFileSync(pagePath, pageContent)
  console.log(`✓ Criado: ${pagePath}`)

  // Create ListaPage.tsx
  const listaPagePath = path.join(FRONTEND_SRC, `pages/cadernetas/${kebabToPascal(config.id)}ListaPage.tsx`)
  const listaPageContent = generateListaPageTemplate(config)
  fs.writeFileSync(listaPagePath, listaPageContent)
  console.log(`✓ Criado: ${listaPagePath}`)

  console.log('\n=== Arquivos gerados com sucesso ===')
  console.log('\nPróximos passos manuais:')
  console.log('1. Adicionar ícone em frontend/public/cadernetas/')
  console.log('2. Modificar frontend/src/types/cadernetas.ts')
  console.log('3. Modificar frontend/src/services/indexedDB.ts')
  console.log('4. Modificar frontend/src/utils/constants.ts')
  console.log('5. Modificar frontend/src/config/labelConfig.ts')
  console.log('6. Modificar frontend/src/services/syncService.ts')
  console.log('7. Modificar frontend/src/services/supabaseService.ts')
  console.log('8. Modificar frontend/src/components/cadernetas/ListaRegistros.tsx')
  console.log('9. Modificar frontend/src/utils/shareUtils.ts')
  console.log('10. Modificar frontend/src/App.tsx')
  console.log('11. Gerar tipos Supabase (supabase gen types typescript)')
  console.log('12. Criar tabela no Supabase (SQL gerado abaixo)')
}

main().catch(console.error)
