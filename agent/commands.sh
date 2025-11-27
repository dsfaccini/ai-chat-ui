#!/bin/bash

# Development commands for pydantic-work

set -e  # Exit on error

sync() {
    echo "Syncing dependencies..."
    uv sync --extra cli
}

build() {
    echo "Cleaning old builds..."
    rm -rf dist/ build/ *.egg-info

    echo "Building package..."
    uv build

    echo "✓ Build complete! Files in dist/"
    ls -lh dist/
}

publish() {
    echo "Publishing to PyPI..."
    uv publish
}

# Parse command
case "$1" in
    sync)
        sync
        ;;
    build)
        build
        ;;
    publish)
        publish
        ;;
    *)
        echo "Usage: ./commands.sh {sync|build|publish}"
        echo ""
        echo "Commands:"
        echo "  sync     - Sync dependencies with uv"
        echo "  build    - Clean and build the package"
        echo "  publish  - Publish to PyPI"
        exit 1
        ;;
esac
