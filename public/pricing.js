import {calculateQuote,money} from './pricing-model.js';
const config=JSON.parse(document.getElementById('pricing-data').textContent);
const byID=id=>document.getElementById(id);
let roomID=config.rooms[0].id,code='';
function paint(announce=false){
 const q=calculateQuote(config,roomID,code);
 for(const card of document.querySelectorAll('[data-room-card]'))card.classList.toggle('is-selected',card.dataset.roomCard===roomID);
 for(const [id,value] of Object.entries({'sum-room':q.roomName,'sum-base':money(q.base),'sum-total':money(q.total),'sum-discount':'−'+money(q.discount),'sum-deposit':money(q.deposit),'sum-balance':money(q.balance),'sum-code':q.code||'—'}))byID(id).textContent=value;
 byID('discount-row').hidden=!q.promoApplied;
 const values={selected_room:q.roomName,package_estimate_usd:money(q.total),planned_deposit_usd:money(q.deposit),planned_balance_usd:money(q.balance),promo_code:q.code||'None',request_type:'Pricing inquiry only — not a reservation'};
 for(const form of document.querySelectorAll('#pricing-inquiry form')){
  for(const [name,value] of Object.entries(values)){
   let input=form.querySelector(`input[name="${name}"]`);
   if(!input){input=document.createElement('input');input.type='hidden';input.name=name;form.append(input);}
   input.value=value;
  }
 }
 if(announce)byID('quote-announcement').textContent=`${q.roomName}: ${money(q.total)} package, ${money(q.deposit)} planned deposit, ${money(q.balance)} balance. No payment is collected.`;
}
for(const radio of document.querySelectorAll('input[name="accommodation"]'))radio.addEventListener('change',()=>{roomID=radio.value;paint(true);});
const promo=byID('promo-code'),apply=byID('apply-promo'),feedback=byID('promo-feedback');
if(promo&&apply){
 apply.addEventListener('click',()=>{
  const entered=promo.value.trim().toUpperCase();
  const q=calculateQuote(config,roomID,entered);
  code=q.promoApplied?entered:'';
  feedback.textContent=!entered?'No code applied. Standard pricing is shown.':q.promoApplied?`${config.promo_percent}% promotion applied. Your package and planned deposit have been updated.`:'That code is not valid. Standard pricing is shown. Check the spelling and try again.';
  feedback.classList.toggle('is-error',!!entered&&!q.promoApplied);
  feedback.classList.toggle('is-success',q.promoApplied);paint(true);
 });
 promo.addEventListener('input',()=>{
  if(code){code='';paint(true);}
  feedback.textContent='Select Apply to check your code. Standard pricing is shown until a valid code is applied.';
  feedback.classList.remove('is-error','is-success');
 });
 promo.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();apply.click();}});
}
paint();

