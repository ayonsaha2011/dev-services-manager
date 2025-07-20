#!/bin/bash

# Dev Services Manager Release Script
# This script automates the release process for the project

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get current version from Cargo.toml
get_current_version() {
    grep '^version = ' Cargo.toml | cut -d '"' -f2
}

# Function to update version in Cargo.toml
update_version() {
    local new_version=$1
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/^version = \".*\"/version = \"$new_version\"/" Cargo.toml
    else
        # Linux
        sed -i "s/^version = \".*\"/version = \"$new_version\"/" Cargo.toml
    fi
}

# Function to update version in package.json
update_package_version() {
    local new_version=$1
    if command_exists npm; then
        npm version "$new_version" --no-git-tag-version --allow-same-version
    else
        print_warning "npm not found, skipping package.json version update"
    fi
}

# Function to generate changelog
generate_changelog() {
    local version=$1
    local changelog_file="CHANGELOG.md"
    
    print_status "Generating changelog for version $version..."
    
    # Create changelog if it doesn't exist
    if [[ ! -f "$changelog_file" ]]; then
        echo "# Changelog" > "$changelog_file"
        echo "" >> "$changelog_file"
        echo "All notable changes to this project will be documented in this file." >> "$changelog_file"
        echo "" >> "$changelog_file"
    fi
    
    # Get commits since last tag
    local last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    local commit_range=""
    
    if [[ -n "$last_tag" ]]; then
        commit_range="$last_tag..HEAD"
    else
        commit_range="HEAD"
    fi
    
    # Generate changelog entry
    local temp_changelog=$(mktemp)
    echo "## [$version] - $(date +%Y-%m-%d)" > "$temp_changelog"
    echo "" >> "$temp_changelog"
    
    # Get conventional commits
    if command_exists conventional-changelog; then
        conventional-changelog -p angular -i "$changelog_file" -s -r 0
    else
        # Fallback to git log
        echo "### Added" >> "$temp_changelog"
        git log --pretty=format:"- %s" "$commit_range" --grep="^feat" --no-merges >> "$temp_changelog" 2>/dev/null || echo "- No new features" >> "$temp_changelog"
        echo "" >> "$temp_changelog"
        
        echo "### Changed" >> "$temp_changelog"
        git log --pretty=format:"- %s" "$commit_range" --grep="^change\|^refactor" --no-merges >> "$temp_changelog" 2>/dev/null || echo "- No changes" >> "$temp_changelog"
        echo "" >> "$temp_changelog"
        
        echo "### Fixed" >> "$temp_changelog"
        git log --pretty=format:"- %s" "$commit_range" --grep="^fix" --no-merges >> "$temp_changelog" 2>/dev/null || echo "- No fixes" >> "$temp_changelog"
        echo "" >> "$temp_changelog"
    fi
    
    # Prepend to changelog
    cat "$temp_changelog" "$changelog_file" > "${changelog_file}.tmp"
    mv "${changelog_file}.tmp" "$changelog_file"
    rm "$temp_changelog"
    
    print_success "Changelog generated"
}

# Function to check if working directory is clean
check_working_directory() {
    if [[ -n $(git status --porcelain) ]]; then
        print_error "Working directory is not clean. Please commit or stash your changes."
        git status --short
        exit 1
    fi
}

# Function to check if we're on main branch
check_branch() {
    local current_branch=$(git branch --show-current)
    if [[ "$current_branch" != "main" && "$current_branch" != "master" ]]; then
        print_warning "You're not on the main branch (current: $current_branch)"
        read -p "Do you want to continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Function to validate version format
validate_version() {
    local version=$1
    if [[ ! $version =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$ ]]; then
        print_error "Invalid version format: $version"
        print_error "Expected format: X.Y.Z[-prerelease][+build]"
        exit 1
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] <version>"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -d, --dry-run       Show what would be done without executing"
    echo "  -p, --push          Automatically push to remote after release"
    echo "  -c, --changelog     Generate changelog"
    echo "  -t, --tag-only      Only create tag, don't update versions"
    echo ""
    echo "Examples:"
    echo "  $0 1.0.0           # Release version 1.0.0"
    echo "  $0 -p 1.1.0        # Release and push to remote"
    echo "  $0 -d 2.0.0        # Dry run for version 2.0.0"
    echo ""
    echo "Version types:"
    echo "  patch: 1.0.0 -> 1.0.1"
    echo "  minor:  1.0.0 -> 1.1.0"
    echo "  major:  1.0.0 -> 2.0.0"
}

# Main script
main() {
    local dry_run=false
    local auto_push=false
    local generate_changelog_flag=false
    local tag_only=false
    local version=""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -d|--dry-run)
                dry_run=true
                shift
                ;;
            -p|--push)
                auto_push=true
                shift
                ;;
            -c|--changelog)
                generate_changelog_flag=true
                shift
                ;;
            -t|--tag-only)
                tag_only=true
                shift
                ;;
            -*)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                version="$1"
                shift
                ;;
        esac
    done
    
    # Check if version is provided
    if [[ -z "$version" ]]; then
        print_error "Version is required"
        show_usage
        exit 1
    fi
    
    # Validate version format
    validate_version "$version"
    
    # Check prerequisites
    if ! command_exists git; then
        print_error "git is required but not installed"
        exit 1
    fi
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository"
        exit 1
    fi
    
    # Check working directory
    check_working_directory
    
    # Check branch
    check_branch
    
    # Get current version
    local current_version=$(get_current_version)
    print_status "Current version: $current_version"
    print_status "New version: $version"
    
    if [[ "$dry_run" == true ]]; then
        print_warning "DRY RUN - No changes will be made"
        echo "Would perform the following actions:"
        echo "1. Update version in Cargo.toml to $version"
        echo "2. Update version in package.json to $version"
        if [[ "$generate_changelog_flag" == true ]]; then
            echo "3. Generate changelog"
        fi
        echo "4. Commit changes"
        echo "5. Create git tag v$version"
        if [[ "$auto_push" == true ]]; then
            echo "6. Push to remote"
        fi
        exit 0
    fi
    
    # Update versions
    if [[ "$tag_only" != true ]]; then
        print_status "Updating version in Cargo.toml..."
        update_version "$version"
        
        print_status "Updating version in package.json..."
        update_package_version "$version"
    fi
    
    # Generate changelog
    if [[ "$generate_changelog_flag" == true ]]; then
        generate_changelog "$version"
    fi
    
    # Commit changes
    if [[ "$tag_only" != true ]]; then
        print_status "Committing changes..."
        git add Cargo.toml package.json package-lock.json CHANGELOG.md 2>/dev/null || true
        git commit -m "chore: release version $version"
    fi
    
    # Create tag
    print_status "Creating git tag v$version..."
    git tag -a "v$version" -m "Release version $version"
    
    # Push to remote
    if [[ "$auto_push" == true ]]; then
        print_status "Pushing to remote..."
        git push origin HEAD
        git push origin "v$version"
        print_success "Release v$version pushed to remote"
    else
        print_success "Release v$version created locally"
        print_warning "Don't forget to push:"
        echo "  git push origin HEAD"
        echo "  git push origin v$version"
    fi
    
    print_success "Release v$version completed successfully!"
}

# Run main function with all arguments
main "$@" 