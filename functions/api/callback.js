import {configuredOrigin,reply} from './auth.js';
const clearCookie='__Host-decap_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
export async function onRequestGet({request,env}){
 const origin=configuredOrigin(env),url=new URL(request.url);
 if(!origin||!env.GITHUB_CLIENT_ID||!env.GITHUB_CLIENT_SECRET)return reply('Editor login is not configured.',503);
 if(url.origin!==origin)return reply('Incorrect login domain.',403);
 const state=url.searchParams.get('state');
 const cookie=request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-decap_state='))?.slice('__Host-decap_state='.length);
 if(!state||!cookie||state!==cookie)return reply('Login expired or could not be verified. Close this window and sign in again.',403);
 const fail=(message,status=400)=>{const r=reply(message,status);r.headers.set('Set-Cookie',clearCookie);return r;};
 if(url.searchParams.has('error'))return fail('GitHub authorization was cancelled. You can close this window.');
 const code=url.searchParams.get('code');if(!code)return fail('GitHub did not return a login code.');
 try{
  const res=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json','User-Agent':'PrimalReset-CMS'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code,redirect_uri:origin+'/api/callback'}),signal:AbortSignal.timeout(15000)});
  const token=await res.json();
  if(!res.ok||!token.access_token)return fail('GitHub login could not be completed. Please try again.',502);
  // A token is only sent to the CMS window on the configured origin after its handshake.
  const encoded=JSON.stringify('authorization:github:success:'+JSON.stringify({token:token.access_token,provider:'github'})).replace(/</g,'\\u003c');
  const safeOrigin=JSON.stringify(origin).replace(/</g,'\\u003c');
  const html=`<!doctype html><meta charset="utf-8"><title>Signing in</title><p>Completing your sign-in. You may close this window once the editor opens.</p><script>const target=${safeOrigin};const openerWindow=window.opener;if(openerWindow){window.addEventListener('message',function receive(event){if(event.origin!==target||event.source!==openerWindow||event.data!=='authorizing:github')return;openerWindow.postMessage(${encoded},target);window.removeEventListener('message',receive);window.close();});openerWindow.postMessage('authorizing:github',target);}</script>`;
  return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Set-Cookie':clearCookie,'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'"}});
 }catch{return fail('GitHub is temporarily unavailable. Close this window and try again.',502);}
}
