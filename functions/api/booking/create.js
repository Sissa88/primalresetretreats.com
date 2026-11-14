import {json,ready,originOK,input,quote,reserve,paypal} from '../../_lib/booking.js';
export async function onRequestPost({request,env}){
 if(!ready(env))return json({error:'Online payments are not connected yet.'},503);
 if(!originOK(request))return json({error:'Please start checkout on our website.'},403);
 let data,q;
 try{data=await input(request);if(data.termsAccepted!==true)throw Error('Please accept the booking terms.');q=quote(data.room,data.code||'');}catch(e){return json({error:e.message},400);}
 const id=crypto.randomUUID(),db=env.BOOKING_DB;
 try{
  if(!await reserve(db,id,q))return json({error:'This accommodation has just sold out. Please choose another room.'},409);
  await db.prepare('UPDATE bookings SET terms_url=?,terms_accepted_at=unixepoch() WHERE id=?').bind(env.BOOKING_TERMS_URL,id).run();
  const origin=new URL(request.url).origin;
  const order=await paypal(env,'/v2/checkout/orders',{method:'POST',requestID:id,body:{intent:'CAPTURE',purchase_units:[{reference_id:id,custom_id:id,description:`Men’s Rebirth — ${q.roomName} — 50% deposit — April 2027`,amount:{currency_code:'USD',value:(q.deposit/100).toFixed(2)}}],payment_source:{paypal:{experience_context:{shipping_preference:'NO_SHIPPING',user_action:'PAY_NOW',return_url:origin+'/pricing/?booking_return=1',cancel_url:origin+'/pricing/?booking_cancel=1'}}}}});
  const approval=order.links?.find(l=>l.rel==='payer-action'||l.rel==='approve')?.href;
  if(!order.id||!approval||!/^https:\/\/(www\.)?(sandbox\.)?paypal\.com\//.test(approval))throw Error('Checkout unavailable');
  await db.prepare('UPDATE bookings SET paypal_order_id=? WHERE id=?').bind(order.id,id).run();
  return json({reference:id,orderID:order.id,approvalURL:approval,holdMinutes:15});
 }catch{
  await db.prepare("UPDATE bookings SET status='cancelled' WHERE id=? AND status='held'").bind(id).run();
  return json({error:'We could not start checkout. No booking has been confirmed. Please try again.'},502);
 }
}
