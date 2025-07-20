import { Component, JSX } from 'solid-js'
import { RotateCcw } from 'lucide-solid'

interface LoadingSpinnerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive'
}

const LoadingSpinner: Component<LoadingSpinnerProps> = (props) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const variantClasses = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    success: 'text-primary',
    warning: 'text-warning',
    destructive: 'text-destructive'
  }

  return (
    <div
      class={`flex items-center justify-center ${props.class || ''}`}
      {...props}
    >
      <RotateCcw 
        class={`${sizeClasses[props.size || 'md']} ${variantClasses[props.variant || 'default']} animate-spin`} 
      />
    </div>
  )
}

export default LoadingSpinner 