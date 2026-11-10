# Ask Skyfall — implementation and operations

## Release state — November 10, 2026

Implementation is on `feature/ask-skyfall-ai`. Production `main` is unchanged.

Staging: https://skyfall-assistant-staging.briansecord10.workers.dev/
Cloudflare account: ad595dba19103f3c47227aaa27009097
Worker: skyfall-assistant-staging
D1 staging database: skyfall-assistant-staging / 7132d250-dcf2-44c2-ad97-a7e197e3c999

No OpenAI key has been created, saved or configured. Real-model conversations and live model quality evaluations are NOT verified. The preview accurately reports AI unavailable. This is a staging checkpoint, not a production-ready release claim.

## Source and architecture

- `index.html`, `styles.css`, `app.js`: existing website with real server API integration, project brief editor, download, optional contact, security verification and privacy notice.
- `assistant/knowledge.js`: reviewed public business facts and conversation instructions. No private company project data.
- `assistant/core.js`: schema validation, request bounds and conservative cost accounting.
- `assistant/worker.js`: request validation, Turnstile checks, durable conversation state, model requests, budget reservations and inquiry delivery.
- `assistant/schema.sql`: private inquiry storage; production must use a separate database.
- `assistant/preview.js`: staging-only static frontend wrapper. Production API Worker uses worker.js directly.
- `scripts/build-preview.mjs`: reproducible staging assets. Generated preview-assets.js is ignored by Git.

No build framework or runtime npm dependency is required. Miniflare is pinned as a development dependency. There are no mock answer paths in production code. Tests explicitly substitute external services; passing those tests is not evidence of live OpenAI success.

## Session and data flow

All mutation endpoints are same-origin JSON under `/api/skyfall/`. No arbitrary recipient, URL, model or system prompt is accepted from the client.

POST session requires Turnstile and returns an HttpOnly, Secure, SameSite=Strict host cookie plus a CSRF token. Each anonymous session has its own SQLite Durable Object. Chats require cookie and CSRF. The server bounds history to the latest 10 messages while retaining the AI's structured memory and full current brief. Session age is a fixed 24 hours. The visitor may clear it sooner with Start over or by declining review submission. An expiry alarm deletes active stored state. Provider and backup retention are separate.

The model returns schema-checked plain text and suggested conversation state. It cannot send email. Contact is a separate user-submitted form with new Turnstile verification. A brief must be reviewed/edited by the visitor. The Worker includes the saved brief only for project inquiries when the user selected submission. Support messages omit it. No customer content is committed to Git.

The private D1 record contains a random reference, session hash, request ID, contact fields, message, optional brief, recent conversation/context, timestamps and explicit delivery status. Daily cleanup removes active records after 90 days. Emails remain in Brian's inbox until deleted. Admin review is through authenticated Cloudflare D1 access, not a public admin endpoint.

Web3Forms receives the complete brief in the email body. A downloadable plain-text document is offered to the visitor. A literal email file attachment is not implemented: that requires Web3Forms paid attachment support or another approved provider.

## Cost and abuse controls

Model is pinned to gpt-5.4-mini-2026-03-17; no automatic paid fallback, tools or web search.

Per-call input is byte-bounded. Output limit is 2200 tokens with reasoning disabled. Input price used is $0.75/M tokens and output $4.50/M tokens. Revalidate rates before changing model or enabling production. Reservations use UTF-8 payload bytes plus conservative framing overhead and maximum output. Unknown usage is charged against the full reservation. Unsettled reservations remain held; this conservatively reduces availability rather than risking unaccounted spending. A price/bound mismatch stops the budget bucket.

The budget Durable Object serializes reservations for this app and month at a $5 allowance. It does not cap spending from other apps using the OpenAI account or cover Cloudflare charges. Session requests are capped at 40 model calls. Per-address rate buckets permit 12 API mutations/minute and 100/hour, keyed by salted daily hashes, not stored raw IPs. Successful request replays avoid repeated model calls. An uncertain model timeout may require a new billable retry, charged conservatively.

## Email status and retries

Saved -> sending -> accepted / rejected / unknown.

Only an HTTP success with `success === true` is accepted. This means provider acceptance, not verified inbox delivery. Accepted request IDs replay without sending twice. Unknown delivery is not automatically retried; the UI gives the saved reference and direct email path. Explicit provider rejection can be retried. D1 failures after sending may leave status unconfirmed: never assume exactly-once email delivery across independent services.

## Backups and rollback

Baseline commit: b9a9fdc83183ca510485881c9d340f9e04e2d0ef
Remote backup branch: backup/pre-ai-2026-11-10
Local bundle was verified and restored into a separate bare repository; the main ref matched the baseline.

The existing skyfall-honeypot Worker source and settings were downloaded for inspection. It has not been modified. Existing routes for skyfallcreations.com/* and www.skyfallcreations.com/* still point to that Worker. Its forwarding, dashboard secret binding and honeypot D1 database remain unchanged. No production API routes have been created.

Before production, recheck the live frontend commit and Worker configuration for intervening changes. Configure a separate production Worker and D1 database, plus its secret bindings. Add only the narrower `/api/skyfall/*` routes on both hostnames, preserving all existing routes. These API paths apply their own validation and abuse protections; the wildcard honeypot continues handling other paths.

Disable AI using AI_ENABLED=false without breaking the contact API. For complete rollback, restore the saved frontend tree with a new commit, then remove only the assistant's narrower API routes. Do not reset the production D1 database; preserve inquiries. Worker code rollback does not restore database contents. Use additive schema migrations and record a D1 recovery bookmark/export before future schema changes.

## Deployment and remaining verification

Cloudflare connector deployment uses multipart Worker modules, SQLite Durable Object migrations, a staging D1 binding and server secrets. Compatibility date deployed to staging: 2026-11-10. Observability has logs, traces and redacted query strings; application logs include only event/status/token/cost metadata.

Staging secrets: RATE_SALT, WEB3_PROJECT_KEY, WEB3_SUPPORT_KEY, TURNSTILE_SECRET and TURNSTILE_SITEKEY. OPENAI_API_KEY is missing. No secrets are stored in source. The new API key local destination was approved as `.env.local`, which is ignored, but no file is written until secure creation is possible.

Rebuild preview assets with npm run build:preview before uploading all five Worker modules. On subsequent uploads preserve secret_text bindings, existing DO namespace bindings and D1 identifiers; do not reapply the initial v1 migration. Daily D1 cleanup cron is `17 5 * * *` UTC.

Run `npm ci`, `npm run check` and `npm test`. Installed workerd currently supports through 2026-08-06; local runtime tests disclose and use that compatibility date. The actual staging Worker deploy succeeds with 2026-11-10. Full endpoint behavior on that deployed compatibility date still needs Turnstile browser verification and live OpenAI tests.

Browser QA verified desktop staging rendering and opening/closing the contact form with correct project address. Full mobile interaction, Turnstile form submission and live AI flow are pending.

Live email routing verification: SKY-ROUTING-20261110172840. Direct Web3Forms submissions for both existing keys were accepted and both arrived in iCloud on November 10, 2026. Project email body contained TEST PROJECT BRIEF and the matching reference. This verifies the delivery provider/routing, not the complete deployed frontend-to-Worker-to-mail path.

Release requires a securely configured OpenAI key, real question/design/review/decline/submit conversations, adversarial/prompt-injection checks, inbox verification through both deployed contact paths, mobile QA, current route backup and post-deploy checks on both production hostnames. Do not merge or enable production before those gates pass.
