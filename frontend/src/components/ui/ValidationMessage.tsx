interface ValidationMessageProps {
  errors: { field: string; message: string }[]
}

export default function ValidationMessage({ errors }: ValidationMessageProps) {
  if (errors.length === 0) return null

  return (
    <div className="bg-red-50 border border-red-300 rounded-lg p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-xl">⚠️</span>
        <p className="text-sm font-semibold text-red-800">
          {errors.length} {errors.length === 1 ? 'campo obrigatório' : 'campos obrigatórios'}
        </p>
      </div>
    </div>
  )
}
