import {recordBookingChoice} from '../../_lib/customers.js';
import {json,ready,originOK,input,quote,reserve,paypal} from '../../_lib/booking.js';
export async function onRequestPost({request,env,liveTest=false}){
 if(!ready(env))return json({error:'Online payments are not connected yet.'},503);
 if(!originOK(request))return json({error:'Please start checkout on our website.'},403);
 let data,q;
 try{data=await input(request);if(data.termsAccepted!==true)throw Error('Please accept the booking terms.');q=quote(data.room,data.code||'');if(data.method&&!['paypal','card'].includes(data.method))throw Error('Invalid payment method.');
 const name=data.guest?.name,email=data.guest?.email;
 if(typeof name!=='string'||!name.trim()||name.length>120||/[\x00-\x1f]/.test(name))throw Error('Please enter the guest’s full name.');
 if(typeof email!=='string'||email.length>180||! /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email.trim()))throw Error('Please enter a valid guest email address.');
 if(data.method==='card'&&(typeof data.cardholderName!=='string'||!data.cardholderName.trim()||data.cardholderName.length>120||/[\x00-\x1f]/.test(data.cardholderName)))throw Error('Please enter the name on the card.');}catch(e){return json({error:e.message},400);}
 if(data.marketingOptIn!==undefined&&typeof data.marketingOptIn!=='boolean')return json({error:'Invalid marketing preference.'},400);
 if(liveTest)q={...q,base:100,discount:0,total:100,deposit:100,balance:0,code:'INTERNAL_LIVE_TEST'};
 const id=liveTest?'003d9a78-1cd0-486d-b6c1-b4f60098b1cd':crypto.randomUUID(),db=env.BOOKING_DB;
 let reservedNow=false;
 try{
  if(liveTest){
   const existing=await db.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first();
   if(existing){
    if(existing.promo_code!=='INTERNAL_LIVE_TEST'||existing.deposit_cents!==100||!existing.paypal_order_id)return json({error:'The existing test needs review. No new payment was created.'},409);
    if(existing.status==='cancelled')return json({error:'This test was closed. No new payment was created.'},409);
    const order=await paypal(env,'/v2/checkout/orders/'+encodeURIComponent(existing.paypal_order_id));
    const unit=order.purchase_units?.find(u=>u.custom_id===id||u.reference_id===id);
    if(!unit||unit.amount?.currency_code!=='USD'||unit.amount?.value!=='1.00')return json({error:'The existing test order could not be verified. No new payment was created.'},409);
    const origin=new URL(request.url).origin;
    if(existing.status==='paid'||existing.status==='processing'||order.status==='COMPLETED')return json({reference:id,orderID:existing.paypal_order_id,approvalURL:origin+'/api/booking/live-test?returned=1',resumed:true});
    if(!['CREATED','SAVED','PAYER_ACTION_REQUIRED','APPROVED'].includes(order.status))return json({error:'The existing PayPal order is no longer available. No new payment was created.'},409);
    const renewed=await db.prepare("UPDATE bookings SET expires_at=unixepoch()+900 WHERE id=? AND status='held' AND (expires_at>unixepoch() OR ((SELECT COUNT(*) FROM bookings WHERE id<>? AND (status IN ('paid','processing') OR (status='held' AND expires_at>unixepoch())))<15 AND (SELECT COUNT(*) FROM bookings WHERE id<>? AND room_id='shared' AND (status IN ('paid','processing') OR (status='held' AND expires_at>unixepoch())))<(SELECT capacity FROM retreat_capacity WHERE room_id='shared')))").bind(id,id,id).run();
    if(!renewed.meta.changes)return json({error:'No shared place is currently available for this test. No new payment was created.'},409);
    return json({reference:id,orderID:existing.paypal_order_id,approvalURL:'https://www.paypal.com/checkoutnow?token='+encodeURIComponent(existing.paypal_order_id),holdMinutes:15,resumed:true});
   }
  }
  if(!await reserve(db,id,q))return json({error:'This accommodation has just sold out. Please choose another room.'},409);
  reservedNow=true;
  await db.prepare('UPDATE bookings SET terms_url=?,terms_accepted_at=unixepoch() WHERE id=?').bind(env.BOOKING_TERMS_URL,id).run();
  // Additive table creation supports existing installations without altering bookings.
  await db.prepare('CREATE TABLE IF NOT EXISTS booking_guests (booking_id TEXT PRIMARY KEY REFERENCES bookings(id),full_name TEXT NOT NULL,email TEXT NOT NULL)').run();
  await db.prepare('INSERT INTO booking_guests(booking_id,full_name,email) VALUES(?,?,?)').bind(id,data.guest.name.trim(),data.guest.email.trim()).run();
  await recordBookingChoice(db,id,data.marketingOptIn);
  const origin=new URL(request.url).origin;
  const card=data.method==='card';
  const source=card?{card:{name:data.cardholderName.trim(),attributes:{verification:{method:'SCA_WHEN_REQUIRED'}}}}:{paypal:{experience_context:{landing_page:'LOGIN',shipping_preference:'NO_SHIPPING',user_action:'PAY_NOW',return_url:origin+(liveTest?'/api/booking/live-test?returned=1':'/pricing/?booking_return=1'),cancel_url:origin+(liveTest?'/api/booking/live-test?cancelled=1':'/pricing/?booking_cancel=1')}}};
  const order=await paypal(env,'/v2/checkout/orders',{method:'POST',requestID:id,body:{intent:'CAPTURE',purchase_units:[{reference_id:id,custom_id:id,description:liveTest?'Owner checkout test — USD 1 — not a retreat booking':`Men’s Rebirth — ${q.roomName} — 50% deposit — April 2027`,amount:{currency_code:'USD',value:(q.deposit/100).toFixed(2)}}],payment_source:source}});
  const approval=order.links?.find(l=>l.rel==='payer-action'||l.rel==='approve')?.href;
  if(!order.id||(!card&&(!approval||!/^https:\/\/(www\.)?(sandbox\.)?paypal\.com\//.test(approval))))throw Error('Checkout unavailable');
  await db.prepare('UPDATE bookings SET paypal_order_id=? WHERE id=?').bind(order.id,id).run();
  return json({reference:id,orderID:order.id,...(card?{}:{approvalURL:approval}),holdMinutes:15});
 }catch{
  if(reservedNow)await db.prepare("UPDATE bookings SET status='cancelled' WHERE id=? AND status='held'").bind(id).run();
  return json({error:'We could not start checkout. No booking has been confirmed. Please try again.'},502);
 }
}
