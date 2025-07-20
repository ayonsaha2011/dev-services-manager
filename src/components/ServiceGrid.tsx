import { Component, createSignal, createMemo, Show, For } from 'solid-js'
import { useServices } from '../providers/ServiceProvider'
import { useNavigation } from '../providers/NavigationProvider'
import ServiceCard from './ServiceCard'
import Button from './ui/Button'
import { Settings, Plus, Filter, ChevronDown, Check, Circle, Square, X, Search, Activity, Zap, AlertTriangle } from 'lucide-solid'

interface ServiceGridProps {
  onRemoveService?: (serviceName: string) => void
}

const ServiceGrid: Component<ServiceGridProps> = (props) => {
  const { services, loading, totalServicesCount, showingAll, loadAllServices, loadMoreServices } = useServices()
  const { navigateToService } = useNavigation()
  const [searchQuery, setSearchQuery] = createSignal('')
  const [statusFilter, setStatusFilter] = createSignal<string>('all')
  const [showStatusDropdown, setShowStatusDropdown] = createSignal(false)

  // Memoize filtered services with explicit dependencies to prevent unnecessary recalculations
  const filteredServices = createMemo(() => {
    const currentServices = services()
    const query = searchQuery()
    const statusFilterValue = statusFilter()
    
    let filtered = currentServices
    
    // Search filter
    if (query) {
      const lowerQuery = query.toLowerCase()
      filtered = filtered.filter(service => 
        service.name.toLowerCase().includes(lowerQuery) ||
        service.description.toLowerCase().includes(lowerQuery)
      )
    }
    
    // Status filter
    if (statusFilterValue !== 'all') {
      filtered = filtered.filter(service => {
        switch (statusFilterValue) {
          case 'running': return service.status === 'Running'
          case 'stopped': return service.status === 'Stopped'
          case 'failed': return service.status === 'Failed'
          default: return true
        }
      })
    }
    
    return filtered
  })

  // Memoize status counts to prevent unnecessary recalculations
  const statusCounts = createMemo(() => {
    const currentServices = services()
    const counts = { running: 0, stopped: 0, failed: 0, total: currentServices.length }
    
    for (const service of currentServices) {
      switch (service.status) {
        case 'Running': 
          counts.running++
          break
        case 'Stopped': 
          counts.stopped++
          break
        case 'Failed': 
          counts.failed++
          break
      }
    }
    
    return counts
  })

  const statusOptions = [
    { value: 'all', label: 'All Status', icon: Filter, color: 'text-muted-foreground' },
    { value: 'running', label: 'Running', icon: Circle, color: 'text-success' },
    { value: 'stopped', label: 'Stopped', icon: Square, color: 'text-muted-foreground' },
    { value: 'failed', label: 'Failed', icon: X, color: 'text-destructive' }
  ]

  const selectedStatus = createMemo(() => 
    statusOptions.find(option => option.value === statusFilter()) || statusOptions[0]
  )

  const handleStatusSelect = (value: string) => {
    setStatusFilter(value)
    setShowStatusDropdown(false)
  }

  const toggleStatusDropdown = () => {
    setShowStatusDropdown(!showStatusDropdown())
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
  }

  return (
    <div class="space-y-6">
      {/* Enhanced Stats and Filters with Glass Effects */}
      <div class="glass-card rounded-xl p-6">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
          {/* Enhanced Stats with Glass Effects */}
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="text-center p-4 glass-light rounded-lg">
              <div class="text-2xl font-bold text-foreground">{statusCounts().total}</div>
              <div class="text-sm text-muted-foreground font-medium">Total Services</div>
            </div>
            <div class="text-center p-4 glass-light rounded-lg border border-success/20">
              <div class="text-2xl font-bold text-success">{statusCounts().running}</div>
              <div class="text-sm text-success font-medium flex items-center justify-center space-x-1">
                <Zap class="w-3 h-3" />
                <span>Running</span>
              </div>
            </div>
            <div class="text-center p-4 glass-light rounded-lg">
              <div class="text-2xl font-bold text-muted-foreground">{statusCounts().stopped}</div>
              <div class="text-sm text-muted-foreground font-medium">Stopped</div>
            </div>
            <div class="text-center p-4 glass-light rounded-lg border border-destructive/20">
              <div class="text-2xl font-bold text-destructive">{statusCounts().failed}</div>
              <div class="text-sm text-destructive font-medium flex items-center justify-center space-x-1">
                <AlertTriangle class="w-3 h-3" />
                <span>Failed</span>
              </div>
            </div>
          </div>

          {/* Enhanced Filters with Glass Effects */}
          <div class="flex items-center space-x-3">
            {/* Enhanced Search with Glass Effects */}
            <div class="relative">
              <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery()}
                onInput={(e) => setSearchQuery(e.currentTarget.value)}
                class="w-64 pl-10 pr-3 py-2 glass-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 hover:border-primary/50 shadow-sm hover:shadow-md"
              />
            </div>

            {/* Enhanced Status Filter with Glass Effects */}
            <div class="relative">
              <button
                onClick={toggleStatusDropdown}
                onBlur={() => setTimeout(() => setShowStatusDropdown(false), 150)}
                class="flex items-center justify-between w-48 px-3 py-2 glass-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 hover:border-primary/50 shadow-sm hover:shadow-md cursor-pointer"
                aria-haspopup="listbox"
                aria-expanded={showStatusDropdown()}
                aria-label="Filter by service status"
              >
                <div class="flex items-center space-x-2">
                  {(() => {
                    const Icon = selectedStatus().icon
                    return <Icon class={`w-4 h-4 ${selectedStatus().color}`} />
                  })()}
                  <span class="font-medium">{selectedStatus().label}</span>
                </div>
                <ChevronDown class={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showStatusDropdown() ? 'rotate-180' : ''}`} />
              </button>

              {/* Enhanced Dropdown Menu with Glass Effects */}
              <Show when={showStatusDropdown()}>
                <div class="absolute top-full left-0 right-0 mt-1 glass-medium rounded-lg shadow-lg z-50 py-1 max-h-60 overflow-auto animate-scale-in">
                  <For each={statusOptions}>
                    {(option) => (
                      <button
                        onClick={() => handleStatusSelect(option.value)}
                        class={`w-full flex items-center space-x-3 px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors duration-150 ${
                          statusFilter() === option.value ? 'bg-primary/10 text-primary' : 'text-foreground'
                        }`}
                        role="option"
                        aria-selected={statusFilter() === option.value}
                      >
                        {(() => {
                          const Icon = option.icon
                          return <Icon class={`w-4 h-4 ${option.color}`} />
                        })()}
                        <span class="flex-1 font-medium">{option.label}</span>
                        <Show when={statusFilter() === option.value}>
                          <Check class="w-4 h-4 text-primary" />
                        </Show>
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            {/* Enhanced Clear Filters with Glass Effects */}
            <Show when={searchQuery() || statusFilter() !== 'all'}>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                class="px-3 py-2 text-muted-foreground hover:text-foreground glass-input"
              >
                Clear Filters
              </Button>
            </Show>
          </div>
        </div>
      </div>

      {/* Enhanced Services Grid with Glass Effects */}
      <Show
        when={!loading()}
        fallback={
          <div class="service-grid">
            <For each={Array(6)}>
              {() => (
                <div class="glass-card rounded-xl p-6 animate-pulse">
                  <div class="space-y-4">
                    <div class="flex items-center space-x-3">
                      <div class="skeleton-pulse h-6 w-32 rounded"></div>
                      <div class="skeleton-pulse h-5 w-5 rounded"></div>
                    </div>
                    <div class="skeleton-pulse h-4 w-full rounded"></div>
                    <div class="skeleton-pulse h-4 w-3/4 rounded"></div>
                    <div class="flex items-center space-x-2">
                      <div class="skeleton-pulse h-8 w-20 rounded"></div>
                      <div class="skeleton-pulse h-8 w-8 rounded"></div>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        }
      >
        <Show
          when={filteredServices().length > 0}
          fallback={
            <div class="text-center py-12">
              <div class="w-16 h-16 mx-auto mb-4 glass-light rounded-full flex items-center justify-center">
                <Search class="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 class="text-lg font-semibold text-foreground mb-2">No services found</h3>
              <p class="text-muted-foreground mb-4">
                {searchQuery() || statusFilter() !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No services are currently available.'
                }
              </p>
              <Show when={searchQuery() || statusFilter() !== 'all'}>
                <Button variant="outline" onClick={clearFilters} class="glass-button">
                  Clear Filters
                </Button>
              </Show>
            </div>
          }
        >
          <div class="service-grid">
            <For each={filteredServices()}>
              {(service) => (
                <ServiceCard
                  service={service}
                  onViewDetails={() => navigateToService(service)}
                  onRemove={props.onRemoveService ? () => props.onRemoveService!(service.name) : undefined}
                />
              )}
            </For>
          </div>

          {/* Enhanced Load More with Glass Effects */}
          <Show when={!showingAll() && filteredServices().length > 0 && totalServicesCount() > filteredServices().length}>
            <div class="text-center py-6">
              <Button
                variant="outline"
                onClick={loadMoreServices}
                class="px-6 py-3 glass-button"
              >
                Load More Services ({filteredServices().length} of {totalServicesCount()})
              </Button>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  )
}

export default ServiceGrid