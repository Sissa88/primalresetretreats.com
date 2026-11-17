import {json,originOK} from '../../_lib/booking.js';
import {ensureCustomers,validateContact,saveContact,optIn} from '../../_lib/customers.js';
export async function onRequestPost({request,env}){
 if(!originOK(request))return json({error:'Please use the contact form on our website.'},403);
 if(!env.BOOKING_DB)return json({error:'Customer database is not connected.'},503);
 let data,c;
 try{const raw=await request.text();if(raw.length>3000)throw Error('Request too large.');data=JSON.parse(raw);if(data.honey)throw Error('Unable to submit.');if(!/^[a-f0-9-]{36}$/.test(data.id||''))throw Error('Please refresh the page and try again.');if(data.contactPermission!==true)throw Error('Please agree to be contacted about your inquiry.');c=validateContact(data,{inquiry:true});if(data.marketingOptIn!==undefined&&typeof data.marketingOptIn!=='boolean')throw Error('Invalid consent selection.');}catch(e){return json({error:e.message},400);}
 try{
  await ensureCustomers(env.BOOKING_DB);await saveContact(env.BOOKING_DB,c,'inquiry');
  await env.BOOKING_DB.prepare('INSERT OR IGNORE INTO retreat_inquiries(id,email) VALUES(?,?)').bind(data.id,c.email).run();
  if(data.marketingOptIn===true)await optIn(env.BOOKING_DB,c.email,'inquiry:'+data.id,'inquiry');
  return json({saved:true});
 }catch{return json({error:'Your contact details could not be saved. Please try again or email info@primalresetretreats.com.'},503);}
}
