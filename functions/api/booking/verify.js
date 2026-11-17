import {json,ready,originOK,input,paypal,validCapture} from '../../_lib/booking.js';
// Read-only receipt lookup, protected by the unguessable booking reference.
// Returns merchant identifiers only, never buyer details or payment credentials.
export async function onRequestPost({request,env}){
 if(!ready(env))return json({error:'Payment connection unavailable.'},503);
 if(!originOK(request))return json({error:'Start this request on our website.'},403);
 let reference;
 try{({reference}=await input(request));if(typeof reference!=='string'||!/^[a-f0-9-]{36}$/.test(reference))throw Error();}catch{return json({error:'Invalid booking reference.'},400);}
 try{
  const b=await env.BOOKING_DB.prepare('SELECT * FROM bookings WHERE id=?').bind(reference).first();
  if(!b?.paypal_order_id||!b?.paypal_capture_id)return json({error:'No captured payment is recorded for this reference.'},404);
  const order=await paypal(env,'/v2/checkout/orders/'+encodeURIComponent(b.paypal_order_id));
  const unit=order.purchase_units?.find(u=>u.reference_id===reference||u.custom_id===reference);
  const capture=unit?.payments?.captures?.find(c=>c.id===b.paypal_capture_id);
  if(!validCapture(b,capture))return json({error:'PayPal did not confirm a matching completed deposit.'},409);
  return json({mode:env.PAYPAL_ENV==='live'?'live':'sandbox',verified:true,status:capture.status,orderID:order.id,captureID:capture.id,amount:capture.amount,createdAt:capture.create_time||order.create_time,merchant:{email:unit.payee?.email_address||null,id:unit.payee?.merchant_id||null}});
 }catch{return json({error:'PayPal could not verify this payment with the current account connection.'},502);}
}
