# Ask Skyfall — architecture and operations

## Deployment

Production frontend: GitHub Pages, repository truefastfix/truefastfix.github.io, main branch.
Production hosts: skyfallcreations.com and www.skyfallcreations.com.
API Worker: skyfall-assistant; compatibility date 2026-11-10.
Production D1: skyfall-assistant-production / b070456e-7577-4cce-8051-2c4ffd4d938b.
Cloudflare account: ad595dba19103f3c47227aaa27009097.

Only `/api/skyfall/*` routes are assigned to the assistant. Existing `skyfall-honeypot` wildcard routes, dashboard, secret bindings and honeypot database are preserved. Production API workers.dev and preview URLs are disabled. The frontend and backend are deployed separately: update the Worker before releasing frontend changes that depend on it.

Staging frontend/API: https://ask-preview.skyfallcreations.com/ and https://skyfall-assistant-staging.briansecord10.workers.dev/.
Staging Worker: skyfall-assistant-staging.
Staging D1: skyfall-assistant-staging / 7132d250-dcf2-44c2-ad97-a7e197e3c999.
The staging-only `/__qa/mobile` page embeds the real site at a 390px viewport; it is a responsive-layout check, not physical iOS emulation. Disable staging AI after release to avoid a separate public testing allowance. Its DB remains isolated from production.

## Source

- `index.html`, `styles.css`, `app.js`: retain the existing branding; provide chat, brief editing/download, optional contact, security checks and privacy notice.
- `assistant/knowledge.js`: reviewed public business facts and conversational instructions. No private company project data.
- `assistant/core.js`: bounded inputs, output schema, state validation, interface prompts and conservative model cost accounting.
- `assistant/worker.js`: API, Turnstile, sessions, budget reservations, private records and browser delivery preparation/reporting.
- `assistant/schema.sql`: initial database schema. Existing databases without delivery_evidence use migrations/002-browser-evidence.sql exactly once.
- `assistant/preview.js`: staging-only static wrapper. `scripts/build-preview.mjs` generates ignored preview-assets.js before staging uploads.

No frontend framework or runtime npm dependency is required. Miniflare is a pinned development dependency. No fake answers, canned success or mock endpoints exist in production code. Automated runtime tests substitute external services explicitly; they are not live-service evidence.

## Conversation and privacy

POST session requires Turnstile and returns a Secure, HttpOnly, SameSite=Strict host cookie and CSRF token. All mutations require same-origin JSON and rate checks; subsequent requests require session ownership and CSRF. Each anonymous visitor has a separate SQLite Durable Object. No name/email is required during Q&A or design.

The assistant answers questions first, optionally offers design help for a potential project, interprets natural responses, and asks focused discovery questions after acceptance. The current brief separates confirmed requirements, suggestions and unresolved questions. Clear review-stage acceptance/decline is handled deterministically by the server without another paid inference; qualified replies and other conversation decisions remain model-driven. Review copy is rendered consistently by the server; full briefs appear in a separate editable panel. A contact suggestion only opens the form. Email can be triggered only by the visitor submitting that form.

History is bounded to the last 10 messages, with a compact AI-generated memory and current brief retained to preserve earlier context. Session age is a fixed 24 hours. Start over and declined submission clear active session data sooner. Alarms remove expired state. Provider and recovery-backup retention are separate.

Submitted inquiries contain a random reference, session hash, request ID, contact fields, message, optional reviewed brief, recent conversation/context and delivery evidence. Daily cleanup (`17 5 * * *` UTC) removes active D1 records after 90 days. Mailbox messages remain until deleted. There is no public project lookup or administration endpoint. Review records through authenticated Cloudflare D1 access.

## Model, secrets and costs

Model: gpt-5.4-mini-2026-03-17. Reasoning disabled, 2200 maximum output tokens, no tools, web search or automatic paid fallback. Public facts come from the versioned knowledge file, not a vector database. Brian must confirm feasibility, pricing and timelines; AI suggestions are not guarantees.

A dedicated OpenAI key named Skyfall Website is configured as OPENAI_API_KEY in Cloudflare secrets. It was created through the encrypted connector and verified against the Responses API without displaying plaintext. The approved local .env.local copy is ignored by Git and permission-restricted. Temporary setup private-key material was removed. No credentials may be committed or logged. Revocation of the separate user-created key is a dashboard operation and remains distinct from the website key.

Other bindings: RATE_SALT, WEB3_PROJECT_KEY, WEB3_SUPPORT_KEY, TURNSTILE_SECRET, TURNSTILE_SITEKEY, DB, SESSIONS, GUARD, ALLOWED_ORIGINS and AI_ENABLED. Web3Forms access keys are public form identifiers; the OpenAI key and Turnstile secret are never returned to the browser. Existing secrets must be preserved on Worker module uploads.

The approved spending policy is **$5 per calendar month, no daily spending cap**. Rate limits are abuse controls, not daily monetary limits. A monthly Durable Object serializes reservations across simultaneous calls. Reserve UTF-8 input bytes plus generous framing overhead and maximum output cost before inference. Unknown/time-out usage retains its full reservation; an uncompleted reservation conservatively reduces availability. Settle using usage when present. A cost/bound mismatch stops that budget bucket.

Price assumptions verified for the selected model: $0.75/M input tokens and $4.50/M output tokens; cached input is conservatively charged at full input price in the allowance. Revalidate rates before changing the model. The application allowance does not cap other apps/account usage or Cloudflare charges. The month boundary is UTC. Model evaluation script has its own explicit $0.30 per-run ceiling and is opt-in; it is not used by the public site.

