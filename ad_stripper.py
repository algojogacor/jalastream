# JalaStream — mitmproxy ad stripper
# Intercepts RBTV+ player traffic and removes ad/gambling scripts

from mitmproxy import http
import re

# Ad domains to block completely
BLOCK_DOMAINS = [
    'admaven.com', 'clickadu.com', 'galaksion.com', 'adcash.com',
    'adsterra.com', 'monetag.com', 'roastoup.com', 'zerodrifts.com',
    'dcbbwymp1bhlf.cloudfront.net', 'clobberprocurertightwad.com',
    'scendho.com', 'acscdn.com', 'expelledcleaner.com',
    'sauptowhy.com', 'leezeept.com', 'narilyhukelpfulin.com',
    'ey43.com', 'sandburstf2b9n.buzz', 'ttycu14gd.cfd',
    'cutty13dm.cfd', 'txslass02.xyz', 'googletagmanager.com',
    'google-analytics.com',
]

# Ad scripts to remove from HTML
BLOCK_SCRIPTS = [
    '/js/mtg.js',      # Monetag
    'gtag/js',         # Google Analytics
    'gtm.js',          # Google Tag Manager
]

def request(flow: http.HTTPFlow) -> None:
    # Block ad domains entirely
    for domain in BLOCK_DOMAINS:
        if domain in flow.request.pretty_host:
            flow.kill()
            return

def response(flow: http.HTTPFlow) -> None:
    # Only process HTML responses
    content_type = flow.response.headers.get('content-type', '')
    if 'text/html' not in content_type:
        return

    # Strip X-Frame-Options so player can be embedded in JalaStream
    flow.response.headers.pop('x-frame-options', None)
    flow.response.headers.pop('content-security-policy', None)

    # Remove ad scripts from HTML
    body = flow.response.get_text()
    if not body:
        return

    # Remove scripts by pattern
    for pattern in BLOCK_SCRIPTS:
        body = re.sub(
            rf'<script[^>]*{re.escape(pattern)}[^>]*>.*?</script>',
            '',
            body,
            flags=re.DOTALL | re.IGNORECASE
        )
        body = re.sub(
            rf'<script[^>]*{re.escape(pattern)}[^>]*/>',
            '',
            body,
            flags=re.IGNORECASE
        )

    # Remove common ad containers
    body = re.sub(r'<div[^>]*class="[^"]*ad[^"]*"[^>]*>.*?</div>', '', body, flags=re.DOTALL)
    
    # Remove gambling links
    body = re.sub(r'<a[^>]*href="[^"]*(?:stake|bet|casino|judi|gacor|slot)[^"]*"[^>]*>.*?</a>', '', body, flags=re.DOTALL)

    flow.response.set_text(body)
