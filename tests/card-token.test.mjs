import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/booking/card-token.js';
const env={BOOKING_ENABLED:'true',BOOKING_DB:{},PAYPAL_ENV:'sandbox',PAYPAL_CLIENT_ID:'example-client',PAYPAL_CLIENT_SECRET:'example-secret',PAYPAL_WEBHOOK_ID:'webhook',BOOKING_TERMS_URL:'https://example.com/sandbox-terms/'};
test('card token endpoint requests only a browser-safe SDK token, never a full-scope token',async t=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
 globalThis.fetch=async (url,options)=>{assert.equal(url,'https://api-m.sandbox.paypal.com/v1/oauth2/token');assert.equal(options.body,'grant_type=client_credentials&response_type=client_token&intent=sdk_init');return Response.json({access_token:'browser-safe-example',refresh_token:'must-not-return',scope:'must-not-return'});};
 const response=await onRequestPost({env,request:new Request('https://example.com/api/booking/card-token',{method:'POST',headers:{Origin:'https://example.com'}})});
 assert.deepEqual(await response.json(),{clientToken:'browser-safe-example',mode:'sandbox'});assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('card tokens are blocked cross-origin and when checkout is disconnected',async()=>{
 const request=new Request('https://example.com/api/booking/card-token',{method:'POST',headers:{Origin:'https://other.example'}});
 assert.equal((await onRequestPost({env,request})).status,403);
 assert.equal((await onRequestPost({env:{},request})).status,503);
});
