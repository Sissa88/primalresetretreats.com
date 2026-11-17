import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/booking/verify.js';
const id='e192e815-ea01-45ff-8735-1ba6448bc3bc';
const booking={id,deposit_cents:260000,paypal_order_id:'ORDER',paypal_capture_id:'CAPTURE'};
const env={BOOKING_ENABLED:'true',PAYPAL_ENV:'sandbox',PAYPAL_CLIENT_ID:'test',PAYPAL_CLIENT_SECRET:'secret',PAYPAL_WEBHOOK_ID:'webhook',BOOKING_TERMS_URL:'https://example.com/terms',BOOKING_DB:{prepare(){return {bind(){return this;},first:async()=>booking};}}};
const request=()=>new Request('https://example.com/api/booking/verify',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify({reference:id})});
test('read-only verification identifies merchant while excluding buyer data and credentials',async t=>{
 const old=globalThis.fetch;t.after(()=>globalThis.fetch=old);
 globalThis.fetch=async(url,options)=>{
  if(String(url).includes('oauth2'))return Response.json({access_token:'private-token'});
  assert.equal(options.method,'GET');assert.equal(String(url).endsWith('/v2/checkout/orders/ORDER'),true);
  return Response.json({id:'ORDER',payer:{email_address:'private-buyer@example.com'},purchase_units:[{reference_id:id,payee:{email_address:'merchant@example.com',merchant_id:'MERCHANT'},payments:{captures:[{id:'CAPTURE',status:'COMPLETED',amount:{currency_code:'USD',value:'2600.00'}}]}}]});
 };
 const response=await onRequestPost({env,request:request()});const body=await response.json();assert.equal(body.verified,true);assert.equal(body.merchant.email,'merchant@example.com');assert.equal(body.mode,'sandbox');assert.doesNotMatch(JSON.stringify(body),/private-buyer|private-token|secret/);
});
test('receipt lookup rejects missing reference and cross-origin access',async()=>{
 const response=await onRequestPost({env,request:new Request('https://example.com/api/booking/verify',{method:'POST',headers:{Origin:'https://other.example'}})});assert.equal(response.status,403);
});
