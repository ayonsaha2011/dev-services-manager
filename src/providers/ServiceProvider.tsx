import { Component, createContext, createSignal, useContext, ParentComponent, onMount, createEffect } from 'solid-js'
import { invoke } from '@tauri-apps/api/core'
import toast from 'solid-toast'
import { Service, ServiceOperation } from '../types/service'
import { useEvents } from './EventProvider'

interface AuthRequest {
  requires_auth: boolean
  message: string
}

interface ServiceContextType {
  services: () => Service[]
  loading: () => boolean
  selectedServices: () => Set<string>
  toggleSelection: (serviceName: string) => void
  clearSelection: () => void
  refreshServices: () => Promise<void>
  loadAllServices: () => Promise<void>
  loadMoreServices: () => Promise<void>
  startService: (serviceName: string, password?: string) => Promise<void>
  stopService: (serviceName: string, password?: string) => Promise<void>
  restartService: (serviceName: string) => Promise<void>
  enableService: (serviceName: string) => Promise<void>
  disableService: (serviceName: string) => Promise<void>
  startMultipleServices: (serviceNames: string[]) => Promise<void>
  stopAllServices: () => Promise<void>
  checkAuthRequired: (serviceName: string) => Promise<AuthRequest>
  showPasswordDialog: () => boolean
  setShowPasswordDialog: (show: boolean) => void
  currentAuthAction: () => { serviceName: string, action: string, callback: (password: string) => void } | null
  setCurrentAuthAction: (action: { serviceName: string, action: string, callback: (password: string) => void } | null) => void
  totalServicesCount: () => number
  showingAll: () => boolean
}

const ServiceContext = createContext<ServiceContextType>()

