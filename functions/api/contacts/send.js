import {json,originOK} from '../../_lib/booking.js';
import {validateContact} from '../../_lib/customers.js';
import config from '../../_lib/email-config.js';
const schema=`CREATE TABLE IF NOT EXISTS contact_delivery_requests (id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at INTEGER NOT NULL DEFAULT (unixepoch()),updated_at INTEGER NOT NULL DEFAULT (unixepoch()))`;
export async function onRequestGet({request}){
 if(new URL(request.url).searchParams.get('probe')!=='1')return json({transport:'same-origin',ready:true});
 if(!originOK(request))return json({error:'Open this check on our website.'},403);
 try{const response=await fetch('https://formsubmit.co/ajax/'+(config.formsubmit_id||config.contact_email),{method:'GET',headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});return json({transport:'same-origin',providerReachable:true,providerStatus:response.status});}catch{return json({transport:'same-origin',providerReachable:false},503);}
}
export async function onRequestPost({request,env}){
 if(!originOK(request))return json({error:'Please send your inquiry from our website.'},403);
 if(!env.BOOKING_DB)return json({error:'Contact submission is temporarily unavailable. Please email '+config.contact_email+'.'},503);
 let data,contact,message,kind;
 try{
  const raw=await request.text();if(raw.length>12000)throw Error('Please shorten your message.');data=JSON.parse(raw);
  if(!/^[a-f0-9-]{36}$/.test(data.id||''))throw Error('Please refresh this page and try again.');
  kind=data.kind==='coach'?'coach':'retreat';
  contact=validateContact(data,{inquiry:kind==='retreat'});
  message=typeof data.message==='string'?data.message.trim():'';
  if(!message||message.length>6000)throw Error('Please enter a message of up to 6,000 characters.');
  if(data._honey)throw Error('Unable to submit.');
  if(data.contact_permission!=='Yes')throw Error('Please agree to be contacted about this inquiry.');
 }catch(e){return json({error:e.message||'Please check the form fields.'},400);}
 const payload={name:contact.name,email:contact.email,country:contact.country,phone:contact.phone,message,inquiry_type:kind,contact_permission:'Yes',_subject:'Primal Reset — '+(kind==='coach'?'coach application':'retreat inquiry'),_template:'table',_url:new URL(request.url).origin+'/'};
 if(kind==='retreat'){payload.age=contact.age;payload.marketing_opt_in=data.marketing_opt_in==='Yes'?'Yes':'No';}
 if(kind==='coach'&&typeof data.cv_link==='string')payload.cv_link=data.cv_link.slice(0,500);
 for(const field of ['selected_room','package_estimate_usd','planned_deposit_usd','planned_balance_usd','promo_code','request_type'])if(typeof data[field]==='string')payload[field]=data[field].slice(0,180);
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload)));
 const fingerprint=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join(''),db=env.BOOKING_DB;
 let attempted=false;
 try{
  await db.prepare(schema).run();
  await db.prepare('INSERT OR IGNORE INTO contact_delivery_requests(id,fingerprint) VALUES(?,?)').bind(data.id,fingerprint).run();
  const prior=await db.prepare('SELECT fingerprint,status FROM contact_delivery_requests WHERE id=?').bind(data.id).first();
  if(prior.fingerprint!==fingerprint)return json({error:'This submission reference belongs to a different message. Please refresh before sending a new inquiry.'},409);
  if(prior.status==='sent')return json({success:true});
  if(!['pending','failed'].includes(prior.status))return json({error:'The earlier submission is still being checked. Please email '+config.contact_email+' before sending again.'},409);
  const lock=await db.prepare("UPDATE contact_delivery_requests SET status='sending',updated_at=unixepoch() WHERE id=? AND status IN ('pending','failed')").bind(data.id).run();
  if(!lock.meta.changes)return json({error:'This message is already being submitted. Please wait.'},409);
  attempted=true;
  const response=await fetch('https://formsubmit.co/ajax/'+(config.formsubmit_id||config.contact_email),{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Origin:new URL(request.url).origin,Referer:new URL(request.url).origin+'/'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
  const result=await response.json().catch(()=>null);
  if(!response.ok||!result||![true,'true'].includes(result.success)){
   const definiteRejection=result?.success===false||result?.success==='false'||(response.status>=400&&response.status<500);
   await db.prepare('UPDATE contact_delivery_requests SET status=?,updated_at=unixepoch() WHERE id=?').bind(definiteRejection?'failed':'uncertain',data.id).run();
   return json({error:'The email service could not confirm this message. Please email '+config.contact_email+' directly before trying again.',code:result?'provider_rejected':'provider_unexpected_response'},502);
  }
  await db.prepare("UPDATE contact_delivery_requests SET status='sent',updated_at=unixepoch() WHERE id=?").bind(data.id).run();
  return json({success:true});
 }catch{
  if(attempted)try{await db.prepare("UPDATE contact_delivery_requests SET status='uncertain',updated_at=unixepoch() WHERE id=? AND status='sending'").bind(data.id).run();}catch{}
  return json({error:'Submission could not be confirmed. Your message is still here. Please email '+config.contact_email+' before trying again.'},503);
 }
}
