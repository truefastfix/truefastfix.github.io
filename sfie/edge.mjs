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
  const categories=["normal","wordpress_probe","sqlmap","nuclei","nikto","content_scanner","path_traversal","sqli_probe","xss_probe","environment_probe","source_control_probe","config_probe","phpmyadmin_probe","backup_probe","shell_probe","suspicious_post","honeypot_decoy","other"];
  const params=new URL(request.url).searchParams;
  const requested=params.get("category")||"all";
  const category=categories.includes(requested)||requested==="suspicious"?requested:"all";
  const range=params.get("range")==="24h"?"24h":"7d";
  const since=new Date(Date.now()-(range==="24h"?0:6)*86400000).toISOString().slice(0,10);
  const dimensions=[["label","Detection category"],["browser","Client-reported browser family"],["protocol","HTTP protocol"],["tls","TLS version"],["cipher_family","TLS cipher family"],["bot","Provider bot classification"],["fetch_mode","Client-reported fetch mode"]];
  const where=" WHERE day >= ?"+(category==="all"?"":category==="suspicious"?" AND label <> ?":" AND label = ?");
  const args=category==="all"?[since]:[since,category==="suspicious"?"normal":category];
  const summaries=await db.batch(dimensions.map(([col])=>db.prepare("SELECT "+col+" AS label,SUM(n) AS n FROM sfie_daily_v1"+where+" GROUP BY "+col+" ORDER BY n DESC LIMIT 20").bind(...args)));
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const titleFor=v=>v==="all"?"All categories":v==="suspicious"?"Suspicious categories only":v.replace(/_/g," ");
  const options=["all","suspicious",...categories].map(v=>'<option value="'+esc(v)+'"'+(v===category?' selected':'')+'>'+esc(titleFor(v))+'</option>').join("");
  const link=v=>"/intelligence?"+new URLSearchParams({category:v,range}).toString();
  const cards=dimensions.map(([col,title],i)=>{
    const rows=summaries[i].results||[];
    return "<section><h2>"+esc(title)+"</h2>"+(rows.length?rows.map(r=>"<p>"+(col==="label"&&categories.includes(r.label)?'<a href="'+esc(link(r.label))+'">'+esc(titleFor(r.label))+'</a>':esc(r.label))+" <strong>"+esc(Number(r.n))+"</strong></p>").join(""):'<p class="muted">No observations for this selection.</p>')+"</section>";
  }).join("");
  const html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Skyfall Intelligence</title><style>*{box-sizing:border-box}body{background:#080e1a;color:#e7f2ff;font:16px system-ui;margin:auto;max-width:980px;padding:18px}a{color:#7de5ff}h1{font-size:1.7rem}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:12px}section,form{border:1px solid #30445b;border-radius:12px;background:#101e31;padding:16px}h2{font-size:1rem;color:#8fdbff}p{overflow-wrap:anywhere}strong{float:right;color:#a6ffd9}form{display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin:16px 0}label{display:block;flex:1;min-width:180px}select,button,.reset{display:block;width:100%;min-height:46px;background:#172b43;color:#fff;border:1px solid #52749a;border-radius:8px;padding:10px;font:inherit;margin-top:6px}button{background:#11638a;width:auto;cursor:pointer}.reset{width:auto;text-decoration:none}.muted{color:#a4b6cb}@media(max-width:520px){label{flex-basis:100%}button,.reset{flex:1;text-align:center}}</style><a href="/">← Threat Monitor</a> · <a href="'+esc(link(category))+'">Refresh</a><h1>Skyfall Fingerprint Intelligence</h1><p>Observation only · 10% sample of normal requests; suspicious heuristic labels unsampled. Counts are observations, not unique visitors. Accuracy not yet measured.</p><form method="get" action="/intelligence"><label>Detection category<select name="category">'+options+'</select></label><label>Date range<select name="range"><option value="7d"'+(range==="7d"?" selected":"")+'>Last seven UTC calendar days</option><option value="24h"'+(range==="24h"?" selected":"")+'>Today (UTC)</option></select></label><button type="submit">Apply filters</button><a class="reset" href="/intelligence">Reset</a></form><p class="muted">Showing: '+esc(titleFor(category))+'</p><main>'+cards+'</main></html>';
  return new Response(request.method==="HEAD"?null:html,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"private, no-store","x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"no-referrer","x-robots-tag":"noindex,nofollow","content-security-policy":"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
}

export {collect,record,expire,render};
