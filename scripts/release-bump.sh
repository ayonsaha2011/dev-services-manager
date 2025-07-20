#!/bin/bash

# Dev Services Manager Release Bump Script
# This script combines version bumping and releasing in one command

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

# Function to show usage
show_usage() {
    echo "Usage: $0 <bump_type> [OPTIONS]"
    echo ""
    echo "Bump types:"
    echo "  patch    - Increment patch version (1.0.0 -> 1.0.1)"
    echo "  minor    - Increment minor version (1.0.0 -> 1.1.0)"
    echo "  major    - Increment major version (1.0.0 -> 2.0.0)"
    echo ""
    echo "Options:"
    echo "  -p, --push          Automatically push to remote after release"
    echo "  -c, --changelog     Generate changelog"
    echo "  -d, --dry-run       Show what would be done without executing"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 patch           # Bump patch version and release"
    echo "  $0 minor -p        # Bump minor version, release and push"
    echo "  $0 major -c -p     # Bump major version, generate changelog and push"
    echo "  $0 patch -d        # Dry run for patch bump"
}

# Main script
main() {
    if [[ $# -eq 0 ]]; then
        print_error "Bump type is required"
        show_usage
        exit 1
    fi
    
    local bump_type=$1
    shift
    
    # Validate bump type
    case $bump_type in
        major|minor|patch)
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Invalid bump type: $bump_type"
            show_usage
            exit 1
            ;;
    esac
    
    # Get new version
    print_status "Bumping $bump_type version..."
    local new_version=$(./scripts/bump-version.sh "$bump_type")
    
    # Build release command
    local release_cmd="./scripts/release.sh"
    
    # Add options
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--push)
                release_cmd="$release_cmd -p"
                shift
                ;;
            -c|--changelog)
                release_cmd="$release_cmd -c"
                shift
                ;;
            -d|--dry-run)
                release_cmd="$release_cmd -d"
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Execute release
    print_status "Executing release for version $new_version..."
    $release_cmd "$new_version"
    
    print_success "Release bump completed successfully!"
}

main "$@" 