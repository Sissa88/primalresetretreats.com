import {json,ready,originOK,input,paypal,markPaid,receipt} from '../../_lib/booking.js';
export async function onRequestPost({request,env}){
 if(!ready(env))return json({error:'Payment connection unavailable.'},503);
 if(!originOK(request))return json({error:'Please return to the booking page.'},403);
 let id;try{({reference:id}=await input(request));if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw Error();}catch{return json({error:'Invalid booking reference.'},400);}
 const db=env.BOOKING_DB;
 try{
  let booking=await db.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first();
  if(!booking)return json({error:'Booking not found.'},404);
  if(booking.status==='paid')return json(receipt(booking));
  // Do not pin an unapproved order: it must still expire normally.
  let order=await paypal(env,'/v2/checkout/orders/'+encodeURIComponent(booking.paypal_order_id));
  if(!['APPROVED','COMPLETED'].includes(order.status))return json({error:'The deposit has not been approved in PayPal. Please complete or cancel checkout.'},409);
  if(booking.status==='held'){
   const lock=await db.prepare("UPDATE bookings SET status='processing' WHERE id=? AND status='held' AND expires_at>unixepoch()").bind(id).run();
   if(!lock.meta.changes)return json({error:'Your checkout hold expired. Please contact us if you see a payment in PayPal.'},409);
  }else if(booking.status!=='processing')return json({error:'This checkout is no longer active.'},409);
  // Retrieve first: a retry after a network interruption must not charge again.
  if(order.status!=='COMPLETED')order=await paypal(env,'/v2/checkout/orders/'+encodeURIComponent(booking.paypal_order_id)+'/capture',{method:'POST',requestID:id+'-capture',body:{}});
  const unit=order.purchase_units?.find(u=>u.custom_id===id||u.reference_id===id);
  const capture=unit?.payments?.captures?.find(c=>c.status==='COMPLETED');
  if(!capture)return json({status:'processing',reference:id},202);
  await markPaid(db,booking,capture);
  booking=await db.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first();return json(receipt(booking));
 }catch{return json({status:'processing',reference:id,message:'Payment confirmation is pending. Keep this reference and check again before making another payment.'},202);}
}
