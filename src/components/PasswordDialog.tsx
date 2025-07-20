import { Component, createSignal, Show } from 'solid-js'
import Button from './ui/Button'
import { X, Lock, AlertTriangle } from 'lucide-solid'

interface PasswordDialogProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: (password: string) => void
  onCancel: () => void
  loading?: boolean
}

const PasswordDialog: Component<PasswordDialogProps> = (props) => {
  const [password, setPassword] = createSignal('')
  const [showPassword, setShowPassword] = createSignal(false)

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    if (password().trim()) {
      props.onConfirm(password())
    }
  }

  const handleCancel = () => {
    setPassword('')
    props.onCancel()
  }

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-card border rounded-lg w-full max-w-md animate-slide-in">
          {/* Header */}
          <div class="flex items-center justify-between p-6 border-b">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Lock class="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h2 class="text-lg font-semibold text-foreground">{props.title}</h2>
                <p class="text-sm text-muted-foreground">Authentication Required</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCancel} class="w-8 h-8 p-0">
              <X class="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} class="p-6 space-y-4">
            <div class="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle class="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div class="text-sm text-yellow-800 dark:text-yellow-200">
                {props.message}
              </div>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-foreground mb-2">
                Administrator Password
              </label>
              <div class="relative">
                <input
                  id="password"
                  type={showPassword() ? 'text' : 'password'}
                  value={password()}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  placeholder="Enter your password"
                  class="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                  disabled={props.loading}
                  autofocus
                />
              </div>
              <div class="mt-2">
                <label class="flex items-center space-x-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPassword()}
                    onChange={(e) => setShowPassword(e.currentTarget.checked)}
                    class="w-4 h-4 text-primary bg-background border border-input rounded focus:ring-2 focus:ring-primary"
                  />
                  <span>Show password</span>
                </label>
              </div>
            </div>

            <div class="flex items-center justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={props.loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!password().trim() || props.loading}
                class="min-w-[100px]"
              >
                <Show when={props.loading} fallback="Authenticate">
                  <div class="flex items-center space-x-2">
                    <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </div>
                </Show>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  )
}

export default PasswordDialog