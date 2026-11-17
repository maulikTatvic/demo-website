/**
 * NexusTech Solutions - Static Server + Dual reCAPTCHA (v2 Checkbox & Enterprise/v3 Score) APIs
 */

'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { RecaptchaEnterpriseServiceClient } = require('@google-cloud/recaptcha-enterprise');

const PORT = process.env.PORT || 8080;

// reCAPTCHA v2 Checkbox Secret Key
const RECAPTCHA_V2_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '6LcX4bUtAAAAAHPW58tAq8V2-6uaCR9cQUpcwj4c';

// reCAPTCHA Enterprise / v3 Settings (gtagdemosite project)
const RECAPTCHA_V3_PROJECT_ID = 'gtagdemosite';
const RECAPTCHA_V3_SITE_KEY = '6Ld7dw8uAAAAAF0qsVlUG3njrghGw-Bi29BfxQX7';

// Load GCP credentials (local file or base64 env var)
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const localKeyPath = path.join(__dirname, 'gcp-credentials.json');
  if (fs.existsSync(localKeyPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = localKeyPath;
    console.log('[GCP] Credentials loaded from local gcp-credentials.json');
  } else if (process.env.GCP_CREDENTIALS_BASE64) {
    const decoded = Buffer.from(process.env.GCP_CREDENTIALS_BASE64, 'base64').toString('utf8');
    const tmpPath = path.join(require('os').tmpdir(), 'gcp-key.json');
    fs.writeFileSync(tmpPath, decoded);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
    console.log('[GCP] Credentials loaded from GCP_CREDENTIALS_BASE64');
  }
}

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
 * Verifies a reCAPTCHA v2 token using Google's siteverify API
 * @param {string} token
 * @returns {Promise<{ success: boolean, hostname?: string }>}
 */
function verifyRecaptchaV2(token) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      secret: RECAPTCHA_V2_SECRET_KEY,
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
 * Creates a reCAPTCHA Enterprise/v3 assessment to get numeric risk score
 * @param {string} token
 * @param {string} action
 * @returns {Promise<number|null>}
 */
async function verifyRecaptchaV3(token, action = 'LOGIN') {
  const client = new RecaptchaEnterpriseServiceClient();
  const projectPath = client.projectPath(RECAPTCHA_V3_PROJECT_ID);

  const request = {
    assessment: {
      event: {
        token: token,
        siteKey: RECAPTCHA_V3_SITE_KEY,
      },
    },
    parent: projectPath,
  };

  const [response] = await client.createAssessment(request);

  if (!response.tokenProperties.valid) {
    console.log('[reCAPTCHA v3] Token invalid. Reason: ' + response.tokenProperties.invalidReason);
    return null;
  }

  console.log('[reCAPTCHA v3] Score: ' + response.riskAnalysis.score);
  return response.riskAnalysis.score;
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
 * Handles POST /api/verify-recaptcha-v2
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function handleVerifyV2(req, res) {
  try {
    const { token } = await parseJsonBody(req);
    if (!token) {
      sendJson(res, 400, { success: false, error: 'Missing token' });
      return;
    }

    const verification = await verifyRecaptchaV2(token);
    console.log('[reCAPTCHA v2] Result:', verification);

    if (!verification.success) {
      sendJson(res, 400, { success: false, error: 'reCAPTCHA v2 verification failed' });
      return;
    }

    sendJson(res, 200, { success: true, hostname: verification.hostname });
  } catch (err) {
    console.error('[reCAPTCHA v2] Error:', err.message);
    sendJson(res, 500, { success: false, error: err.message });
  }
}

/**
 * Handles POST /api/verify-recaptcha-v3
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function handleVerifyV3(req, res) {
  try {
    const { token, action } = await parseJsonBody(req);
    if (!token) {
      sendJson(res, 400, { success: false, error: 'Missing token' });
      return;
    }

    const score = await verifyRecaptchaV3(token, action || 'LOGIN');
    if (score === null) {
      sendJson(res, 400, { success: false, error: 'reCAPTCHA v3 verification failed' });
      return;
    }

    sendJson(res, 200, { success: true, score });
  } catch (err) {
    console.error('[reCAPTCHA v3] Error:', err.message);
    sendJson(res, 500, { success: false, error: err.message });
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

const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://www.googletagmanager.com",
  "frame-src https://www.google.com",
  "connect-src 'self' https://www.google.com https://www.googletagmanager.com https://www.google-analytics.com",
  "img-src 'self' data: https://www.google.com https://www.gstatic.com https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'"
].join('; ');

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const headers = { 'Content-Type': contentType };
    if (ext === '.html') {
      headers['Content-Security-Policy'] = CSP_HEADER;
    }
    res.writeHead(200, headers);
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
    const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'set' : 'missing';
    sendJson(res, 200, { status: 'ok', v2: true, v3: true, credentials: creds });
    return;
  }

  // Backward compatibility + specific v2 endpoint
  if (req.method === 'POST' && (req.url === '/api/verify-recaptcha-v2' || req.url === '/api/verify-recaptcha')) {
    handleVerifyV2(req, res);
    return;
  }

  // Dedicated v3 endpoint
  if (req.method === 'POST' && req.url === '/api/verify-recaptcha-v3') {
    handleVerifyV3(req, res);
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
  console.log(`NexusTech Server running at http://localhost:${PORT}/ (Dual reCAPTCHA v2 & v3 mode)`);
});
