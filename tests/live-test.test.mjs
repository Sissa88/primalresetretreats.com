import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './sqlite-helper.mjs';
import {onRequestPost as liveTest} from '../functions/api/booking/live-test.js';
import {onRequestPost as create} from '../functions/api/booking/create.js';
const env={BOOKING_ENABLED:'true',PAYPAL_ENV:'live',PAYPAL_CLIENT_ID:'test',PAYPAL_CLIENT_SECRET:'test',PAYPAL_WEBHOOK_ID:'test',BOOKING_TERMS_URL:'https://example.com/booking-terms/'};
const request=(body)=>new Request('https://example.com/api/booking/live-test',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify(body)});
test('private live test rejects missing or incorrect bearer token before accessing PayPal',async()=>{
 for(const token of ['', 'wrong'])assert.equal((await liveTest({request:request({token}),env})).status,403);
});
test('public checkout cannot enable $1 pricing with client-controlled test flags',async t=>{
 const db=await database(t),old=globalThis.fetch;t.after(()=>globalThis.fetch=old);let amount;
 globalThis.fetch=async(url,options)=>{if(url.endsWith('/token'))return Response.json({access_token:'mock'});amount=JSON.parse(options.body).purchase_units[0].amount.value;return Response.json({id:'ORDER',links:[{rel:'payer-action',href:'https://www.paypal.com/checkoutnow?token=ORDER'}]});};
 const r=await create({request:request({room:'shared',termsAccepted:true,guest:{name:'Owner',email:'owner@example.com'},liveTest:true,deposit:100}),env:{...env,BOOKING_DB:db}});
 assert.equal(r.status,200);assert.equal(amount,'2600.00');
});
test('server-authorised test charges exactly $1 once, reserves one shared place and has no balance',async t=>{
 const db=await database(t),old=globalThis.fetch;t.after(()=>globalThis.fetch=old);let orders=0;
 globalThis.fetch=async(url,options)=>{if(url.endsWith('/token'))return Response.json({access_token:'mock'});if(options.method==='GET')return Response.json({status:'CREATED',purchase_units:[{custom_id:'003d9a78-1cd0-486d-b6c1-b4f60098b1cd',amount:{currency_code:'USD',value:'1.00'}}]});orders++;const order=JSON.parse(options.body);assert.equal(order.purchase_units[0].amount.value,'1.00');assert.match(order.purchase_units[0].description,/not a retreat booking/);assert.match(order.payment_source.paypal.experience_context.return_url,/live-test\?returned/);return Response.json({id:'TESTORDER',links:[{rel:'payer-action',href:'https://www.paypal.com/checkoutnow?token=TESTORDER'}]});};
 const context=()=>({request:request({room:'shared',termsAccepted:true,guest:{name:'Owner',email:'owner@example.com'}}),env:{...env,BOOKING_DB:db},liveTest:true});
 const first=await create(context());assert.equal(first.status,200);const {reference}=await first.json();const booking=await db.prepare('SELECT * FROM bookings WHERE id=?').bind(reference).first();assert.equal(booking.deposit_cents,100);assert.equal(booking.balance_cents,0);assert.equal(booking.promo_code,'INTERNAL_LIVE_TEST');
 await db.prepare('UPDATE bookings SET expires_at=0 WHERE id=?').bind(reference).run();const resumed=await create(context());assert.equal(resumed.status,200);const retry=await resumed.json();assert.equal(retry.orderID,'TESTORDER');assert.equal(retry.resumed,true);assert.equal(orders,1);await db.prepare("UPDATE bookings SET status='paid' WHERE id=?").bind(reference).run();const paid=await (await create(context())).json();assert.match(paid.approvalURL,/live-test\?returned=1$/);assert.equal(orders,1);
});
test('verified full refund releases only the $1 test place, never a real booking',async t=>{
 const {onRequestPost:webhook}=await import('../functions/api/booking/webhook.js');const {reserve,quote,availability}=await import('../functions/_lib/booking.js');
 const db=await database(t),old=globalThis.fetch;t.after(()=>globalThis.fetch=old);
 await reserve(db,'test-refund',{...quote('shared'),base:100,total:100,deposit:100,balance:0,code:'INTERNAL_LIVE_TEST'});
 await db.prepare("UPDATE bookings SET status='paid',paypal_capture_id='CAPTURETEST' WHERE id='test-refund'").run();
 await reserve(db,'real-booking',quote('shared'));await db.prepare("UPDATE bookings SET status='paid',paypal_capture_id='CAPTUREREAL' WHERE id='real-booking'").run();
 globalThis.fetch=async url=>Response.json(url.endsWith('/token')?{access_token:'mock'}:{verification_status:'SUCCESS'});
 for(const capture of ['CAPTURETEST','CAPTUREREAL']){
 const event={event_type:'PAYMENT.CAPTURE.REFUNDED',resource:{status:'COMPLETED',amount:{currency_code:'USD',value:'1.00'},links:[{rel:'up',href:'https://api.paypal.com/v2/payments/captures/'+capture}]}};
 assert.equal((await webhook({request:request(event),env:{...env,BOOKING_DB:db}})).status,200);
 }
 assert.equal((await db.prepare("SELECT status FROM bookings WHERE id='test-refund'").first()).status,'cancelled');assert.equal((await db.prepare("SELECT status FROM bookings WHERE id='real-booking'").first()).status,'paid');assert.equal((await availability(db)).rooms.shared,9);
});
test('paid owner tests are excluded from customer backfill and retreat confirmation emails',async t=>{
 const {reserve,quote}=await import('../functions/_lib/booking.js');const {syncPaidCustomer}=await import('../functions/_lib/customers.js');const {sendBookingConfirmation}=await import('../functions/_lib/confirmation-email.js');const db=await database(t);
 await reserve(db,'excluded',{...quote('shared'),base:100,total:100,deposit:100,balance:0,code:'INTERNAL_LIVE_TEST'});await db.prepare("UPDATE bookings SET status='paid' WHERE id='excluded'").run();await db.prepare('INSERT INTO booking_guests VALUES(?,?,?)').bind('excluded','Owner','owner@example.com').run();await syncPaidCustomer(db,'excluded');
 assert.equal(await db.prepare('SELECT * FROM customer_contacts').first(),null);assert.deepEqual(await sendBookingConfirmation({...env,BOOKING_DB:db,BOOKING_EMAIL_ENABLED:'true',RESEND_API_KEY:'mock',BOOKING_EMAIL_FROM:'test@example.com'},'excluded'),{status:'test-excluded'});
});
