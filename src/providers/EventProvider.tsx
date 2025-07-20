import { Component, createContext, useContext, ParentComponent, onMount, onCleanup, createSignal } from 'solid-js'
import { listen, UnlistenFn } from '@tauri-apps/api/event'

export interface ServiceEvent {
  type: 'StatusChanged' | 'ServiceAdded' | 'ServiceRemoved' | 'ServicesRefreshed' | 'DatabaseUpdated'
  service_name?: string
  old_status?: string
  new_status?: string
  status?: string
  timestamp: string
  count?: number
  operation?: string
}

interface EventContextType {
  lastEvent: () => ServiceEvent | null
  isConnected: () => boolean
  eventCount: () => number
  onServiceStatusChange: (callback: (event: ServiceEvent) => void) => void
  onServiceAdded: (callback: (event: ServiceEvent) => void) => void
  onServiceRemoved: (callback: (event: ServiceEvent) => void) => void
  onServicesRefreshed: (callback: (event: ServiceEvent) => void) => void
  onDatabaseUpdated: (callback: (event: ServiceEvent) => void) => void
}

const EventContext = createContext<EventContextType>()

export const EventProvider: ParentComponent = (props) => {
  const [lastEvent, setLastEvent] = createSignal<ServiceEvent | null>(null)
  const [isConnected, setIsConnected] = createSignal(false)
  const [eventCount, setEventCount] = createSignal(0)
  
  // Callback registries
  let statusChangeCallbacks: ((event: ServiceEvent) => void)[] = []
  let serviceAddedCallbacks: ((event: ServiceEvent) => void)[] = []
  let serviceRemovedCallbacks: ((event: ServiceEvent) => void)[] = []
  let servicesRefreshedCallbacks: ((event: ServiceEvent) => void)[] = []
  let databaseUpdatedCallbacks: ((event: ServiceEvent) => void)[] = []
  
  let unlisten: UnlistenFn | null = null

  const handleEvent = (event: ServiceEvent) => {
    console.log('Received service event:', event)
    setLastEvent(event)
    setEventCount(prev => prev + 1)
    
    // Dispatch to appropriate callback lists
    switch (event.type) {
      case 'StatusChanged':
        statusChangeCallbacks.forEach(callback => callback(event))
        break
      case 'ServiceAdded':
        serviceAddedCallbacks.forEach(callback => callback(event))
        break
      case 'ServiceRemoved':
        serviceRemovedCallbacks.forEach(callback => callback(event))
        break
      case 'ServicesRefreshed':
        servicesRefreshedCallbacks.forEach(callback => callback(event))
        break
      case 'DatabaseUpdated':
        databaseUpdatedCallbacks.forEach(callback => callback(event))
        break
    }
  }

  const onServiceStatusChange = (callback: (event: ServiceEvent) => void) => {
    statusChangeCallbacks.push(callback)
  }

  const onServiceAdded = (callback: (event: ServiceEvent) => void) => {
    serviceAddedCallbacks.push(callback)
  }

  const onServiceRemoved = (callback: (event: ServiceEvent) => void) => {
    serviceRemovedCallbacks.push(callback)
  }

  const onServicesRefreshed = (callback: (event: ServiceEvent) => void) => {
    servicesRefreshedCallbacks.push(callback)
  }

  const onDatabaseUpdated = (callback: (event: ServiceEvent) => void) => {
    databaseUpdatedCallbacks.push(callback)
  }

  onMount(async () => {
    try {
      // Listen for service events from the backend
      unlisten = await listen<ServiceEvent>('service-event', (event) => {
        handleEvent(event.payload)
      })
      
      setIsConnected(true)
      console.log('Event listener connected - listening for real-time service updates')
    } catch (error) {
      console.error('Failed to set up event listener:', error)
      console.log('Continuing without real-time events - app will use polling instead')
      setIsConnected(false)
      
      // Don't throw error - app can work without events
      // Events are optional for functionality
    }
  })

  onCleanup(() => {
    if (unlisten) {
      unlisten()
      setIsConnected(false)
      console.log('Event listener disconnected')
    }
    
    // Clear callback arrays
    statusChangeCallbacks = []
    serviceAddedCallbacks = []
    serviceRemovedCallbacks = []
    servicesRefreshedCallbacks = []
    databaseUpdatedCallbacks = []
  })

  const value: EventContextType = {
    lastEvent,
    isConnected,
    eventCount,
    onServiceStatusChange,
    onServiceAdded,
    onServiceRemoved,
    onServicesRefreshed,
    onDatabaseUpdated,
  }

  return (
    <EventContext.Provider value={value}>
      {props.children}
    </EventContext.Provider>
  )
}

export const useEvents = () => {
  const context = useContext(EventContext)
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider')
  }
  return context
}