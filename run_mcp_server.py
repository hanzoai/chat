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
    env["PORT"] = str(SSE_PORT)
    
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
