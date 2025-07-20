import { Component, createSignal, Show, For, onMount } from 'solid-js'
import { invoke } from '@tauri-apps/api/core'
import toast from 'solid-toast'
import Button from './ui/Button'
import { useServices } from '../providers/ServiceProvider'
import {
  Search,
  Plus,
  Minus,
  Settings,
  Database,
  Server,
  Container,
  Code,
  Globe,
  Shield,
  Package,
  Eye,
  EyeOff,
  Check,
  MessageSquare,
  Activity,
  GitBranch,
  Lock,
  HardDrive,
  Zap,
  Brain,
  Video,
  Wrench,
  ArrowLeft
} from 'lucide-solid'
import { useNavigation } from '../providers/NavigationProvider'

interface SystemService {
  name: string
  service_name: string
  status: string
  category: string
  enabled: boolean
  description: string
}

interface TrackedService {
  id: number
  name: string
  display_name: string
  description?: string
  category: string
  enabled: boolean
  auto_start: boolean
  created_at: string
  updated_at: string
}

const ServiceManagementPage: Component = () => {
  const { navigateToServices } = useNavigation()
  const { refreshServices } = useServices()
  const [systemServices, setSystemServices] = createSignal<SystemService[]>([])
  const [trackedServices, setTrackedServices] = createSignal<TrackedService[]>([])
  const [loading, setLoading] = createSignal(false)
  const [searchTerm, setSearchTerm] = createSignal('')
  const [selectedCategory, setSelectedCategory] = createSignal('All')
  const [activeTab, setActiveTab] = createSignal<'available' | 'tracked'>('available')
  const [processing, setProcessing] = createSignal<string | null>(null)

  const categories = [
    'All', 
    'Web Server', 
    'Database', 
    'NoSQL Database', 
    'Cache', 
    'Container', 
    'Runtime', 
    'Programming Language', 
    'Version Control', 
    'Network', 
    'Message Broker',
    'Monitoring',
    'CI/CD',
    'Security',
    'Storage',
    'Search',
    'Stream Processing',
    'Machine Learning',
    'Media',
    'Development Tools',
    'System',
    'Other'
  ]

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Web Server': return Globe
      case 'Database': 
      case 'NoSQL Database': return Database
      case 'Cache': return Server
      case 'Container': return Container
      case 'Runtime':
      case 'Programming Language': return Code
      case 'Version Control': return Package
      case 'Network': return Shield
      case 'Message Broker': return MessageSquare
      case 'Monitoring': return Activity
      case 'CI/CD': return GitBranch
      case 'Security': return Lock
      case 'Storage': return HardDrive
      case 'Search': return Search
      case 'Stream Processing': return Zap
      case 'Machine Learning': return Brain
      case 'Media': return Video
      case 'Development Tools': return Wrench
      case 'System': return Settings
      default: return Settings
    }
  }

  const loadSystemServices = async () => {
    setLoading(true)
    try {
      const services = await invoke<SystemService[]>('get_all_system_services')
      setSystemServices(services)
    } catch (error) {
      console.error('Failed to load system services:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTrackedServices = async () => {
    try {
      const services = await invoke<TrackedService[]>('get_tracked_services')
      setTrackedServices(services)
    } catch (error) {
      console.error('Failed to load tracked services:', error)
    }
  }

  const isServiceTracked = (serviceName: string) => {
    return trackedServices().some(ts => ts.name === serviceName)
  }

  const filteredServices = () => {
    if (activeTab() === 'available') {
      let services = systemServices()
      
      // Filter by category
      if (selectedCategory() !== 'All') {
        services = services.filter(s => s.category === selectedCategory())
      }
      
      // Filter by search term
      if (searchTerm()) {
        const term = searchTerm().toLowerCase()
        services = services.filter(s => 
          s.name.toLowerCase().includes(term) ||
          (s.description || '').toLowerCase().includes(term)
        )
      }
      
      return services
    } else {
      let services = trackedServices()
      
      // Filter by category
      if (selectedCategory() !== 'All') {
        services = services.filter(s => s.category === selectedCategory())
      }
      
      // Filter by search term
      if (searchTerm()) {
        const term = searchTerm().toLowerCase()
        services = services.filter(s => 
          s.name.toLowerCase().includes(term) ||
          (s.description || '').toLowerCase().includes(term)
        )
      }
      
      return services
    }
  }

  const handleAddToTracking = async (service: SystemService) => {
    setProcessing(service.name)
    try {
      // Optimistically update the UI
      const newTrackedService: TrackedService = {
        id: Date.now(), // Temporary ID
        name: service.name,
        display_name: service.name.charAt(0).toUpperCase() + service.name.slice(1),
        description: service.description,
        category: service.category,
        enabled: true,
        auto_start: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Add to tracked services immediately for UI feedback
      setTrackedServices(prev => [...prev, newTrackedService])
      
      await invoke('add_service_to_tracking', {
        name: service.name,
        displayName: service.name.charAt(0).toUpperCase() + service.name.slice(1),
        description: service.description,
        category: service.category
      })
      
      // Reload tracked services to get the real data from database
      await loadTrackedServices()
      
      // Refresh the main dashboard services
      await refreshServices()
      
      // Show success notification
      toast.success(`Service "${service.name}" added to tracking`, {
        duration: 3000,
        icon: '👁️'
      })
    } catch (error) {
      console.error('Failed to add service to tracking:', error)
      // Revert optimistic update on error
      setTrackedServices(prev => prev.filter(ts => ts.name !== service.name))
      
      // Show error notification
      toast.error(`Failed to add "${service.name}" to tracking: ${error}`, {
        duration: 5000,
        icon: '❌'
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleRemoveFromTracking = async (service: TrackedService) => {
    setProcessing(service.name)
    try {
      // Optimistically update the UI
      setTrackedServices(prev => prev.filter(ts => ts.name !== service.name))
      
      await invoke('remove_service_from_tracking', { name: service.name })
      
      // Reload tracked services to get the real data from database
      await loadTrackedServices()
      
      // Refresh the main dashboard services
      await refreshServices()
      
      // Show success notification
      toast.success(`Service "${service.name}" removed from tracking`, {
        duration: 3000,
        icon: '🗑️'
      })
    } catch (error) {
      console.error('Failed to remove service from tracking:', error)
      // Revert optimistic update on error
      await loadTrackedServices()
      
      // Show error notification
      toast.error(`Failed to remove "${service.name}" from tracking: ${error}`, {
        duration: 5000,
        icon: '❌'
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleToggleTracking = async (service: TrackedService, enabled: boolean) => {
    setProcessing(service.name)
    try {
      // Optimistically update the UI
      setTrackedServices(prev => 
        prev.map(ts => 
          ts.name === service.name 
            ? { ...ts, enabled } 
            : ts
        )
      )
      
      await invoke('update_service_tracking_status', { 
        name: service.name, 
        enabled 
      })
      
      // Reload tracked services to get the real data from database
      await loadTrackedServices()
      
      // Refresh the main dashboard services
      await refreshServices()
      
      // Show success notification
      toast.success(`Service "${service.name}" ${enabled ? 'enabled' : 'disabled'} for tracking`, {
        duration: 3000,
        icon: enabled ? '👁️' : '👁️‍🗨️'
      })
    } catch (error) {
      console.error('Failed to update service tracking status:', error)
      // Revert optimistic update on error
      await loadTrackedServices()
      
      // Show error notification
      toast.error(`Failed to update "${service.name}" tracking status: ${error}`, {
        duration: 5000,
        icon: '❌'
      })
    } finally {
      setProcessing(null)
    }
  }

  onMount(() => {
    loadSystemServices()
    loadTrackedServices()
  })

  return (
    <div class="h-screen bg-gradient-to-br from-background via-background/95 to-background/90 flex flex-col overflow-hidden">
      {/* Header */}
      <div class="bg-card border-b border-border flex-shrink-0">
        <div class="container mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={navigateToServices}
                class="flex items-center space-x-2"
              >
                <ArrowLeft class="w-4 h-4" />
                <span>Back to Services</span>
              </Button>
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Settings class="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h1 class="text-2xl font-bold text-foreground">Service Management</h1>
                  <p class="text-sm text-muted-foreground">Manage which services to track and monitor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div class="flex-1 overflow-y-auto">
        <div class="container mx-auto px-6 py-6">
        {/* Tabs */}
        <div class="bg-card border border-border rounded-lg mb-6">
          <div class="flex items-center px-6">
            <button
              onClick={() => setActiveTab('available')}
              class={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab() === 'available'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package class="w-4 h-4 mr-2 inline" />
              Available Services ({systemServices().length})
            </button>
            <button
              onClick={() => setActiveTab('tracked')}
              class={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab() === 'tracked'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye class="w-4 h-4 mr-2 inline" />
              Tracked Services ({trackedServices().length})
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div class="bg-card border border-border rounded-lg p-6 mb-6 space-y-4">
          <div class="flex items-center space-x-4">
            <div class="flex-1 relative">
              <Search class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm()}
                onInput={(e) => setSearchTerm(e.currentTarget.value)}
                class="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button
              onClick={() => {
                loadSystemServices()
                loadTrackedServices()
              }}
              disabled={loading()}
              class="flex-shrink-0"
            >
              <Settings class={`w-4 h-4 mr-2 ${loading() ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Category Filter */}
          <div class="flex flex-wrap gap-2">
            <For each={categories}>
              {(category) => (
                <button
                  onClick={() => setSelectedCategory(category)}
                  class={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedCategory() === category
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {category}
                </button>
              )}
            </For>
          </div>
        </div>

        {/* Services List */}
        <div class="bg-card border border-border rounded-lg p-6">
          <Show
            when={!loading()}
            fallback={
              <div class="flex items-center justify-center h-64">
                <div class="text-center">
                  <Settings class="w-12 h-12 mx-auto mb-4 animate-spin text-muted-foreground" />
                  <p class="text-muted-foreground">Loading services...</p>
                </div>
              </div>
            }
          >
            <Show
              when={filteredServices().length > 0}
              fallback={
                <div class="flex items-center justify-center h-64">
                  <div class="text-center">
                    <Package class="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 class="font-medium text-foreground mb-2">No Services Found</h3>
                    <p class="text-muted-foreground">Try adjusting your search or category filter</p>
                  </div>
                </div>
              }
            >
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <For each={filteredServices()}>
                  {(service) => {
                    const Icon = getCategoryIcon(service.category)
                    const isTracked = () => activeTab() === 'available' 
                      ? isServiceTracked((service as SystemService).name)
                      : true
                    
                    return (
                      <div class="bg-muted/30 border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div class="flex items-start justify-between mb-3 gap-3">
                          <div class="flex items-start space-x-3 flex-1 min-w-0">
                            <div class={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isTracked() ? 'bg-primary/10 dark:bg-primary/20' : 'bg-blue-100 dark:bg-blue-900/30'
                            }`}>
                              <Icon class={`w-4 h-4 ${
                                isTracked() ? 'text-primary' : 'text-blue-600'
                              }`} />
                            </div>
                            <div class="flex-1 min-w-0">
                              <h4 class="font-medium text-foreground leading-tight break-words">
                                <span class="block truncate">
                                  {activeTab() === 'tracked' 
                                    ? (service as TrackedService).display_name 
                                    : service.name
                                  }
                                </span>
                              </h4>
                              <p class="text-xs text-muted-foreground mt-1">{service.category}</p>
                            </div>
                          </div>
                          <Show
                            when={activeTab() === 'available'}
                            fallback={
                              <div class="flex items-center space-x-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleTracking(
                                    service as TrackedService, 
                                    !(service as TrackedService).enabled
                                  )}
                                  disabled={processing() === service.name}
                                  class={`${(service as TrackedService).enabled ? 'text-primary' : 'text-gray-600'}`}
                                >
                                  {(service as TrackedService).enabled ? <Eye class="w-3 h-3" /> : <EyeOff class="w-3 h-3" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRemoveFromTracking(service as TrackedService)}
                                  disabled={processing() === service.name}
                                  class="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                                >
                                  <Minus class="w-3 h-3" />
                                </Button>
                              </div>
                            }
                          >
                            <Show
                              when={!isTracked()}
                              fallback={
                                <div class="flex items-center space-x-1 text-primary text-xs font-medium flex-shrink-0">
                                  <Check class="w-3 h-3" />
                                  <span>Tracked</span>
                                </div>
                              }
                            >
                              <Button
                                size="sm"
                                onClick={() => handleAddToTracking(service as SystemService)}
                                disabled={processing() === service.name}
                                class="text-primary hover:text-primary/80 hover:bg-primary/10 flex-shrink-0"
                              >
                                <Show
                                  when={processing() !== service.name}
                                  fallback={<Settings class="w-3 h-3 mr-1 animate-spin" />}
                                >
                                  <Plus class="w-3 h-3 mr-1" />
                                </Show>
                                Track
                              </Button>
                            </Show>
                          </Show>
                        </div>
                        <p class="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {service.description || `System service: ${service.name}`}
                        </p>
                        <Show when={activeTab() === 'available'}>
                          <div class="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Status: {(service as SystemService).status}</span>
                            <span>{(service as SystemService).enabled ? 'Enabled' : 'Disabled'}</span>
                          </div>
                        </Show>
                      </div>
                    )
                  }}
                </For>
              </div>
            </Show>
          </Show>
        </div>

        {/* Footer Stats */}
        <div class="mt-6 text-center">
          <div class="text-sm text-muted-foreground">
            <Show when={activeTab() === 'available'}>
              {filteredServices().length} available services • {trackedServices().length} currently tracked
            </Show>
            <Show when={activeTab() === 'tracked'}>
              {filteredServices().length} tracked services • {trackedServices().filter(s => s.enabled).length} actively monitored
            </Show>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceManagementPage 