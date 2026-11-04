/**
 * NexusTech Solutions - Local Development Server
 * Built with Node.js standard libraries (zero dependencies)
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

/**
 * Resolves request path safely to prevent directory traversal
 * @param {string} urlPath 
 * @returns {string}
 */
function getSafeFilePath(urlPath) {
  const cleanUrl = urlPath.split('?')[0];
  const relativePath = cleanUrl === '/' ? 'index.html' : cleanUrl.replace(/^\/+/, '');
  return path.join(__dirname, path.normalize(relativePath));
}

/**
 * Serves a file or returns 404
 * @param {http.ServerResponse} res 
 * @param {string} filePath 
 */
function serveFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

/**
 * Main HTTP request dispatcher
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse} res 
 */
function handleRequest(req, res) {
  const safePath = getSafeFilePath(req.url);
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }
  serveFile(res, safePath);
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`NexusTech Server running at http://localhost:${PORT}/`);
});

