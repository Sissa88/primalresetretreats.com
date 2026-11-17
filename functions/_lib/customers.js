export const MARKETING_VERSION='2026-11-17';
export const MARKETING_TEXT='I am the person named above and would like occasional emails from Primal Reset Retreats about retreats, offers and updates. I can unsubscribe at any time.';
export const CUSTOMER_SCHEMA=[
 `CREATE TABLE IF NOT EXISTS booking_guests (booking_id TEXT PRIMARY KEY REFERENCES bookings(id),full_name TEXT NOT NULL,email TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS customer_contacts (email TEXT PRIMARY KEY,full_name TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',country TEXT NOT NULL DEFAULT '',age INTEGER,is_guest INTEGER NOT NULL DEFAULT 0,is_inquiry INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL DEFAULT (unixepoch()),updated_at INTEGER NOT NULL DEFAULT (unixepoch()))`,
 `CREATE TABLE IF NOT EXISTS marketing_subscribers (email TEXT PRIMARY KEY REFERENCES customer_contacts(email),active INTEGER NOT NULL DEFAULT 1,unsubscribe_token TEXT NOT NULL UNIQUE,consent_version TEXT NOT NULL,consent_text TEXT NOT NULL,consented_at INTEGER NOT NULL DEFAULT (unixepoch()),source TEXT NOT NULL,withdrawn_at INTEGER)`,
 `CREATE TABLE IF NOT EXISTS marketing_events (event_id TEXT PRIMARY KEY,email TEXT NOT NULL,action TEXT NOT NULL,source TEXT NOT NULL,consent_version TEXT NOT NULL,consent_text TEXT NOT NULL,created_at INTEGER NOT NULL DEFAULT (unixepoch()))`,
 `CREATE TABLE IF NOT EXISTS booking_marketing_choices (booking_id TEXT PRIMARY KEY REFERENCES bookings(id),opt_in INTEGER NOT NULL DEFAULT 0,consent_version TEXT NOT NULL,consent_text TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS retreat_inquiries (id TEXT PRIMARY KEY,email TEXT NOT NULL REFERENCES customer_contacts(email),created_at INTEGER NOT NULL DEFAULT (unixepoch()))`,
 `CREATE VIEW IF NOT EXISTS customer_directory AS SELECT email,full_name,phone,country,age,is_guest,is_inquiry,created_at,updated_at FROM customer_contacts`,
 `CREATE VIEW IF NOT EXISTS marketing_contacts AS SELECT c.email,c.full_name,c.country,s.consented_at,s.consent_version,s.source,'/unsubscribe/?token='||s.unsubscribe_token AS unsubscribe_path FROM customer_contacts c JOIN marketing_subscribers s ON s.email=c.email WHERE s.active=1`
];
export async function ensureCustomers(db){await db.batch([...CUSTOMER_SCHEMA.map(sql=>db.prepare(sql)),db.prepare("INSERT INTO customer_contacts(email,full_name,is_guest) SELECT lower(trim(g.email)),g.full_name,1 FROM booking_guests g JOIN bookings b ON b.id=g.booking_id WHERE b.status='paid' ON CONFLICT(email) DO UPDATE SET is_guest=1")]);}
export function validateContact(data,{inquiry=false}={}){
 const name=typeof data.name==='string'?data.name.trim():'',email=typeof data.email==='string'?data.email.trim().toLowerCase():'';
 if(!name||name.length>120||/[\x00-\x1f]/.test(name))throw Error('Please enter your full name.');
 if(email.length>180||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))throw Error('Please enter a valid email address.');
 const phone=typeof data.phone==='string'?data.phone.trim():'',country=typeof data.country==='string'?data.country.trim():'';
 if(phone.length>40||country.length>80||/[\x00-\x1f]/.test(phone+country))throw Error('Please check your phone number and country.');
 const age=inquiry?Number(data.age):null;
 if(inquiry&&(!country||!Number.isInteger(age)||age<29||age>60))throw Error('Please enter your country and age (29–60).');
 return {name,email,phone,country,age};
}
export async function saveContact(db,c,source){
 await db.prepare(`INSERT INTO customer_contacts(email,full_name,phone,country,age,is_guest,is_inquiry) VALUES(?,?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET full_name=excluded.full_name,phone=CASE WHEN excluded.phone<>'' THEN excluded.phone ELSE customer_contacts.phone END,country=CASE WHEN excluded.country<>'' THEN excluded.country ELSE customer_contacts.country END,age=COALESCE(excluded.age,customer_contacts.age),is_guest=MAX(customer_contacts.is_guest,excluded.is_guest),is_inquiry=MAX(customer_contacts.is_inquiry,excluded.is_inquiry),updated_at=unixepoch()`).bind(c.email,c.name,c.phone||'',c.country||'',c.age,source==='booking'?1:0,source==='inquiry'?1:0).run();
}
export async function optIn(db,email,eventID,source,version=MARKETING_VERSION,text=MARKETING_TEXT){
 // The transaction makes retries idempotent: an old webhook cannot undo an unsubscribe.
 await db.batch([
  db.prepare(`INSERT INTO marketing_subscribers(email,active,unsubscribe_token,consent_version,consent_text,source) SELECT ?,1,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM marketing_events WHERE event_id=?) ON CONFLICT(email) DO UPDATE SET active=1,consent_version=excluded.consent_version,consent_text=excluded.consent_text,source=excluded.source,consented_at=unixepoch(),withdrawn_at=NULL`).bind(email,crypto.randomUUID(),version,text,source,eventID),
  db.prepare(`INSERT OR IGNORE INTO marketing_events(event_id,email,action,source,consent_version,consent_text) VALUES(?,?,'opt_in',?,?,?)`).bind(eventID,email,source,version,text)
 ]);
}
export async function syncPaidCustomer(db,id){
 await ensureCustomers(db);
 const g=await db.prepare(`SELECT g.full_name,g.email,c.opt_in,c.consent_version,c.consent_text FROM booking_guests g JOIN bookings b ON b.id=g.booking_id LEFT JOIN booking_marketing_choices c ON c.booking_id=b.id WHERE b.id=? AND b.status='paid'`).bind(id).first();
 if(!g)return;
 const c=validateContact({name:g.full_name,email:g.email});await saveContact(db,c,'booking');
 if(g.opt_in===1)await optIn(db,c.email,'booking:'+id,'booking',g.consent_version,g.consent_text);
}
export async function recordBookingChoice(db,id,opted){
 await ensureCustomers(db);
 await db.prepare('INSERT OR IGNORE INTO booking_marketing_choices(booking_id,opt_in,consent_version,consent_text) VALUES(?,?,?,?)').bind(id,opted===true?1:0,MARKETING_VERSION,MARKETING_TEXT).run();
}
