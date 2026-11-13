/**
 * NexusTech Solutions - Static Server + reCAPTCHA v3 Verification API
 */

'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '6LcX4bUtAAAAAHPW58tAq8V2-6uaCR9cQUpcwj4c';

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
 * Verifies a reCAPTCHA v3 token using Google's siteverify API
 * @param {string} token
 * @returns {Promise<{ success: boolean, score?: number, action?: string }>}
 */
function verifyRecaptchaV3(token) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      secret: RECAPTCHA_SECRET_KEY,
      response: token,
    }).toString();

    const options = {
      hostname: 'www.google.com',
      port: 443,
      path: '/recaptcha/api/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Reads and parses JSON body from an incoming request
 * @param {http.IncomingMessage} req
 * @returns {Promise<Object>}
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

/**
 * Sends a JSON response
 * @param {http.ServerResponse} res
 * @param {number} statusCode
 * @param {Object} data
 */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

/**
 * Handles POST /api/verify-recaptcha for reCAPTCHA v3
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function handleVerifyRecaptcha(req, res) {
  try {
    const { token, action } = await parseJsonBody(req);

    if (!token) {
      sendJson(res, 400, { success: false, error: 'Missing token' });
      return;
    }

    const verification = await verifyRecaptchaV3(token);
    console.log('[reCAPTCHA v3] Verification result:', verification);

    if (!verification.success) {
      sendJson(res, 400, {
        success: false,
        error: 'reCAPTCHA verification failed',
        errorCodes: verification['error-codes']
      });
      return;
    }

    sendJson(res, 200, {
      success: true,
      score: verification.score,
      action: verification.action
    });
  } catch (err) {
    console.error('[reCAPTCHA v3] Verification error:', err.message);
    sendJson(res, 500, { success: false, error: 'Verification service error' });
  }
}

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
  if (req.method === 'GET' && req.url === '/api/health') {
    sendJson(res, 200, { status: 'ok', recaptcha: 'v3', secretConfigured: !!RECAPTCHA_SECRET_KEY });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/verify-recaptcha') {
    handleVerifyRecaptcha(req, res);
    return;
  }

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
  console.log('NexusTech Server running at http://localhost:' + PORT + '/ (reCAPTCHA v3 mode)');
});
