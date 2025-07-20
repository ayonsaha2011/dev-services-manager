export interface Service {
  name: string
  service_name: string
  status: ServiceStatus
  enabled: boolean
  uptime?: string
  last_started?: string
  description: string
}

export type ServiceStatus = 'Running' | 'Stopped' | 'Failed' | 'Unknown'

export interface ServiceOperation {
  success: boolean
  message: string
  service?: Service
}

export interface ServiceLogs {
  service_name: string
  logs: string[]
  timestamp: string
}

export interface SystemLogs {
  service_name: string
  system_logs: string[]
  kernel_logs: string[]
  boot_logs: string[]
  timestamp: string
}

export interface SystemMetrics {
  service_name: string
  cpu_usage: number
  memory_usage: number
  memory_total: number
  network_in: number
  network_out: number
  disk_read: number
  disk_write: number
  process_count: number
  open_files: number
  timestamp: string
}

export interface TerminalCommand {
  command: string
  output: string
  exit_code: number
  timestamp: string
  duration_ms: number
}

export interface TerminalSession {
  commands: TerminalCommand[]
  current_directory: string
}