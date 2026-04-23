import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function useScreenTracking() {
  const location = useLocation()

  useEffect(() => {
    const screenName = location.pathname
    const screens = JSON.parse(localStorage.getItem('screenViews') || '{}')
    screens[screenName] = (screens[screenName] || 0) + 1
    localStorage.setItem('screenViews', JSON.stringify(screens))
  }, [location.pathname])

  const getScreens = () => {
    const screens = JSON.parse(localStorage.getItem('screenViews') || '{}')
    return Object.entries(screens)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([screen, count]) => `${screen}:${count}`)
      .join(',')
  }

  return { getScreens }
}
