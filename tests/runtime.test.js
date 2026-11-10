import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare, Log, LogLevel } from 'miniflare';
// Installed workerd supports through 2026-08-06; deployed compatibility is verified separately.
const origin='https://skyfall.test';
let mf, db, mailCalls=0, aiCalls=0, captured=[], delayAI=false, rejectMail=false, malformedMail=false, failAI=false, uncertainMail=false;
let releaseAI, aiStarted;
const validAnswer={message:'Yes, we can explore that. Who will use your app?',brief:'',memory:'Visitor wants an app.',next:'offer'};
let answer=validAnswer;
before(async()=>{
  mf=new Miniflare({
    log:new Log(LogLevel.ERROR),
    workers:[{
      name:'app',modules:true,modulesRules:[{type:'ESModule',include:['**/*.js']}],scriptPath:'assistant/worker.js',compatibilityDate:'2026-08-06',
      durableObjects:{SESSIONS:{className:'Session',useSQLite:true},GUARD:{className:'Guard',useSQLite:true}},
      d1Databases:{DB:'runtime-test'},
      bindings:{ALLOWED_ORIGINS:origin,AI_ENABLED:'true',OPENAI_API_KEY:'runtime-test-not-a-real-key',TURNSTILE_SECRET:'runtime-test',RATE_SALT:'runtime-test',WEB3_PROJECT_KEY:'test-project-route',WEB3_SUPPORT_KEY:'test-support-route'},
      outboundService:async req=>{
        const url=new URL(req.url);
        if(url.hostname==='challenges.cloudflare.com'){
          const body=await req.formData();const token=body.get('response');
          return Response.json({success:token!=='bad',hostname:'skyfall.test',action:token==='contact'?'contact':'session'});
        }
        if(url.hostname==='api.openai.com'){
          aiCalls++;const payload=await req.json();captured.push(payload);if(failAI)return Response.json({error:{message:'provider unavailable'}},{status:503});
          if(delayAI){aiStarted?.();await new Promise(resolve=>{releaseAI=resolve;});}
          return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(answer)}]}],usage:{input_tokens:1500,output_tokens:150}});
        }
        if(url.hostname==='api.web3forms.com'){
          mailCalls++;captured.push(await req.json());if(uncertainMail)throw Error('simulated connection loss');
          if(malformedMail)return Response.json({});
          return Response.json({success:!rejectMail},{status:rejectMail?400:200});
        }
        throw Error(`Unexpected outbound request: ${url.hostname}`);
      }
    },{
      name:'driver',modules:true,compatibilityDate:'2026-08-06',
      durableObjects:{GUARD:{className:'Guard',scriptName:'app',useSQLite:true}},
      script:`export default {async fetch(r,e){const b=await r.json();const d=e.GUARD.getByName(b.name);return Response.json({value:await d[b.method](...b.args)??null});}}`
    }]
  });
  db=await mf.getD1Database('DB','app');
  await db.exec((await readFile('assistant/schema.sql','utf8')).replaceAll('\n',' '));
});
after(async()=>{await mf?.dispose();});
let ip=1;
async function call(path,body={},s={},headers={}){
  return mf.dispatchFetch(origin+'/api/skyfall/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':s.ip||`192.0.2.${ip++}`,...(s.cookie?{Cookie:s.cookie,'X-Skyfall-CSRF':s.csrf}:{}),...headers},body:JSON.stringify(body)});
}
async function session(){const r=await call('session',{token:'session'});assert.equal(r.status,200,await r.clone().text());const b=await r.json();return {cookie:r.headers.get('set-cookie').split(';')[0],csrf:b.csrf,ip:`198.51.100.${ip++}`};}
async function guard(name,method,...args){const w=await mf.getWorker('driver');return (await (await w.fetch('http://driver',{method:'POST',body:JSON.stringify({name,method,args})})).json()).value;}

