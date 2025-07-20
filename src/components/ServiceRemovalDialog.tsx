import { Component, createSignal, Show } from 'solid-js'
import Button from './ui/Button'
import {
  X,
  Trash2,
  AlertTriangle,
  Shield
} from 'lucide-solid'

interface ServiceRemovalDialogProps {
  isOpen: boolean
  serviceName: string
  onClose: () => void
  onConfirm: (serviceName: string) => void
}

const ServiceRemovalDialog: Component<ServiceRemovalDialogProps> = (props) => {
  const [removing, setRemoving] = createSignal(false)

  const handleRemove = async () => {
    setRemoving(true)
    try {
      props.onConfirm(props.serviceName)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-card border border-border rounded-lg w-full max-w-md shadow-2xl">
          {/* Header */}
          <div class="flex items-center justify-between p-6 border-b border-border">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <Trash2 class="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h2 class="text-lg font-semibold text-foreground">Remove Service</h2>
                <p class="text-sm text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={props.onClose}
              class="w-8 h-8 p-0"
            >
              <X class="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div class="p-6 space-y-4">
            <div class="flex items-start space-x-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertTriangle class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div class="text-sm">
                <p class="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  Warning: Complete Service Removal
                </p>
                <p class="text-yellow-700 dark:text-yellow-300">
                  This will permanently remove <strong>{props.serviceName}</strong> and all its configuration files from your system.
                </p>
              </div>
            </div>

            <div class="space-y-3">
              <h4 class="font-medium text-foreground">What will happen:</h4>
              <ul class="space-y-2 text-sm text-muted-foreground">
                <li class="flex items-center space-x-2">
                  <div class="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0" />
                  <span>Stop the service if it's currently running</span>
                </li>
                <li class="flex items-center space-x-2">
                  <div class="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0" />
                  <span>Disable automatic startup</span>
                </li>
                <li class="flex items-center space-x-2">
                  <div class="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0" />
                  <span>Remove the package and its configuration files</span>
                </li>
                <li class="flex items-center space-x-2">
                  <div class="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0" />
                  <span>Clean up dependencies (if not used by other services)</span>
                </li>
              </ul>
            </div>

            <div class="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Shield class="w-4 h-4 text-blue-600 flex-shrink-0" />
              <p class="text-xs text-blue-700 dark:text-blue-300">
                Administrator privileges will be required to complete this operation.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div class="flex items-center justify-end space-x-3 p-6 border-t border-border">
            <Button
              variant="outline"
              onClick={props.onClose}
              disabled={removing()}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removing()}
              class="bg-red-600 hover:bg-red-700 text-white"
            >
              <Show
                when={!removing()}
                fallback={
                  <>
                    <Trash2 class="w-4 h-4 mr-2 animate-pulse" />
                    Removing...
                  </>
                }
              >
                <Trash2 class="w-4 h-4 mr-2" />
                Remove Service
              </Show>
            </Button>
          </div>
        </div>
      </div>
    </Show>
  )
}

export default ServiceRemovalDialog