export const ServiceProvider: ParentComponent = (props) => {
  const [services, setServices] = createSignal<Service[]>([])
  const [loading, setLoading] = createSignal(true)
  const [selectedServices, setSelectedServices] = createSignal(new Set<string>())
  const [showPasswordDialog, setShowPasswordDialog] = createSignal(false)
  const [currentAuthAction, setCurrentAuthAction] = createSignal<{ serviceName: string, action: string, callback: (password: string) => void } | null>(null)
  const [totalServicesCount, setTotalServicesCount] = createSignal(0)
  const [showingAll, setShowingAll] = createSignal(false)
  const [displayLimit, setDisplayLimit] = createSignal(8) // Initial limit of 8 services
  
  // Get event system for real-time updates
  let events: ReturnType<typeof useEvents> | null = null
  try {
    events = useEvents()
  } catch (e) {
    // EventProvider not available - continue without real-time updates
    console.warn('EventProvider not available - real-time updates disabled')
  }

  const refreshServices = async (skipLoading = false) => {
    try {
      if (!skipLoading) setLoading(true)
      
      // Get tracked services from database and their current status
      const trackedServices = await invoke<any[]>('get_tracked_services')
      const enabledTrackedServices = trackedServices.filter(ts => ts.enabled)
      
      // Determine how many services to show
      const currentLimit = showingAll() ? enabledTrackedServices.length : Math.min(displayLimit(), enabledTrackedServices.length)
      const servicesToShow = enabledTrackedServices.slice(0, currentLimit)
      
      // For each tracked service to show, get its current system status
      const servicePromises = servicesToShow.map(async (ts) => {
        try {
          // Get current status for this service
          const systemService = await invoke<Service>('get_service_status', { serviceName: ts.name })
          return {
            ...systemService,
            display_name: ts.display_name,
            category: ts.category,
            description: ts.description
          }
        } catch (error) {
          console.warn(`Failed to get status for tracked service ${ts.name}:`, error)
          // Return a basic service object if status check fails
          return {
            name: ts.name,
            service_name: ts.name,
            status: 'Unknown' as const,
            enabled: false,
            display_name: ts.display_name,
            category: ts.category,
            description: ts.description || `Tracked service: ${ts.name}`
          }
        }
      })
      
      const servicesResult = await Promise.all(servicePromises)
      setServices(servicesResult)
      setTotalServicesCount(enabledTrackedServices.length)
      
    } catch (error) {
      console.error(`Failed to load services: ${error}`)
      // Fallback to original method if database fails
      try {
        const fallbackServices = await invoke<Service[]>('get_services', { limit: 8, showAll: false })
        setServices(fallbackServices)
      } catch (fallbackError) {
        console.error(`Fallback service loading also failed: ${fallbackError}`)
      }
    } finally {
      if (!skipLoading) setLoading(false)
    }
  }

  const loadAllServices = async () => {
    try {
      setLoading(true)
      setShowingAll(true)
      await refreshServices(true) // Use existing refresh logic but skip the loading state since we already set it
    } catch (error) {
      console.error(`Failed to load all services: ${error}`)
      setShowingAll(false) // Reset on error
    } finally {
      setLoading(false)
    }
  }

  const loadMoreServices = async () => {
    try {
      // Increase display limit by 8
      const newLimit = displayLimit() + 8
      setDisplayLimit(newLimit)
      await refreshServices(true) // Refresh with new limit
    } catch (error) {
      console.error(`Failed to load more services: ${error}`)
    }
  }

  const toggleSelection = (serviceName: string) => {
    setSelectedServices(prev => {
      const newSet = new Set<string>(prev)
      if (newSet.has(serviceName)) {
        newSet.delete(serviceName)
      } else {
        newSet.add(serviceName)
      }
      return newSet
    })
  }

  const clearSelection = () => {
    setSelectedServices(new Set<string>())
  }

  const checkAuthRequired = async (serviceName: string): Promise<AuthRequest> => {
    try {
      return await invoke<AuthRequest>('check_auth_required', { serviceName })
    } catch (error) {
      console.error(`Failed to check auth requirements: ${error}`)
      return { requires_auth: true, message: 'Authentication required' }
    }
  }

  const handleServiceOperation = async (
    operation: string,
    serviceName: string,
    invokeCommand: string
  ) => {
    try {
      const result = await invoke<ServiceOperation>(invokeCommand, { serviceName })
      if (result.success) {
        console.log(`Success: ${result.message}`)
        
        // Show success toast
        toast.success(`Service ${operation} completed successfully`, {
          duration: 3000,
          icon: operation === 'restart' ? '🔄' : operation === 'enable' ? '✅' : operation === 'disable' ? '⏸️' : '✅'
        })
        
        // Update the specific service instead of reloading all
        if (result.service) {
          setServices(prev => 
            prev.map(service => 
              service.name === serviceName ? result.service! : service
            )
          )
        } else {
          // Fallback to partial refresh without loading state
          await refreshServices(true)
        }
      } else {
        console.error(`Error: ${result.message}`)
        toast.error(`Failed to ${operation} service: ${result.message}`, {
          duration: 5000,
          icon: '❌'
        })
      }
    } catch (error) {
      console.error(`Failed to ${operation} ${serviceName}: ${error}`)
      toast.error(`Failed to ${operation} service: ${error}`, {
        duration: 5000,
        icon: '❌'
      })
    }
  }

  const handleAuthenticatedOperation = async (
    serviceName: string,
    action: string,
    password?: string
  ) => {
    try {
      // if (!password) {
      //   throw new Error('Password required')
      // }
      
      let result: ServiceOperation
      
      if (action === 'start') {
        result = await invoke<ServiceOperation>('start_service_with_auth', { serviceName, password })
      } else if (action === 'stop') {
        result = await invoke<ServiceOperation>('stop_service_with_auth', { serviceName, password })
      } else {
        throw new Error(`Unsupported action: ${action}`)
      }

      if (result.success) {
        console.log(`Success: ${result.message}`)
        
        // Show success toast
        toast.success(`Service ${action} completed successfully`, {
          duration: 3000,
          icon: action === 'start' ? '▶️' : action === 'stop' ? '⏹️' : '✅'
        })
        
        // Update the specific service instead of reloading all
        if (result.service) {
          setServices(prev => 
            prev.map(service => 
              service.name === serviceName ? result.service! : service
            )
          )
        } else {
          // Fallback to partial refresh without loading state
          await refreshServices(true)
        }
      } else {
        console.error(`Error: ${result.message}`)
        
        // Check if it's an authentication failure
        if (result.message.includes('authentication') || 
            result.message.includes('password') || 
            result.message.includes('incorrect') ||
            result.message.includes('denied')) {
          throw new Error('Authentication failed')
        } else {
          // Some other error, not authentication related
          toast.error(`Failed to ${action} service: ${result.message}`, {
            duration: 5000,
            icon: '❌'
          })
          throw new Error(result.message)
        }
      }
    } catch (error) {
      const errorStr = String(error)
      console.log('errorStr', errorStr)
      if (errorStr.includes('Authentication failed') || errorStr.includes('Password required') || errorStr.includes('authentication')  || errorStr.includes('Authentication') || errorStr.includes('password') || errorStr.includes('Password') || errorStr.includes('Authentication required')) {
        // Show password dialog
        setCurrentAuthAction({
          serviceName,
          action,
          callback: (pwd: string) => handleAuthenticatedOperation(serviceName, action, pwd)
        })
        setShowPasswordDialog(true)
      } else {
        console.error(`Failed to ${action} ${serviceName}: ${error}`)
        toast.error(`Failed to ${action} service: ${error}`, {
          duration: 5000,
          icon: '❌'
        })
      }
    }
  }

  const startService = async (serviceName: string, password?: string) => {
    if (password) {
      await handleAuthenticatedOperation(serviceName, 'start', password)
    } else {
      await handleAuthenticatedOperation(serviceName, 'start')
    }
  }

  const stopService = async (serviceName: string, password?: string) => {
    if (password) {
      await handleAuthenticatedOperation(serviceName, 'stop', password)
    } else {
      await handleAuthenticatedOperation(serviceName, 'stop')
    }
  }

  const restartService = (serviceName: string) => 
    handleServiceOperation('restart', serviceName, 'restart_service')

  const enableService = (serviceName: string) => 
    handleServiceOperation('enable', serviceName, 'enable_service')

  const disableService = (serviceName: string) => 
    handleServiceOperation('disable', serviceName, 'disable_service')

  const startMultipleServices = async (serviceNames: string[]) => {
    try {
      const results = await invoke<ServiceOperation[]>('start_multiple_services', { serviceNames })
      
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      
      if (successful > 0) {
        console.log(`Started ${successful} service(s)`)
      }
      if (failed > 0) {
        console.error(`Failed to start ${failed} service(s)`)
      }
      
      // Update services individually for better performance
      setServices(prev => 
        prev.map(service => {
          const result = results.find(r => r.service?.name === service.name)
          return result?.service || service
        })
      )
      
      clearSelection()
    } catch (error) {
      console.error(`Failed to start services: ${error}`)
      // Fallback to refresh on error
      await refreshServices(true)
    }
  }

  const stopAllServices = async () => {
    try {
      const results = await invoke<ServiceOperation[]>('stop_all_services')
      
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      
      if (successful > 0) {
        console.log(`Stopped ${successful} service(s)`)
      }
      if (failed > 0) {
        console.error(`Failed to stop ${failed} service(s)`)
      }
      
      // Update services individually for better performance
      setServices(prev => 
        prev.map(service => {
          const result = results.find(r => r.service?.name === service.name)
          return result?.service || service
        })
      )
    } catch (error) {
      console.error(`Failed to stop all services: ${error}`)
      // Fallback to refresh on error
      await refreshServices(true)
    }
  }

  // Auto-refresh services every 60 seconds (only when document is visible and no operations in progress)
  onMount(() => {
    refreshServices()
    
    // Set up real-time event listeners if available
    if (events) {
      // Listen for service status changes
      events.onServiceStatusChange((event) => {
        console.log('Service status changed:', event)
        // Update specific service in the list
        setServices(prev => 
          prev.map(service => {
            if (service.name === event.service_name) {
              return {
                ...service,
                status: event.new_status?.includes('Running') ? 'Running' : 
                       event.new_status?.includes('Stopped') ? 'Stopped' : 
                       event.new_status?.includes('Failed') ? 'Failed' : 'Unknown'
              }
            }
            return service
          })
        )
      })

      // Listen for service additions/removals
      events.onServiceAdded((event) => {
        console.log('Service added to tracking:', event)
        // Refresh services to include the new one
        refreshServices(true)
      })

      events.onServiceRemoved((event) => {
        console.log('Service removed from tracking:', event)
        // Remove service from current list
        setServices(prev => prev.filter(service => service.name !== event.service_name))
        setTotalServicesCount(prev => Math.max(0, prev - 1))
      })

      // Listen for database updates
      events.onDatabaseUpdated((event) => {
        console.log('Database updated:', event)
        // Refresh services to reflect database changes
        refreshServices(true)
      })

      console.log('Real-time event listeners set up for service updates')
    }
    
    const interval = setInterval(() => {
      if (!document.hidden && !loading()) {
        // Use skipLoading to prevent blinking during auto-refresh
        // Reduce frequency since we have real-time updates
        refreshServices(true)
      }
    }, 120000) // Increased to 2 minutes since we have real-time updates
    
    // Refresh when window becomes visible again (but not immediately to prevent double refresh)
    let visibilityTimeout: number
    const handleVisibilityChange = () => {
      if (!document.hidden && !loading()) {
        clearTimeout(visibilityTimeout)
        visibilityTimeout = window.setTimeout(() => {
          refreshServices(true)
        }, 1000) // Wait 1 second before refreshing on visibility change
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(interval)
      clearTimeout(visibilityTimeout)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  })

  const value: ServiceContextType = {
    services,
    loading,
    selectedServices,
    toggleSelection,
    clearSelection,
    refreshServices,
    loadAllServices,
    loadMoreServices,
    startService,
    stopService,
    restartService,
    enableService,
    disableService,
    startMultipleServices,
    stopAllServices,
    checkAuthRequired,
    showPasswordDialog,
    setShowPasswordDialog,
    currentAuthAction,
    setCurrentAuthAction,
    totalServicesCount,
    showingAll
  }

  return (
    <ServiceContext.Provider value={value}>
      {props.children}
    </ServiceContext.Provider>
  )
}

export const useServices = () => {
  const context = useContext(ServiceContext)
  if (!context) {
    throw new Error('useServices must be used within a ServiceProvider')
  }
  return context
}