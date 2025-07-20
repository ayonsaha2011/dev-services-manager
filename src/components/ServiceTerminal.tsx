import { Component, createSignal, Show, onMount, For, createEffect, onCleanup } from 'solid-js'
import { invoke } from '@tauri-apps/api/core'
import { Service } from '../types/service'
import HighlightedCommand from './HighlightedCommand'
import {
  Terminal,
  Copy,
  Trash2,
  Play,
  Square,
  RotateCcw,
  Activity,
  Wifi,
  WifiOff,
  Settings,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-solid'

interface ServiceTerminalProps {
  service: Service
}

interface TerminalEntry {
  id: string
  type: 'command' | 'output' | 'error' | 'info' | 'warning' | 'stdout' | 'stderr' | 'service_output'
  content: string
  timestamp: Date
  command?: string
  action?: string
  service?: string
  pid?: number
}

const ServiceTerminal: Component<ServiceTerminalProps> = (props) => {
  const [terminalHistory, setTerminalHistory] = createSignal<TerminalEntry[]>([])
  const [isMonitoring, setIsMonitoring] = createSignal(true)
  const [isLiveOutput, setIsLiveOutput] = createSignal(false)
  const [servicePid, setServicePid] = createSignal<number | null>(null)
  const [monitoringInterval, setMonitoringInterval] = createSignal<ReturnType<typeof setInterval> | undefined>(undefined)
  const [liveOutputInterval, setLiveOutputInterval] = createSignal<ReturnType<typeof setInterval> | undefined>(undefined)
  let terminalContainer: HTMLDivElement | undefined

  const logServiceAction = (action: string, command: string, output: string, exitCode: number, duration?: number) => {
    const timestamp = new Date()
    
    // Add command entry
    const commandEntry: TerminalEntry = {
      id: `${timestamp.getTime()}-cmd`,
      type: 'command',
      content: command,
      timestamp,
      command,
      action
    }
    
    const entries = [commandEntry]
    
    // For status command, always show output if it exists
    // For other commands (start/stop/restart), only show output if there's actual meaningful output
    if (output && output.trim()) {
      const outputType: TerminalEntry['type'] = exitCode === 0 ? 'output' : 'error'
      const outputEntry: TerminalEntry = {
        id: `${timestamp.getTime()}-out`,
        type: outputType,
        content: output.trim(),
        timestamp,
        action
      }
      entries.push(outputEntry)
    }
    
    // Only show exit code if it's non-zero (error) and we haven't already shown an error message
    if (exitCode !== 0 && (!output || !output.trim())) {
      entries.push({
        id: `${timestamp.getTime()}-error`,
        type: 'error',
        content: `Exit code: ${exitCode}`,
        timestamp,
        action
      })
    }
    
    setTerminalHistory(prev => [...prev, ...entries])
    setTimeout(scrollToBottom, 100)
  }

  // Expose function to log service actions
  if (typeof window !== 'undefined') {
    window.logServiceAction = logServiceAction
  }

  const scrollToBottom = () => {
    if (terminalContainer) {
      terminalContainer.scrollTop = terminalContainer.scrollHeight
    }
  }

  const addEntry = (type: TerminalEntry['type'], content: string, command?: string, action?: string, service?: string, pid?: number) => {
    const entry: TerminalEntry = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      command,
      action,
      service,
      pid
    }
    setTerminalHistory(prev => [...prev, entry])
    setTimeout(scrollToBottom, 100)
  }

  const getServicePid = async () => {
    try {
      const result = await invoke<{ command: string, output: string, exit_code: number }>('execute_terminal_command', {
        command: `systemctl show ${props.service.service_name} --property=MainPID --value`
      })
      
      if (result.exit_code === 0 && result.output.trim()) {
        const pid = parseInt(result.output.trim())
        if (pid > 0) {
          setServicePid(pid)
          return pid
        }
      }
    } catch (error) {
      console.error('Failed to get service PID:', error)
    }
    return null
  }

  const startLiveOutput = async () => {
    if (!isLiveOutput()) return
    
    const pid = await getServicePid()
    if (!pid) {
      return
    }

    const interval = setInterval(async () => {
      try {
        // Get real-time process output using strace or similar
        const result = await invoke<{ command: string, output: string, exit_code: number }>('execute_terminal_command', {
          command: `timeout 1 strace -p ${pid} -e trace=write,read -s 1000 2>&1 || echo "No new output"`
        })
        
        if (result.output.trim() && result.output !== "No new output") {
          const lines = result.output.split('\n').filter(line => line.trim())
          for (const line of lines) {
            if (line.includes('write(') || line.includes('read(')) {
              addEntry('service_output', line, undefined, undefined, props.service.name, pid)
            }
          }
        }
      } catch (error) {
        console.error('Live output monitoring error:', error)
      }
    }, 2000) // Check every 2 seconds
    
    setLiveOutputInterval(interval)
  }

  const stopLiveOutput = () => {
    if (liveOutputInterval()) {
      clearInterval(liveOutputInterval())
      setLiveOutputInterval(undefined)
    }
  }

  const startServiceMonitoring = async () => {
    if (!isMonitoring()) return
    
    const interval = setInterval(async () => {
      try {
        // Get service status and logs
        const statusResult = await invoke<{ command: string, output: string, exit_code: number }>('execute_terminal_command', {
          command: `systemctl is-active ${props.service.service_name}`
        })
        
        const logsResult = await invoke<{ command: string, output: string, exit_code: number }>('execute_terminal_command', {
          command: `journalctl -u ${props.service.service_name} --no-pager -n 1 --since "1 minute ago"`
        })
        
        if (statusResult.exit_code === 0) {
          const status = statusResult.output.trim()
          if (status === 'active') {
            // Service is running, check for new logs
            if (logsResult.output.trim()) {
              const lines = logsResult.output.split('\n').filter(line => line.trim())
              for (const line of lines) {
                if (line.includes('stdout') || line.includes('stderr')) {
                  const type = line.includes('stderr') ? 'stderr' : 'stdout'
                  addEntry(type, line, undefined, undefined, props.service.name)
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Service monitoring error:', error)
      }
    }, 5000) // Check every 5 seconds
    
    setMonitoringInterval(interval)
  }

  const stopServiceMonitoring = () => {
    if (monitoringInterval()) {
      clearInterval(monitoringInterval())
      setMonitoringInterval(undefined)
    }
  }

  const executeCustomCommand = async (command: string) => {
    addEntry('command', command)
    
    try {
      const result = await invoke<{ command: string, output: string, exit_code: number, duration_ms: number }>('execute_terminal_command', {
        command
      })
      
      if (result.output.trim()) {
        const outputType: TerminalEntry['type'] = result.exit_code === 0 ? 'output' : 'error'
        addEntry(outputType, result.output.trim(), command)
      }
      
      if (result.exit_code !== 0) {
        addEntry('error', `Command failed with exit code: ${result.exit_code}`)
      }
    } catch (error) {
      addEntry('error', `Command execution failed: ${error}`)
    }
  }

  const getServiceRealTimeInfo = async () => {
    try {
      const commands = [
        `systemctl status ${props.service.service_name} --no-pager`,
        `ps aux | grep ${props.service.name} | grep -v grep`,
        `lsof -p $(systemctl show ${props.service.service_name} --property=MainPID --value) 2>/dev/null || echo "No open files"`,
        `netstat -tulpn | grep ${props.service.name} || echo "No network connections"`
      ]
      
      for (const cmd of commands) {
        await executeCustomCommand(cmd)
      }
    } catch (error) {
      addEntry('error', `Failed to get real-time service info: ${error}`)
    }
  }

  const clearTerminal = () => {
    setTerminalHistory([])
    addEntry('info', '🧹 Terminal cleared')
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  const getEntryColor = (type: TerminalEntry['type']) => {
    switch (type) {
      case 'command': return 'text-green-400'
      case 'output': return 'text-gray-300'
      case 'error': return 'text-red-400'
      case 'warning': return 'text-yellow-400'
      case 'info': return 'text-blue-400'
      case 'stdout': return 'text-cyan-400'
      case 'stderr': return 'text-orange-400'
      case 'service_output': return 'text-purple-400'
      default: return 'text-gray-300'
    }
  }

  const getEntryIcon = (type: TerminalEntry['type']) => {
    switch (type) {
      case 'command': return '❯'
      case 'output': return ''
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      case 'stdout': return '📤'
      case 'stderr': return '📥'
      case 'service_output': return '🔄'
      default: return ''
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      addEntry('info', '📋 Copied to clipboard')
    }).catch(() => {
      addEntry('error', '❌ Failed to copy to clipboard')
    })
  }

  const toggleLiveOutput = () => {
    setIsLiveOutput(!isLiveOutput())
    if (!isLiveOutput()) {
      startLiveOutput()
    } else {
      stopLiveOutput()
    }
  }

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring())
    if (!isMonitoring()) {
      startServiceMonitoring()
    } else {
      stopServiceMonitoring()
    }
  }

  onMount(() => {
    // Start monitoring by default
    startServiceMonitoring()
  })

  onCleanup(() => {
    stopServiceMonitoring()
    stopLiveOutput()
  })

  createEffect(() => {
    scrollToBottom()
  })

  return (
    <div class="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Enhanced Terminal Header */}
      <div class="bg-gray-800 border-b border-gray-700 p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center space-x-3">
            <Terminal class="w-5 h-5 text-green-400" />
            <span class="font-medium">Service Terminal - {props.service.name}</span>
            <div class="px-2 py-1 bg-gray-700 rounded text-xs">
              Real-time I/O
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button
              onClick={getServiceRealTimeInfo}
              class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors flex items-center"
              title="Get real-time service info"
            >
              <Activity class="w-3 h-3 mr-1" />
              Info
            </button>
            <div class="text-xs text-gray-400">
              {terminalHistory().length} entries
            </div>
            <button
              onClick={() => copyToClipboard(terminalHistory().map(h => h.content).join('\n'))}
              class="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors flex items-center"
              title="Copy all output"
            >
              <Copy class="w-3 h-3 mr-1" />
              Copy
            </button>
            <button
              onClick={clearTerminal}
              class="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors flex items-center"
              title="Clear terminal"
            >
              <Trash2 class="w-3 h-3 mr-1" />
              Clear
            </button>
          </div>
        </div>
        
        {/* PID Display */}
        <Show when={servicePid()}>
          <div class="text-xs text-gray-400">
            PID: {servicePid()}
          </div>
        </Show>
      </div>

      {/* Terminal Content */}
      <div 
        ref={terminalContainer}
        class="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed"
        style="scrollbar-width: thin; scrollbar-color: #4a5568 #2d3748;"
      >
        <For each={terminalHistory()}>
          {(entry) => (
            <div class="mb-2 group hover:bg-gray-800/30 rounded px-2 py-1 transition-colors">
              <Show when={entry.type === 'command'}>
                <div class="flex items-start space-x-2">
                  <span class="text-green-400 font-medium select-none">
                    $
                  </span>
                  <div class="flex-1">
                    <HighlightedCommand 
                      command={entry.content}
                      class="text-white font-mono"
                    />
                  </div>
                  <button
                    onClick={() => copyToClipboard(entry.content)}
                    class="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 transition-opacity"
                    title="Copy command"
                  >
                    <Copy class="w-3 h-3" />
                  </button>
                  <span class="text-xs text-gray-500 flex-shrink-0">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
              </Show>
              
              <Show when={entry.type === 'output' || entry.type === 'stdout' || entry.type === 'stderr' || entry.type === 'service_output'}>
                <div class="flex">
                  <Show when={entry.type === 'stdout' || entry.type === 'stderr' || entry.type === 'service_output'}>
                    <span class="text-xs text-gray-500 mr-2 flex-shrink-0 mt-1">
                      {entry.type === 'stdout' ? 'STDOUT' : entry.type === 'stderr' ? 'STDERR' : 'I/O'}
                    </span>
                  </Show>
                  <pre class={`whitespace-pre-wrap ${getEntryColor(entry.type)} flex-1 font-mono text-sm leading-relaxed`}>
                    {entry.content}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(entry.content)}
                    class="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 transition-opacity ml-2"
                    title="Copy output"
                  >
                    <Copy class="w-3 h-3" />
                  </button>
                  <span class="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
              </Show>
              
              <Show when={entry.type === 'error' || entry.type === 'warning' || entry.type === 'info'}>
                <div class="flex items-start space-x-2">
                  <span class="text-lg flex-shrink-0 mt-0.5">
                    {getEntryIcon(entry.type)}
                  </span>
                  <pre class={`whitespace-pre-wrap ${getEntryColor(entry.type)} flex-1 font-mono text-sm leading-relaxed`}>
                    {entry.content}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(entry.content)}
                    class="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 transition-opacity"
                    title="Copy content"
                  >
                    <Copy class="w-3 h-3" />
                  </button>
                  <span class="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>

      {/* Enhanced Footer Info */}
      <div class="bg-gray-800 border-t border-gray-700 p-4">
        <div class="text-xs text-gray-500 flex items-center justify-between">
          <span>Real-time service I/O monitoring • Live stdin/stdout capture</span>
          <span>Total entries: {terminalHistory().length}</span>
        </div>
      </div>
    </div>
  )
}

export default ServiceTerminal