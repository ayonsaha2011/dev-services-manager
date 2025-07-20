import { Component, createContext, createSignal, useContext, ParentComponent } from 'solid-js'
import { Service } from '../types/service'

interface NavigationContextType {
  currentPage: () => 'services' | 'service-detail' | 'service-management'
  selectedService: () => Service | null
  setCurrentPage: (page: 'services' | 'service-detail' | 'service-management') => void
  setSelectedService: (service: Service | null) => void
  navigateToService: (service: Service) => void
  navigateToServices: () => void
  navigateToServiceManagement: () => void
}

const NavigationContext = createContext<NavigationContextType>()

export const NavigationProvider: ParentComponent = (props) => {
  const [currentPage, setCurrentPage] = createSignal<'services' | 'service-detail' | 'service-management'>('services')
  const [selectedService, setSelectedService] = createSignal<Service | null>(null)

  const navigateToService = (service: Service) => {
    setSelectedService(service)
    setCurrentPage('service-detail')
  }

  const navigateToServices = () => {
    setSelectedService(null)
    setCurrentPage('services')
  }

  const navigateToServiceManagement = () => {
    setSelectedService(null)
    setCurrentPage('service-management')
  }

  const value: NavigationContextType = {
    currentPage,
    selectedService,
    setCurrentPage,
    setSelectedService,
    navigateToService,
    navigateToServices,
    navigateToServiceManagement
  }

  return (
    <NavigationContext.Provider value={value}>
      {props.children}
    </NavigationContext.Provider>
  )
}

export const useNavigation = () => {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}