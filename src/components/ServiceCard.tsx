import { Component, createSignal, Show, createMemo } from 'solid-js'
import { Service } from '../types/service'
import { useServices } from '../providers/ServiceProvider'
import Button from './ui/Button'
import Badge from './ui/Badge'
import LoadingSpinner from './ui/LoadingSpinner'
import {
  Play,
  Square,
  RotateCcw,
  Check,
  ExternalLink,
  Trash2,
  MoreVertical,
  Clock,
  Zap,
  AlertCircle
} from 'lucide-solid'

interface ServiceCardProps {
  service: Service
  onViewDetails: () => void
  onRemove?: () => void
}

const ServiceCard: Component<ServiceCardProps> = (props) => {
  const { 
    selectedServices, 
    toggleSelection, 
    startService, 
    stopService, 
    restartService
  } = useServices()
  const [actionLoading, setActionLoading] = createSignal<string | null>(null)

  const isSelected = createMemo(() => selectedServices().has(props.service.name))

  const handleAction = async (action: string, fn: () => Promise<void>) => {
    setActionLoading(action)
    try {
      await fn()
    } finally {
      setActionLoading(null)
    }
  }

  const handleKeyDown = (event: KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      action()
    }
  }

  const statusConfig = createMemo(() => {
    switch (props.service.status) {
      case 'Running':
        return {
          color: 'status-indicator running',
          icon: '●',
          text: 'Running',
          health: 'text-primary',
          variant: 'success' as const
        }
      case 'Stopped':
        return {
          color: 'status-indicator stopped',
          icon: '○',
          text: 'Stopped',
          health: 'text-muted-foreground',
          variant: 'secondary' as const
        }
      case 'Failed':
        return {
          color: 'status-indicator failed',
          icon: '✕',
          text: 'Failed',
          health: 'text-destructive',
          variant: 'destructive' as const
        }
      default:
        return {
          color: 'status-indicator unknown',
          icon: '?',
          text: 'Unknown',
          health: 'text-warning',
          variant: 'warning' as const
        }
    }
  })

  const healthIndicator = createMemo(() => {
    if (props.service.status === 'Running') {
      const uptime = props.service.uptime
      if (uptime && uptime.includes('days')) {
        return { color: 'text-primary', icon: <Zap class="w-3 h-3" /> }
      } else if (uptime && uptime.includes('hours')) {
        return { color: 'text-warning', icon: <Clock class="w-3 h-3" /> }
      } else {
        return { color: 'text-info', icon: <Clock class="w-3 h-3" /> }
      }
    }
    return { color: 'text-muted-foreground', icon: null }
  })

  return (
    <div 
      class={`card-hover rounded-xl p-6 service-card-enter selection-indicator h-full flex flex-col ${
        isSelected() ? 'selected' : ''
      }`}
      role="article"
      aria-label={`Service card for ${props.service.name}`}
    >
      {/* Enhanced Header */}
      <div class="flex items-start justify-between mb-4 gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-start gap-2 mb-2">
            <h3 class="font-semibold text-foreground text-lg leading-tight break-words flex-1 min-w-0">
              <span class="block truncate">{props.service.name}</span>
            </h3>
            <button
              onClick={() => toggleSelection(props.service.name)}
              onKeyDown={(e) => handleKeyDown(e, () => toggleSelection(props.service.name))}
              class={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                isSelected() 
                  ? 'bg-primary border-primary text-primary-foreground shadow-sm' 
                  : 'border-muted-foreground hover:border-primary hover:bg-primary/5'
              }`}
              aria-label={`${isSelected() ? 'Deselect' : 'Select'} ${props.service.name}`}
              tabIndex={0}
            >
              <Show when={isSelected()}>
                <Check class="w-3 h-3" />
              </Show>
            </button>
          </div>
          <p class="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {props.service.description}
          </p>
        </div>
        
        {/* Enhanced View Details Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={props.onViewDetails}
          class="px-3 py-2 bg-primary/5 hover:bg-primary hover:text-primary-foreground border-primary/20 hover:border-primary text-primary font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 flex-shrink-0"
          title="View service details and logs (Ctrl+D)"
          aria-label={`View details for ${props.service.name}`}
        >
          <ExternalLink class="w-4 h-4 mr-1.5" />
          <span class="text-xs">Details</span>
        </Button>
      </div>

      {/* Enhanced Status Section */}
      <div class="flex items-center justify-between mb-4">
        <Badge variant={statusConfig().variant as any} class="flex items-center space-x-1">
          <span class={statusConfig().health}>{statusConfig().icon}</span>
          <span>{statusConfig().text}</span>
        </Badge>
        <Show when={props.service.enabled}>
          <Badge variant="success" class="flex items-center space-x-1 bg-primary/10 text-primary border-primary/20">
            <Zap class="w-3 h-3" />
            <span>Auto-start</span>
          </Badge>
        </Show>
      </div>

      {/* Enhanced Uptime Display */}
      <Show when={props.service.uptime && props.service.status === 'Running'}>
        <div class="flex items-center space-x-2 text-xs text-muted-foreground mb-4 p-2 bg-muted/30 rounded-lg">
          <Clock class="w-3 h-3" />
          <span>Uptime: {props.service.uptime}</span>
          <Show when={healthIndicator().icon}>
            <div class="flex items-center space-x-1">
              {healthIndicator().icon}
              <span class={healthIndicator().color}>Healthy</span>
            </div>
          </Show>
        </div>
      </Show>

      {/* Spacer to push actions to bottom */}
      <div class="flex-1"></div>

      {/* Enhanced Actions */}
      <div class="flex items-center space-x-2">
        <Show
          when={props.service.status === 'Running'}
          fallback={
            <Button
              size="sm"
              variant="default"
              onClick={() => handleAction('start', () => startService(props.service.name))}
              onKeyDown={(e) => handleKeyDown(e, () => handleAction('start', () => startService(props.service.name)))}
              disabled={actionLoading() === 'start'}
              class="flex-1 h-9 bg-primary hover:bg-primary/90"
              title="Start service (Ctrl+S)"
              aria-label={`Start ${props.service.name}`}
            >
              <Show
                when={actionLoading() !== 'start'}
                fallback={<LoadingSpinner size="sm" variant="primary" class="mr-1" />}
              >
                <Play class="w-3 h-3 mr-1" />
              </Show>
              Start
            </Button>
          }
        >
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleAction('stop', () => stopService(props.service.name))}
            onKeyDown={(e) => handleKeyDown(e, () => handleAction('stop', () => stopService(props.service.name)))}
            disabled={actionLoading() === 'stop'}
            class="flex-1 h-9"
            title="Stop service (Ctrl+X)"
            aria-label={`Stop ${props.service.name}`}
          >
            <Show
              when={actionLoading() !== 'stop'}
              fallback={<LoadingSpinner size="sm" variant="destructive" class="mr-1" />}
            >
              <Square class="w-3 h-3 mr-1" />
            </Show>
            Stop
          </Button>
        </Show>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction('restart', () => restartService(props.service.name))}
          onKeyDown={(e) => handleKeyDown(e, () => handleAction('restart', () => restartService(props.service.name)))}
          disabled={actionLoading() === 'restart'}
          class="px-3 h-9"
          title="Restart service (Ctrl+R)"
          aria-label={`Restart ${props.service.name}`}
        >
          <Show
            when={actionLoading() !== 'restart'}
            fallback={<LoadingSpinner size="sm" variant="primary" />}
          >
            <RotateCcw class="w-3 h-3" />
          </Show>
        </Button>

        <Show when={props.onRemove}>
          <Button
            size="sm"
            variant="ghost"
            onClick={props.onRemove}
            class="px-2 h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Remove service (Delete)"
            aria-label={`Remove ${props.service.name}`}
          >
            <Trash2 class="w-3 h-3" />
          </Button>
        </Show>
      </div>

      {/* Enhanced Error State */}
      <Show when={props.service.status === 'Failed'}>
        <div class="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div class="flex items-center space-x-2 text-xs text-destructive">
            <AlertCircle class="w-3 h-3" />
            <span class="font-medium">Service failed to start</span>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default ServiceCard