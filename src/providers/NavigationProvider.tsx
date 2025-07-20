import { Component, createContext, createSignal, useContext, ParentComponent } from 'solid-js'
import { Service } from '../types/service'

interface NavigationContextType {
  currentPage: () => 'services' | 'service-detail'
  selectedService: () => Service | null
  setCurrentPage: (page: 'services' | 'service-detail') => void
  setSelectedService: (service: Service | null) => void
  navigateToService: (service: Service) => void
  navigateToServices: () => void
}

const NavigationContext = createContext<NavigationContextType>()

export const NavigationProvider: ParentComponent = (props) => {
  const [currentPage, setCurrentPage] = createSignal<'services' | 'service-detail'>('services')
  const [selectedService, setSelectedService] = createSignal<Service | null>(null)

  const navigateToService = (service: Service) => {
    setSelectedService(service)
    setCurrentPage('service-detail')
  }

  const navigateToServices = () => {
    setSelectedService(null)
    setCurrentPage('services')
  }

  const value: NavigationContextType = {
    currentPage,
    selectedService,
    setCurrentPage,
    setSelectedService,
    navigateToService,
    navigateToServices
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