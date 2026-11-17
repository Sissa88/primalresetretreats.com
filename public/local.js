"use strict";
for(const form of document.querySelectorAll('.inquiry-form')){
 const status=form.querySelector('.form-status'),button=form.querySelector('button[type=submit]');
 const readyLabel=button.dataset?.readyLabel||button.textContent;
 const restoreButton=()=>{if(['formsubmit','formspree'].includes(form.dataset.provider)){button.disabled=false;button.textContent=readyLabel;}};
 restoreButton();
 if(typeof window!=='undefined')window.addEventListener('pageshow',restoreButton);
 form.addEventListener('invalid',event=>{
  const label=event.target.labels?.[0]?.textContent?.replace(/\s+/g,' ').trim()||'the highlighted field';
  status.textContent='Please check '+label+': '+event.target.validationMessage;
 },true);
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!form.reportValidity()||button.disabled)return;
  if(!form.elements.name.value.trim()||!form.elements.message.value.trim()||!form.elements.country.value.trim()){status.textContent='Please enter your name, country, and a short message.';return;}
  const isFormSubmit=form.dataset.provider==='formsubmit'&&/^https:\/\/formsubmit\.co\/[^/?#]+$/.test(form.action);
  const isFormspree=form.dataset.provider==='formspree'&&/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(form.action);
  if(!isFormSubmit&&!isFormspree){status.textContent='Online inquiries are not connected. Please email us directly.';return;}
  const formData=new FormData(form),payload=Object.fromEntries(formData);
  button.disabled=true;button.textContent='Sending…';status.textContent='Sending your message…';
  let sent=false;
  if(form.dataset.kind==='retreat'){
   try{
    if(!form.dataset.customerId)form.dataset.customerId=crypto.randomUUID();
    const response=await fetch('/api/contacts/inquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:form.dataset.customerId,name:payload.name,email:payload.email,phone:payload.phone||'',country:payload.country,age:payload.age,contactPermission:form.elements.contact_permission.checked,marketingOptIn:form.elements.marketing_opt_in?.checked===true,honey:payload._honey||''}),signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Error();
   }catch{/* Email delivery must still work if profile storage is temporarily unavailable. */}
  }
  if(isFormSubmit){
   // Let FormSubmit complete its CAPTCHA and redirect using the hidden _next.
   // A timed-out AJAX relay can deliver email without returning an acknowledgement.
   status.textContent='Opening the secure spam check. After submitting, you will return to our thank-you page.';
   button.textContent='Continue…';
   HTMLFormElement.prototype.submit.call(form);
   return;
  }
  try{
   const response=await fetch(form.action,{method:'POST',headers:{Accept:'application/json'},body:formData,signal:AbortSignal.timeout(25000)});
   const result=await response.json();
   const confirmed=result.ok!==false;
   if(!response.ok||!confirmed)throw Error(result.error||'We could not confirm submission. Your message is still here. Please email info@primalresetretreats.com before trying again.');
   sent=true;status.textContent='Thank you. Your message has been submitted. Opening your confirmation…';button.textContent='Message sent';
   form.reset();delete form.dataset.customerId;
   window.location.assign('/thank-you/');
  }catch(error){
   status.textContent=error.message==='Failed to fetch'||error.name==='TimeoutError'?'The connection was interrupted. Please email info@primalresetretreats.com before sending again.':error.message||'We could not confirm submission. Please email info@primalresetretreats.com before trying again.';
  }finally{if(!sent)restoreButton();}
 });
}
for (const header of document.querySelectorAll('header:not([data-custom-header])')) {
  const menu = document.createElement('details'); menu.className = 'local-menu';
  const summary = document.createElement('summary'); summary.textContent = 'Menu'; menu.append(summary);
  const nav = document.createElement('nav'); nav.setAttribute('aria-label','All pages');
  for (const [label, href] of [['Home','/'],['Pricing & rooms','/pricing/'],['Retreats','/#retreats'],['The team','/#team'],['FAQs','/#faq'],['Contact us','/#inquire']]) {
    const a = document.createElement('a'); a.textContent = label; a.href = href; nav.append(a);
  }
  menu.append(nav); header.append(menu);
  nav.addEventListener('click', () => { menu.open = false; });
}
const skip = document.createElement('a'); skip.href = '#main-content'; skip.className = 'skip-link'; skip.textContent = 'Skip to content';
const main = document.querySelector('main');
if (main) { main.id = 'main-content'; main.tabIndex = -1; document.body.prepend(skip); }

for (const menu of document.querySelectorAll('.home-mobile-menu')) {
 menu.addEventListener('click',event=>{if(event.target.closest('a'))menu.open=false;});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus();}});
}
