import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './sqlite-helper.mjs';
import {onRequestPost} from '../functions/api/contacts/send.js';
const body=()=>({id:crypto.randomUUID(),kind:'retreat',name:'Guest',email:'guest@example.com',age:'40',country:'Canada',message:'A question about the retreat.',contact_permission:'Yes',_honey:'',_next:'https://malicious.example/not-forwarded'});
const request=data=>new Request('https://example.com/api/contacts/send',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify(data)});
test('same-origin delivery sends JSON to the fixed inbox and confirms only provider acknowledgement',async t=>{
 const db=await database(t),data=body(),old=globalThis.fetch;t.after(()=>globalThis.fetch=old);let sends=0;
 globalThis.fetch=async(url,options)=>{sends++;assert.equal(url,'https://formsubmit.co/ajax/7e6131f9762722c6f31ce70aa2fbd74b');assert.equal(options.headers['Content-Type'],'application/json');assert.equal(options.headers.Origin,'https://example.com');const sent=JSON.parse(options.body);assert.equal(sent.message,data.message);assert.equal(sent._next,undefined);assert.equal(sent._url,'https://example.com/');return Response.json({success:'true'});};
 const first=await onRequestPost({request:request(data),env:{BOOKING_DB:db}});assert.equal(first.status,200);assert.equal((await first.json()).success,true);
 const retry=await onRequestPost({request:request(data),env:{BOOKING_DB:db}});assert.equal(retry.status,200);assert.equal(sends,1);
 const record=await db.prepare('SELECT * FROM contact_delivery_requests WHERE id=?').bind(data.id).first();assert.equal(record.status,'sent');assert.doesNotMatch(JSON.stringify(record),/A question about|guest@example/);
});
test('uncertain provider timeout never causes an automatic duplicate delivery',async t=>{
 const db=await database(t),data=body(),old=globalThis.fetch;t.after(()=>globalThis.fetch=old);let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Connection interrupted');};
 assert.equal((await onRequestPost({request:request(data),env:{BOOKING_DB:db}})).status,503);
 assert.equal((await onRequestPost({request:request(data),env:{BOOKING_DB:db}})).status,409);assert.equal(calls,1);
});
test('spam trap and invalid contact permission are rejected without any email request',async()=>{
 for(const changes of [{_honey:'bot'},{contact_permission:'No'},{age:'20'}]){const r=await onRequestPost({request:request({...body(),...changes}),env:{BOOKING_DB:{}}});assert.equal(r.status,400);}
});
