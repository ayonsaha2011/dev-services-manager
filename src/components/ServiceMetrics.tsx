import { Component, Show, createSignal, onMount } from 'solid-js'
import { SystemMetrics, Service } from '../types/service'
import MetricCard from './MetricCard'
import { invoke } from '@tauri-apps/api/core'
import {
  Activity,
  Server,
  Clock,
  Globe,
  Hash
} from 'lucide-solid'

interface ServiceMetricsProps {
  metrics: SystemMetrics | null
  service: Service
  loading: boolean
}

const ServiceMetrics: Component<ServiceMetricsProps> = (props) => {
  const [serviceInfo, setServiceInfo] = createSignal<any>(null)
  const [portInfo, setPortInfo] = createSignal<string[]>([])



  const formatUptime = (uptime: string) => {
    try {
      const date = new Date(uptime)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      
      if (days > 0) return `${days}d ${hours}h ${minutes}m`
      if (hours > 0) return `${hours}h ${minutes}m`
      return `${minutes}m`
    } catch {
      return uptime
    }
  }

  const loadServiceInfo = async () => {
    try {
      // Get service version/info
      const info = await invoke<any>('get_service_info', { serviceName: props.service.name })
      setServiceInfo(info)
    } catch (error) {
      console.error('Failed to load service info:', error)
    }
  }

  const loadPortInfo = async () => {
    try {
      const ports = await invoke<string[]>('get_service_ports', { serviceName: props.service.name })
      setPortInfo(ports)
    } catch (error) {
      console.error('Failed to load port info:', error)
      setPortInfo([])
    }
  }

  onMount(() => {
    loadServiceInfo()
    loadPortInfo()
  })


  return (
    <Show
      when={!props.loading}
      fallback={
        <div class="flex items-center justify-center h-full">
          <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <div class="space-y-8">
        <Show
          when={props.metrics}
          fallback={
            <div class="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Activity class="w-12 h-12 mb-4 opacity-50" />
              <p class="text-lg font-medium">Loading Service Metrics...</p>
              <p class="text-sm">Gathering performance data for {props.service.name}</p>
            </div>
          }
        >
          {/* Service Information */}
          <div>
            <h3 class="text-lg font-semibold text-foreground mb-4 flex items-center">
              <Server class="w-5 h-5 mr-2" />
              Service Information
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Service Details */}
              <MetricCard
                icon={Hash}
                title="Service Details"
                value=""
                color="slate"
              >
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">Name:</span>
                    <span class="text-slate-600 font-medium">{props.service.name}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">System Service:</span>
                    <span class="text-slate-600 font-mono text-xs">{props.service.service_name}</span>
                  </div>
                  <Show when={serviceInfo()?.version}>
                    <div class="flex justify-between">
                      <span class="text-muted-foreground">Version:</span>
                      <span class="text-slate-600">{serviceInfo()?.version}</span>
                    </div>
                  </Show>
                </div>
              </MetricCard>

              {/* Current Status */}
              <MetricCard
                icon={Activity}
                title="Current Status"
                value=""
                color={props.service.status === 'Running' ? 'green' : 'red'}
              >
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">Status:</span>
                    <span class={props.service.status === 'Running' ? 'text-green-600' : 'text-red-600'}>
                      {props.service.status}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">Auto-start:</span>
                    <span class={props.service.enabled ? 'text-green-600' : 'text-gray-600'}>
                      {props.service.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </MetricCard>

              {/* Uptime Information */}
              <Show when={props.service.uptime && props.service.status === 'Running'}>
                <MetricCard
                  icon={Clock}
                  title="Uptime Duration"
                  value=""
                  color="green"
                >
                  <div class="space-y-1 text-sm">
                    <div class="flex justify-between">
                      <span class="text-muted-foreground">Running for:</span>
                      <span class="text-green-600 font-medium">{formatUptime(props.service.uptime!)}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-muted-foreground">Started:</span>
                      <span class="text-green-600 text-xs">{props.service.uptime}</span>
                    </div>
                  </div>
                </MetricCard>
              </Show>

              {/* Port Information */}
              <Show when={portInfo().length > 0}>
                <MetricCard
                  icon={Globe}
                  title="Port Information"
                  value=""
                  color="blue"
                >
                  <div class="space-y-1 text-sm">
                    {portInfo().slice(0, 3).map(port => (
                      <div class="flex justify-between">
                        <span class="text-muted-foreground">Port:</span>
                        <span class="text-blue-600 font-mono">{port}</span>
                      </div>
                    ))}
                    <Show when={portInfo().length > 3}>
                      <span class="text-xs text-muted-foreground">+{portInfo().length - 3} more...</span>
                    </Show>
                  </div>
                </MetricCard>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  )
}

export default ServiceMetrics