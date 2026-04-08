import { useState, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { setStatus } from '../store/slices/syncSlice'
import {
  loadLocalConflicts,
  removeLocalConflict,
  Conflict,
} from '../services/conflictService'

export function useConflicts() {
  const dispatch = useDispatch()
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [currentConflict, setCurrentConflict] = useState<Conflict | null>(null)

  const loadConflicts = useCallback(() => {
    const loaded = loadLocalConflicts()
    setConflicts(loaded)
    if (loaded.length > 0) {
      setCurrentConflict(loaded[0])
    } else {
      setCurrentConflict(null)
      dispatch(setStatus('online'))
    }
  }, [dispatch])

  const handleConflictResolved = useCallback(() => {
    if (currentConflict) {
      removeLocalConflict(currentConflict.id)
    }
    const remaining = loadLocalConflicts()
    setConflicts(remaining)
    if (remaining.length > 0) {
      setCurrentConflict(remaining[0])
    } else {
      setCurrentConflict(null)
      dispatch(setStatus('online'))
    }
  }, [currentConflict, dispatch])

  return {
    conflicts,
    currentConflict,
    loadConflicts,
    handleConflictResolved,
  }
}
