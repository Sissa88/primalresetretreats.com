// SDK v6 creates PayPal-hosted fields; our code never reads card numbers or CVVs.
export async function setupCardCheckout({api,start,confirm,cancel,canPay,setBusy,money,quote,validateGuest=()=>true}){
 const el=id=>document.getElementById(id),panel=el('card-checkout'),button=el('card-deposit'),status=el('card-status');
 let loading=false,session=null;
 const countryNames=new Intl.DisplayNames(['en'],{type:'region'});
 const countryCodes='AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
 for(const code of countryCodes.sort((a,b)=>countryNames.of(a).localeCompare(countryNames.of(b)))){const option=document.createElement('option');option.value=code;option.textContent=countryNames.of(code);el('card-country').appendChild(option);}
 function update(){button.disabled=!session||!canPay();button.textContent=`Pay ${money(quote().deposit)} deposit by card ↗`;}
 panel.hidden=false;
 panel.addEventListener('toggle',async()=>{
  if(!panel.open||session||loading)return;
  loading=true;status.textContent='Loading secure card fields…';
  try{
   const token=await api('card-token',{});
   await new Promise((resolve,reject)=>{
    if(window.paypal?.createInstance){resolve();return;}
    const script=document.createElement('script');script.src=token.mode==='live'?'https://www.paypal.com/web-sdk/v6/core':'https://www.sandbox.paypal.com/web-sdk/v6/core';script.async=true;script.onload=resolve;script.onerror=reject;document.head.append(script);
   });
   const sdk=await window.paypal.createInstance({clientToken:token.clientToken,components:['card-fields'],pageType:'checkout'});
   const methods=await sdk.findEligibleMethods({currencyCode:'USD'});
   if(!methods.isEligible('advanced_cards'))throw Error('Card payments are not available for this checkout. Please choose PayPal below.');
   session=sdk.createCardFieldsOneTimePaymentSession();
   for(const [id,type,placeholder] of [['card-number','number','Card number'],['card-expiry','expiry','MM/YY'],['card-cvv','cvv','CVV']]){
    el(id).appendChild(session.createCardFieldsComponent({type,placeholder,style:{input:{fontSize:'16px',color:'#17231d'}}}));
   }
   el('card-form').hidden=false;status.textContent=token.mode==='sandbox'?'SANDBOX: use PayPal test card details only.':'Secure debit and credit card payment.';update();
  }catch(e){status.textContent=e.message||'Secure card fields could not load. Please choose PayPal below.';session=null;}
  finally{loading=false;}
 });
 button.addEventListener('click',async()=>{
  if(button.disabled||!canPay())return;
  if(!validateGuest())return;
  const name=el('card-name');name.value=name.value.trim();
  if(!name.reportValidity()){status.textContent='Please enter the name exactly as it appears on the card.';return;}
  if(!el('card-country').value){status.textContent='Please select your billing country.';el('card-country').focus();return;}
  let booking=null,submitted=false;
  setBusy(true);update();status.textContent='Checking availability and preparing your deposit…';
  try{
   booking=await start('card',name.value);
   const postal=el('card-postal').value.trim();
   const result=await session.submit(booking.orderID,{billingAddress:{countryCode:el('card-country').value,...(postal?{postalCode:postal}:{})}});
   if(result.state==='succeeded'){
    submitted=true;
    status.textContent='Verifying your deposit…';
    await confirm(booking.reference);
    el('card-form').hidden=true;
    status.textContent='See your payment confirmation or status below.';
   }else if(['canceled','failed'].includes(result.state)){
    await cancel(booking.reference);booking=null;
    status.textContent=result.state==='canceled'?'Card authentication was cancelled. No booking is confirmed. You can try again.':'The card could not be approved. Check your details or choose PayPal.';
   }else{
    submitted=true;status.textContent='Card confirmation is pending. Check the payment status below before trying again.';await confirm(booking.reference);
   }
  }catch{
   // After submission is uncertain, retain the booking reference and check PayPal;
   // never encourage a second charge while the payment status is unknown.
   if(booking){submitted=true;status.textContent='Card confirmation was interrupted. Check payment status below before paying again.';await confirm(booking.reference);}
   else status.textContent='We could not start card checkout. Please try again or choose PayPal.';
  }finally{if(!submitted)setBusy(false);update();}
 });
 return {update};
}
