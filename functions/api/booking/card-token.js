import {json,ready,originOK} from '../../_lib/booking.js';
import {browserClientToken} from '../../_lib/card-token.js';
export async function onRequestPost({request,env}){
 if(!ready(env))return json({error:'Checkout is not connected.'},503);
 if(!originOK(request))return json({error:'Start checkout on our website.'},403);
 try{return json({clientToken:await browserClientToken(env),mode:env.PAYPAL_ENV==='live'?'live':'sandbox'});}
 catch{return json({error:'Card payments could not be loaded. You can still choose PayPal.'},502);}
}
