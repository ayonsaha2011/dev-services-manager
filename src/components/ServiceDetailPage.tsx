import { Component, createSignal, Show, onMount } from 'solid-js'
import { invoke } from '@tauri-apps/api/core'
import { Service, SystemMetrics } from '../types/service'
import { useServices } from '../providers/ServiceProvider'
import { useNavigation } from '../providers/NavigationProvider'
import toast from 'solid-toast'
import Button from './ui/Button'
import ServiceMetrics from './ServiceMetrics'
import ServiceTerminal from './ServiceTerminal'
import ServiceLogs from './ServiceLogs'
import {
  ArrowLeft,
  Play,
  Square,
  RotateCcw,
  Settings,
  Clock,
  Server,
  Shield,
  Activity,
  Terminal,
  FileText,
  Info
} from 'lucide-solid'

const ServiceDetailPage: Component = () => {
  const { navigateToServices } = useNavigation()
  const { startService, stopService, restartService, enableService, disableService } = useServices()
  const { selectedService } = useNavigation()
  
  const [currentService, setCurrentService] = createSignal<Service | null>(selectedService())
  const [metrics, setMetrics] = createSignal<SystemMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = createSignal(false)
  const [actionLoading, setActionLoading] = createSignal<string | null>(null)
  const [statusUpdating, setStatusUpdating] = createSignal(false)
  const [activeTab, setActiveTab] = createSignal<'details' | 'terminal' | 'logs'>('details')

  // Create a reactive reference to the service
  const service = () => currentService()
  if (!service()) return null


  const loadMetrics = async () => {
    console.log('Loading metrics for service:', service().name)
    setMetricsLoading(true)
    try {
      const result = await invoke<SystemMetrics>('get_service_metrics', {
        serviceName: service().name
      })
      console.log('Loaded metrics:', result)
      setMetrics(result)
    } catch (error) {
      console.error('Failed to load metrics:', error)
    } finally {
      setMetricsLoading(false)
    }
  }

  const refreshServiceStatus = async () => {
    if (!service()) return
    setStatusUpdating(true)
    try {
      console.log('Refreshing service status for:', service().name)
      const updatedService = await invoke<Service>('get_service_status', {
        serviceName: service().name
      })
      console.log('Updated service status:', updatedService.status)
      setCurrentService(updatedService)
    } catch (error) {
      console.error('Failed to refresh service status:', error)
    } finally {
      setStatusUpdating(false)
    }
  }

  const refreshAllData = async () => {
    await Promise.all([
      refreshServiceStatus(),
      loadMetrics()
    ])
  }

  const handleAction = async (action: string, fn: () => Promise<void>) => {
    console.log(`Starting action: ${action} for service: ${service().name}`)
    setActionLoading(action)
    
    const command = `systemctl ${action} ${service().service_name}`
    
    // Switch to terminal tab when action is clicked
    setActiveTab('terminal')
    
    try {
      await fn()
      console.log(`Action ${action} completed, waiting 2 seconds...`)
      
      // Log only the command to terminal (no custom messages)
      if (typeof window !== 'undefined' && window.logServiceAction) {
        window.logServiceAction(action, command, '', 0, 0)
      }
      
      // Wait a moment for the service to fully start/stop
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log(`Refreshing all data after ${action}`)
      // Refresh all data after the action
      await refreshAllData()
    } catch (error) {
      console.error(`Failed to ${action} service:`, error)
      
      // Log only the command and error to terminal (no custom wrapper messages)
      if (typeof window !== 'undefined' && window.logServiceAction) {
        window.logServiceAction(action, command, String(error), 1, 0)
      }
      
      // Even if action failed, try to refresh to get current state
      await refreshServiceStatus()
    } finally {
      setActionLoading(null)
    }
  }

  const handleStatusCommand = async () => {
    console.log(`Getting status for service: ${service().name}`)
    setActionLoading('status')
    
    const command = `systemctl status ${service().service_name}`
    
    // Switch to terminal tab when status is clicked
    setActiveTab('terminal')
    
    try {
      // Execute systemctl status command - returns TerminalCommand object
      const result = await invoke<{
        command: string
        output: string
        exit_code: number
        timestamp: string
        duration_ms: number
      }>('execute_terminal_command', {
        command: `systemctl status ${service().service_name}`
      })
      
      console.log(`Status command completed with exit code: ${result.exit_code}`)
      
      // Show toast notification
      if (result.exit_code === 0) {
        toast.success('Service status retrieved successfully', {
          duration: 2000,
          icon: 'ℹ️'
        })
      } else {
        toast.error('Failed to get service status', {
          duration: 3000,
          icon: '❌'
        })
      }
      
      // Log the status command to terminal with raw output
      if (typeof window !== 'undefined' && window.logServiceAction) {
        window.logServiceAction('status', command, result.output, result.exit_code, result.duration_ms)
      }
    } catch (error) {
      console.error(`Failed to get service status:`, error)
      
      // Show error toast
      toast.error(`Status command failed: ${error}`, {
        duration: 4000,
        icon: '❌'
      })
      
      // Log the failed status command to terminal
      if (typeof window !== 'undefined' && window.logServiceAction) {
        window.logServiceAction('status', command, String(error), 1, 0)
      }
    } finally {
      setActionLoading(null)
    }
  }



  onMount(async () => {
    // Load initial data
    await refreshAllData()
    
    // Auto-refresh intervals
    const statusInterval = setInterval(() => {
      if (!document.hidden && !actionLoading() && !statusUpdating()) {
        refreshServiceStatus()
      }
    }, 15000) // Status every 15 seconds
    
    const metricsInterval = setInterval(() => {
      if (!document.hidden && !metricsLoading()) {
        loadMetrics()
      }
    }, 5000) // Metrics every 5 seconds
    
    // Refresh when window becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && !actionLoading() && !statusUpdating()) {
        refreshAllData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(statusInterval)
      clearInterval(metricsInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  })

  const statusColor = () => {
    switch (service().status) {
      case 'Running': return 'text-green-600 bg-green-100 dark:bg-green-900/30'
      case 'Stopped': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30'
      case 'Failed': return 'text-red-600 bg-red-100 dark:bg-red-900/30'
      default: return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
    }
  }


  return (
    <div class="h-full flex flex-col">
      {/* Header */}
      <div class="bg-card border-b border-border/50 p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateToServices}
              class="px-3"
            >
              <ArrowLeft class="w-4 h-4 mr-2" />
              Back to Services
            </Button>
            <div class="h-6 w-px bg-border"></div>
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center">
                <Settings class="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 class="text-2xl font-bold text-foreground">{service().name}</h1>
                <p class="text-muted-foreground">{service().description}</p>
              </div>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <div class={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${statusColor()}`}>
              <Show when={statusUpdating()}>
                <RotateCcw class="w-3 h-3 animate-spin" />
              </Show>
              <span>{service().status}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshServiceStatus}
              disabled={statusUpdating()}
              class="w-8 h-8 p-0"
              title="Refresh service status"
            >
              <RotateCcw class={`w-4 h-4 ${statusUpdating() ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>


      {/* Content */}
      <div class="flex-1 flex overflow-hidden">
        {/* Service Actions Sidebar */}
        <div class="w-80 bg-card border-r border-border/50 p-6 overflow-y-auto" style="scrollbar-width: none; -ms-overflow-style: none;">
          <div class="space-y-6">
            {/* Quick Actions */}
            <div class="bg-muted/50 rounded-lg p-4">
              <h3 class="font-medium text-foreground mb-3 flex items-center">
                <Play class="w-4 h-4 mr-2" />
                Quick Actions
              </h3>
              <div class="space-y-2">
                <Show
                  when={service().status === 'Running'}
                  fallback={
                    <Button
                      class="w-full justify-start text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/30"
                      variant="outline"
                      onClick={() => handleAction('start', () => startService(service().name))}
                      disabled={actionLoading() === 'start' || statusUpdating()}
                    >
                      <Show
                        when={actionLoading() !== 'start'}
                        fallback={<RotateCcw class="w-4 h-4 mr-2 animate-spin" />}
                      >
                        <Play class="w-4 h-4 mr-2" />
                      </Show>
                      Start Service
                    </Button>
                  }
                >
                  <Button
                    class="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                    variant="outline"
                    onClick={() => handleAction('stop', () => stopService(service().name))}
                    disabled={actionLoading() === 'stop' || statusUpdating()}
                  >
                    <Show
                      when={actionLoading() !== 'stop'}
                      fallback={<RotateCcw class="w-4 h-4 mr-2 animate-spin" />}
                    >
                      <Square class="w-4 h-4 mr-2" />
                    </Show>
                    Stop Service
                  </Button>
                </Show>

                <Button
                  class="w-full justify-start"
                  variant="outline"
                  onClick={() => handleAction('restart', () => restartService(service().name))}
                  disabled={actionLoading() === 'restart' || statusUpdating()}
                >
                  <Show
                    when={actionLoading() !== 'restart'}
                    fallback={<RotateCcw class="w-4 h-4 mr-2 animate-spin" />}
                  >
                    <RotateCcw class="w-4 h-4 mr-2" />
                  </Show>
                  Restart Service
                </Button>

                <Button
                  class="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  variant="outline"
                  onClick={handleStatusCommand}
                  disabled={actionLoading() === 'status' || statusUpdating()}
                >
                  <Show
                    when={actionLoading() !== 'status'}
                    fallback={<RotateCcw class="w-4 h-4 mr-2 animate-spin" />}
                  >
                    <Info class="w-4 h-4 mr-2" />
                  </Show>
                  Check Status
                </Button>
              </div>
            </div>

            {/* Service Details */}
            <div>
              <h3 class="font-medium text-foreground mb-3 flex items-center">
                <Server class="w-4 h-4 mr-2" />
                Service Details
              </h3>
              <div class="space-y-4">
                <div>
                  <label class="text-sm font-medium text-muted-foreground">System Service</label>
                  <code class="block mt-1 text-sm bg-muted px-3 py-2 rounded text-foreground font-mono">
                    {service().service_name}
                  </code>
                </div>

                <div>
                  <label class="text-sm font-medium text-muted-foreground">Auto-start</label>
                  <div class="flex items-center justify-between mt-1">
                    <div class="flex items-center space-x-2">
                      <span class={`text-sm transition-colors duration-300 ${service().enabled ? 'text-green-600' : 'text-gray-600'}`}>
                        {service().enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <Show when={statusUpdating()}>
                        <RotateCcw class="w-3 h-3 animate-spin text-muted-foreground" />
                      </Show>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(
                        service().enabled ? 'disable' : 'enable',
                        () => service().enabled 
                          ? disableService(service().name)
                          : enableService(service().name)
                      )}
                      disabled={actionLoading() === 'enable' || actionLoading() === 'disable' || statusUpdating()}
                    >
                      {service().enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>

                <Show when={service().uptime && service().status === 'Running'}>
                  <div>
                    <label class="text-sm font-medium text-muted-foreground flex items-center">
                      <Clock class="w-3 h-3 mr-1" />
                      Started
                    </label>
                    <p class="text-sm text-green-600 mt-1 font-medium">{service().uptime}</p>
                  </div>
                </Show>
              </div>
            </div>

            {/* Security Info */}
            <div class="bg-muted/50 rounded-lg p-4">
              <h3 class="font-medium text-foreground mb-2 flex items-center">
                <Shield class="w-4 h-4 mr-2" />
                Security
              </h3>
              <p class="text-sm text-muted-foreground">
                Administrative privileges may be required for service management operations.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Panel */}
        <div class="flex-1 flex flex-col">
          {/* Tab Navigation */}
          <div class="bg-card border-b border-border/50">
            <div class="flex items-center justify-between px-6 py-4">
              <div class="flex space-x-1">
                <button
                  class={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab() === 'details'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                  onClick={() => setActiveTab('details')}
                >
                  <Activity class="w-4 h-4 mr-2 inline" />
                  Details
                </button>
                <button
                  class={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab() === 'terminal'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                  onClick={() => setActiveTab('terminal')}
                >
                  <Terminal class="w-4 h-4 mr-2 inline" />
                  Terminal
                </button>
                <button
                  class={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab() === 'logs'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                  onClick={() => setActiveTab('logs')}
                >
                  <FileText class="w-4 h-4 mr-2 inline" />
                  Service Logs
                </button>
              </div>
              <Show when={activeTab() === 'details'}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadMetrics}
                  disabled={metricsLoading()}
                >
                  <RotateCcw class={`w-4 h-4 mr-2 ${metricsLoading() ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </Show>
            </div>
          </div>

          {/* Tab Content */}
          <div class="flex-1 overflow-hidden">
            <Show when={activeTab() === 'details'}>
              <div class="h-full overflow-y-auto p-6" style="scrollbar-width: none; -ms-overflow-style: none;">
                <ServiceMetrics 
                  metrics={metrics()} 
                  service={service()!} 
                  loading={metricsLoading()} 
                />
              </div>
            </Show>
            
            <Show when={activeTab() === 'terminal'}>
              <ServiceTerminal 
                service={service()!}
              />
            </Show>
            
            <Show when={activeTab() === 'logs'}>
              <ServiceLogs 
                service={service()!}
              />
            </Show>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceDetailPage