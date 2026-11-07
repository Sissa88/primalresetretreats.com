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
