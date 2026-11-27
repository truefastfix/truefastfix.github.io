import {test} from "node:test";
import assert from "node:assert/strict";
import {collect,record,expire,render} from "./edge.mjs";

test("collects only allowed coarse fields and treats missing as unknown",()=>{
  const req={headers:new Headers({"user-agent":"Mozilla/5.0 Chrome/140.0 Safari/537.36","sec-fetch-mode":"navigate",cookie:"secret",authorization:"Bearer secret"}),cf:{httpProtocol:"HTTP/3",tlsVersion:"TLSv1.3",tlsCipher:"AEAD-AES128-GCM-SHA256"}};
  const a=collect(req,"normal",0);
  assert.equal(a.browser,"chromium"); assert.equal(a.protocol,"HTTP/3"); assert.equal(a.tls,"TLSv1.3"); assert.equal(a.cipherFamily,"aes128"); assert.equal(a.bot,"unavailable"); assert.equal(a.fetchMode,"navigate");
  assert.equal(JSON.stringify(a).includes("secret"),false);
  const b=collect({headers:new Headers()},"<script>",0);
  assert.equal(b.label,"other"); assert.equal(b.tls,"unknown"); assert.equal(b.browser,"unknown");
});
test("suspicious aggregation and expiry use bound parameters",async()=>{
  const writes=[]; const db={prepare:sql=>({bind:(...args)=>({run:async()=>writes.push({sql,args})})})};
  await record({headers:new Headers()},db,"wordpress_probe");
  await expire(db,7*86400000);
  assert.equal(writes.length,2); assert.equal(writes[0].args.length,8); assert.equal(writes[1].args[0],"1970-01-01");
});
test("render escapes data and uses non-cacheable headers",async()=>{
  const db={prepare:()=>({bind:()=>({})}),batch:async s=>s.map(()=>({results:[{label:"<script>",n:3}]}))};
  const response=await render(db,new Request("https://example.test/intelligence"));
  const html=await response.text();
  assert.ok(html.includes("&lt;script&gt;")); assert.ok(!html.includes("<script>")); assert.match(response.headers.get("cache-control"),/no-store/);
});
