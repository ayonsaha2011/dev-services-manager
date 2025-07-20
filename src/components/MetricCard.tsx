import { Component, createSignal, createEffect } from 'solid-js'
import { SystemMetrics } from '../types/service'

interface MetricCardProps {
  icon: any
  title: string
  value: string | number
  unit?: string
  color: string
  progress?: number
  subtitle?: string
  children?: any
}

const MetricCard: Component<MetricCardProps> = (props) => {
  const [displayValue, setDisplayValue] = createSignal('')

  const updateDisplayValue = () => {
    if (typeof props.value === 'number') {
      setDisplayValue(props.unit ? `${props.value.toFixed(1)}${props.unit}` : props.value.toString())
    } else {
      setDisplayValue(props.value)
    }
  }

  // Update display value when props change
  createEffect(() => {
    updateDisplayValue()
  })

  return (
    <div class="bg-muted/30 rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center space-x-2">
          <props.icon class={`w-5 h-5 text-${props.color}-600`} />
          <span class="font-medium text-foreground">{props.title}</span>
        </div>
        <span class={`text-lg font-bold text-${props.color}-600`}>
          {displayValue()}
        </span>
      </div>
      {props.progress !== undefined && (
        <div class="w-full bg-muted rounded-full h-2 mb-1">
          <div 
            class={`bg-${props.color}-600 h-2 rounded-full transition-all duration-300`}
            style={`width: ${Math.min(props.progress, 100)}%`}
          ></div>
        </div>
      )}
      {props.subtitle && (
        <div class="text-xs text-muted-foreground">{props.subtitle}</div>
      )}
      {props.children}
    </div>
  )
}

export default MetricCard