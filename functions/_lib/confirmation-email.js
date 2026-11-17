import config from './email-config.js';
import {renderConfirmation} from './confirmation-template.js';
export function emailEnabled(env){return env.BOOKING_EMAIL_ENABLED==='true'&&!!env.RESEND_API_KEY&&!!env.BOOKING_EMAIL_FROM&&env.PAYPAL_ENV==='live';}
const schema=`CREATE TABLE IF NOT EXISTS booking_confirmation_emails (booking_id TEXT PRIMARY KEY REFERENCES bookings(id),status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','review')),payload_json TEXT NOT NULL,idempotency_key TEXT NOT NULL UNIQUE,created_at INTEGER NOT NULL DEFAULT (unixepoch()),lease_until INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,provider_id TEXT,sent_at INTEGER,last_error TEXT)`;
export async function sendBookingConfirmation(env,id){
 if(!emailEnabled(env))return {status:'disabled'};
 const db=env.BOOKING_DB;if(!db)throw Error('Email database unavailable.');
 const booking=await db.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first();
 if(booking?.promo_code==='INTERNAL_LIVE_TEST')return {status:'test-excluded'};
 if(!booking||booking.status!=='paid')return {status:'not-paid'};
 const guest=await db.prepare('SELECT full_name,email FROM booking_guests WHERE booking_id=?').bind(id).first();
 if(!guest?.email||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(guest.email))throw Error('A valid guest email is required.');
 await db.prepare(schema).run();
 const message=renderConfirmation(booking,guest,config);
 const payload={from:env.BOOKING_EMAIL_FROM,to:[guest.email],reply_to:config.contact_email,...message};
 await db.prepare('INSERT OR IGNORE INTO booking_confirmation_emails(booking_id,payload_json,idempotency_key) VALUES(?,?,?)').bind(id,JSON.stringify(payload),'booking-confirmation-v1/'+id).run();
 let record=await db.prepare('SELECT * FROM booking_confirmation_emails WHERE booking_id=?').bind(id).first();
 if(record.status==='sent')return {status:'sent'};
 // Resend keeps idempotency keys for 24 hours. Stop automatic retries before then.
 await db.prepare("UPDATE booking_confirmation_emails SET status='review',last_error='retry_window_expired' WHERE booking_id=? AND status<>'sent' AND created_at<unixepoch()-82800").bind(id).run();
 record=await db.prepare('SELECT * FROM booking_confirmation_emails WHERE booking_id=?').bind(id).first();
 if(record.status==='review')throw Error('Email needs manual review.');
 const lock=await db.prepare("UPDATE booking_confirmation_emails SET status='sending',lease_until=unixepoch()+90,attempts=attempts+1 WHERE booking_id=? AND (status='pending' OR (status='sending' AND lease_until<unixepoch()))").bind(id).run();
 if(!lock.meta.changes)throw Error('Email is already being processed.');
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':record.idempotency_key},body:record.payload_json,signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('email_provider_'+response.status);
  const result=await response.json();if(!result.id)throw Error('missing_provider_id');
  await db.prepare("UPDATE booking_confirmation_emails SET status='sent',provider_id=?,sent_at=unixepoch(),lease_until=0,last_error=NULL WHERE booking_id=?").bind(result.id,id).run();
  return {status:'sent'};
 }catch(error){
  await db.prepare("UPDATE booking_confirmation_emails SET status='pending',lease_until=0,last_error=? WHERE booking_id=? AND status<>'sent'").bind(/^email_provider_\d+$/.test(error.message)?error.message:'send_or_confirmation_interrupted',id).run();
  throw Error('Confirmation email needs retry.');
 }
}
export function scheduleConfirmation(context,id){
 if(!emailEnabled(context.env))return;
 const task=sendBookingConfirmation(context.env,id).catch(()=>{console.warn('Booking email is pending. Verified payment remains confirmed.');});
 if(context.waitUntil)context.waitUntil(task);
}
