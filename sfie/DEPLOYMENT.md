# SFIE integration and rollback

Deployment: November 26, 2026 (US Central). Cloudflare accepted the content-only uploads of both existing Workers; current deployments were verified at 100%. Existing bindings and route assignments were not intentionally changed.

## Reproduce the integration

1. Apply `schema.sql` to the existing honeypot D1 database.
2. Include `edge.mjs` as a module named `sfie.mjs` in each existing Worker.
3. In the honeypot, import `record` and `expire` as `sfieRecord` and `sfieExpire`. After the existing `recordRequest` scheduling, call the following for the apex and www production hosts only:
   ```js
   if (["skyfallcreations.com","www.skyfallcreations.com"].includes(url.hostname)) {
     ctx.waitUntil(sfieRecord(request, env.HONEYPOT_DB, category).catch(() => console.error("SFIE aggregate write failed")));
   }
   ```
4. In the honeypot default export add a scheduled handler calling `ctx.waitUntil(sfieExpire(env.HONEYPOT_DB))`; schedule it at 05:17 UTC daily. The cleanup deletes daily buckets older than the UTC date seven days ago. The dashboard displays seven UTC calendar days including today.
5. In the existing dashboard, import `render` as `sfieRender`. After existing hostname, method, Cloudflare Access identity and database checks, handle `/intelligence` with `return await sfieRender(env.HONEYPOT_DB, request)` inside a try/catch returning the existing 503 response on failure. Add a relative link to that page on the dashboard homepage.
6. The live legacy collector was also changed to insert an empty query_string and omit the Referer header from new events. Historical legacy records were not modified. Existing raw IP, path and user agent logging is separate from SFIE.

## Verification

Run `node --test sfie/edge.test.mjs` on Node 22 or newer. Initial collector and storage mock checks were executed separately during implementation. Full integration, browser login, cron execution and production traffic count verification remain open. Public endpoint tests could not resolve/reach the host from the execution environment. The aggregate database was empty at deployment verification. The test file is supplied for subsequent execution; its rendering test has not yet been run.

## Rollback

Use Cloudflare Worker deployments to restore the prior known versions (recorded in the deployment history), preserving the database and secret bindings. Remove only the added scheduled trigger if reverting the collector. Do not delete existing D1 events. Existing production routes and the Access policy remain the security boundary. Do not enable enforcement or advertise 99.9% accuracy without independent validation.
