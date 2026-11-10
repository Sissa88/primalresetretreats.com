import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {calculateQuote} from '../public/pricing-model.js';
import {validatePricing,renderPricing} from '../scripts/pricing.mjs';
import {esc,imageURL} from '../scripts/build.mjs';
const config=JSON.parse(await readFile(new URL('../content/pricing.json',import.meta.url),'utf8'));
test('private and shared standard prices calculate a 50% planned deposit',()=>{
 const privateQuote=calculateQuote(config,'private');
 assert.deepEqual([privateQuote.base,privateQuote.total,privateQuote.deposit,privateQuote.balance],[585000,585000,292500,292500]);
 const shared=calculateQuote(config,'shared');
 assert.deepEqual([shared.total,shared.deposit,shared.balance],[520000,260000,260000]);
});
test('30% promo is applied before splitting the deposit, preserving cents',()=>{
 const privateQuote=calculateQuote(config,'private','  opengatehostel  ');
 assert.equal(privateQuote.promoApplied,true);
 assert.deepEqual([privateQuote.discount,privateQuote.total,privateQuote.deposit,privateQuote.balance],[175500,409500,204750,204750]);
 const shared=calculateQuote(config,'shared','OPENGATEHOSTEL');
 assert.deepEqual([shared.discount,shared.total,shared.deposit,shared.balance],[156000,364000,182000,182000]);
});
test('invalid and removed codes return to standard pricing; disabled promos have no effect',()=>{
 assert.equal(calculateQuote(config,'private','wrong').total,585000);
 assert.equal(calculateQuote(config,'private','').promoApplied,false);
 assert.equal(calculateQuote({...config,promo_enabled:false},'shared','OPENGATEHOSTEL').total,520000);
});
test('rounding never loses or invents a cent between the deposit and balance',()=>{
 const custom={...config,rooms:[{id:'odd',name:'Odd cents',price:100.01}],promo_enabled:false};
 const q=calculateQuote(custom,'odd');assert.equal(q.deposit+q.balance,q.total);assert.equal(q.total,10001);
});
test('invalid room and price settings fail rather than producing a misleading quote',()=>{
 assert.throws(()=>calculateQuote(config,'missing'));
 assert.throws(()=>validatePricing({...config,rooms:[]}));
 assert.throws(()=>validatePricing({...config,deposit_percent:101}));
 assert.throws(()=>validatePricing({...config,promo_percent:-1}));
 assert.throws(()=>validatePricing({...config,rooms:config.rooms.map(r=>({...r,id:'duplicate'}))}));
});
test('pricing page is an inquiry preview with real photos and no payment collection',()=>{
 const html=renderPricing(config,{esc,imageURL,formHtml:'<form></form>',contactEmail:'info@example.com'});
 assert.match(html,/No payments collected/);assert.match(html,/Nothing is charged today/);
 assert.match(html,/one guest/);assert.match(html,/not live remaining availability/);
 assert.match(html,/room-private-canopy-1.jpg/);assert.match(html,/room-shared-cabin-1.jpg/);
 assert.match(html,/mailto:info@example.com/);
 assert.doesNotMatch(html,/checkout\.stripe\.com|name="card/);
});
test('built site exposes the editable pricing collection and clear pricing navigation',async()=>{
 const home=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 assert.match(home,/class="home-nav"/);assert.match(home,/href="\/pricing\/">Rooms &amp; pricing/);
 const cms=JSON.parse(await readFile(new URL('../dist/admin/config.json',import.meta.url),'utf8'));
 const pricing=cms.collections.find(c=>c.name==='pricing');assert.equal(pricing.files[0].file,'content/pricing.json');
 assert.equal(await readFile(new URL('../dist/_redirects',import.meta.url),'utf8'),'/book /pricing/ 301\n/book/ /pricing/ 301\n');
});
