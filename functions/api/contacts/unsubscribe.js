import {json,originOK} from '../../_lib/booking.js';
import {ensureCustomers} from '../../_lib/customers.js';
export async function onRequestPost({request,env}){
 if(!originOK(request)||!env.BOOKING_DB)return json({error:'Please use the unsubscribe page.'},403);
 try{
  const raw=await request.text();if(raw.length>200)throw Error();const {token}=JSON.parse(raw);if(typeof token!=='string'||!/^[a-f0-9-]{36}$/.test(token))return json({error:'Invalid unsubscribe link.'},400);
  await ensureCustomers(env.BOOKING_DB);
  const sub=await env.BOOKING_DB.prepare('SELECT email,active FROM marketing_subscribers WHERE unsubscribe_token=?').bind(token).first();
  if(sub&&sub.active===1)await env.BOOKING_DB.batch([
   env.BOOKING_DB.prepare('UPDATE marketing_subscribers SET active=0,withdrawn_at=unixepoch() WHERE unsubscribe_token=?').bind(token),
   env.BOOKING_DB.prepare("INSERT INTO marketing_events(event_id,email,action,source,consent_version,consent_text) VALUES(?,?,'unsubscribe','unsubscribe-link','','')").bind(crypto.randomUUID(),sub.email)
  ]);
  return json({unsubscribed:true});
 }catch{return json({error:'Could not update your preference. Please email info@primalresetretreats.com.'},503);}
}
