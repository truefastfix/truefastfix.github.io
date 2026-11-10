import test from 'node:test';
import assert from 'node:assert/strict';
import { budgetDecision, usageCost, reserveCost, readJSON, contactData, validateAnswer, reviewDecision } from '../assistant/core.js';

test('budget refuses over-allocation, invalid reservations and accounts for pending calls',()=>{
  assert.equal(budgetDecision(4_800_000,190_000,10_000),true);
  assert.equal(budgetDecision(4_800_000,190_000,10_001),false);
  for(const amount of [0,-1,NaN,Infinity,0.5])assert.equal(budgetDecision(0,0,amount),false);
});
test('unknown or malformed provider usage keeps full reservation',()=>{
  for(const value of [null,{}, {input_tokens:-1,output_tokens:0},{input_tokens:2.5,output_tokens:0}])assert.equal(usageCost(value,1234),1234);
  assert.equal(usageCost({input_tokens:1000,output_tokens:100},1234),1200);
  assert.ok(reserveCost({input:'😀'.repeat(1000)})>10000);
});
test('reject malformed and oversized JSON even without Content-Length',async()=>{
  for(const body of ['null','[]','{','"x"'])await assert.rejects(readJSON(new Request('https://x',{method:'POST',headers:{'Content-Type':'application/json'},body})),{status:400});
  await assert.rejects(readJSON(new Request('https://x',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:'a'.repeat(18000)})})),{status:413});
});
test('contact validation refuses header injection and malformed addresses',()=>{
  const c={name:'Visitor',email:'visitor@example.com',message:'Help build an app.',mode:'project',id:crypto.randomUUID()};
  assert.equal(contactData(c).email,c.email);
  for(const patch of [{name:'Visitor\r\nBcc: victim@example.com'},{email:'a@b.com\r\nX: y'},{email:'a@b'},{id:'guessable'},{message:''}])assert.throws(()=>contactData({...c,...patch}));
});
test('reset is gated by review, incomplete brief cannot enter review',()=>{
  const a={message:'Hello',brief:'',memory:'',next:'reset'};
  assert.equal(validateAnswer(a,'qa').next,'qa'); assert.equal(validateAnswer(a,'review').next,'reset');
  assert.equal(validateAnswer({...a,next:'review'},'design').next,'design');
  assert.throws(()=>validateAnswer({...a,next:'send_email'},'review'));
});
test('clear review choices bypass model ambiguity; qualified replies do not',()=>{
  for(const q of ['Yes','Yes, I want to submit this reviewed design.','Sure, send it','Please submit my design'])assert.equal(reviewDecision('review',q),'contact');
  for(const q of ['No','No thanks, do not submit it; return me to the start.'])assert.equal(reviewDecision('review',q),'reset');
  for(const q of ['Maybe','Yes, but do not submit yet','No, I want to change the features','Sure, how does submission work?','Not yet, please revise it','No worries, please send it'])assert.equal(reviewDecision('review',q),null);
  assert.equal(reviewDecision('offer','Yes'),null);
});
