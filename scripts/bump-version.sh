#!/bin/bash

# Dev Services Manager Version Bump Script
# This script automatically bumps version numbers based on semantic versioning

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to get current version from Cargo.toml
get_current_version() {
    grep '^version = ' Cargo.toml | cut -d '"' -f2
}

# Function to bump version
bump_version() {
    local current_version=$1
    local bump_type=$2
    
    IFS='.' read -ra VERSION_PARTS <<< "$current_version"
    local major=${VERSION_PARTS[0]}
    local minor=${VERSION_PARTS[1]}
    local patch=${VERSION_PARTS[2]}
    
    case $bump_type in
        major)
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        minor)
            minor=$((minor + 1))
            patch=0
            ;;
        patch)
            patch=$((patch + 1))
            ;;
        *)
            print_error "Invalid bump type: $bump_type"
            print_error "Valid types: major, minor, patch"
            exit 1
            ;;
    esac
    
    echo "$major.$minor.$patch"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 <bump_type>"
    echo ""
    echo "Bump types:"
    echo "  major    - Increment major version (1.0.0 -> 2.0.0)"
    echo "  minor    - Increment minor version (1.0.0 -> 1.1.0)"
    echo "  patch    - Increment patch version (1.0.0 -> 1.0.1)"
    echo ""
    echo "Examples:"
    echo "  $0 patch    # 1.0.0 -> 1.0.1"
    echo "  $0 minor    # 1.0.0 -> 1.1.0"
    echo "  $0 major    # 1.0.0 -> 2.0.0"
}

# Main script
main() {
    if [[ $# -ne 1 ]]; then
        print_error "Bump type is required"
        show_usage
        exit 1
    fi
    
    local bump_type=$1
    local current_version=$(get_current_version)
    
    print_status "Current version: $current_version"
    
    case $bump_type in
        major|minor|patch)
            local new_version=$(bump_version "$current_version" "$bump_type")
            print_status "New version: $new_version"
            echo "$new_version"
            ;;
        *)
            print_error "Invalid bump type: $bump_type"
            show_usage
            exit 1
            ;;
    esac
}

main "$@" 