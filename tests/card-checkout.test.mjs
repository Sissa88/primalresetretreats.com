import test from 'node:test';
import assert from 'node:assert/strict';
import {setupCardCheckout} from '../public/card-checkout.js';
async function fixture(t,result){
 const oldDocument=globalThis.document,oldWindow=globalThis.window;t.after(()=>{globalThis.document=oldDocument;globalThis.window=oldWindow;});
 const nodes=new Map();
 const el=id=>{if(!nodes.has(id))nodes.set(id,{value:id==='card-country'?'US':'',open:true,hidden:false,disabled:false,children:[],events:{},appendChild(child){this.children.push(child);},addEventListener(name,fn){this.events[name]=fn;},focus(){}});return nodes.get(id);};
 globalThis.document={getElementById:el,createElement:()=>({})};
 let submitted,confirmed=0,cancelled=0,busy=false;
 globalThis.window={paypal:{createInstance:async()=>({findEligibleMethods:async()=>({isEligible:()=>true}),createCardFieldsOneTimePaymentSession:()=>({createCardFieldsComponent:({type})=>({type}),submit:async(order,options)=>{submitted={order,options};if(result instanceof Error)throw result;return result;}})})}};
 await setupCardCheckout({api:async()=>({clientToken:'browser-token',mode:'sandbox'}),start:async()=>({reference:'reference',orderID:'ORDER'}),confirm:async()=>{confirmed++;},cancel:async()=>{cancelled++;},canPay:()=>!busy,setBusy:value=>busy=value,money:c=>String(c/100),quote:()=>({deposit:204750})});
 await el('card-checkout').events.toggle();
 return {el,pay:()=>el('card-deposit').events.click(),get submitted(){return submitted;},get confirmed(){return confirmed;},get cancelled(){return cancelled;},get busy(){return busy;}};
}
test('card success submits hosted fields then confirms the existing deposit reservation',async t=>{
 const f=await fixture(t,{state:'succeeded',data:{orderId:'ORDER'}});await f.pay();
 assert.equal(f.submitted.order,'ORDER');assert.equal(f.submitted.options.billingAddress.countryCode,'US');assert.equal(f.confirmed,1);assert.equal(f.cancelled,0);assert.equal(f.busy,true);
});
test('cancelled card authentication releases an uncaptured hold and permits retry',async t=>{
 const f=await fixture(t,{state:'canceled'});await f.pay();assert.equal(f.confirmed,0);assert.equal(f.cancelled,1);assert.equal(f.busy,false);
});
test('uncertain card submission keeps the hold and checks status instead of a new charge',async t=>{
 const f=await fixture(t,Error('Network interruption'));await f.pay();assert.equal(f.confirmed,1);assert.equal(f.cancelled,0);assert.equal(f.busy,true);
});
