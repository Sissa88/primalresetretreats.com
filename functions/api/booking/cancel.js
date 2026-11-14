import {json,originOK,input} from '../../_lib/booking.js';
export async function onRequestPost({request,env}){
 if(!env.BOOKING_DB||!originOK(request))return json({error:'Unavailable'},403);
 try{const {reference}=await input(request);if(typeof reference!=='string'||!/^[a-f0-9-]{36}$/.test(reference))return json({error:'Invalid reference'},400);await env.BOOKING_DB.prepare("UPDATE bookings SET status='cancelled' WHERE id=? AND status='held'").bind(reference).run();return json({cancelled:true});}catch{return json({error:'Could not release checkout hold'},400);}
}
