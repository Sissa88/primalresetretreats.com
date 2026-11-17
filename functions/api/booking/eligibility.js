import {json,originOK,paypal,availability} from '../../_lib/booking.js';
import {browserClientToken} from '../../_lib/card-token.js';
// This route cannot create/capture orders, change stock, or enable checkout.
export async function onRequestPost({request,env}){
 if(!originOK(request))return json({error:'Open this check on the retreat website.'},403);
 if(!env.PAYPAL_CLIENT_ID||!env.PAYPAL_CLIENT_SECRET)return json({error:'PayPal credentials have not been configured.'},503);
 try{
  const clientToken=await browserClientToken(env);
  const checks={mode:env.PAYPAL_ENV==='live'?'live':'sandbox',checkoutPaused:env.BOOKING_ENABLED!=='true',connection:true,termsReady:!!env.BOOKING_TERMS_URL?.endsWith('/booking-terms/'),webhookRegistered:false,databaseReady:false,freshDatabase:false};
  if(env.PAYPAL_WEBHOOK_ID){try{
   const hook=await paypal(env,'/v1/notifications/webhooks/'+encodeURIComponent(env.PAYPAL_WEBHOOK_ID));
   checks.webhookRegistered=hook.url===new URL(request.url).origin+'/api/booking/webhook'&&hook.event_types?.some(e=>e.name==='PAYMENT.CAPTURE.COMPLETED'||e.name==='*')===true;
  }catch{/* A wrong app/webhook pairing is reported as unverified, not a connection success. */}}
  if(env.BOOKING_DB){try{
   const stock=await availability(env.BOOKING_DB);
   const row=await env.BOOKING_DB.prepare('SELECT COUNT(*) AS count FROM bookings').first();
   checks.databaseReady=true;checks.remaining=stock.remaining;checks.rooms=stock.rooms;checks.freshDatabase=row.count===0;
  }catch{/* Schema or binding needs attention. */}}
  return json({clientToken,...checks});
 }catch{return json({error:'PayPal did not accept the configured credentials. Check that the keys belong to the selected Live or Sandbox app.'},502);}
}
