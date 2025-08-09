#!/bin/bash

# Supabase MCP Server Runner Script
# This script starts the Supabase MCP server

echo "Starting Supabase MCP Server..."

# Activate Python environment if using pyenv
if command -v pyenv &> /dev/null; then
    echo "Using pyenv Python environment..."
    eval "$(pyenv init -)"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found. Please create one from .env.example"
    exit 1
fi

# Start the MCP server
echo "Launching MCP server..."
python -m supabase_mcp.server

echo "Supabase MCP Server started successfully!" 