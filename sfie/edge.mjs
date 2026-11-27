function collect(request, category, now = Date.now()) {
  const cf=request.cf||{}, h=request.headers, ua=(h.get("user-agent")||"").slice(0,512);
  const allowed=["wordpress_probe","sqlmap","nuclei","nikto","content_scanner","path_traversal","sqli_probe","xss_probe","environment_probe","source_control_probe","config_probe","phpmyadmin_probe","backup_probe","shell_probe","suspicious_post","honeypot_decoy"];
  const label=category==="normal"?"normal":allowed.includes(category)?category:"other";
  const browser=/\b(?:Edg|EdgiOS|EdgA)\//i.test(ua)?"edge":/\b(?:Firefox|FxiOS)\//i.test(ua)?"firefox":/\b(?:Chrome|CriOS|Chromium)\//i.test(ua)?"chromium":/\bSafari\//i.test(ua)?"safari":/\b(?:curl|wget|python-requests|Go-http-client)\//i.test(ua)?"script-client":ua?"other":"unknown";
  const protocol=["HTTP/1.0","HTTP/1.1","HTTP/2","HTTP/3"].includes(cf.httpProtocol)?cf.httpProtocol:"unknown";
  const tls=["TLSv1","TLSv1.0","TLSv1.1","TLSv1.2","TLSv1.3"].includes(cf.tlsVersion)?cf.tlsVersion:"unknown";
  const cipher=typeof cf.tlsCipher==="string"?cf.tlsCipher:"";
  const cipherFamily=/CHACHA20/i.test(cipher)?"chacha20":/AES[_-]?128/i.test(cipher)?"aes128":/AES[_-]?256/i.test(cipher)?"aes256":cipher?"other":"unknown";
  const bot=cf.botManagement?.verifiedBot===true?"verified":Number.isInteger(cf.botManagement?.score)&&cf.botManagement.score>=1&&cf.botManagement.score<=99?(cf.botManagement.score<30?"provider-low":"provider-other"):"unavailable";
  const fetchMode=["navigate","cors","no-cors","same-origin","websocket"].includes(h.get("sec-fetch-mode"))?h.get("sec-fetch-mode"):"unknown";
  return {day:new Date(now).toISOString().slice(0,10),label,browser,protocol,tls,cipherFamily,bot,fetchMode};
}

async function record(request, db, category) {
  if (!db) return;
  // Keep a uniform 10% sample of normal traffic; suspicious labels are retained.
  if(category==="normal" && crypto.getRandomValues(new Uint32Array(1))[0] >= 429496730) return;
  const a=collect(request,category);
  await db.prepare("INSERT INTO sfie_daily_v1(day,label,browser,protocol,tls,cipher_family,bot,fetch_mode,n) VALUES(?,?,?,?,?,?,?,?,1) ON CONFLICT(day,label,browser,protocol,tls,cipher_family,bot,fetch_mode) DO UPDATE SET n=n+1").bind(a.day,a.label,a.browser,a.protocol,a.tls,a.cipherFamily,a.bot,a.fetchMode).run();
}

async function expire(db, now=Date.now()) {
  if(!db)return;
  await db.prepare("DELETE FROM sfie_daily_v1 WHERE day < ?").bind(new Date(now-7*86400000).toISOString().slice(0,10)).run();
}

async function render(db,request) {
  const since=new Date(Date.now()-6*86400000).toISOString().slice(0,10);
  const dimensions=[["label","Detection category"],["browser","Client-reported browser family"],["protocol","HTTP protocol"],["tls","TLS version"],["cipher_family","TLS cipher family"],["bot","Provider bot classification"],["fetch_mode","Client-reported fetch mode"]];
  const summaries=await db.batch(dimensions.map(([col])=>db.prepare("SELECT "+col+" AS label,SUM(n) AS n FROM sfie_daily_v1 WHERE day >= ? GROUP BY "+col+" ORDER BY n DESC LIMIT 20").bind(since)));
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const cards=dimensions.map(([,title],i)=>"<section><h2>"+esc(title)+"</h2>"+(summaries[i].results||[]).map(r=>"<p>"+esc(r.label)+" <strong>"+esc(Number(r.n))+"</strong></p>").join("")+"</section>").join("");
  const html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Skyfall Intelligence</title><style>body{background:#080e1a;color:#e7f2ff;font:16px system-ui;margin:auto;max-width:980px;padding:18px}a{color:#7de5ff}h1{font-size:1.7rem}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:12px}section{border:1px solid #30445b;border-radius:12px;background:#101e31;padding:16px}h2{font-size:1rem;color:#8fdbff}p{overflow-wrap:anywhere}strong{float:right;color:#a6ffd9}</style><a href="/">← Threat Monitor</a> · <a href="/intelligence">Refresh</a><h1>Skyfall Fingerprint Intelligence</h1><p>Observation only · Last seven UTC calendar days · 10% sample of normal requests; suspicious heuristic labels unsampled. Counts are observations, not unique visitors. Accuracy not yet measured.</p><main>'+cards+'</main></html>';
  return new Response(request.method==="HEAD"?null:html,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"private, no-store","x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"no-referrer","x-robots-tag":"noindex,nofollow","content-security-policy":"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});
}

export {collect,record,expire,render};
