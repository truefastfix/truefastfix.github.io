(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const input = $('#ask-input'), chat = $('[data-conversation]'), experience = $('[data-experience]');
  const modal = $('[data-contact-modal]'), contact = $('[data-contact-form]');
  const status = $('[data-contact-status]'), briefBox = $('[data-brief]'), briefInput = $('#project-brief');
  const notice = $('[data-ai-status]'), submit = $('[data-contact-submit]');
  let config, csrf, sessionPromise, busy = false, mode = 'qa', brief = '', contactMode = 'project', lastFocus;
  let contactId = crypto.randomUUID(), pendingQuestion = null, attach = false, tokenPending = false;
  $('[data-year]').textContent = new Date().getFullYear();
  function message(role, content) {
    const article = document.createElement('article'); article.className = `turn turn-${role}`;
    const label = document.createElement('span'); label.className = 'turn-label'; label.textContent = role === 'user' ? 'You' : 'Skyfall AI';
    const p = document.createElement('p'); p.textContent = content; article.append(label, p); chat.append(article);
    experience.classList.add('is-active'); chat.scrollTop = chat.scrollHeight; return article;
  }
  async function api(path, body, timeout = 55000) {
    const r = await fetch(`/api/skyfall/${path}`, { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json','X-Skyfall-CSRF':csrf || ''}, body:JSON.stringify(body), signal:AbortSignal.timeout(timeout) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { if (r.status === 401) { csrf = null; sessionPromise = null; } throw Error(data.error || 'Service unavailable. Please try again.'); }
    return data;
  }
  const configured = fetch('/api/skyfall/config', {cache:'no-store'}).then(async r => {
    if (!r.ok) throw Error(); const c = await r.json();
    if (!c.sitekey) throw Error(); config = c;
    notice.textContent = c.aiEnabled ? 'AI assistant · No email needed to explore your idea.' : 'AI is currently unavailable. You can still use Contact or Website support.';
    return c;
  }).catch(() => { notice.textContent = 'The assistant is unavailable. Use Contact or the direct email addresses below.'; return null; });
  async function securityToken(action) {
    await configured;
    if (!config?.sitekey) throw Error('Security service unavailable. Please use direct email.');
    if (tokenPending) throw Error('Please finish the current security check.');
    tokenPending = true;
    const target = $('[data-security]'); target.hidden = false;
    let widget;
    try {
      await new Promise((resolve, reject) => {
        if (window.turnstile) return resolve();
        const script = document.createElement('script'); script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true;
        script.onload = resolve; script.onerror = () => reject(Error('Could not load the security check.')); document.head.append(script);
      });
      return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error('Security check timed out. Please try again.')), 90000);
        widget = window.turnstile.render(target, {sitekey:config.sitekey, action, theme:'dark', callback:token => {clearTimeout(timer); resolve(token);}, 'error-callback':() => {clearTimeout(timer); reject(Error('Security check failed. Please try again.'));}, 'expired-callback':() => {clearTimeout(timer); reject(Error('Security check expired. Please try again.'));} });
      });
    } finally { if (widget !== undefined) window.turnstile?.remove(widget); target.hidden = true; tokenPending = false; }
  }
  async function session() {
    if (csrf) return;
    if (!sessionPromise) sessionPromise = (async () => {
      const token = await securityToken('session'); const s = await api('session', {token}); csrf = s.csrf; mode = s.mode; brief = s.brief;
      if (!chat.querySelector('.turn') && s.turns?.length) s.turns.forEach(t => message(t.role, t.content));
      renderBrief();
    })().catch(e => {sessionPromise=null; throw e;});
    return sessionPromise;
  }
  function renderBrief() {
    briefBox.hidden = !brief; briefInput.value = brief;
    $('[data-review-actions]').hidden = mode !== 'review';
    $('[data-include-brief]').hidden = !(attach && brief && contactMode === 'project');
  }
  function openContact(nextMode = 'project', includeBrief = false) {
    lastFocus = document.activeElement; contactMode = nextMode === 'support' ? 'support' : 'project'; attach = includeBrief && !!brief && contactMode === 'project';
    $('[data-contact-title]').textContent = contactMode === 'support' ? 'Website support' : 'Contact Skyfall Creations';
    $('[data-contact-copy]').textContent = attach ? 'Your reviewed project brief will be included with your message.' : 'Send your message to Brian.';
    const address = contactMode === 'support' ? 'support@skyfallcreations.com' : 'skyfall.developer@skyfallcreations.com';
    const link = $('[data-contact-direct]'); link.textContent = `Or email ${address}`; link.href = `mailto:${address}`;
    status.textContent = ''; modal.hidden = false; renderBrief(); $('#contact-name').focus();
  }
  function closeContact() {if (submit.disabled) return; modal.hidden=true; lastFocus?.focus();}
  async function reset(serverCleared = false) {
    if (busy) return;
    try {if (!serverCleared) {await session(); await api('reset', {});} csrf=null; sessionPromise=null; brief=''; mode='qa'; pendingQuestion=null; chat.querySelectorAll('.turn').forEach(n=>n.remove()); experience.classList.remove('is-active'); input.value=''; renderBrief(); input.focus();}
    catch(e) {notice.textContent=e.message;}
  }
  async function ask(question, isRetry = false) {
    if (busy || !question.trim()) return;
    busy = true; input.disabled=true; $('[data-ask-submit]').disabled=true;
    if (!isRetry) pendingQuestion={id:crypto.randomUUID(),question};
    const pending=pendingQuestion;
    let thinking;
    try {
      const c = await configured; if (!c?.aiEnabled) throw Error('The AI assistant is unavailable. Please use Contact to discuss your idea with Brian.');
      await session(); if (!isRetry) message('user',question);
      thinking=message('assistant','Thinking…'); thinking.setAttribute('aria-busy','true');
      const data=await api('chat',pending); thinking.remove(); thinking=null;
      if (data.reset) {busy=false; await reset(true); notice.textContent=data.message; return;}
      mode=data.mode; brief=data.brief; message('assistant',data.message); renderBrief(); pendingQuestion=null; $('[data-retry]').hidden=true;
      if (data.openContact) openContact('project',!!brief);
    } catch(e) {thinking?.remove(); message('assistant',e.message); $('[data-retry]').hidden=!pendingQuestion; input.value=question;}
    finally {busy=false; input.disabled=false; $('[data-ask-submit]').disabled=false; input.focus();}
  }
  $('[data-form]').addEventListener('submit', e=>{e.preventDefault();const q=input.value.trim(); if(q){input.value='';ask(q);}});
  $('[data-retry]').addEventListener('click',()=>{if(pendingQuestion)ask(pendingQuestion.question,true);});
  $('[data-reset]').addEventListener('click',()=>reset());
  $('[data-decline]').addEventListener('click',()=>reset());
  $('[data-submit-design]').addEventListener('click',async()=>{
    if(busy)return;
    try{await api('brief',{brief:briefInput.value});brief=briefInput.value;openContact('project',true);}catch(e){notice.textContent=e.message;}
  });
  $('[data-save-brief]').addEventListener('click',async()=>{
    if(busy)return;
    try{await session();const r=await api('brief',{brief:briefInput.value});brief=r.brief;mode='review';renderBrief();notice.textContent='Brief updated. Would you like to submit this design to Skyfall?';}catch(e){notice.textContent=e.message;}
  });
  $('[data-download]').addEventListener('click',()=>{
    const blob=new Blob([`SKYFALL CREATIONS — PROJECT BRIEF\nPlanning document; scope and pricing require Brian’s confirmation.\n\n${briefInput.value}\n`],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='Skyfall_Project_Brief.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  document.addEventListener('click',e=>{const t=e.target.closest('[data-contact-mode]');if(t){e.preventDefault();openContact(t.dataset.contactMode,false);}if(e.target===modal)closeContact();});
  $('[data-contact-close]').addEventListener('click',closeContact);
  document.addEventListener('keydown',e=>{
    if(modal.hidden)return;if(e.key==='Escape')closeContact();
    if(e.key==='Tab'){const nodes=[...modal.querySelectorAll('button,input,textarea,a[href]')].filter(n=>!n.disabled&&n.offsetParent!==null);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
  contact.addEventListener('submit',async e=>{
    e.preventDefault();if(submit.disabled||!contact.reportValidity())return;
    submit.disabled=true;status.textContent='Preparing your message…';
    try{
      await session();
      if(attach){const r=await api('brief',{brief:briefInput.value});brief=r.brief;}
      const token=await securityToken('contact');const fd=new FormData(contact);
      const data=await api('contact',{id:contactId,name:fd.get('name'),email:fd.get('email'),message:fd.get('message'),botcheck:fd.get('botcheck'),mode:contactMode,includeBrief:attach,token});
      status.textContent=`Email service accepted your message. Reference: ${data.reference}.`;status.className='contact-status is-success';contact.reset();contactId=crypto.randomUUID();attach=false;renderBrief();
    }catch(e){status.textContent=e.message;status.className='contact-status is-error';}
    finally{submit.disabled=false;}
  });
})();
