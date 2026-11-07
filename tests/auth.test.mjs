import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet as auth,configuredOrigin} from '../functions/api/auth.js';
import {onRequestGet as callback} from '../functions/api/callback.js';
const env={SITE_URL:'https://retreat.pages.dev',GITHUB_CLIENT_ID:'test-client',GITHUB_CLIENT_SECRET:'test-secret'};
const context=(url,extra={})=>({env,request:new Request(url,extra)});
test('login requires configuration and exact HTTPS canonical origin',async()=>{
 assert.equal((await auth({env:{},request:new Request(env.SITE_URL+'/api/auth')})).status,503);
 assert.equal((await auth(context('https://preview.pages.dev/api/auth'))).status,403);
 assert.equal(configuredOrigin({SITE_URL:'https://user:pass@example.com'}),null);
 assert.equal(configuredOrigin({SITE_URL:'http://example.com'}),null);
 assert.equal(configuredOrigin({SITE_URL:'https://example.com/admin/'}),null);
});
test('login sets a secure state cookie and minimal public repository scope',async()=>{
 const res=await auth(context(env.SITE_URL+'/api/auth'));assert.equal(res.status,302);
 const target=new URL(res.headers.get('Location'));
 assert.equal(target.origin,'https://github.com');assert.equal(target.searchParams.get('scope'),'public_repo');
 assert.equal(target.searchParams.get('redirect_uri'),env.SITE_URL+'/api/callback');
 assert.match(res.headers.get('Set-Cookie'),/HttpOnly; Secure; SameSite=Lax; Max-Age=600/);
 assert.ok(target.searchParams.get('state').length>=64);
 assert.equal(res.headers.get('Cache-Control'),'no-store');
});
test('callback rejects missing and mismatched state and cancelled authorization',async()=>{
 assert.equal((await callback(context(env.SITE_URL+'/api/callback?code=x'))).status,403);
 assert.equal((await callback(context(env.SITE_URL+'/api/callback?state=a&code=x',{headers:{Cookie:'__Host-decap_state=b'}}))).status,403);
 const cancelled=await callback(context(env.SITE_URL+'/api/callback?state=a&error=access_denied',{headers:{Cookie:'__Host-decap_state=a'}}));
 assert.equal(cancelled.status,400);assert.match(cancelled.headers.get('Set-Cookie'),/Max-Age=0/);
});
test('callback exchanges the code server-side and restricts popup token delivery to its opener',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async(url,options)=>{
   assert.equal(url,'https://github.com/login/oauth/access_token');
   assert.equal(JSON.parse(options.body).client_secret,'test-secret');
   return Response.json({access_token:'test-token',token_type:'bearer'});
  };
  const res=await callback(context(env.SITE_URL+'/api/callback?state=a&code=sample',{headers:{Cookie:'__Host-decap_state=a'}}));
  assert.equal(res.status,200);const html=await res.text();
  assert.match(html,/authorization:github:success:/);assert.match(html,/event.origin!==target/);
  assert.match(html,/event.source!==openerWindow/);assert.match(html,/event.data!=='authorizing:github'/);
  assert.equal(res.headers.get('Cache-Control'),'no-store');assert.match(res.headers.get('Set-Cookie'),/Max-Age=0/);
 }finally{globalThis.fetch=original;}
});
test('upstream OAuth failures are actionable and never expose a secret',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>Response.json({error:'bad_code'},{status:400});
  const res=await callback(context(env.SITE_URL+'/api/callback?state=a&code=sample',{headers:{Cookie:'__Host-decap_state=a'}}));
  assert.equal(res.status,502);assert.doesNotMatch(await res.text(),/test-secret/);
 }finally{globalThis.fetch=original;}
});
