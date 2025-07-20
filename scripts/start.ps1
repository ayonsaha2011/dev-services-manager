# Dev Services Manager Startup Script for PowerShell
# This script provides different logging options for the application

param(
    [Parameter(Position=0)]
    [ValidateSet("dev", "debug", "trace", "quiet", "sql", "custom", "help")]
    [string]$Mode = "dev"
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$Cyan = "Cyan"

# Application name
$AppName = "Dev Services Manager"

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

function Write-Header {
    Write-Host "================================" -ForegroundColor $Blue
    Write-Host "  $AppName Startup Script" -ForegroundColor $Blue
    Write-Host "================================" -ForegroundColor $Blue
}

function Show-Help {
    Write-Host "Usage:" -ForegroundColor $Cyan
    Write-Host "  .\start.ps1 [OPTION]"
    Write-Host ""
    Write-Host "Options:" -ForegroundColor $Cyan
    Write-Host "  dev          - Start in development mode with info logging" -ForegroundColor $Green
    Write-Host "  debug        - Start with debug logging (most detailed)" -ForegroundColor $Green
    Write-Host "  trace        - Start with trace logging (maximum detail)" -ForegroundColor $Green
    Write-Host "  quiet        - Start with error-only logging" -ForegroundColor $Green
    Write-Host "  sql          - Start with SQL query logging" -ForegroundColor $Green
    Write-Host "  custom       - Start with custom logging configuration" -ForegroundColor $Green
    Write-Host "  help         - Show this help message" -ForegroundColor $Green
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor $Cyan
    Write-Host "  .\start.ps1 dev          # Development mode" -ForegroundColor $Green
    Write-Host "  .\start.ps1 debug        # Debug logging" -ForegroundColor $Green
    Write-Host "  .\start.ps1 trace        # Trace logging" -ForegroundColor $Green
    Write-Host "  .\start.ps1 sql          # SQL logging" -ForegroundColor $Green
    Write-Host "  .\start.ps1 custom       # Custom logging" -ForegroundColor $Green
    Write-Host ""
    Write-Host "Log Levels:" -ForegroundColor $Cyan
    Write-Host "  error   - Only error messages" -ForegroundColor $Green
    Write-Host "  warn    - Warning and error messages" -ForegroundColor $Green
    Write-Host "  info    - General information (default)" -ForegroundColor $Green
    Write-Host "  debug   - Detailed debugging information" -ForegroundColor $Green
    Write-Host "  trace   - Most detailed logging" -ForegroundColor $Green
}

# Function to check if cargo is installed
function Test-Cargo {
    try {
        $null = cargo --version
        return $true
    }
    catch {
        Write-Error "Cargo is not installed. Please install Rust and Cargo first."
        return $false
    }
}

# Function to check if tauri-cli is installed
function Test-Tauri {
    try {
        $null = cargo tauri --version
        return $true
    }
    catch {
        Write-Warning "Tauri CLI not found. Installing..."
        cargo install tauri-cli
        return $true
    }
}

# Function to start with custom logging
function Start-Custom {
    Write-Status "Starting with custom logging configuration..."
    Write-Host "Available log levels:" -ForegroundColor $Cyan
    Write-Host "  error, warn, info, debug, trace"
    Write-Host ""
    
    $logLevel = Read-Host "Enter log level (default: info)"
    if ([string]::IsNullOrWhiteSpace($logLevel)) {
        $logLevel = "info"
    }
    
    $crateLog = Read-Host "Enter specific crate log level (optional, e.g., sqlx=warn)"
    if ([string]::IsNullOrWhiteSpace($crateLog)) {
        $env:RUST_LOG = $logLevel
    } else {
        $env:RUST_LOG = "$logLevel,$crateLog"
    }
    
    Write-Status "Starting with RUST_LOG=$($env:RUST_LOG)"
    cargo tauri dev
}

# Function to start with specific logging
function Start-WithLogging {
    param(
        [string]$LogConfig,
        [string]$Description
    )
    
    Write-Header
    Write-Status "Starting $AppName in $Description mode"
    Write-Status "Log configuration: $LogConfig"
    Write-Host ""
    
    $env:RUST_LOG = $LogConfig
    cargo tauri dev
}

# Main script logic
function Main {
    # Check dependencies
    if (-not (Test-Cargo)) {
        exit 1
    }
    
    if (-not (Test-Tauri)) {
        exit 1
    }
    
    switch ($Mode) {
        "dev" {
            Start-WithLogging -LogConfig "info" -Description "development"
        }
        "debug" {
            Start-WithLogging -LogConfig "debug" -Description "debug"
        }
        "trace" {
            Start-WithLogging -LogConfig "trace" -Description "trace"
        }
        "quiet" {
            Start-WithLogging -LogConfig "error" -Description "quiet (error-only)"
        }
        "sql" {
            Start-WithLogging -LogConfig "info,sqlx=debug" -Description "SQL debugging"
        }
        "custom" {
            Start-Custom
        }
        "help" {
            Write-Header
            Show-Help
        }
        default {
            Write-Error "Unknown option: $Mode"
            Write-Host ""
            Show-Help
            exit 1
        }
    }
}

# Run main function
Main 