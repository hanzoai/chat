const http = require('http');

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/api/health' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'hanzo-runtime' }));
  } else if (req.url === '/api/sandboxes' && req.method === 'POST') {
    // Mock sandbox creation
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: 'sandbox-' + Date.now(),
      state: 'started',
      language: 'python',
      createdAt: new Date().toISOString()
    }));
  } else if (req.url.startsWith('/api/sandboxes/') && req.method === 'DELETE') {
    // Mock sandbox deletion
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  } else if (req.url.includes('/execute') && req.method === 'POST') {
    // Mock code execution
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const code = data.code || '';
        console.log('Executing code:', code);
        
        // Simple mock responses based on code
        let output = 'Hello from Hanzo Runtime!\n';
        if (code.includes('print(')) {
          // Extract string from print statement
          const match = code.match(/print\(["'](.*?)["']\)/);
          if (match) {
            output = match[1] + '\n';
          } else {
            output = 'Hello, World!\n';
          }
        } else if (code.includes('1 + 1')) {
          output = '2\n';
        } else if (code.includes('error')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            output: 'Error: Something went wrong',
            exitCode: 1,
            executionTime: 50
          }));
          return;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          output: output,
          exitCode: 0,
          executionTime: 100
        }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Mock Hanzo Runtime API running on port 3000');
});