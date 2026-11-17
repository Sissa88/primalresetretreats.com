import {json,ready,originOK,apiBase} from '../../_lib/booking.js';
export async function onRequestPost({request,env}){
 if(!ready(env))return json({error:'Checkout is not connected.'},503);
 if(!originOK(request))return json({error:'Start checkout on our website.'},403);
 try{
  // Only this browser-safe token is returned. Never return a full-scope OAuth token.
  const response=await fetch(apiBase(env)+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+btoa(env.PAYPAL_CLIENT_ID+':'+env.PAYPAL_CLIENT_SECRET),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials&response_type=client_token&intent=sdk_init',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error();
  const data=await response.json();if(!data.access_token)throw Error();
  return json({clientToken:data.access_token,mode:env.PAYPAL_ENV==='live'?'live':'sandbox'});
 }catch{return json({error:'Card payments could not be loaded. You can still choose PayPal.'},502);}
}
