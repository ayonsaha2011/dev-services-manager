import { Component, Show, createSignal, onMount, onCleanup } from 'solid-js'
import { invoke } from '@tauri-apps/api/core'
import toast from 'solid-toast'
import TitleBar from './components/TitleBar'
import Header from './components/Header'
import ServiceGrid from './components/ServiceGrid'
import ServiceDetailPage from './components/ServiceDetailPage'
import PasswordDialog from './components/PasswordDialog'

import ServiceRemovalDialog from './components/ServiceRemovalDialog'
import ServiceManagementDialog from './components/ServiceManagementDialog'
import { ThemeProvider } from './providers/ThemeProvider'
import { ServiceProvider, useServices } from './providers/ServiceProvider'
import { NavigationProvider, useNavigation } from './providers/NavigationProvider'
import { EventProvider } from './providers/EventProvider'

const AppContent: Component = () => {
  const { 
    showPasswordDialog, 
    setShowPasswordDialog, 
    currentAuthAction, 
    setCurrentAuthAction,
    refreshServices,
    selectedServices,
    clearSelection,
    startMultipleServices,
    stopAllServices
  } = useServices()
  
  const { currentPage, navigateToServices } = useNavigation()

  const [showRemovalDialog, setShowRemovalDialog] = createSignal(false)
  const [showManagementDialog, setShowManagementDialog] = createSignal(false)
  const [serviceToRemove, setServiceToRemove] = createSignal<string>('')

  // Keyboard shortcuts handler
  const handleKeyDown = (event: KeyboardEvent) => {
    // Only handle shortcuts when not in input fields
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement || 
        event.target instanceof HTMLSelectElement) {
      return
    }

    const isCtrl = event.ctrlKey || event.metaKey
    const isShift = event.shiftKey

    if (isCtrl) {
      switch (event.key.toLowerCase()) {
        case 'r':
          event.preventDefault()
          refreshServices()
          toast.success('Services refreshed', { duration: 2000, icon: '🔄' })
          break
        case 's':
          event.preventDefault()
          if (selectedServices().size > 0) {
            startMultipleServices(Array.from(selectedServices()))
            toast.success(`Starting ${selectedServices().size} service(s)`, { duration: 3000, icon: '▶️' })
          }
          break
        case 'x':
          event.preventDefault()
          stopAllServices()
          toast.success('Stopping all services', { duration: 3000, icon: '⏹️' })
          break
        case 'd':
          event.preventDefault()
          if (currentPage() !== 'services') {
            navigateToServices()
          }
          break

        case 'm':
          event.preventDefault()
          setShowManagementDialog(true)
          break
        case 'escape':
          event.preventDefault()
          clearSelection()
          if (currentPage() !== 'services') {
            navigateToServices()
          }
          break
      }
    }

    // Single key shortcuts
    switch (event.key) {
      case 'Escape':
        if (!isCtrl) {
          clearSelection()
          if (currentPage() !== 'services') {
            navigateToServices()
          }
        }
        break
      case 'Delete':
        if (selectedServices().size > 0) {
          event.preventDefault()
          const selectedArray = Array.from(selectedServices())
          if (selectedArray.length === 1) {
            setServiceToRemove(selectedArray[0])
            setShowRemovalDialog(true)
          } else {
            toast.success('Select a single service to remove', { duration: 3000, icon: 'ℹ️' })
          }
        }
        break
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown)
  })

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })

  const handlePasswordConfirm = (password: string) => {
    const action = currentAuthAction()
    if (action) {
      action.callback(password)
      setCurrentAuthAction(null)
      setShowPasswordDialog(false)
    }
  }

  const handlePasswordCancel = () => {
    setCurrentAuthAction(null)
    setShowPasswordDialog(false)
  }

  const handleServiceRemove = (serviceName: string) => {
    setServiceToRemove(serviceName)
    setShowRemovalDialog(true)
  }

  const handleRemovalConfirm = (serviceName: string) => {
    setCurrentAuthAction({
      action: 'remove',
      serviceName,
      callback: async (password: string) => {
        try {
          const result = await invoke<string>('remove_service', { 
            serviceName, 
            password 
          })
          console.log('Removal result:', result)
          toast.success(`Service "${serviceName}" removed successfully`, {
            duration: 4000,
            icon: '🗑️'
          })
          // Refresh services list after removal
          setTimeout(() => refreshServices(), 2000)
        } catch (error) {
          console.error('Removal failed:', error)
          toast.error(`Failed to remove service "${serviceName}": ${error}`, {
            duration: 6000,
            icon: '❌'
          })
        }
      }
    })
    setShowPasswordDialog(true)
    setShowRemovalDialog(false)
  }

  return (
    <div class="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-sm transition-colors duration-300 rounded-lg overflow-hidden shadow-2xl border border-border/30">
      <TitleBar />
      
      <Show when={currentPage() === 'services'}>
        <Header 
          onShowManagementDialog={() => setShowManagementDialog(true)}
        />
      </Show>
      
      <main class={currentPage() === 'services' ? "container mx-auto px-6 py-6 mt-32" : "mt-12 h-[calc(100vh-3rem)]"}>
        <Show when={currentPage() === 'services'} fallback={<ServiceDetailPage />}>
          <ServiceGrid 
            onRemoveService={handleServiceRemove}
            onShowManagementDialog={() => setShowManagementDialog(true)}
          />
        </Show>
      </main>
      
      <PasswordDialog
        isOpen={showPasswordDialog()}
        title={`${currentAuthAction()?.action.charAt(0).toUpperCase()}${currentAuthAction()?.action.slice(1)} Service`}
        message={`Administrator privileges are required to ${currentAuthAction()?.action} the service "${currentAuthAction()?.serviceName}".`}
        onConfirm={handlePasswordConfirm}
        onCancel={handlePasswordCancel}
      />

      <ServiceRemovalDialog
        isOpen={showRemovalDialog()}
        serviceName={serviceToRemove()}
        onClose={() => setShowRemovalDialog(false)}
        onConfirm={handleRemovalConfirm}
      />

      <ServiceManagementDialog
        isOpen={showManagementDialog()}
        onClose={() => {
          setShowManagementDialog(false)
          // Refresh services after management dialog closes to reflect changes
          refreshServices()
        }}
        onRefresh={() => refreshServices()}
      />
    </div>
  )
}

const App: Component = () => {
  return (
    <ThemeProvider>
      <NavigationProvider>
        <EventProvider>
          <ServiceProvider>
            <AppContent />
          </ServiceProvider>
        </EventProvider>
      </NavigationProvider>
    </ThemeProvider>
  )
}

export default App