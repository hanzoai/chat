#!/usr/bin/env python3
"""
MCP Server Runner Script
This script starts the Hanzo MCP server with SSE transport and captures the PID
"""

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

# Store PID file in the same directory as this script
PID_FILE = Path(__file__).parent / "mcp_server.pid"

def signal_handler(sig, frame):
    """Handle termination signals to clean up before exiting."""
    print("\nMCP server shutting down...")
    if PID_FILE.exists():
        PID_FILE.unlink()
    sys.exit(0)

def main():
    """Main function to run the MCP server."""
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Current working directory (where this script is located)
    working_dir = Path(__file__).parent.absolute()
    os.chdir(working_dir)

    # Clean up any existing PID file
    if PID_FILE.exists():
        print(f"Warning: PID file {PID_FILE} already exists. Previous server might still be running.")
        try:
            with open(PID_FILE, 'r') as f:
                old_pid = int(f.read().strip())
            try:
                os.kill(old_pid, 0)  # Check if process exists
                print(f"Process with PID {old_pid} is still running. Please stop it first.")
                print("Use 'make stop-mcp' or manually kill the process.")
                return 1
            except OSError:
                print(f"No process with PID {old_pid} is running. Cleaning up stale PID file.")
                PID_FILE.unlink()
        except Exception as e:
            print(f"Error checking PID: {e}")
            PID_FILE.unlink()

    # Define MCP server command
    cmd = [
        "python3", "-m", "hanzo_mcp.cli",
        "--transport", "sse",
        "--name", "hanzo-mcp",
        "--enable-agent-tool"
    ]

    # Add allowed paths (current dir and home)
    cmd.extend(["--allow-path", str(Path.home())])
    cmd.extend(["--allow-path", str(working_dir)])

    # Start MCP server
    print(f"Starting Hanzo MCP server: {' '.join(cmd)}")
    process = subprocess.Popen(cmd)

    # Write PID to file
    with open(PID_FILE, 'w') as f:
        f.write(str(process.pid))

    print(f"MCP server started with PID {process.pid}")
    print(f"PID saved to {PID_FILE}")
    print("Server running at http://localhost:3001/sse")
    print("Press Ctrl+C to stop the server")

    # Keep the script running to maintain the subprocess
    try:
        while True:
            time.sleep(1)
            # Check if process is still running
            if process.poll() is not None:
                print(f"MCP server process exited with code {process.returncode}")
                if PID_FILE.exists():
                    PID_FILE.unlink()
                return process.returncode
    except KeyboardInterrupt:
        print("\nStopping MCP server...")
        process.terminate()
        process.wait(timeout=5)
        if PID_FILE.exists():
            PID_FILE.unlink()
        return 0

if __name__ == "__main__":
    sys.exit(main())
