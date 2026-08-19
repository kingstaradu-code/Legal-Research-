# Legal-Research- — Worker proxy and deployment

This repository includes a simple serverless proxy (Cloudflare Worker) that the site can use to fetch and display full case texts inside a modal viewer.

Why this proxy is needed
- Many law-report websites block cross-origin requests or use headers that prevent in-browser embedding (CORS, X-Frame-Options, CSP). The proxy fetches the page server-side, sanitises it, and returns HTML with permissive CORS so the frontend can render it in a modal.
- The proxy strips scripts and rewrites links so proxied pages remain navigable through the proxy.

Files added
- workers/proxy.js — Cloudflare Worker implementation (also works with other serverless platforms with minor changes).
- workers/wrangler.toml — Wrangler configuration template.

Deployment (recommended): Cloudflare Workers
1. Install Wrangler (Cloudflare CLI) if you don't have it:
   - npm install -g wrangler
2. Log in or configure using an API token with Workers permissions.
3. Edit `workers/wrangler.toml` and set your `account_id`, and optionally `workers_dev = true` or a `route`.
4. Deploy:
   - wrangler publish --env production
5. Note the worker origin (e.g. https://legal-research-proxy.example.workers.dev). Set `window.WORKER_BASE` in the site to that origin (see below).

Local testing (quick): Node proxy
You can also run a quick local proxy for testing using Node. See `Local test` instructions below in the README (or copy the script from the issue discussion).

Wiring the worker into the site
- After you have a deployed worker origin (e.g. https://legal-research-proxy.example.workers.dev), set the site to use it by editing `index.html` or in the browser console:

  window.WORKER_BASE = 'https://legal-research-proxy.example.workers.dev'

- Hard-refresh the site. When users click "View source →" the page will request `/proxy?url=<encoded>` on your worker and the worker will return sanitized HTML to display in the modal.

Security notes
- Restrict origins in the worker (ALLOW_ORIGINS) or require an API token if you expect public traffic.
- Add rate limiting or logging in the worker to detect abuse.
- The worker strips script tags but you should still review proxied content before trusting it.

Automated deploy via GitHub Actions (optional)
- You can create a GitHub Actions workflow that deploys the worker using Wrangler and a `CF_API_TOKEN` secret. Because this requires your Cloudflare credentials, it's left as an optional step. Contact me if you want the workflow added and I can add a template that you enable by adding `CF_API_TOKEN` and `CF_ACCOUNT_ID` secrets.

If you want me to deploy the worker for you, grant me the necessary Cloudflare API token (Workers write) or deploy the worker yourself and paste the worker origin here; I will update `index.html` to hardcode the origin and verify the modal end-to-end.
