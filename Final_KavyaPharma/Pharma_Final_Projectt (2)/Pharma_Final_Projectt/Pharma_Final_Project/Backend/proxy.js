const http = require('http');
const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.resolve(__dirname, '../Frontend/KavyaPharma/Farma_Track');
const BACKEND_URL = 'http://localhost:8082';

const server = http.createServer((req, res) => {
    // Extract pathname to ignore query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    console.log(`${req.method} ${pathname}`);
    
    if (pathname.startsWith('/api/')) {
        // Proxy to backend
        const options = {
            hostname: 'localhost',
            port: 8082,
            path: req.url,
            method: req.method,
            headers: req.headers
        };

        const proxyReq = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });
        
        proxyReq.on('error', (err) => {
            console.error('Proxy error:', err);
            res.writeHead(502, { 'Content-Type': 'text/plain' });
            res.end('Bad Gateway: Backend might be down at ' + BACKEND_URL);
        });
        
        req.pipe(proxyReq);
        return;
    }

    // Serve static files
    let filePath = path.join(FRONTEND_DIR, pathname === '/' ? 'index.html' : pathname);
    
    // Check if filename has extension, if not, try adding .html or fallback to index.html
    if (!path.extname(filePath)) {
        if (fs.existsSync(filePath + '.html')) {
            filePath += '.html';
        }
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
         // Fallback to index.html for SPA-like behavior or if file not found
         filePath = path.join(FRONTEND_DIR, 'index.html');
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
        }
        
        // Basic MIME types
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        res.end(data);
    });
});

const PORT = 8081;
server.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
    console.log(`Serving frontend from: ${FRONTEND_DIR}`);
    console.log(`Forwarding /api to ${BACKEND_URL}`);
});
