import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/booking/eligibility.js';
const env={PAYPAL_ENV:'live',PAYPAL_CLIENT_ID:'test',PAYPAL_CLIENT_SECRET:'secret',PAYPAL_WEBHOOK_ID:'webhook',BOOKING_ENABLED:'false',BOOKING_TERMS_URL:'https://example.com/booking-terms/'};
test('eligibility check works while payments are paused and cannot create orders',async t=>{
 const old=globalThis.fetch;t.after(()=>globalThis.fetch=old);const calls=[];
 globalThis.fetch=async (url,options)=>{
  calls.push(String(url));
  if(String(url).includes('oauth2'))return Response.json({access_token:options.body.includes('client_token')?'browser-token':'private-token'});
  assert.equal(options.method,'GET');assert.match(url,/\/v1\/notifications\/webhooks\/webhook$/);
  return Response.json({url:'https://example.com/api/booking/webhook',event_types:[{name:'PAYMENT.CAPTURE.COMPLETED'}]});
 };
 const request=new Request('https://example.com/api/booking/eligibility',{method:'POST',headers:{Origin:'https://example.com'}});
 const response=await onRequestPost({request,env});const result=await response.json();assert.equal(result.clientToken,'browser-token');assert.equal(result.checkoutPaused,true);assert.equal(result.mode,'live');assert.equal(result.webhookRegistered,true);assert.equal(result.connection,true);assert.doesNotMatch(JSON.stringify(result),/private-token|secret/);assert.equal(calls.some(u=>u.includes('/orders')),false);
});
test('eligibility check rejects cross-origin calls',async()=>{
 const request=new Request('https://example.com/api/booking/eligibility',{method:'POST',headers:{Origin:'https://other.example'}});assert.equal((await onRequestPost({request,env})).status,403);
});
