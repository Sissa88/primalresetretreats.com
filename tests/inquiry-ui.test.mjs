import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const code=await readFile(new URL('../public/local.js',import.meta.url),'utf8');
function setup({dbOK=true,providerOK=true,providerResult={success:'true'},initiallyDisabled=false,kind='retreat'}={}){
 let submitHandler,onShow,redirect=null,reset=false;
 const calls=[],status={textContent:''},button={disabled:initiallyDisabled,textContent:initiallyDisabled?'Sending…':'Send inquiry',dataset:{readyLabel:'Send inquiry ↗'}};
 const fields=Object.fromEntries(Object.entries({name:'Guest',email:'guest@example.com',message:'Message sent only to the email provider',country:'Canada',phone:'',age:'42',_honey:'',_next:'https://primalresetretreats.com/thank-you/'}).map(([key,value])=>[key,{value}]));fields.contact_permission={checked:true,value:'Yes'};fields.marketing_opt_in={checked:false,value:'Yes'};
 const form={dataset:{kind,provider:'formsubmit'},action:'https://formsubmit.co/info@primalresetretreats.com',elements:fields,reportValidity:()=>true,querySelector:selector=>selector==='.form-status'?status:button,reset(){reset=true;},addEventListener:(event,callback)=>{if(event==='submit')submitHandler=callback;}};
 const document={querySelectorAll:selector=>selector==='.inquiry-form'?[form]:[],querySelector:()=>null,createElement:()=>({})};
 const window={addEventListener:(name,callback)=>{if(name==='pageshow')onShow=callback;},location:{assign:path=>redirect=path}};
 class FakeFormData{constructor(f){return new Map(Object.entries(f.elements).filter(([,v])=>v.checked!==false).map(([key,v])=>[key,v.value]));}}
 const fetch=async(url,options)=>{calls.push({url,body:typeof options.body==='string'?JSON.parse(options.body):Object.fromEntries(options.body)});if(url==='/api/contacts/inquiry')return {ok:dbOK,json:async()=>({saved:dbOK})};return {ok:providerOK,json:async()=>providerResult};};
 vm.runInNewContext(code,{document,window,crypto,AbortSignal,FormData:FakeFormData,fetch});
 return {calls,status,button,form,submit:()=>submitHandler({preventDefault(){}}),show:()=>onShow(),get redirect(){return redirect;},get reset(){return reset;}};
}
test('successful provider acknowledgement redirects to the website thank-you page',async()=>{
 const f=setup();await f.submit();assert.equal(f.redirect,'/thank-you/');assert.equal(f.reset,true);assert.equal(f.calls.length,2);assert.equal(f.calls[0].url,'/api/contacts/inquiry');assert.equal(f.calls[0].body.marketingOptIn,false);assert.equal(f.calls[0].body.message,undefined);assert.equal(f.calls[1].url,'https://formsubmit.co/ajax/info@primalresetretreats.com');assert.match(f.calls[1].body.message,/only to the email provider/);
});
test('database failure cannot prevent email submission or its thank-you redirect',async()=>{
 const f=setup({dbOK:false});await f.submit();assert.equal(f.redirect,'/thank-you/');assert.equal(f.calls.length,2);
});
test('a failed or unconfirmed delivery never shows thank-you or discards the message',async()=>{
 for(const providerResult of [{success:false},{success:'false'},{}]){
  const f=setup({providerResult});await f.submit();assert.equal(f.redirect,null);assert.equal(f.reset,false);assert.equal(f.button.disabled,false);assert.match(f.status.textContent,/could not confirm/);
 }
});
test('coach applications use the same acknowledgement-driven return flow without guest database capture',async()=>{
 const f=setup({kind:'coach',providerResult:{success:true}});await f.submit();assert.equal(f.redirect,'/thank-you/');assert.equal(f.calls.length,1);assert.match(f.calls[0].url,/\/ajax\//);
});
test('configured send buttons recover from Firefox reload and back navigation',()=>{
 const f=setup({initiallyDisabled:true});assert.equal(f.button.disabled,false);assert.equal(f.button.textContent,'Send inquiry ↗');f.button.disabled=true;f.button.textContent='Sending…';f.show();assert.equal(f.button.disabled,false);assert.equal(f.button.textContent,'Send inquiry ↗');
});
