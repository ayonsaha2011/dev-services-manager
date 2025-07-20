import { Component, createContext, createSignal, useContext, ParentComponent, onMount } from 'solid-js'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: () => Theme
  setTheme: (theme: Theme) => void
  isDark: () => boolean
}

const ThemeContext = createContext<ThemeContextType>()

export const ThemeProvider: ParentComponent = (props) => {
  const [theme, setTheme] = createSignal<Theme>('system')

  const isDark = () => {
    if (theme() === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return theme() === 'dark'
  }

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    
    const root = document.documentElement
    if (newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  onMount(() => {
    const savedTheme = localStorage.getItem('theme') as Theme || 'system'
    updateTheme(savedTheme)

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme() === 'system') {
        updateTheme('system')
      }
    }
    mediaQuery.addEventListener('change', handleChange)
  })

  const value: ThemeContextType = {
    theme,
    setTheme: updateTheme,
    isDark
  }

  return (
    <ThemeContext.Provider value={value}>
      {props.children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}