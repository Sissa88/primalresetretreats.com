import {apiBase} from './booking.js';
export async function browserClientToken(env){
 // A full-scope access token must never be returned to a browser.
 const response=await fetch(apiBase(env)+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+btoa(env.PAYPAL_CLIENT_ID+':'+env.PAYPAL_CLIENT_SECRET),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials&response_type=client_token&intent=sdk_init',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Unable to connect to PayPal');
 const data=await response.json();if(!data.access_token)throw Error('Missing browser token');
 return data.access_token;
}