// The browser displays estimates; the booking API recalculates all payable amounts.
const review=byID('deposit-review'),pay=byID('paypal-deposit'),terms=byID('booking-terms'),paymentStatus=byID('payment-status');
let checkoutEnabled=false,checkoutBusy=false,liveRooms=null;
function paintReview(){
 const q=calculateQuote(config,roomID,code);
 for(const [id,value] of Object.entries({'review-room':q.roomName,'review-base':money(q.base),'review-discount':'−'+money(q.discount),'review-total':money(q.total),'review-deposit-amount':money(q.deposit),'review-balance':money(q.balance),'review-code':q.code?'Promotion: '+q.code:'No promotion applied.'}))byID(id).textContent=value;
 byID('review-discount-row').hidden=!q.promoApplied;
 pay.disabled=!checkoutEnabled||!terms.checked||checkoutBusy||liveRooms?.[roomID]===0;
}
byID('review-deposit').addEventListener('click',()=>{review.hidden=false;paintReview();review.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});
for(const radio of document.querySelectorAll('input[name="accommodation"]'))radio.addEventListener('change',paintReview);
apply?.addEventListener('click',paintReview);promo?.addEventListener('input',paintReview);terms.addEventListener('change',paintReview);
async function api(path,body){const response=await fetch('/api/booking/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(data.error||'Could not complete this request.');return data;}
async function refreshAvailability(){
 try{
  const response=await fetch('/api/booking/availability',{cache:'no-store'});if(!response.ok)return;
  const data=await response.json();if(!data.enabled)return;
  const termsURL=new URL(data.termsURL,location.origin);if(termsURL.protocol!=='https:')return;
  checkoutEnabled=true;liveRooms=data.rooms;
  byID('checkout-preview-note').textContent='A verified deposit reserves one place. Your remaining balance is due February 1, 2027. Please review the booking terms before paying.';
  byID('checkout-footer-note').textContent=data.mode==='live'?'Secure deposit payments via PayPal':'PayPal sandbox · Test payments only';
  byID('checkout-mode').textContent=data.mode==='live'?'SECURE PAYPAL DEPOSIT CHECKOUT':'PAYPAL SANDBOX — TEST PAYMENTS ONLY';
  byID('checkout-availability').textContent=`${data.remaining} places available · ${data.rooms.private} private · ${data.rooms.shared} shared`;
  byID('deposit-explanation').textContent='Only the 50% deposit is charged now. The balance is due February 1, 2027.';
  byID('booking-terms-link').href=termsURL.href;byID('booking-terms-link').hidden=false;byID('booking-terms-pending').hidden=true;terms.disabled=false;
  paymentStatus.textContent='You’ll continue to PayPal to approve your deposit. Your checkout hold lasts 15 minutes.';
  for(const radio of document.querySelectorAll('input[name="accommodation"]')){radio.disabled=data.rooms[radio.value]===0;}
  paintReview();
 }catch{/* The static preview remains usable when the payment backend is not connected. */}
}
pay.addEventListener('click',async()=>{
 if(pay.disabled||checkoutBusy)return;
 if(sessionStorage.getItem('primal-booking')){paymentStatus.textContent='You already have a checkout in progress. Finish or cancel it before starting another.';return;}
 checkoutBusy=true;paintReview();paymentStatus.textContent='Checking availability and preparing your secure PayPal checkout…';
 try{
  sessionStorage.setItem('primal-storage-check','1');sessionStorage.removeItem('primal-storage-check');
  const data=await api('create',{room:roomID,code,termsAccepted:terms.checked});
  sessionStorage.setItem('primal-booking',JSON.stringify({reference:data.reference,orderID:data.orderID}));
  location.assign(data.approvalURL);
 }catch(e){paymentStatus.textContent=e.message;checkoutBusy=false;paintReview();}
});
const params=new URLSearchParams(location.search);
if(params.has('checkout_preview')){review.hidden=false;paintReview();}
async function confirmPayment(reference){
 checkoutBusy=true;review.hidden=false;paintReview();paymentStatus.textContent='Verifying your deposit with PayPal. Please keep this page open…';
 try{
  const data=await api('capture',{reference});
  if(data.status==='paid'){
   byID('review-room').textContent=data.room==='private'?'Private room':'Shared room';
   for(const [id,value] of Object.entries({'review-total':data.total,'review-deposit-amount':data.deposit,'review-balance':data.balance}))byID(id).textContent=money(value);
   byID('review-base').textContent=money(data.base);byID('review-discount').textContent='−'+money(data.discount);byID('review-discount-row').hidden=!data.discount;byID('review-code').textContent=data.code?'Promotion: '+data.code:'No promotion applied.';
   paymentStatus.textContent=`Your deposit is confirmed and one place is reserved. Booking reference: ${data.reference}. Remaining balance: ${money(data.balance)}, due ${data.balanceDue}. Keep your PayPal receipt.`;
   byID('checkout-mode').textContent='DEPOSIT PAID — PLACE RESERVED';pay.hidden=true;byID('review-deposit').disabled=true;
   for(const el of document.querySelectorAll('input[name="accommodation"],#apply-promo,#promo-code,#booking-terms'))el.disabled=true;
   sessionStorage.removeItem('primal-booking');
  }else{
   paymentStatus.textContent=`Your deposit confirmation is pending. Reference: ${reference}. Please check again or contact info@primalresetretreats.com before making another payment.`;
   pay.textContent='Check payment status';pay.disabled=false;pay.onclick=()=>confirmPayment(reference);
  }
 }catch(e){paymentStatus.textContent=e.message+' Contact info@primalresetretreats.com with reference '+reference+' before paying again.';}
}
await refreshAvailability();
if(params.has('booking_return')||params.has('booking_cancel')){
 let saved;try{saved=JSON.parse(sessionStorage.getItem('primal-booking')||'null');}catch{}
 if(saved?.reference){
  if(params.has('booking_return'))await confirmPayment(saved.reference);
  else{try{await api('cancel',{reference:saved.reference});sessionStorage.removeItem('primal-booking');}catch{}paymentStatus.textContent='PayPal checkout was cancelled. No booking has been confirmed.';review.hidden=false;}
 }else{review.hidden=false;paymentStatus.textContent='We could not find your checkout session. Please contact info@primalresetretreats.com if you approved a payment. Do not pay again until it is checked.';}
 history.replaceState(null,'',location.pathname+'#deposit-review');
}
