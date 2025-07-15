#!/usr/bin/env python3
"""
Hanzo Code Executor MCP Server
Provides code execution capabilities through the Hanzo Runtime API
"""

import asyncio
import json
import os
from typing import Any, Dict, List, Optional

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent, CallToolResult


# Configuration
RUNTIME_API_URL = os.getenv("RUNTIME_API_URL", "http://localhost:3003/api")
RUNTIME_API_KEY = os.getenv("RUNTIME_API_KEY", "runtime-secret-key")

# Initialize MCP server
server = Server("hanzo-code-executor")


class RuntimeClient:
    """Client for interacting with Hanzo Runtime API"""
    
    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.client = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30.0
        )
    
    async def create_sandbox(self, language: str = "python") -> Dict[str, Any]:
        """Create a new sandbox for code execution"""
        response = await self.client.post(
            f"{self.api_url}/sandboxes",
            json={"language": language}
        )
        response.raise_for_status()
        return response.json()
    
    async def execute_code(self, sandbox_id: str, code: str) -> Dict[str, Any]:
        """Execute code in a sandbox"""
        response = await self.client.post(
            f"{self.api_url}/sandboxes/{sandbox_id}/execute",
            json={"code": code}
        )
        response.raise_for_status()
        return response.json()
    
    async def delete_sandbox(self, sandbox_id: str) -> None:
        """Delete a sandbox"""
        response = await self.client.delete(
            f"{self.api_url}/sandboxes/{sandbox_id}"
        )
        response.raise_for_status()
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Initialize runtime client
runtime_client = RuntimeClient(RUNTIME_API_URL, RUNTIME_API_KEY)


@server.list_tools()
async def list_tools() -> List[Tool]:
    """List available code execution tools"""
    return [
        Tool(
            name="execute_python",
            description="Execute Python code in a secure sandbox environment",
            inputSchema={
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "Python code to execute"
                    }
                },
                "required": ["code"]
            }
        ),
        Tool(
            name="execute_typescript",
            description="Execute TypeScript code in a secure sandbox environment",
            inputSchema={
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "TypeScript code to execute"
                    }
                },
                "required": ["code"]
            }
        ),
        Tool(
            name="execute_javascript",
            description="Execute JavaScript code in a secure sandbox environment",
            inputSchema={
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "JavaScript code to execute"
                    }
                },
                "required": ["code"]
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> CallToolResult:
    """Handle tool calls for code execution"""
    
    try:
        code = arguments.get("code", "")
        
        if not code:
            return CallToolResult(
                content=[TextContent(text="Error: No code provided")]
            )
        
        # Determine language from tool name
        if name == "execute_python":
            language = "python"
        elif name == "execute_typescript":
            language = "typescript"
        elif name == "execute_javascript":
            language = "javascript"
        else:
            return CallToolResult(
                content=[TextContent(text=f"Error: Unknown tool '{name}'")]
            )
        
        # Create sandbox
        sandbox = await runtime_client.create_sandbox(language)
        sandbox_id = sandbox["id"]
        
        try:
            # Execute code
            result = await runtime_client.execute_code(sandbox_id, code)
            
            # Format output
            output = result.get("output", "")
            exit_code = result.get("exitCode", 0)
            execution_time = result.get("executionTime", 0)
            
            if exit_code == 0:
                response = f"✅ Code executed successfully\n\n"
                response += f"Output:\n{output}\n\n"
                response += f"Execution time: {execution_time}ms"
            else:
                response = f"❌ Code execution failed (exit code: {exit_code})\n\n"
                response += f"Output:\n{output}"
            
            return CallToolResult(
                content=[TextContent(text=response)]
            )
            
        finally:
            # Clean up sandbox
            await runtime_client.delete_sandbox(sandbox_id)
            
    except httpx.HTTPError as e:
        return CallToolResult(
            content=[TextContent(text=f"Error communicating with Runtime API: {str(e)}")]
        )
    except Exception as e:
        return CallToolResult(
            content=[TextContent(text=f"Error: {str(e)}")]
        )


async def main():
    """Run the MCP server"""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)


if __name__ == "__main__":
    asyncio.run(main())