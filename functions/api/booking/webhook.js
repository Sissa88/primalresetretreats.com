import {json,paypal,markPaid} from '../../_lib/booking.js';
export async function onRequestPost({request,env}){
 if(!env.PAYPAL_WEBHOOK_ID||!env.BOOKING_DB)return json({error:'Unavailable'},503);
 try{
  const raw=await request.text();if(raw.length>100000)return json({error:'Too large'},413);
  const event=JSON.parse(raw),h=request.headers;
  const verified=await paypal(env,'/v1/notifications/verify-webhook-signature',{method:'POST',body:{auth_algo:h.get('paypal-auth-algo'),cert_url:h.get('paypal-cert-url'),transmission_id:h.get('paypal-transmission-id'),transmission_sig:h.get('paypal-transmission-sig'),transmission_time:h.get('paypal-transmission-time'),webhook_id:env.PAYPAL_WEBHOOK_ID,webhook_event:event}});
  if(verified.verification_status!=='SUCCESS')return json({error:'Invalid signature'},400);
  if(event.event_type==='PAYMENT.CAPTURE.COMPLETED'){
   const capture=event.resource,orderID=capture?.supplementary_data?.related_ids?.order_id;
   const booking=await env.BOOKING_DB.prepare('SELECT * FROM bookings WHERE paypal_order_id=?').bind(orderID||'').first();
   if(booking&&booking.status!=='paid')await markPaid(env.BOOKING_DB,booking,capture);
  }
  return json({received:true});
 }catch{return json({error:'Webhook could not be processed'},500);}
}