test('cross-origin, CSRF, invalid challenge and unknown session requests are rejected',async()=>{
  assert.equal((await call('session',{token:'session'},{},{Origin:'https://evil.test'})).status,403);
  assert.equal((await call('session',{token:'bad'})).status,403);
  assert.equal((await call('chat',{id:crypto.randomUUID(),question:'Hello'})).status,401);
  const s=await session();assert.equal((await call('chat',{id:crypto.randomUUID(),question:'Hello'},s,{'X-Skyfall-CSRF':'wrong'})).status,403);
});
test('chat uses real Worker RPC and storage, replays requests without rebilling, isolates sessions',async()=>{
  const a=await session(),b=await session();const before=aiCalls;const body={id:crypto.randomUUID(),question:'Can you build an app?'};
  const r=await call('chat',body,a);assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).mode,'offer');
  assert.equal((await call('chat',body,a)).status,200);assert.equal(aiCalls,before+1);
  const changed=await call('chat',{...body,question:'Different question'},a);assert.equal(changed.status,409);
  await call('brief',{brief:'A private project specification'},a);
  const rb=await call('session',{token:'session'},b);assert.equal((await rb.json()).brief,'');
  const ra=await call('session',{token:'session'},a);assert.equal((await ra.json()).brief,'A private project specification');
  const payload=captured.find(x=>x.model);assert.equal(payload.store,false);assert.equal(payload.tools,undefined);assert.equal(payload.model,'gpt-5.4-mini-2026-03-17');
});
test('simultaneous budget reservations cannot exceed cap, settlement is idempotent',async()=>{
  const name='concurrent-budget';
  const results=await Promise.all(Array.from({length:25},(_,i)=>guard(name,'reserve',`r${i}`,250000)));
  assert.equal(results.filter(Boolean).length,20);
  await guard(name,'settle','r0',100000);await guard(name,'settle','r0',100000);
  assert.equal(await guard(name,'reserve','new',150000),true);assert.equal(await guard(name,'reserve','over',1),false);
});
test('concurrent session requests reject overlap; reset during inference prevents resurrection',async()=>{
  const s=await session();delayAI=true;const started=new Promise(resolve=>{aiStarted=resolve;});
  const first=call('chat',{id:crypto.randomUUID(),question:'Help design an app'},s);await started;
  assert.equal((await call('chat',{id:crypto.randomUUID(),question:'Another question'},s)).status,409);
  assert.equal((await call('reset',{},s)).status,200);releaseAI();
  assert.equal((await first).status,409);delayAI=false;aiStarted=null;
  assert.equal((await call('brief',{brief:'Should fail'},s)).status,401);
});
test('review decline clears session and sends no email',async()=>{
  const s=await session();await call('brief',{brief:'Reviewed design'},s);const n=mailCalls;
  answer={message:'No inquiry sent.',brief:'',memory:'',next:'reset'};
  const r=await call('chat',{id:crypto.randomUUID(),question:'No thanks, do not submit'},s);assert.equal((await r.json()).reset,true);
  assert.equal((await call('brief',{brief:'Old session'},s)).status,401);assert.equal(mailCalls,n);answer=validAnswer;
});
test('contact prepares reviewed brief and public routing packet without backend forwarding',async()=>{
  const s=await session();await call('brief',{brief:'Confirmed requirements: build a simple booking website.'},s);
  const before=mailCalls;const b={id:crypto.randomUUID(),token:'contact',name:'Runtime visitor',email:'visitor@example.com',message:'Please discuss this plan.',includeBrief:true,mode:'project'};
  const r=await call('contact',b,s);assert.equal(r.status,200,await r.clone().text());const data=await r.json();assert.equal(data.status,'prepared');
  assert.equal(data.packet.access_key,'test-project-route');assert.match(data.packet.project_brief,/booking/);assert.equal(data.packet.project_reference,data.reference);
  assert.equal(mailCalls,before);assert.equal((await call('contact',b,s)).status,409);
  assert.equal((await call('delivery',{id:b.id,outcome:'accepted'},s)).status,200);
  assert.equal((await call('contact',b,s)).status,200);
  assert.equal((await call('contact',{...b,message:'Different unsent content'},s)).status,409);
  const support=await call('contact',{...b,id:crypto.randomUUID(),mode:'support'},s);assert.equal(support.status,200);
  const last=await support.json();assert.equal(last.packet.access_key,'test-support-route');assert.equal(last.packet.project_brief,'No design brief included.');
});
test('client delivery reports are explicitly unverified and isolated to their session',async()=>{
  const s=await session(),other=await session();const id=crypto.randomUUID();
  await call('contact',{id,token:'contact',name:'Evidence test',email:'test@example.com',message:'Test inquiry',mode:'project'},s);
  assert.equal((await call('delivery',{id,outcome:'accepted'},other)).status,404);
  assert.equal((await call('delivery',{id,outcome:'provider_verified'},s)).status,400);
  assert.equal((await call('delivery',{id,outcome:'accepted'},s)).status,200);
  await call('delivery',{id,outcome:'unknown'},s);
  const row=await db.prepare("SELECT delivery_status,delivery_evidence FROM inquiries WHERE name='Evidence test'").first();
  assert.equal(row.delivery_status,'accepted');assert.equal(row.delivery_evidence,'browser_report');
});
test('per-address rate limit rejects a burst',async()=>{
  const s=await session();let rejected=false;
  for(let i=0;i<14;i++){const r=await call('brief',{brief:'Test'},s);if(r.status===429)rejected=true;}
  assert.equal(rejected,true);
});

test('provider outage fails honestly without losing the saved brief',async()=>{
 const s=await session();await call('brief',{brief:'Preserve this confirmed project.'},s);failAI=true;
 const r=await call('chat',{id:crypto.randomUUID(),question:'Help me refine it'},s);assert.equal(r.status,502);assert.match((await r.json()).error,/unavailable/);failAI=false;
 const reload=await call('session',{token:'session'},s);assert.equal((await reload.json()).brief,'Preserve this confirmed project.');
});
test('uncertain browser email delivery stays recoverable and cannot auto-resend',async()=>{
 const s=await session();const b={id:crypto.randomUUID(),token:'contact',name:'Uncertain test',email:'test@example.com',message:'Test inquiry',mode:'project'};const before=mailCalls;
 assert.equal((await call('contact',b,s)).status,200);
 assert.equal((await call('delivery',{id:b.id,outcome:'unknown'},s)).status,200);
 assert.equal((await call('contact',b,s)).status,409);assert.equal(mailCalls,before);
 const row=await db.prepare("SELECT delivery_status FROM inquiries WHERE name='Uncertain test'").first();assert.equal(row.delivery_status,'unknown');
});
