import { Component, createSignal, Show, onMount, onCleanup, createEffect } from 'solid-js'
import { Portal } from 'solid-js/web'
import { useTheme } from '../providers/ThemeProvider'
import { useServices } from '../providers/ServiceProvider'
import { useEvents } from '../providers/EventProvider'
import Button from './ui/Button'
import LoadingSpinner from './ui/LoadingSpinner'
import {
  Sun,
  Moon,
  Monitor,
  Play,
  Square,
  RotateCcw,
  Settings,
  Plus,
  Keyboard,
  Activity,
  Zap
} from 'lucide-solid'

interface HeaderProps {
  onShowManagementDialog?: () => void
}

const Header: Component<HeaderProps> = (props) => {
  const { theme, setTheme, isDark } = useTheme()
  const { 
    selectedServices, 
    clearSelection, 
    startMultipleServices, 
    stopAllServices, 
    refreshServices,
    loading
  } = useServices()
  
  // Get event system for real-time status
  let events: ReturnType<typeof useEvents> | null = null
  try {
    events = useEvents()
  } catch (e) {
    // EventProvider not available
  }
  
  const [showThemeMenu, setShowThemeMenu] = createSignal(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = createSignal(false)
  const [dropdownPosition, setDropdownPosition] = createSignal({ top: 0, right: 0 })
  let themeMenuRef: HTMLDivElement | undefined
  let buttonRef: HTMLButtonElement | undefined

  // Calculate dropdown position
  const updateDropdownPosition = () => {
    if (buttonRef) {
      const rect = buttonRef.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      })
    }
  }

  // Close menu when clicking outside
  const handleClickOutside = (event: MouseEvent) => {
    if (themeMenuRef && !themeMenuRef.contains(event.target as Node) && 
        buttonRef && !buttonRef.contains(event.target as Node)) {
      setShowThemeMenu(false)
    }
  }

  // Update position when menu opens
  createEffect(() => {
    if (showThemeMenu()) {
      updateDropdownPosition()
    }
  })

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside)
  })

  onCleanup(() => {
    document.removeEventListener('mousedown', handleClickOutside)
  })

  const handleStartSelected = () => {
    const selected = Array.from(selectedServices())
    if (selected.length > 0) {
      startMultipleServices(selected)
    }
  }

  const handleStopAll = () => {
    stopAllServices()
  }

  const ThemeIcon = () => {
    switch (theme()) {
      case 'light': return <Sun class="w-4 h-4" />
      case 'dark': return <Moon class="w-4 h-4" />
      default: return <Monitor class="w-4 h-4" />
    }
  }

  return (
    <header class="glass-heavy fixed top-12 left-0 right-0 z-40">
      <div class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          {/* Enhanced Stats and Description with Glass Effects */}
          <div class="flex items-center space-x-6">
            <div class="flex items-center space-x-3">
              <div class="p-2 glass-light rounded-lg">
                <Activity class="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 class="text-xl font-bold text-foreground flex items-center space-x-3">
                  <span class="text-gradient">Service Dashboard</span>
                  <Show when={events}>
                    <div class="flex items-center space-x-2 px-2 py-1 glass-light rounded-full">
                      <div class={`w-2 h-2 rounded-full ${events?.isConnected() ? 'bg-success animate-pulse' : 'bg-destructive'}`}></div>
                      <span class="text-xs font-medium text-muted-foreground">
                        {events?.isConnected() ? 'Live' : 'Offline'}
                      </span>
                    </div>
                  </Show>
                </h1>
                <p class="text-sm text-muted-foreground mt-1 flex items-center space-x-2">
                  <span>Manage your development services</span>
                  <Show when={events?.isConnected()}>
                    <span class="flex items-center space-x-1 text-success">
                      <Zap class="w-3 h-3" />
                      <span class="text-xs font-medium">Real-time updates</span>
                    </span>
                  </Show>
                </p>
              </div>
            </div>
          </div>

          {/* Enhanced Actions with Glass Effects */}
          <div class="flex items-center space-x-3">
            {/* Selection Actions with Glass Effects */}
            <Show when={selectedServices().size > 0}>
              <div class="flex items-center space-x-3 px-4 py-2 glass-light rounded-lg border border-primary/20">
                <span class="text-sm font-medium text-primary">
                  {selectedServices().size} selected
                </span>
                <div class="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="success"
                    onClick={handleStartSelected}
                    class="h-7 px-3 text-xs glass-button"
                  >
                    <Play class="w-3 h-3 mr-1" />
                    Start
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearSelection}
                    class="h-7 px-3 text-xs glass-input"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </Show>

            {/* Global Actions with Glass Effects */}
            <div class="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={props.onShowManagementDialog}
                class="text-info hover:text-info hover:bg-info/10 border-info/30 hover:border-info glass-input"
              >
                <Settings class="w-4 h-4 mr-2" />
                Manage
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleStopAll}
                class="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive glass-input"
              >
                <Square class="w-4 h-4 mr-2" />
                Stop All
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshServices()}
                disabled={loading()}
                class="text-muted-foreground hover:text-foreground glass-input"
              >
                <Show
                  when={!loading()}
                  fallback={<LoadingSpinner size="sm" variant="default" class="mr-2" />}
                >
                  <RotateCcw class="w-4 h-4 mr-2" />
                </Show>
                Refresh
              </Button>

              {/* Keyboard Shortcuts Help with Glass Effects */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowShortcutsHelp(true)}
                class="text-muted-foreground hover:text-foreground glass-light"
                title="Keyboard shortcuts"
              >
                <Keyboard class="w-4 h-4" />
              </Button>

              {/* Enhanced Theme Selector with Glass Effects */}
              <div class="relative">
                <Button
                  ref={buttonRef}
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowThemeMenu(!showThemeMenu())}
                  class="text-muted-foreground hover:text-foreground glass-light"
                  title="Change theme"
                >
                  <ThemeIcon />
                </Button>

                <Show when={showThemeMenu()}>
                  <Portal>
                    <div
                      ref={themeMenuRef}
                      class="absolute z-50 mt-2 w-48 glass-medium rounded-lg p-1 shadow-lg animate-scale-in"
                      style={{
                        top: `${dropdownPosition().top}px`,
                        right: `${dropdownPosition().right}px`
                      }}
                    >
                      <button
                        onClick={() => {
                          setTheme('light')
                          setShowThemeMenu(false)
                        }}
                        class={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors ${
                          theme() === 'light' 
                            ? 'bg-accent text-accent-foreground' 
                            : 'hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        <Sun class="w-4 h-4" />
                        <span>Light</span>
                      </button>
                      <button
                        onClick={() => {
                          setTheme('dark')
                          setShowThemeMenu(false)
                        }}
                        class={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors ${
                          theme() === 'dark' 
                            ? 'bg-accent text-accent-foreground' 
                            : 'hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        <Moon class="w-4 h-4" />
                        <span>Dark</span>
                      </button>
                      <button
                        onClick={() => {
                          setTheme('system')
                          setShowThemeMenu(false)
                        }}
                        class={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors ${
                          theme() === 'system' 
                            ? 'bg-accent text-accent-foreground' 
                            : 'hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        <Monitor class="w-4 h-4" />
                        <span>System</span>
                      </button>
                    </div>
                  </Portal>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header