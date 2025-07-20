@echo off
setlocal enabledelayedexpansion

REM Dev Services Manager Startup Script for Windows
REM This script provides different logging options for the application

set "APP_NAME=Dev Services Manager"

REM Function to print colored output (Windows compatible)
:print_status
echo [INFO] %~1
goto :eof

:print_warning
echo [WARN] %~1
goto :eof

:print_error
echo [ERROR] %~1
goto :eof

:print_header
echo ================================
echo   %APP_NAME% Startup Script
echo ================================
goto :eof

:print_help
echo Usage:
echo   %~nx0 [OPTION]
echo.
echo Options:
echo   dev          - Start in development mode with info logging
echo   debug        - Start with debug logging (most detailed)
echo   trace        - Start with trace logging (maximum detail)
echo   quiet        - Start with error-only logging
echo   sql          - Start with SQL query logging
echo   custom       - Start with custom logging configuration
echo   help         - Show this help message
echo.
echo Examples:
echo   %~nx0 dev          # Development mode
echo   %~nx0 debug        # Debug logging
echo   %~nx0 trace        # Trace logging
echo   %~nx0 sql          # SQL logging
echo   %~nx0 custom       # Custom logging
echo.
echo Log Levels:
echo   error   - Only error messages
echo   warn    - Warning and error messages
echo   info    - General information (default)
echo   debug   - Detailed debugging information
echo   trace   - Most detailed logging
goto :eof

REM Function to check if cargo is installed
:check_cargo
cargo --version >nul 2>&1
if errorlevel 1 (
    call :print_error "Cargo is not installed. Please install Rust and Cargo first."
    exit /b 1
)
goto :eof

REM Function to check if tauri-cli is installed
:check_tauri
cargo tauri --version >nul 2>&1
if errorlevel 1 (
    call :print_warning "Tauri CLI not found. Installing..."
    cargo install tauri-cli
)
goto :eof

REM Function to start with custom logging
:start_custom
call :print_status "Starting with custom logging configuration..."
echo Available log levels:
echo   error, warn, info, debug, trace
echo.
set /p LOG_LEVEL="Enter log level (default: info): "
if "!LOG_LEVEL!"=="" set "LOG_LEVEL=info"

set /p CRATE_LOG="Enter specific crate log level (optional, e.g., sqlx=warn): "
if not "!CRATE_LOG!"=="" (
    set "RUST_LOG=!LOG_LEVEL!,!CRATE_LOG!"
) else (
    set "RUST_LOG=!LOG_LEVEL!"
)

call :print_status "Starting with RUST_LOG=!RUST_LOG!"
cargo tauri dev
goto :eof

REM Function to start with specific logging
:start_with_logging
set "log_config=%~1"
set "description=%~2"

call :print_header
call :print_status "Starting %APP_NAME% in %description% mode"
call :print_status "Log configuration: %log_config%"
echo.

set "RUST_LOG=%log_config%"
cargo tauri dev
goto :eof

REM Main script logic
:main
REM Check dependencies
call :check_cargo
if errorlevel 1 exit /b 1
call :check_tauri

REM Get the first argument or default to dev
if "%~1"=="" (
    set "option=dev"
) else (
    set "option=%~1"
)

REM Process the option
if "%option%"=="dev" (
    call :start_with_logging "info" "development"
) else if "%option%"=="debug" (
    call :start_with_logging "debug" "debug"
) else if "%option%"=="trace" (
    call :start_with_logging "trace" "trace"
) else if "%option%"=="quiet" (
    call :start_with_logging "error" "quiet (error-only)"
) else if "%option%"=="sql" (
    call :start_with_logging "info,sqlx=debug" "SQL debugging"
) else if "%option%"=="custom" (
    call :start_custom
) else if "%option%"=="help" (
    call :print_header
    call :print_help
) else if "%option%"=="-h" (
    call :print_header
    call :print_help
) else if "%option%"=="--help" (
    call :print_header
    call :print_help
) else (
    call :print_error "Unknown option: %option%"
    echo.
    call :print_help
    exit /b 1
)

goto :eof

REM Run main function with all arguments
call :main %* 