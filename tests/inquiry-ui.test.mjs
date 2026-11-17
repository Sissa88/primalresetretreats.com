import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const code=await readFile(new URL('../public/local.js',import.meta.url),'utf8');
function setup({dbOK=true,providerOK=true,providerResult={success:'true'},initiallyDisabled=false,kind='retreat',provider='formsubmit'}={}){
 let submitHandler,onShow,redirect=null,reset=false,nativeSubmitted=false;
 const calls=[],status={textContent:''},button={disabled:initiallyDisabled,textContent:initiallyDisabled?'Sending…':'Send inquiry',dataset:{readyLabel:'Send inquiry ↗'}};
 const fields=Object.fromEntries(Object.entries({name:'Guest',email:'guest@example.com',message:'Message sent only to the email provider',country:'Canada',phone:'',age:'42',_honey:'',_next:'https://primalresetretreats.com/thank-you/'}).map(([key,value])=>[key,{value}]));fields.contact_permission={checked:true,value:'Yes'};fields.marketing_opt_in={checked:false,value:'Yes'};
 const form={dataset:{kind,provider},action:provider==='formsubmit'?'https://formsubmit.co/7e6131f9762722c6f31ce70aa2fbd74b':'https://formspree.io/f/test123',elements:fields,reportValidity:()=>true,querySelector:selector=>selector==='.form-status'?status:button,reset(){reset=true;},addEventListener:(event,callback)=>{if(event==='submit')submitHandler=callback;}};
 const document={querySelectorAll:selector=>selector==='.inquiry-form'?[form]:[],querySelector:()=>null,createElement:()=>({})};
 const window={addEventListener:(name,callback)=>{if(name==='pageshow')onShow=callback;},location:{assign:path=>redirect=path}};
 class FakeFormData{constructor(f){return new Map(Object.entries(f.elements).filter(([,v])=>v.checked!==false).map(([key,v])=>[key,v.value]));}}
 const fetch=async(url,options)=>{calls.push({url,body:typeof options.body==='string'?JSON.parse(options.body):Object.fromEntries(options.body)});if(url==='/api/contacts/inquiry')return {ok:dbOK,json:async()=>({saved:dbOK})};return {ok:providerOK,json:async()=>providerResult};};
 vm.runInNewContext(code,{document,window,crypto,AbortSignal,FormData:FakeFormData,HTMLFormElement:{prototype:{submit(){nativeSubmitted=true;}}},fetch});
 return {calls,status,button,form,submit:()=>submitHandler({preventDefault(){}}),show:()=>onShow(),get redirect(){return redirect;},get reset(){return reset;},get nativeSubmitted(){return nativeSubmitted;}};
}
test('FormSubmit uses its native CAPTCHA and configured return flow without the timeout relay',async()=>{
 const f=setup();await f.submit();assert.equal(f.nativeSubmitted,true);assert.equal(f.redirect,null);assert.equal(f.reset,false);assert.equal(f.calls.length,1);assert.equal(f.calls[0].url,'/api/contacts/inquiry');assert.equal(f.calls[0].body.marketingOptIn,false);assert.equal(f.calls[0].body.message,undefined);assert.equal(f.form.elements._next.value,'https://primalresetretreats.com/thank-you/');
});
test('database failure cannot prevent native email submission',async()=>{
 const f=setup({dbOK:false});await f.submit();assert.equal(f.nativeSubmitted,true);assert.equal(f.calls.length,1);
});
test('Formspree redirects only on acknowledgement and preserves the message on failure',async()=>{
 const success=setup({provider:'formspree',providerResult:{ok:true}});await success.submit();assert.equal(success.redirect,'/thank-you/');assert.equal(success.reset,true);
 const failure=setup({provider:'formspree',providerOK:false,providerResult:{error:'Not accepted'}});await failure.submit();assert.equal(failure.redirect,null);assert.equal(failure.reset,false);assert.equal(failure.button.disabled,false);
});
test('coach applications submit natively without guest database capture',async()=>{
 const f=setup({kind:'coach'});await f.submit();assert.equal(f.nativeSubmitted,true);assert.equal(f.calls.length,0);
});
test('configured send buttons recover from Firefox reload and back navigation',()=>{
 const f=setup({initiallyDisabled:true});assert.equal(f.button.disabled,false);assert.equal(f.button.textContent,'Send inquiry ↗');f.button.disabled=true;f.button.textContent='Sending…';f.show();assert.equal(f.button.disabled,false);assert.equal(f.button.textContent,'Send inquiry ↗');
});