Per-address salted daily rate buckets permit 12 API mutations/minute and 100/hour. Sessions permit 40 model calls. Successful recent request replays avoid another model call. An uncertain inference retry can incur a separate conservatively reserved call. Once the allowance is exhausted, AI stops while contact remains available. AI_ENABLED=false is an immediate inference kill switch.

## Contact delivery and recovery

Project destination: skyfall.developer@skyfallcreations.com.
Support destination: support@skyfallcreations.com.

Web3Forms documents client-side delivery for free plans; forwarding through a Worker is unsupported without paid server allowlisting. Do not reintroduce server-side forwarding or spoof browser headers to bypass that restriction.

1. The Worker validates Turnstile/CSRF, contact fields and reviewed brief, persists the record and reference, and marks sending before returning a delivery packet.
2. The browser submits that packet directly to Web3Forms, using its supported JSON interface.
3. Only an HTTP success with success===true is shown as provider acceptance. A browser report is recorded with delivery_evidence=browser_report, never server-verified delivery.
4. Unknown delivery is preserved, not automatically retried. Accepted request references replay without sending a duplicate. Changed content cannot reuse a previously accepted reference. Explicit rejection permits a later intentional retry.

A malicious client can falsify its own delivery report. Therefore D1 reports are not proof of provider acceptance or inbox arrival. Confirm important deliveries in the inbox. Network loss between services prevents an exactly-once delivery guarantee. Saved records provide recovery even if delivery or its acknowledgement fails.

The complete reviewed brief is included in the email body, with its matching reference. A downloadable plain-text brief is available to the visitor. Literal email attachments require a paid Web3Forms feature or another approved delivery service and are not claimed here. Support messages omit the active project brief and conversation context.

## Verification evidence — November 10, 2026

- Syntax checks and 17 automated core/Workers-runtime tests passed: input bounds, Origin/CSRF/challenge validation, session isolation, repeated/concurrent requests, reset during inference, atomic budget reservations, submission ownership, browser-report evidence, explicit recovery and rate limits.
- Local installed workerd supports compatibility through 2026-08-06; runtime tests disclose that date. Cloudflare staging and production Workers deployed successfully with 2026-11-10. Deployed browser requests separately exercised the current runtime.
- An initial eight-case live-model evaluation passed contract checks: capabilities FAQ, relevant offer, maybe/explanation, natural acceptance, requested brief, contact confirmation, decline/reset and a prompt attempting to invent price/timing commitments and disclose private company code. Human review also checked answers and brief categories. A later public-context confirmation loop exposed model variability and was fixed with deterministic clear yes/no review handling, covered by additional unit/runtime regressions. The current live checker explicitly identifies those two server decisions and makes six live model calls rather than claiming those confirmations are model tests. These samples do not guarantee every future answer.
- Actual staging browser flow: anonymous question/design, editable brief, contact form submission, Turnstile, provider response and inbox retrieval. Project reference SKY-766abe10-0d16-41d5-b307-ba9570ef3b7e arrived at the developer address with its appliance repair website brief. Support reference SKY-04a89ee5-3e45-49e6-86fe-e9d158bb0d5a arrived at support without the project brief.
- Desktop and 390px responsive-layout checks exercised chat, brief review, modal controls and natural decline/reset. An early mobile send-button wrap was corrected. No physical Safari/device certification is claimed.
- An early unsupported server-side mail test failed and left a recoverable unknown record; it was not reported as success. Later tests use the documented browser transport.
- CLI probes of the public apex/www returned 403 in this execution environment, while the cloud browser loaded the real website. Use browser observations for public UI verification; do not label that isolated CLI result a site outage.

## Backup and rollback

Baseline commit: b9a9fdc83183ca510485881c9d340f9e04e2d0ef.
Remote backup branch: backup/pre-ai-2026-11-10. A complete Git bundle was verified and restored into a separate bare repository; its main ref matched the baseline.

Existing honeypot source/settings were downloaded for inspection and remain unchanged. Original wildcard route IDs are 3f86cec68dd44672878ac415bb4c5f4e (www) and 34863ae81f66437790113ee40fb440c4 (apex).
Assistant route IDs: ac879a75a25848beaf0caecb462ff0ed (apex API), e7786a4455d04bb79c91f2d83baf3c8f (www API).

For full frontend rollback, restore the baseline tree in a NEW commit on main and wait for Pages deployment. Remove only the two narrower assistant routes if backend rollback is also needed; preserve the honeypot routes. Do not delete/reset D1 as part of code rollback. Worker code rollback does not restore database records. Future schema changes must be additive and preceded by a recovery bookmark/export.

## Maintenance

Run npm ci, npm run check and npm test. Run npm run build:preview before staging upload. scripts/live-model-check.mjs makes paid real requests only when explicitly run with the ignored local credential; review its messages as well as assertions. Never upload .env.local, .local, node_modules, test-driver bindings or generated credential material.

Deploy backend modules through the Cloudflare connector with only the intended environment bindings; preserve existing secret_text bindings and DO namespaces on updates. Use separate D1/DO namespaces for staging. Keep logs/traces enabled with query strings redacted; application logs contain only event/status/token/cost metadata. Check errors and actual model usage after changes. Confirm email using a clearly labeled test through the actual public form when delivery changes.
