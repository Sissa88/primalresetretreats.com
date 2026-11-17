import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './sqlite-helper.mjs';
import {reserve,quote} from '../functions/_lib/booking.js';
import {sendBookingConfirmation,emailEnabled} from '../functions/_lib/confirmation-email.js';
import {renderConfirmation} from '../functions/_lib/confirmation-template.js';
import config from '../functions/_lib/email-config.js';
async function paid(t){const db=await database(t),id=crypto.randomUUID();await reserve(db,id,quote('private','OPENGATEHOSTEL'));await db.prepare('INSERT INTO booking_guests(booking_id,full_name,email) VALUES(?,?,?)').bind(id,'Alex Guest','guest@example.com').run();await db.prepare("UPDATE bookings SET status='paid' WHERE id=?").bind(id).run();return {db,id,env:{BOOKING_DB:db,PAYPAL_ENV:'live',BOOKING_EMAIL_ENABLED:'true',RESEND_API_KEY:'test-key',BOOKING_EMAIL_FROM:'Primal Reset Retreats <bookings@mail.example.com>'}};}
test('confirmation uses verified amounts, safe guest text and approved travel guidance',()=>{
 const b={id:'booking-ref',status:'paid',room_id:'private',base_cents:585000,discount_cents:175500,total_cents:409500,deposit_cents:204750,balance_cents:204750,promo_code:'OPENGATEHOSTEL'};
 const mail=renderConfirmation(b,{full_name:'<script>alert(1)</script>'},config);
 assert.match(mail.text,/\$2,047\.50/);assert.match(mail.text,/February 1, 2027/);assert.match(mail.text,/written confirmation/);assert.match(mail.text,/at least 10 guests/);
 assert.match(mail.html,/&lt;script&gt;/);assert.doesNotMatch(mail.html,/<script>/);assert.match(mail.html,/booking-terms/);
 assert.throws(()=>renderConfirmation({...b,status:'held'},{full_name:'Guest'},config));assert.throws(()=>renderConfirmation({...b,balance_cents:1},{full_name:'Guest'},config));
});
test('email remains disabled without configuration and in Sandbox; unpaid bookings never send',async t=>{
 assert.equal(emailEnabled({}),false);assert.equal(emailEnabled({BOOKING_EMAIL_ENABLED:'true',RESEND_API_KEY:'key',BOOKING_EMAIL_FROM:'from',PAYPAL_ENV:'sandbox'}),false);
 assert.deepEqual(await sendBookingConfirmation({},'id'),{status:'disabled'});
 const {db,id,env}=await paid(t);await db.prepare("UPDATE bookings SET status='held' WHERE id=?").bind(id).run();assert.deepEqual(await sendBookingConfirmation(env,id),{status:'not-paid'});
});
test('checkout and webhook attempts send once to the guest and preserve the completed payment',async t=>{
 const {db,id,env}=await paid(t),old=globalThis.fetch;t.after(()=>globalThis.fetch=old);let sends=0;
 globalThis.fetch=async(url,options)=>{sends++;assert.equal(url,'https://api.resend.com/emails');const body=JSON.parse(options.body);assert.deepEqual(body.to,['guest@example.com']);assert.match(body.reply_to,/@primalresetretreats\.com$/);assert.match(body.text,/\$2,047\.50/);assert.equal(options.headers['Idempotency-Key'],'booking-confirmation-v1/'+id);return Response.json({id:'provider-message'});};
 await Promise.allSettled([sendBookingConfirmation(env,id),sendBookingConfirmation(env,id),sendBookingConfirmation(env,id)]);
 await sendBookingConfirmation(env,id);assert.equal(sends,1);assert.equal((await db.prepare('SELECT status FROM booking_confirmation_emails WHERE booking_id=?').bind(id).first()).status,'sent');assert.equal((await db.prepare('SELECT status FROM bookings WHERE id=?').bind(id).first()).status,'paid');
});
test('retry uses exactly the same payload and key after provider failure',async t=>{
 const {db,id,env}=await paid(t),old=globalThis.fetch;t.after(()=>globalThis.fetch=old);const requests=[];
 globalThis.fetch=async(url,options)=>{requests.push({body:options.body,key:options.headers['Idempotency-Key']});return requests.length===1?Response.json({error:'rate limit'},{status:429}):Response.json({id:'retried-message'});};
 await assert.rejects(()=>sendBookingConfirmation(env,id));assert.equal((await db.prepare('SELECT status FROM bookings WHERE id=?').bind(id).first()).status,'paid');await sendBookingConfirmation(env,id);assert.deepEqual(requests[0],requests[1]);
});
test('late retry is held for manual review rather than risking a duplicate email',async t=>{
 const {db,id,env}=await paid(t),old=globalThis.fetch;t.after(()=>globalThis.fetch=old);let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({error:'error'},{status:500});};
 await assert.rejects(()=>sendBookingConfirmation(env,id));await db.prepare('UPDATE booking_confirmation_emails SET created_at=unixepoch()-90000 WHERE booking_id=?').bind(id).run();await assert.rejects(()=>sendBookingConfirmation(env,id));assert.equal(calls,1);assert.equal((await db.prepare('SELECT status FROM booking_confirmation_emails WHERE booking_id=?').bind(id).first()).status,'review');
});
