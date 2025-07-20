import { Component, createSignal, Show, onMount, For, createEffect } from 'solid-js'
import { invoke } from '@tauri-apps/api/core'
import { Service, ServiceLogs as ServiceLogsType } from '../types/service'
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug,
  Zap
} from 'lucide-solid'

interface ServiceLogsProps {
  service: Service
}

interface LogEntry {
  timestamp: string
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE'
  source: string
  message: string
}

const ServiceLogs: Component<ServiceLogsProps> = (props) => {
  const [logs, setLogs] = createSignal<LogEntry[]>([])
  const [loading, setLoading] = createSignal(false)
  const [searchTerm, setSearchTerm] = createSignal('')
  const [selectedLevel, setSelectedLevel] = createSignal<string>('ALL')
  const [currentPage, setCurrentPage] = createSignal(1)
  const [logsPerPage] = createSignal(50)
  const [autoRefresh, setAutoRefresh] = createSignal(true)
  const [lastRefresh, setLastRefresh] = createSignal<Date>(new Date())

  const logLevels = ['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']

  const parseLogs = (rawLogs: string[]): LogEntry[] => {
    return rawLogs.map(log => {
      // Try to parse systemd journal format
      const timestampMatch = log.match(/^(\w{3} \d{2} \d{2}:\d{2}:\d{2})/)
      const levelMatch = log.match(/\[(ERROR|WARN|INFO|DEBUG|TRACE)\]/) || 
                        log.match(/(ERROR|WARN|INFO|DEBUG|TRACE):/) ||
                        log.match(/^(\w{3} \d{2} \d{2}:\d{2}:\d{2}).*?(ERROR|WARN|INFO|DEBUG|TRACE)/)
      
      let level: LogEntry['level'] = 'INFO'
      if (levelMatch) {
        level = (levelMatch[1] || levelMatch[2]) as LogEntry['level']
      } else if (log.toLowerCase().includes('error') || log.toLowerCase().includes('failed')) {
        level = 'ERROR'
      } else if (log.toLowerCase().includes('warn')) {
        level = 'WARN'
      } else if (log.toLowerCase().includes('debug')) {
        level = 'DEBUG'
      }

      const timestamp = timestampMatch ? timestampMatch[1] : new Date().toLocaleString()
      
      // Extract source/component
      const serviceMatch = log.match(/systemd\[(\d+)\]/) || 
                          log.match(new RegExp(`${props.service.name}\\[(\\d+)\\]`)) ||
                          log.match(/(\w+)\[(\d+)\]/)
      const source = serviceMatch ? serviceMatch[0] : props.service.name

      // Clean message
      let message = log
      if (timestampMatch) {
        message = log.substring(timestampMatch[0].length).trim()
      }
      if (serviceMatch) {
        message = message.replace(serviceMatch[0], '').trim()
      }
      message = message.replace(/^\[.*?\]\s*/, '').trim() // Remove level prefixes

      return {
        timestamp,
        level,
        source,
        message: message || log
      }
    })
  }

  const loadLogs = async () => {
    setLoading(true)
    try {
      const result = await invoke<ServiceLogsType>('get_service_logs', {
        serviceName: props.service.name,
        lines: 500
      })
      
      const parsedLogs = parseLogs(result.logs)
      setLogs(parsedLogs)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to load service logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const [filteredLogs, setFilteredLogs] = createSignal<LogEntry[]>([])
  const [paginatedLogs, setPaginatedLogs] = createSignal<LogEntry[]>([])
  const [totalPages, setTotalPages] = createSignal(0)

  const updateFilteredLogs = () => {
    let filtered = logs()
    
    // Filter by level
    if (selectedLevel() !== 'ALL') {
      filtered = filtered.filter(log => log.level === selectedLevel())
    }
    
    // Filter by search term
    if (searchTerm()) {
      const term = searchTerm().toLowerCase()
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(term) ||
        log.source.toLowerCase().includes(term) ||
        log.timestamp.toLowerCase().includes(term)
      )
    }
    
    setFilteredLogs(filtered)
    
    // Update total pages
    const pages = Math.ceil(filtered.length / logsPerPage())
    setTotalPages(pages)
    
    // Update paginated logs
    updatePaginatedLogs(filtered)
  }

  const updatePaginatedLogs = (filtered = filteredLogs()) => {
    const startIndex = (currentPage() - 1) * logsPerPage()
    const endIndex = startIndex + logsPerPage()
    setPaginatedLogs(filtered.slice(startIndex, endIndex))
  }

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'ERROR': return AlertCircle
      case 'WARN': return AlertTriangle
      case 'INFO': return Info
      case 'DEBUG': return Bug
      case 'TRACE': return Zap
      default: return Info
    }
  }

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'ERROR': return 'text-red-600 bg-red-100 dark:bg-red-900/30'
      case 'WARN': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
      case 'INFO': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
      case 'DEBUG': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30'
      case 'TRACE': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30'
    }
  }

  const downloadLogs = async () => {
    try {
      const allLogs = filteredLogs()
      const logContent = allLogs.map(log => 
        `[${log.timestamp}] [${log.level}] ${log.source}: ${log.message}`
      ).join('\n')
      
      const blob = new Blob([logContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${props.service.name}-logs-${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download logs:', error)
    }
  }

  const nextPage = () => {
    if (currentPage() < totalPages()) {
      setCurrentPage(currentPage() + 1)
    }
  }

  const prevPage = () => {
    if (currentPage() > 1) {
      setCurrentPage(currentPage() - 1)
    }
  }

  onMount(() => {
    loadLogs()
    
    // Auto-refresh every 30 seconds if enabled
    const interval = setInterval(() => {
      if (autoRefresh() && !loading()) {
        loadLogs()
      }
    }, 30000)
    
    return () => clearInterval(interval)
  })

  // Update filtered logs when logs, searchTerm, or selectedLevel change
  createEffect(() => {
    updateFilteredLogs()
  })

  // Update paginated logs when currentPage changes
  createEffect(() => {
    updatePaginatedLogs()
  })

  return (
    <div class="h-full flex flex-col bg-background">
      {/* Header */}
      <div class="bg-card border-b border-border/50 p-4">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-3">
            <FileText class="w-5 h-5 text-muted-foreground" />
            <h3 class="font-medium text-foreground">Service Logs</h3>
            <div class="px-2 py-1 bg-muted rounded-full text-xs">
              {filteredLogs().length} entries
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <div class="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-refresh"
                checked={autoRefresh()}
                onChange={(e) => setAutoRefresh(e.currentTarget.checked)}
                class="rounded"
              />
              <label for="auto-refresh" class="text-sm text-muted-foreground">
                Auto-refresh
              </label>
            </div>
            <button
              onClick={loadLogs}
              disabled={loading()}
              class="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center space-x-1"
            >
              <RefreshCw class={`w-4 h-4 ${loading() ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={downloadLogs}
              class="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/90 flex items-center space-x-1"
            >
              <Download class="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div class="flex items-center space-x-4">
          {/* Search */}
          <div class="flex-1 relative">
            <Search class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
              class="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          {/* Level Filter */}
          <div class="flex items-center space-x-2">
            <Filter class="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedLevel()}
              onChange={(e) => setSelectedLevel(e.currentTarget.value)}
              class="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <For each={logLevels}>
                {(level) => <option value={level}>{level}</option>}
              </For>
            </select>
          </div>
        </div>

        {/* Last refresh info */}
        <div class="mt-2 text-xs text-muted-foreground">
          Last updated: {lastRefresh().toLocaleTimeString()}
        </div>
      </div>

      {/* Logs Content */}
      <div class="flex-1 overflow-y-auto">
        <Show
          when={!loading()}
          fallback={
            <div class="flex items-center justify-center h-full">
              <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <Show
            when={paginatedLogs().length > 0}
            fallback={
              <div class="flex items-center justify-center h-full text-muted-foreground">
                <div class="text-center">
                  <FileText class="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No logs found</p>
                  <p class="text-sm">Try adjusting your filters or refresh the logs</p>
                </div>
              </div>
            }
          >
            <div class="p-4 space-y-2">
              <For each={paginatedLogs()}>
                {(log) => {
                  const Icon = getLevelIcon(log.level)
                  return (
                    <div class="bg-card border border-border/50 rounded-lg p-3 hover:bg-muted/50 transition-colors">
                      <div class="flex items-start space-x-3">
                        <div class={`p-1.5 rounded-full ${getLevelColor(log.level)}`}>
                          <Icon class="w-4 h-4" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center justify-between mb-1">
                            <div class="flex items-center space-x-2">
                              <span class={`px-2 py-0.5 rounded-full text-xs font-medium ${getLevelColor(log.level)}`}>
                                {log.level}
                              </span>
                              <span class="text-sm text-muted-foreground font-mono">
                                {log.source}
                              </span>
                            </div>
                            <span class="text-xs text-muted-foreground">
                              {log.timestamp}
                            </span>
                          </div>
                          <p class="text-sm text-foreground font-mono whitespace-pre-wrap break-words">
                            {log.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                }}
              </For>
            </div>
          </Show>
        </Show>
      </div>

      {/* Pagination */}
      <Show when={totalPages() > 1}>
        <div class="bg-card border-t border-border/50 p-4">
          <div class="flex items-center justify-between">
            <div class="text-sm text-muted-foreground">
              Showing {((currentPage() - 1) * logsPerPage()) + 1}-{Math.min(currentPage() * logsPerPage(), filteredLogs().length)} of {filteredLogs().length} entries
            </div>
            <div class="flex items-center space-x-2">
              <button
                onClick={prevPage}
                disabled={currentPage() === 1}
                class="p-2 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
              >
                <ChevronLeft class="w-4 h-4" />
              </button>
              <span class="px-3 py-1 text-sm">
                Page {currentPage()} of {totalPages()}
              </span>
              <button
                onClick={nextPage}
                disabled={currentPage() === totalPages()}
                class="p-2 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
              >
                <ChevronRight class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default ServiceLogs