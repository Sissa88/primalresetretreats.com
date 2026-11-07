export function configuredOrigin(env){
 try {
  const url=new URL(env.SITE_URL);
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)return null;
  return url.origin;
 }catch{return null;}
}
export function reply(text,status=400){return new Response(text,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}
export async function onRequestGet({request,env}){
 const origin=configuredOrigin(env);
 if(!origin||!env.GITHUB_CLIENT_ID||!env.GITHUB_CLIENT_SECRET)return reply('Editor login is not configured yet. Follow CLOUDFLARE-SETUP.md to set SITE_URL, GITHUB_CLIENT_ID, and GITHUB_CLIENT_SECRET.',503);
 if(new URL(request.url).origin!==origin)return reply('Open the editor on '+origin+'/admin/ to sign in.',403);
 const state=crypto.randomUUID()+crypto.randomUUID();
 const url=new URL('https://github.com/login/oauth/authorize');
 url.searchParams.set('client_id',env.GITHUB_CLIENT_ID);
 url.searchParams.set('redirect_uri',origin+'/api/callback');
 url.searchParams.set('scope','public_repo');
 url.searchParams.set('state',state);
 return new Response(null,{status:302,headers:{Location:url.href,'Set-Cookie':`__Host-decap_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
