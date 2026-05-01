import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { salvarRegistro } from '../services/api'
import { scrollToFirstError } from '../utils/scrollToError'
import { CadernetaStore } from '../services/indexedDB'

export interface ValidationError {
  field: string
  message: string
}

export interface UseCadernetaFormOptions<T> {
  cadernetaType: CadernetaStore
  initialForm: T
  transformData?: (form: T) => Record<string, unknown>
  onSaveSuccess?: (savedData: Record<string, unknown>) => void
  resetFormAfterSave?: boolean
  validateFn?: (form: T) => ValidationError[] | null
}

export function useCadernetaForm<T extends Record<string, unknown>>(options: UseCadernetaFormOptions<T>) {
  const {
    cadernetaType,
    initialForm,
    transformData,
    onSaveSuccess,
    resetFormAfterSave = true,
    validateFn,
  } = options

  const navigate = useNavigate()
  const [form, setForm] = useState<T>(initialForm)
  const formRef = useRef(form)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<Record<string, unknown> | null>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)

  // Atualizar ref quando form mudar
  formRef.current = form

  // Função para atualizar um campo específico do formulário
  const set = useCallback((field: keyof T) => (val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }))
  }, [])

  // Função para atualizar um campo de input específico
  const setInput = useCallback((field: keyof T) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }, [])

  // Função para atualizar um campo específico com qualquer valor
  const setValue = useCallback((field: keyof T) => (val: unknown) => {
    setForm((prev) => ({ ...prev, [field]: val }))
  }, [])

  // Função para atualizar um campo de array (como categorias)
  const setArrayField = useCallback((field: keyof T) => (val: unknown[]) => {
    setForm((prev) => ({ ...prev, [field]: val }))
  }, [])

  // Função para obter a mensagem de erro de um campo específico
  const getError = useCallback((field: string) => {
    return errors.find((e) => e.field === field)?.message
  }, [errors])

  // Função para resetar o formulário
  const resetForm = useCallback(() => {
    setForm(initialForm)
    setErrors([])
  }, [initialForm])

  // Função para salvar o registro
  const handleSalvar = useCallback(async (customData?: Record<string, unknown>) => {
    setSalvando(true)
    setErrors([])

    // Validar se fornecida função de validação
    if (validateFn) {
      const validationErrors = validateFn(formRef.current)
      if (validationErrors && validationErrors.length > 0) {
        setErrors(validationErrors)
        scrollToFirstError(validationErrors)
        setSalvando(false)
        return { success: false, errors: validationErrors }
      }
    }

    // Transformar dados se fornecida função de transformação
    const dataToSave = transformData ? transformData(formRef.current) : (formRef.current as Record<string, unknown>)

    // Mesclar com dados customizados se fornecidos
    const finalData = customData ? { ...dataToSave, ...customData } : dataToSave

    const result = await salvarRegistro(cadernetaType, finalData)

    setSalvando(false)

    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      // Armazenar o registro salvo para compartilhamento
      setRegistroSalvo(finalData)
      setShowSuccessModal(true)

      if (resetFormAfterSave) {
        resetForm()
      }

      if (onSaveSuccess) {
        onSaveSuccess(finalData)
      }
    }

    return result
  }, [cadernetaType, transformData, resetFormAfterSave, onSaveSuccess, resetForm, validateFn])

  // Função para criar novo registro
  const handleNewRecord = useCallback(() => {
    setShowSuccessModal(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Função para sair da página
  const handleExit = useCallback(() => {
    setShowSuccessModal(false)
    navigate('/')
  }, [navigate])

  // Função para mostrar modal PDF
  const handleShowPdf = useCallback(() => {
    setShowPdfModal(true)
  }, [])

  // Função para fechar modal PDF
  const handleClosePdf = useCallback(() => {
    setShowPdfModal(false)
  }, [])

  return {
    // Estado
    form,
    errors,
    salvando,
    showSuccessModal,
    registroSalvo,
    showPdfModal,

    // Setters
    setForm,
    setErrors,
    setShowSuccessModal,
    setRegistroSalvo,
    setShowPdfModal,

    // Funções helper
    set,
    setInput,
    setValue,
    setArrayField,
    getError,
    resetForm,
    handleSalvar,
    handleNewRecord,
    handleExit,
    handleShowPdf,
    handleClosePdf,
  }
}
