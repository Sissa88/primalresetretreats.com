import pricing from '../../content/pricing.json' with {type:'json'};
import {calculateQuote} from '../../public/pricing-model.js';
export const TOTAL_CAPACITY=15;
export function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export function ready(env){return /^https:\/\//.test(env.BOOKING_TERMS_URL||'')&&env.BOOKING_ENABLED==='true'&&!!env.BOOKING_DB&&!!env.PAYPAL_CLIENT_ID&&!!env.PAYPAL_CLIENT_SECRET&&!!env.PAYPAL_WEBHOOK_ID&&!!env.BOOKING_TERMS_URL;}
export function originOK(request){return request.headers.get('Origin')===new URL(request.url).origin;}
export async function input(request){if(!request.headers.get('content-type')?.startsWith('application/json'))throw Error('JSON required');const body=await request.text();if(body.length>2048)throw Error('Request too large');return JSON.parse(body);}
export function quote(room,code=''){
 if(!['private','shared'].includes(room)||typeof code!=='string'||code.length>64)throw Error('Invalid selection');
 const q=calculateQuote(pricing,room,code);
 if(code.trim()&&!q.promoApplied)throw Error('That promotion code is not valid.');
 return q;
}
export async function availability(db){
 const {results}=await db.prepare(`SELECT c.room_id,MAX(0,c.capacity-(SELECT COUNT(*) FROM bookings b WHERE b.room_id=c.room_id AND (b.status IN ('processing','paid') OR (b.status='held' AND b.expires_at>unixepoch())))) AS remaining FROM retreat_capacity c`).all();
 const used=await db.prepare("SELECT COUNT(*) AS used FROM bookings WHERE status IN ('processing','paid') OR (status='held' AND expires_at>unixepoch())").first();
 const total=Math.max(0,TOTAL_CAPACITY-used.used);
 return {remaining:total,rooms:Object.fromEntries(results.map(r=>[r.room_id,Math.min(total,r.remaining)]))};
}
export async function reserve(db,id,q){
 const result=await db.prepare(`INSERT INTO bookings(id,room_id,status,expires_at,base_cents,discount_cents,total_cents,deposit_cents,balance_cents,promo_code)
 SELECT ?,?,'held',unixepoch()+900,?,?,?,?,?,?
 WHERE (SELECT COUNT(*) FROM bookings WHERE status IN ('processing','paid') OR (status='held' AND expires_at>unixepoch())) < 15
 AND (SELECT COUNT(*) FROM bookings WHERE room_id=? AND (status IN ('processing','paid') OR (status='held' AND expires_at>unixepoch()))) < (SELECT capacity FROM retreat_capacity WHERE room_id=?)`).bind(id,q.roomID,q.base,q.discount,q.total,q.deposit,q.balance,q.code,q.roomID,q.roomID).run();
 return result.meta.changes===1;
}
export function apiBase(env){return env.PAYPAL_ENV==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com';}
export async function paypal(env,path,{method='GET',body,requestID}={}){
 const auth=await fetch(apiBase(env)+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+btoa(env.PAYPAL_CLIENT_ID+':'+env.PAYPAL_CLIENT_SECRET),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(15000)});
 if(!auth.ok)throw Error('Payment connection unavailable');
 const token=await auth.json();
 const response=await fetch(apiBase(env)+path,{method,headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json',...(requestID?{'PayPal-Request-Id':requestID}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Payment request could not be completed');
 return response.status===204?{}:response.json();
}
export function validCapture(booking,capture){return capture?.status==='COMPLETED'&&capture.amount?.currency_code==='USD'&&capture.amount?.value===(booking.deposit_cents/100).toFixed(2)&&typeof capture.id==='string';}
export async function markPaid(db,booking,capture){
 if(!validCapture(booking,capture))throw Error('Payment is not yet confirmed');
 await db.prepare("UPDATE bookings SET status='paid',paypal_capture_id=?,paid_at=unixepoch() WHERE id=? AND status='processing'").bind(capture.id,booking.id).run();
}
export function receipt(booking){return {status:booking.status,reference:booking.id,room:booking.room_id,base:booking.base_cents,discount:booking.discount_cents,code:booking.promo_code,total:booking.total_cents,deposit:booking.deposit_cents,balance:booking.balance_cents,balanceDue:'February 1, 2027'};}
