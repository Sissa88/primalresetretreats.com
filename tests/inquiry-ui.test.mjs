import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const code=await readFile(new URL('../public/local.js',import.meta.url),'utf8');
test('native email submission follows database save and marketing choice is separate from contact permission',async()=>{
 let submitHandler,nativeSubmitted=false,payload;
 const status={textContent:''},button={disabled:false,textContent:'Send inquiry'};
 const fields=Object.fromEntries(Object.entries({name:'Guest',email:'guest@example.com',message:'Private message only sent by email',country:'Canada',phone:'',age:'42',_honey:''}).map(([key,value])=>[key,{value}]));fields.contact_permission={checked:true};fields.marketing_opt_in={checked:false};
 const form={dataset:{kind:'retreat',provider:'formsubmit'},elements:fields,reportValidity:()=>true,querySelector:selector=>selector==='.form-status'?status:button,addEventListener:(event,callback)=>{if(event==='submit')submitHandler=callback;}};
 const document={querySelectorAll:selector=>selector==='.inquiry-form'?[form]:[],querySelector:()=>null,createElement:()=>({})};
 const context={document,crypto,AbortSignal,HTMLFormElement:{prototype:{submit(){nativeSubmitted=true;}}},fetch:async(url,options)=>{assert.equal(nativeSubmitted,false);assert.equal(url,'/api/contacts/inquiry');payload=JSON.parse(options.body);return {ok:true,json:async()=>({saved:true})};}};
 vm.runInNewContext(code,context);await submitHandler({preventDefault(){}});
 assert.equal(nativeSubmitted,true);assert.equal(payload.marketingOptIn,false);assert.equal(payload.contactPermission,true);assert.equal(payload.message,undefined);assert.equal(payload.age,'42');
});
test('customer database failure cannot prevent native contact email submission',async()=>{
 let handler,nativeSubmitted=false;
 const status={textContent:''},button={disabled:false,textContent:'Send inquiry'};
 const elements=Object.fromEntries(Object.entries({name:'Guest',email:'guest@example.com',message:'A question',country:'Canada',phone:'',age:'42',_honey:''}).map(([key,value])=>[key,{value}]));elements.contact_permission={checked:true};elements.marketing_opt_in={checked:false};
 const form={dataset:{kind:'retreat',provider:'formsubmit'},elements,reportValidity:()=>true,querySelector:selector=>selector==='.form-status'?status:button,addEventListener:(event,callback)=>{if(event==='submit')handler=callback;}};
 const document={querySelectorAll:selector=>selector==='.inquiry-form'?[form]:[],querySelector:()=>null,createElement:()=>({})};
 vm.runInNewContext(code,{document,crypto,AbortSignal,HTMLFormElement:{prototype:{submit(){nativeSubmitted=true;}}},fetch:async()=>({ok:false,json:async()=>({error:'Database temporarily unavailable'})})});
 await handler({preventDefault(){}});assert.equal(nativeSubmitted,true);assert.match(status.textContent,/email submission/);
});
