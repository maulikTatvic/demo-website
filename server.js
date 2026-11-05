/**
 * NexusTech Solutions - Static Server + reCAPTCHA Enterprise Assessment API
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { RecaptchaEnterpriseServiceClient } = require('@google-cloud/recaptcha-enterprise');

// Support base64-encoded GCP credentials via env var (used on Render)
if (process.env.GCP_CREDENTIALS_BASE64 && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const decoded = Buffer.from(process.env.GCP_CREDENTIALS_BASE64, 'base64').toString('utf8');
  const tmpPath = require('os').tmpdir() + '/gcp-key.json';
  require('fs').writeFileSync(tmpPath, decoded);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
  console.log('[GCP] Credentials loaded from GCP_CREDENTIALS_BASE64');
}

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
 * Create an assessment to analyze the risk of a UI action.
 * @param {Object} opts - Assessment options
 * @param {string} opts.projectID - Google Cloud Project ID
 * @param {string} opts.recaptchaKey - The reCAPTCHA key associated with the site/app
 * @param {string} opts.token - The generated token obtained from the client
 * @param {string} opts.recaptchaAction - Action name corresponding to the token
 * @returns {Promise<number|null>} Risk score (0.0-1.0) or null on failure
 */
async function createAssessment({
  projectID = "gtagdemosite",
  recaptchaKey = "6Ld7dw8uAAAAAF0qsVlUG3njrghGw-Bi29BfxQX7",
  token = "action-token",
  recaptchaAction = "action-name",
}) {
  const client = new RecaptchaEnterpriseServiceClient();
  const projectPath = client.projectPath(projectID);

  const request = ({
    assessment: {
      event: {
        token: token,
        siteKey: recaptchaKey,
      },
    },
    parent: projectPath,
  });

  const [ response ] = await client.createAssessment(request);

  if (!response.tokenProperties.valid) {
    console.log('[reCAPTCHA] Token invalid. Reason: ' + response.tokenProperties.invalidReason);
    console.log('[reCAPTCHA] Full tokenProperties:', JSON.stringify(response.tokenProperties));
    return null;
  }

  if (response.tokenProperties.action === recaptchaAction) {
    console.log('The reCAPTCHA score is: ' + response.riskAnalysis.score);
    response.riskAnalysis.reasons.forEach((reason) => {
      console.log(reason);
    });

    return response.riskAnalysis.score;
  } else {
    console.log("The action attribute in your reCAPTCHA tag does not match the action you are expecting to score");
    return null;
  }
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
 * Handles POST /api/verify-recaptcha
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function handleVerifyRecaptcha(req, res) {
  try {
    const { token, action } = await parseJsonBody(req);

    if (!token || !action) {
      sendJson(res, 400, { success: false, error: 'Missing token or action' });
      return;
    }

    const score = await createAssessment({
      token,
      recaptchaAction: action,
    });

    if (score === null) {
      sendJson(res, 400, { success: false, error: 'reCAPTCHA verification failed' });
      return;
    }

    sendJson(res, 200, { success: true, score });
  } catch (err) {
    console.error('[reCAPTCHA] Assessment error:', err.message);
    sendJson(res, 500, { success: false, error: 'Assessment service error' });
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
  console.log('NexusTech Server running at http://localhost:' + PORT + '/');
});
