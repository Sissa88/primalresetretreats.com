import {json,originOK} from '../../_lib/booking.js';
import {ensureCustomers} from '../../_lib/customers.js';
export async function onRequestPost({request,env}){
 if(!originOK(request))return json({error:'Use this site to check the contact connection.'},403);
 if(!env.BOOKING_DB)return json({database:false,reason:'missing_database_binding'},503);
 let stage='schema';
 try{
  await ensureCustomers(env.BOOKING_DB);stage='write';
  const email='diagnostic-'+crypto.randomUUID()+'@example.invalid';
  // Both statements commit together: no diagnostic customer remains in the database.
  await env.BOOKING_DB.batch([
   env.BOOKING_DB.prepare("INSERT INTO customer_contacts(email,full_name,phone,country,age,is_inquiry) VALUES(?,'Temporary contact check','','',NULL,0)").bind(email),
   env.BOOKING_DB.prepare('DELETE FROM customer_contacts WHERE email=?').bind(email)
  ]);
  return json({database:true,write:true});
 }catch(e){
  const message=String(e.cause?.message||e.message||'');
  const diagnostic=message.match(/no such (?:table|column): [a-zA-Z0-9_.]+|SQLITE_[A-Z_]+|not authorized|syntax error/i)?.[0]||'database_operation_failed';
  return json({database:false,stage,reason:diagnostic},503);
 }
}
