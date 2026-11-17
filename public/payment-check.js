const byID=id=>document.getElementById(id),button=byID('check'),status=byID('status'),list=byID('checks'),result=byID('result');
button.addEventListener('click',async()=>{
 button.disabled=true;list.replaceChildren();result.hidden=true;status.textContent='Checking the payment connection without creating an order…';
 const row=(label,value)=>{const li=document.createElement('li');li.textContent=label+': '+value;list.append(li);};
 try{
  const response=await fetch('/api/booking/eligibility',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),data=await response.json();
  if(!response.ok)throw Error(data.error||'Unable to check eligibility.');
  row('PayPal mode',data.mode.toUpperCase());row('PayPal connection','Verified');row('Public payments',data.checkoutPaused?'Paused':'Enabled');row('Payment webhook',data.webhookRegistered?'Verified':'Needs checking');row('Booking terms',data.termsReady?'Configured':'Needs checking');row('Booking database',data.databaseReady?(data.freshDatabase?'Fresh database': 'Contains booking records'):'Needs checking');
  if(data.rooms)row('Available places',`${data.rooms.private} private + ${data.rooms.shared} shared = ${data.remaining}`);
  await new Promise((resolve,reject)=>{if(window.paypal?.createInstance){resolve();return;}const script=document.createElement('script');script.src=data.mode==='live'?'https://www.paypal.com/web-sdk/v6/core':'https://www.sandbox.paypal.com/web-sdk/v6/core';script.async=true;script.onload=resolve;script.onerror=()=>reject(Error('The PayPal browser check could not load. Try a private window with blockers disabled for this page.'));document.head.append(script);});
  const sdk=await window.paypal.createInstance({clientToken:data.clientToken,components:['card-fields'],pageType:'checkout'});
  const methods=await sdk.findEligibleMethods({currencyCode:'USD'}),eligible=methods.isEligible('advanced_cards');
  row('Card fields in this browser',eligible?'Eligible':'Not eligible');
  result.textContent=eligible?'PayPal reports card fields are eligible in this browser. No order was created and no payment was taken.':'PayPal did not offer card fields in this browser. This result alone does not identify the reason; confirm Live card approval with PayPal Business Support.';result.hidden=false;
  status.textContent='Check complete. Your checkout settings have not been changed.';
 }catch(e){status.textContent=e.message||'Unable to complete the check. No payment has been taken.';}
 finally{button.disabled=false;}
});
