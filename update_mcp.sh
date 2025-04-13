#!/bin/bash

# Ensure script is executable
chmod +x $(dirname "$0")/update_mcp.sh

# Stop any running MCP server
if [ -f mcp_server.pid ]; then
  echo "Stopping existing MCP server..."
  kill $(cat mcp_server.pid) 2>/dev/null || true
  rm mcp_server.pid
else
  echo "No running MCP server found."
fi

# Check if port 3001 is already in use
if lsof -i :3001 > /dev/null 2>&1; then
  echo "WARNING: Port 3001 is already in use. You may need to kill the process using it."
  lsof -i :3001
fi

# Update configuration to use our new MCP server
echo "Updating configuration..."

# Make a backup of current config
cp librechat.yaml librechat.yaml.bak

# Set the updated SSE configuration (using localhost instead of host.docker.internal)
cat > librechat.yaml << EOF
version: "1.2.4"

endpoints:
  # OpenAI configuration
  openAI:
    apiKey: "\${OPENAI_API_KEY}"
    
  # Anthropic configuration
  anthropic:
    apiKey: "\${ANTHROPIC_API_KEY}"
    
  # Custom endpoints (LM Studio)
  custom:
    - name: "LM Studio"
      apiKey: ""
      baseURL: "http://192.168.1.189:1234/v1"
      models:
        default:
          - deepseek-r1-distill-qwen-7b
          - gemma-3-27b-it
          - phi-4
          - qwen2.5-7b-instruct-1m
          - deepseek-r1-distill-qwen-32b
        fetch: false
      titleModel: "deepseek-r1-distill-qwen-7b"
      titleConvo: true
      mcpServerId: hanzo-mcp

# Agents configuration
agents:
  disableBuilder: false
  recursionLimit: 50
  maxRecursionLimit: 100
  capabilities: ["execute_code", "file_search", "actions", "tools"]

# MCP Servers configuration
mcpServers:
  hanzo-mcp:
    type: sse
    url: http://localhost:3001/sse
    timeout: 60000
    initTimeout: 15000

# Interface configuration
interface:
  customWelcome: "Welcome to Hanzo! Try using the agents interface or LM Studio models."
  endpointsMenu: true
  modelSelect: true
  parameters: true
  sidePanel: true
  presets: true
  prompts: true
  bookmarks: true
  multiConvo: true
  agents: true
EOF

echo "Configuration updated."

# Make sure run_mcp_server.py is up to date
cat > run_mcp_server.py << EOF
#!/usr/bin/env python3
"""
Custom MCP server runner that uses a specific port for the SSE server.
"""

import os
import sys
import subprocess
import signal
import time

# Define the port to use for the SSE server
SSE_PORT = 3001

def start_server():
    """Start the MCP server with the defined port."""
    # Set environment variable for the port
    env = os.environ.copy()
    
    print(f"Starting MCP server on port {SSE_PORT}...")
    
    # Start the MCP server process
    process = subprocess.Popen(
        ["python3", "-m", "hanzo_mcp.cli", "--transport", "sse", "--port", str(SSE_PORT)],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Save the PID to file
    with open("mcp_server.pid", "w") as f:
        f.write(str(process.pid))
    
    print(f"MCP server started with PID {process.pid}")
    return process

def handle_signal(sig, frame):
    """Handle termination signals."""
    if os.path.exists("mcp_server.pid"):
        with open("mcp_server.pid", "r") as f:
            pid = int(f.read().strip())
        
        try:
            os.kill(pid, signal.SIGTERM)
            print(f"Sent termination signal to MCP server process (PID {pid})")
        except OSError as e:
            print(f"Error stopping MCP server: {e}")
        
        os.remove("mcp_server.pid")
    
    sys.exit(0)

def main():
    """Main entry point."""
    # Register signal handlers
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)
    
    # Start the server
    process = start_server()
    
    # Monitor the process
    try:
        while True:
            return_code = process.poll()
            if return_code is not None:
                print(f"MCP server process exited with code {return_code}")
                
                # Print any output from the process
                stdout, stderr = process.communicate()
                if stdout:
                    print("===== STDOUT =====")
                    print(stdout)
                if stderr:
                    print("===== STDERR =====")
                    print(stderr)
                
                # Remove PID file
                if os.path.exists("mcp_server.pid"):
                    os.remove("mcp_server.pid")
                
                sys.exit(return_code)
            
            time.sleep(1)
    except KeyboardInterrupt:
        handle_signal(signal.SIGINT, None)

if __name__ == "__main__":
    main()
EOF

# Make the script executable
chmod +x run_mcp_server.py

# Start the MCP server
echo "Starting MCP server..."
python3 run_mcp_server.py &

echo "Update complete. MCP server running on port 3001."
echo "Important: You may need to restart LibreChat for changes to take effect."
