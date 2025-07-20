import { Component, createSignal, onMount, onCleanup, Show } from 'solid-js'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { 
  Minus, 
  Square, 
  X,
  Activity,
  Monitor
} from 'lucide-solid'

const TitleBar: Component = () => {
  const [isMaximized, setIsMaximized] = createSignal(false)

  onMount(async () => {
    try {
      const appWindow = getCurrentWindow()
      
      // Get initial maximized state
      const maximized = await appWindow.isMaximized()
      setIsMaximized(maximized)
      
      // Listen for resize events to update maximize state
      const unlisten = await appWindow.listen('tauri://resize', async () => {
        try {
          const newMaximized = await appWindow.isMaximized()
          setIsMaximized(newMaximized)
        } catch (error) {
          console.error('Failed to update maximize state:', error)
        }
      })
      
      // Cleanup listener on component unmount
      onCleanup(() => {
        unlisten()
      })
    } catch (error) {
      console.error('Failed to initialize TitleBar:', error)
      console.log('Continuing without window event listeners - basic functionality will still work')
      
      // Don't throw error - app can work without window events
      // Window events are optional for functionality
    }
  })

  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize()
    } catch (error) {
      console.error('Failed to minimize window:', error)
    }
  }

  const handleMaximize = async () => {
    try {
      await getCurrentWindow().toggleMaximize()
    } catch (error) {
      console.error('Failed to toggle maximize:', error)
    }
  }

  const handleClose = async () => {
    try {
      await getCurrentWindow().close()
    } catch (error) {
      console.error('Failed to close window:', error)
    }
  }

  return (
    <div 
      class="flex items-center justify-between h-12 glass-heavy border-b border-border/50 select-none fixed top-0 left-0 right-0 z-50"
    >
      {/* Enhanced App Icon and Title - Drag Region */}
      <div 
        class="flex items-center space-x-3 px-4 flex-1 cursor-default"
        data-tauri-drag-region
      >
        <div class="w-7 h-7 bg-gradient-to-br from-primary via-primary/90 to-primary/70 rounded-lg flex items-center justify-center shadow-sm backdrop-blur-sm">
          <Activity class="w-4 h-4 text-primary-foreground" />
        </div>
        <div class="flex flex-col">
          <span class="text-sm font-bold text-foreground">Dev Services Manager</span>
        </div>
      </div>

      {/* Enhanced Window Controls - Not in drag region */}
      <div class="flex items-center" data-tauri-drag-region="false">
        <button
          onClick={handleMinimize}
          class="h-8 w-8 flex items-center justify-center hover:bg-muted/50 transition-all duration-200 text-foreground hover:text-foreground group glass-light rounded-sm mx-1"
          title="Minimize"
          type="button"
        >
          <Minus class="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
        </button>
        
        <button
          onClick={handleMaximize}
          class="h-8 w-8 flex items-center justify-center hover:bg-muted/50 transition-all duration-200 text-foreground hover:text-foreground group glass-light rounded-sm mx-1"
          title={isMaximized() ? "Restore" : "Maximize"}
          type="button"
        >
          <Show
            when={isMaximized()}
            fallback={<Square class="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />}
          >
            <Monitor class="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
          </Show>
        </button>
        
        <button
          onClick={handleClose}
          class="h-8 w-8 flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-all duration-200 text-foreground group glass-light rounded-sm mx-1"
          title="Close"
          type="button"
        >
          <X class="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
        </button>
      </div>
    </div>
  )
}

export default TitleBar