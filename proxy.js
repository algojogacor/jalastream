// JalaStream — Ad-stripping proxy
// Run: node proxy.js
// Then set Android WiFi proxy to this PC's IP:8888

const http = require('http');
const https = require('https');
const url = require('url');

const PROXY_PORT = 8888;

// Domains to block completely
const BLOCK_DOMAINS = [
  'admaven', 'clickadu', 'galaksion', 'adcash', 'adsterra', 'monetag',
  'roastoup', 'zerodrifts', 'dcbbwymp1bhlf', 'clobberprocurer',
  'scendho', 'acscdn', 'expelledcleaner', 'sauptowhy', 'leezeept',
  'narilyhukelpfulin', 'ey43.com', 'sandburstf2b9n', 'googletagmanager',
  'google-analytics', 'cutty13dm', 'txslass02', 'ttycu14gd',
  'doubleclick', 'googlesyndication',
];

const server = http.createServer((clientReq, clientRes) => {
  const parsed = url.parse(clientReq.url);
  const hostname = parsed.hostname || '';

  // Block ad domains
  if (BLOCK_DOMAINS.some(d => hostname.includes(d))) {
    clientRes.writeHead(204);
    clientRes.end();
    return;
  }

  // Forward the request
  const options = {
    hostname: parsed.hostname,
    port: parsed.port || (clientReq.url.startsWith('https') ? 443 : 80),
    path: parsed.path,
    method: clientReq.method,
    headers: { ...clientReq.headers },
    rejectUnauthorized: false,
  };

  // Remove headers that might cause issues
  delete options.headers['host'];
  options.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0';

  const proxyReq = https.request(options, (proxyRes) => {
    // Strip X-Frame-Options and CSP
    delete proxyRes.headers['x-frame-options'];
    delete proxyRes.headers['content-security-policy'];

    let body = [];
    proxyRes.on('data', chunk => body.push(chunk));
    proxyRes.on('end', () => {
      let responseBody = Buffer.concat(body);
      const contentType = proxyRes.headers['content-type'] || '';
      
      // Strip ads from HTML
      if (contentType.includes('text/html')) {
        let html = responseBody.toString();
        // Remove script tags with ad keywords
        html = html.replace(/<script[^>]*\b(?:mtg|gtag|gtm|admaven|monetag|adcash)[^>]*>[\s\S]*?<\/script>/gi, '');
        // Remove gambling divs/links
        html = html.replace(/<a[^>]*\b(?:stake|bet|casino|judi|gacor|slot)[^>]*>[\s\S]*?<\/a>/gi, '');
        html = html.replace(/<div[^>]*\bclass="[^"]*\bad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
        responseBody = Buffer.from(html);
        
        // Fix content-length
        proxyRes.headers['content-length'] = responseBody.length;
      }

      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      clientRes.end(responseBody);
    });
  });

  proxyReq.on('error', () => {
    clientRes.writeHead(502);
    clientRes.end('Proxy error');
  });

  if (clientReq.method === 'POST' || clientReq.method === 'PUT') {
    let reqBody = [];
    clientReq.on('data', chunk => reqBody.push(chunk));
    clientReq.on('end', () => proxyReq.end(Buffer.concat(reqBody)));
  } else {
    proxyReq.end();
  }
});

server.listen(PROXY_PORT, () => {
  console.log(`Ad-stripping proxy running on port ${PROXY_PORT}`);
  console.log(`Set Android WiFi proxy to this PC's IP:${PROXY_PORT}`);
  console.log(`PC IPs:`, require('os').networkInterfaces());
});
