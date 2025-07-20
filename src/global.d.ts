// Global type declarations

declare global {
  interface Window {
    logServiceAction?: (
      action: string,
      command: string,
      output: string,
      exitCode: number,
      duration?: number
    ) => void
  }
}

export {}