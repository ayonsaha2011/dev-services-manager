#!/bin/bash

# Dev Services Manager Startup Script
# This script provides different logging options for the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Application name
APP_NAME="Dev Services Manager"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  $APP_NAME Startup Script${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_help() {
    echo -e "${CYAN}Usage:${NC}"
    echo -e "  $0 [OPTION]"
    echo ""
    echo -e "${CYAN}Options:${NC}"
    echo -e "  ${GREEN}dev${NC}          - Start in development mode with info logging"
    echo -e "  ${GREEN}debug${NC}        - Start with debug logging (most detailed)"
    echo -e "  ${GREEN}trace${NC}        - Start with trace logging (maximum detail)"
    echo -e "  ${GREEN}quiet${NC}        - Start with error-only logging"
    echo -e "  ${GREEN}sql${NC}          - Start with SQL query logging"
    echo -e "  ${GREEN}custom${NC}       - Start with custom logging configuration"
    echo -e "  ${GREEN}help${NC}         - Show this help message"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo -e "  $0 dev          # Development mode"
    echo -e "  $0 debug        # Debug logging"
    echo -e "  $0 trace        # Trace logging"
    echo -e "  $0 sql          # SQL logging"
    echo -e "  $0 custom       # Custom logging"
    echo ""
    echo -e "${CYAN}Log Levels:${NC}"
    echo -e "  ${GREEN}error${NC}   - Only error messages"
    echo -e "  ${GREEN}warn${NC}    - Warning and error messages"
    echo -e "  ${GREEN}info${NC}    - General information (default)"
    echo -e "  ${GREEN}debug${NC}   - Detailed debugging information"
    echo -e "  ${GREEN}trace${NC}   - Most detailed logging"
}

# Function to check if cargo is installed
check_cargo() {
    if ! command -v cargo &> /dev/null; then
        print_error "Cargo is not installed. Please install Rust and Cargo first."
        exit 1
    fi
}

# Function to check if tauri-cli is installed
check_tauri() {
    if ! cargo tauri --version &> /dev/null; then
        print_warning "Tauri CLI not found. Installing..."
        cargo install tauri-cli
    fi
}

# Function to start with custom logging
start_custom() {
    print_status "Starting with custom logging configuration..."
    echo -e "${CYAN}Available log levels:${NC}"
    echo -e "  error, warn, info, debug, trace"
    echo ""
    read -p "Enter log level (default: info): " LOG_LEVEL
    LOG_LEVEL=${LOG_LEVEL:-info}
    
    read -p "Enter specific crate log level (optional, e.g., sqlx=warn): " CRATE_LOG
    if [ -n "$CRATE_LOG" ]; then
        export RUST_LOG="$LOG_LEVEL,$CRATE_LOG"
    else
        export RUST_LOG="$LOG_LEVEL"
    fi
    
    print_status "Starting with RUST_LOG=$RUST_LOG"
    cargo tauri dev
}

# Function to start with specific logging
start_with_logging() {
    local log_config="$1"
    local description="$2"
    
    print_header
    print_status "Starting $APP_NAME in $description mode"
    print_status "Log configuration: $log_config"
    echo ""
    
    export RUST_LOG="$log_config"
    cargo tauri dev
}

# Main script logic
main() {
    # Check dependencies
    check_cargo
    check_tauri
    
    case "${1:-dev}" in
        "dev")
            start_with_logging "info" "development"
            ;;
        "debug")
            start_with_logging "debug" "debug"
            ;;
        "trace")
            start_with_logging "trace" "trace"
            ;;
        "quiet")
            start_with_logging "error" "quiet (error-only)"
            ;;
        "sql")
            start_with_logging "info,sqlx=debug" "SQL debugging"
            ;;
        "custom")
            start_custom
            ;;
        "help"|"-h"|"--help")
            print_header
            print_help
            ;;
        *)
            print_error "Unknown option: $1"
            echo ""
            print_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 