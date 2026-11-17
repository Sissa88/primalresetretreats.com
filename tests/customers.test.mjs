import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './sqlite-helper.mjs';
import {ensureCustomers,saveContact,optIn,syncPaidCustomer,recordBookingChoice,validateContact} from '../functions/_lib/customers.js';
import {reserve,quote} from '../functions/_lib/booking.js';
import {onRequestPost as inquiry} from '../functions/api/contacts/inquiry.js';
import {onRequestPost as unsubscribe} from '../functions/api/contacts/unsubscribe.js';
const request=(path,body)=>new Request('https://example.com/api/contacts/'+path,{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify(body)});
const person={name:'Test Guest',email:'guest@example.com',age:40,country:'United States',phone:'+1 555 123 4567'};
test('retreat inquiry stores contact profile but never opts in by default',async t=>{
 const db=await database(t),id=crypto.randomUUID();
 const result=await inquiry({env:{BOOKING_DB:db},request:request('inquiry',{...person,id,contactPermission:true,marketingOptIn:false})});assert.equal(result.status,200);
 const contact=await db.prepare('SELECT * FROM customer_directory WHERE email=?').bind(person.email).first();assert.equal(contact.is_inquiry,1);assert.equal(contact.age,40);assert.equal(contact.phone,person.phone);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM marketing_contacts').first()).n,0);
});
test('explicit opt-in exports only subscribed contacts and unsubscribe preserves their contact record',async t=>{
 const db=await database(t),id=crypto.randomUUID(),body={...person,id,contactPermission:true,marketingOptIn:true};
 assert.equal((await inquiry({env:{BOOKING_DB:db},request:request('inquiry',body)})).status,200);
 let contact=await db.prepare('SELECT * FROM marketing_contacts').first();assert.equal(contact.email,person.email);assert.equal(contact.consent_version,'2026-11-17');
 const token=new URL(contact.unsubscribe_path,'https://example.com').searchParams.get('token');
 assert.equal((await unsubscribe({env:{BOOKING_DB:db},request:request('unsubscribe',{token})})).status,200);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM marketing_contacts').first()).n,0);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM customer_directory').first()).n,1);
 // Retrying the same native form or webhook cannot undo withdrawal.
 await inquiry({env:{BOOKING_DB:db},request:request('inquiry',body)});
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM marketing_contacts').first()).n,0);
 // A fresh, explicit opt-in can resubscribe.
 await inquiry({env:{BOOKING_DB:db},request:request('inquiry',{...body,id:crypto.randomUUID()})});
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM marketing_contacts').first()).n,1);
});
test('only paid guests enter customer directory; booking without marketing consent remains excluded from marketing',async t=>{
 const db=await database(t),id=crypto.randomUUID();await reserve(db,id,quote('shared'));
 await db.prepare('INSERT INTO booking_guests(booking_id,full_name,email) VALUES(?,?,?)').bind(id,person.name,person.email).run();await recordBookingChoice(db,id,false);
 await syncPaidCustomer(db,id);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM customer_directory').first()).n,0);
 await db.prepare("UPDATE bookings SET status='paid' WHERE id=?").bind(id).run();await syncPaidCustomer(db,id);
 assert.equal((await db.prepare('SELECT is_guest FROM customer_directory').first()).is_guest,1);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM marketing_contacts').first()).n,0);
});
test('opt-in from paid booking is idempotent and repeated confirmations cannot undo unsubscribe',async t=>{
 const db=await database(t),id=crypto.randomUUID();await reserve(db,id,quote('private'));
 await db.prepare('INSERT INTO booking_guests(booking_id,full_name,email) VALUES(?,?,?)').bind(id,person.name,person.email).run();await recordBookingChoice(db,id,true);
 await db.prepare("UPDATE bookings SET status='paid' WHERE id=?").bind(id).run();await syncPaidCustomer(db,id);
 const sub=await db.prepare('SELECT unsubscribe_token FROM marketing_subscribers').first();
 await unsubscribe({env:{BOOKING_DB:db},request:request('unsubscribe',{token:sub.unsubscribe_token})});await syncPaidCustomer(db,id);
 assert.equal((await db.prepare('SELECT active FROM marketing_subscribers').first()).active,0);
 assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM marketing_events WHERE action='opt_in'").first()).n,1);
 assert.equal((await db.prepare('SELECT status FROM bookings WHERE id=?').bind(id).first()).status,'paid');
});
test('invalid contacts, nonboolean consent, and cross-origin submissions do not reach the database',async()=>{
 assert.throws(()=>validateContact({...person,age:20},{inquiry:true}));assert.throws(()=>validateContact({...person,email:'wrong'}));
 const env={BOOKING_DB:{prepare(){throw Error('must not write');},batch(){throw Error('must not write');}}};
 const bad=await inquiry({env,request:request('inquiry',{...person,id:crypto.randomUUID(),contactPermission:true,marketingOptIn:'yes'})});assert.equal(bad.status,400);
 const foreign=await inquiry({env,request:new Request('https://example.com/api/contacts/inquiry',{method:'POST',headers:{Origin:'https://other.example'}})});assert.equal(foreign.status,403);
});
