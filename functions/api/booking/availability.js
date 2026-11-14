import {json,ready,availability} from '../../_lib/booking.js';
export async function onRequestGet({env}){
 if(!ready(env))return json({enabled:false});
 try{return json({enabled:true,mode:env.PAYPAL_ENV==='live'?'live':'sandbox',termsURL:env.BOOKING_TERMS_URL,...await availability(env.BOOKING_DB)});}catch{return json({enabled:false},503);}
}
