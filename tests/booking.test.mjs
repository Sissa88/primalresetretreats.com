import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {quote,reserve,availability,ready,validCapture} from '../functions/_lib/booking.js';
import {onRequestPost as create} from '../functions/api/booking/create.js';
import {onRequestPost as capture} from '../functions/api/booking/capture.js';
import {onRequestPost as webhook} from '../functions/api/booking/webhook.js';
function python(payload){return new Promise((resolve,reject)=>{
 const child=spawn('python3',['-c',`import sqlite3,json,sys
p=json.load(sys.stdin)
c=sqlite3.connect(p['file'],timeout=10)
c.row_factory=sqlite3.Row
if 'schema' in p:c.executescript(p['schema']);c.commit();print('{}')
else:
 cur=c.execute(p['sql'],p['args'])
 rows=[dict(r) for r in cur.fetchall()]
 changes=c.execute('SELECT changes()').fetchone()[0]
 c.commit()
 print(json.dumps({'results':rows,'meta':{'changes':changes}}))`]);
 let out='',err='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);child.on('close',code=>code?reject(Error(err)):resolve(JSON.parse(out)));child.stdin.end(JSON.stringify(payload));
});}
async function database(t){const dir=await mkdtemp(join(tmpdir(),'retreat-booking-')),file=join(dir,'test.sqlite');t.after(()=>rm(dir,{recursive:true,force:true}));await python({file,schema:await readFile(new URL('../migrations/0001_bookings.sql',import.meta.url),'utf8')});return {prepare(sql){let args=[];const statement={bind(...a){args=a;return statement;},run(){return python({file,sql,args});},all(){return python({file,sql,args});},async first(){return (await python({file,sql,args})).results[0]||null;}};return statement;}};}
const env={BOOKING_ENABLED:'true',PAYPAL_ENV:'sandbox',PAYPAL_CLIENT_ID:'test-id',PAYPAL_CLIENT_SECRET:'test-secret',PAYPAL_WEBHOOK_ID:'test-webhook',BOOKING_TERMS_URL:'https://example.com/terms'};
test('server ignores customer price claims, calculates discounted deposit and fails closed',async()=>{
 assert.equal(quote('private','OPENGATEHOSTEL').deposit,204750);assert.equal(quote('shared').deposit,260000);
 assert.throws(()=>quote('private','INVALID'));assert.throws(()=>quote('other'));
 assert.equal(ready({...env,BOOKING_DB:{}}),true);assert.equal(ready({...env,BOOKING_DB:{},PAYPAL_CLIENT_SECRET:''}),false);
 const response=await create({request:new Request('https://example.com/api/booking/create',{method:'POST'}),env:{}});assert.equal(response.status,503);
});
test('atomic allocation permits only 5 private and 10 shared reservations even concurrently',async t=>{
 const db=await database(t);
 const privateResults=await Promise.all(Array.from({length:9},(_,i)=>reserve(db,'private-'+i,quote('private'))));
 assert.equal(privateResults.filter(Boolean).length,5);
 const sharedResults=await Promise.all(Array.from({length:14},(_,i)=>reserve(db,'shared-'+i,quote('shared','OPENGATEHOSTEL'))));
 assert.equal(sharedResults.filter(Boolean).length,10);
 assert.deepEqual(await availability(db),{remaining:0,rooms:{private:0,shared:0}});
});
test('expiry frees held places but never frees paid or processing places',async t=>{
 const db=await database(t);
 for(let i=0;i<5;i++)assert.equal(await reserve(db,'p'+i,quote('private')),true);
 await db.prepare("UPDATE bookings SET expires_at=0 WHERE id='p0'").run();assert.equal(await reserve(db,'new',quote('private')),true);
 await db.prepare("UPDATE bookings SET status='processing',expires_at=0 WHERE id='p1'").run();
 await db.prepare("UPDATE bookings SET status='paid',expires_at=0 WHERE id='p2'").run();
 assert.equal(await reserve(db,'overflow',quote('private')),false);
});
test('deposit confirmation requires correct USD amount and completed capture',()=>{
 const b={deposit_cents:204750};const c={id:'CAPTURE',status:'COMPLETED',amount:{currency_code:'USD',value:'2047.50'}};
 assert.equal(validCapture(b,c),true);assert.equal(validCapture(b,{...c,status:'PENDING'}),false);
 assert.equal(validCapture(b,{...c,amount:{currency_code:'USD',value:'1.00'}}),false);
 assert.equal(validCapture(b,{...c,amount:{currency_code:'EUR',value:'2047.50'}}),false);
});
test('paid booking retries return the original booking without another PayPal call',async t=>{
 const db=await database(t),id=crypto.randomUUID();await reserve(db,id,quote('private'));
 await db.prepare("UPDATE bookings SET status='paid' WHERE id=?").bind(id).run();
 const result=await capture({env:{...env,BOOKING_DB:db},request:new Request('https://example.com/api/booking/capture',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify({reference:id})})});
 assert.equal(result.status,200);const body=await result.json();assert.equal(body.status,'paid');assert.equal(body.balance,292500);assert.equal(body.balanceDue,'February 1, 2027');
});
test('cross-origin order creation is blocked before an inventory hold is made',async()=>{
 const result=await create({env:{...env,BOOKING_DB:{}},request:new Request('https://example.com/api/booking/create',{method:'POST',headers:{Origin:'https://other.example'}})});assert.equal(result.status,403);
});
test('unverified webhook cannot mark any booking paid',async t=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);let queries=0;
 globalThis.fetch=async url=>Response.json(String(url).includes('oauth2')?{access_token:'fake'}:{verification_status:'FAILURE'});
 const result=await webhook({env:{...env,BOOKING_DB:{prepare(){queries++;throw Error('must not query');}}},request:new Request('https://example.com/api/booking/webhook',{method:'POST',body:JSON.stringify({event_type:'PAYMENT.CAPTURE.COMPLETED',resource:{id:'fake'}})})});assert.equal(result.status,400);assert.equal(queries,0);
});
test('unapproved PayPal order stays expirable and does not become a permanent hold',async t=>{
 const db=await database(t),id=crypto.randomUUID();await reserve(db,id,quote('private'));
 await db.prepare('UPDATE bookings SET paypal_order_id=? WHERE id=?').bind('ORDER-PENDING',id).run();
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
 globalThis.fetch=async url=>Response.json(String(url).includes('oauth2')?{access_token:'fake'}:{id:'ORDER-PENDING',status:'CREATED'});
 const result=await capture({env:{...env,BOOKING_DB:db},request:new Request('https://example.com/api/booking/capture',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify({reference:id})})});
 assert.equal(result.status,409);assert.equal((await db.prepare('SELECT status FROM bookings WHERE id=?').bind(id).first()).status,'held');
});
test('PayPal capture of the exact deposit confirms once and keeps the balance unchanged',async t=>{
 const db=await database(t),id=crypto.randomUUID();await reserve(db,id,quote('shared','OPENGATEHOSTEL'));
 await db.prepare('UPDATE bookings SET paypal_order_id=? WHERE id=?').bind('ORDER-APPROVED',id).run();
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);let captures=0;
 globalThis.fetch=async (url,options)=>{
  if(String(url).includes('oauth2'))return Response.json({access_token:'fake'});
  if(String(url).endsWith('/capture')){captures++;assert.equal(options.headers['PayPal-Request-Id'],id+'-capture');return Response.json({status:'COMPLETED',purchase_units:[{reference_id:id,payments:{captures:[{id:'CAPTURE-ONE',status:'COMPLETED',amount:{currency_code:'USD',value:'1820.00'}}]}}]});}
  return Response.json({id:'ORDER-APPROVED',status:'APPROVED'});
 };
 const request=()=>new Request('https://example.com/api/booking/capture',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify({reference:id})});
 const first=await capture({env:{...env,BOOKING_DB:db},request:request()});const body=await first.json();
 assert.equal(body.status,'paid');assert.equal(body.deposit,182000);assert.equal(body.balance,182000);
 const retry=await capture({env:{...env,BOOKING_DB:db},request:request()});assert.equal((await retry.json()).status,'paid');assert.equal(captures,1);
 assert.equal((await availability(db)).remaining,14);
});
