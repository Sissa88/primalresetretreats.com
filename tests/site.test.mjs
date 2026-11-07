import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,rm,access} from 'node:fs/promises';
import path from 'node:path';
import {build,root,esc,markdown,imageURL} from '../scripts/build.mjs';
const get=rel=>readFile(path.join(root,rel),'utf8');
test('rendered site has two separately configured forms, no browser-local submission storage',async()=>{
 const home=await get('dist/index.html'),coach=await get('dist/coach-with-us/index.html');
 assert.match(home,/data-kind="retreat"/);assert.match(coach,/data-kind="coach"/);
 assert.match(home,/Inquiries opening soon/);assert.match(coach,/Inquiries opening soon/);
 assert.doesNotMatch(await get('dist/local.js'),/localStorage|Saved on this device/);
 assert.doesNotMatch(home,/\{\{[A-Z_a-z0-9]+\}\}/);
});
test('editor is pinned, has correct repository and creates retreats and pages',async()=>{
 const config=JSON.parse(await get('dist/admin/config.json'));
 assert.equal(config.backend.repo,'Sissa88/primalresetretreats.com');
 assert.equal(config.backend.branch,'main');
 assert.ok(config.collections.find(c=>c.name==='retreats').create);
 assert.ok(config.collections.find(c=>c.name==='pages').create);
 assert.match(await get('dist/admin/index.html'),/decap-cms@3\.17\.3/);
});
test('markdown and template content escape unsafe HTML and links',()=>{
 assert.equal(esc('<script>'), '&lt;script&gt;');
 assert.doesNotMatch(markdown('<script>alert(1)</script>'),/<script>/);
 assert.doesNotMatch(markdown('[click](javascript:alert%281%29)'),/href="javascript:/);
 assert.throws(()=>imageURL('https://attacker.example/image.png'));
 assert.throws(()=>imageURL('//attacker.example/image.png'));
 assert.match(markdown('## Your reset\n\nA **strong** start.'),/<h2>Your reset<\/h2>/);
});
test('CMS edits, new retreats, pages, form IDs and sitemap reach generated website',async()=>{
 const settingsPath=path.join(root,'content/settings.json');const original=await get('content/settings.json');
 const fixture=path.join(root,'content/retreats/test-retreat.json');const page=path.join(root,'content/pages/test-page.json');
 try{
  await writeFile(settingsPath,JSON.stringify({...JSON.parse(original),site_url:'https://example.com',allow_indexing:true,retreat_form_id:'test123',coach_form_id:'coach123'}));
  await writeFile(fixture,JSON.stringify({title:'New retreat <test>',summary:'A new experience.',image:'/primal-reset-hero.png',dates:'New dates',duration:'3 days',location:'Hawaiʻi',capacity:'8 people',price:'Ask us',body:'## A fresh start\n\nBuilt for you.',published:true}));
  await writeFile(page,JSON.stringify({type:'custom',title:'Our approach',description:'More about us',body:'## Welcome\n\nAn honest conversation.',published:true}));
  await build();
  const home=await get('dist/index.html');
  assert.match(home,/New retreat &lt;test&gt;/);assert.match(home,/href="\/retreats\/test-retreat\//);
  assert.match(home,/https:\/\/formspree.io\/f\/test123/);
  assert.match(await get('dist/coach-with-us/index.html'),/https:\/\/formspree.io\/f\/coach123/);
  assert.match(await get('dist/retreats/test-retreat/index.html'),/<h2>A fresh start<\/h2>/);
  assert.match(await get('dist/test-page/index.html'),/An honest conversation/);
  assert.match(await get('dist/sitemap.xml'),/https:\/\/example.com\/retreats\/test-retreat\//);
  assert.match(home,/href="\/test-page\//);
  const record=JSON.parse(await get('content/retreats/mens-rebirth.json'));
  const retreatPath=path.join(root,'content/retreats/mens-rebirth.json');const before=await get('content/retreats/mens-rebirth.json');
  try{await writeFile(retreatPath,JSON.stringify({...record,title:'A renamed retreat',dates:'March 2027',capacity:'10 men',published:false}));await build();assert.doesNotMatch(await get('dist/index.html'),/A renamed retreat/);await assert.rejects(access(path.join(root,'dist/retreats/mens-rebirth/index.html')));}
  finally{await writeFile(retreatPath,before);}
 }finally{await writeFile(settingsPath,original);await rm(fixture,{force:true});await rm(page,{force:true});await build();}
});
