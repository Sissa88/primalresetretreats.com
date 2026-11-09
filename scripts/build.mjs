import {cp,mkdir,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {marked} from 'marked';
import {renderPricing} from './pricing.mjs';
import {renderCoachGrid} from './coaches.mjs';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function imageURL(v){if(!/^\/(?!\/)[^\s"<>]*$/.test(v||''))throw Error('Images must use a local path: '+v);return esc(v);}
const json=async p=>JSON.parse(await readFile(path.join(root,p),'utf8'));
const list=async folder=>Promise.all((await readdir(path.join(root,folder))).filter(f=>f.endsWith('.json')).sort().map(async f=>({slug:f.slice(0,-5),...await json(folder+'/'+f)})));
const slugOK=s=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
const renderer=new marked.Renderer();
renderer.html=({text})=>esc(text);
renderer.link=({href,title,tokens})=>{
 const safe=/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(href||'');
 return safe?`<a href="${esc(href)}"${title?` title="${esc(title)}"`:''}>${marked.Parser.parseInline(tokens,{renderer})}</a>`:esc(href);
};
renderer.image=({href,text})=>`<img src="${imageURL(href)}" alt="${esc(text)}" loading="lazy">`;
export const markdown=body=>marked.parse(body||'',{renderer});
function validID(id){if(id&&!/^[a-zA-Z0-9]+$/.test(id))throw Error('Use only the Formspree form ID, not a full URL.');return id;}
function form(kind,settings){
 const id=validID(settings[kind+'_form_id']);
 const note=id?'Your message will be sent securely through Formspree to the retreat team. Please avoid sensitive medical information.':'Online inquiries are not connected yet. Please check back soon.';
 const field=(name,label,type='text',required=true)=>`<div><label for="${kind}-${name}">${label}${required?' *':''}</label><input id="${kind}-${name}" name="${name}" type="${type}" autocomplete="${name==='name'?'name':name==='email'?'email':'tel'}" ${required?'required':''} maxlength="200"></div>`;
 return `<form class="inquiry-form" data-kind="${kind}" ${id?`action="https://formspree.io/f/${id}" method="POST"`:''}><p class="eyebrow">${kind==='coach'?'Coach application':'Private inquiry'}</p><h3>${kind==='coach'?'Tell us about your work.':'Begin the conversation.'}</h3><p class="form-note">${note}</p>${field('name','Full name')}${field('email','Email','email')}${field('phone','Phone','tel',false)}<div><label for="${kind}-message">${kind==='coach'?'Experience, qualifications, and availability':'What brings you here?'} *</label><textarea id="${kind}-message" name="message" required maxlength="6000" rows="5"></textarea></div><input type="hidden" name="inquiry_type" value="${kind}"><label class="consent"><input type="checkbox" name="contact_permission" required> I agree to be contacted about this ${kind==='coach'?'application':'inquiry'}.</label><button type="submit" ${id?'':'disabled'}>${id?(kind==='coach'?'Send application':'Request a conversation'):'Inquiries opening soon'}</button><p class="form-status" role="status" aria-live="polite"></p>${!id&&settings.contact_email?`<p>Questions? <a href="mailto:${esc(settings.contact_email)}">${esc(settings.contact_email)}</a></p>`:''}</form>`;
}
function cards(retreats){return `<section id="retreats" class="cms-section"><div class="cms-container"><p class="eyebrow">Find your reset</p><h2>The retreats.</h2><div class="retreat-grid">${retreats.map(r=>`<a class="retreat-card" href="/retreats/${r.slug}/"><img src="${imageURL(r.image)}" alt="${esc(r.title)}" loading="lazy"><div><p class="eyebrow">${esc(r.location)} · ${esc(r.duration)}</p><h3>${esc(r.title)}</h3><p>${esc(r.summary)}</p><p>${esc(r.dates)}</p><p>${esc(r.price)}</p><span>Explore this retreat →</span></div></a>`).join('')}</div></div></section>`;}
const shell=(data,body)=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(data.title)} | Primal Reset Retreats</title><meta name="description" content="${esc(data.summary||data.description)}"><link rel="stylesheet" href="/local.css"><link rel="icon" href="/favicon.svg"><script src="/local.js" defer></script></head><body class="cms-page"><header><a href="/">Primal Reset Retreats</a><a href="/#inquire">Request details</a></header><main id="main-content">${body}</main><footer><a href="/">Home</a> · <a href="/coach-with-us/">Coach with us</a>{{EXTRA_LINKS}}</footer></body></html>`;
async function renderTemplate(name,data,extra,settings){
 let s=await readFile(path.join(root,'templates',name+'.html'),'utf8');
 const vars={PAGE_TITLE:esc(data.title),PAGE_DESCRIPTION:esc(data.description||data.summary),FORM_COACH:form('coach',settings),FORM_RETREAT:form('retreat',settings),EXTRA_BODY:'',RETREAT_TITLE:esc(data.title),RETREAT_DATES:esc(data.dates),RETREAT_LOCATION:esc(data.location),RETREAT_CAPACITY:esc(data.capacity),RETREAT_SUMMARY:esc(data.summary),RETREAT_IMAGE:data.image?imageURL(data.image):'',...extra};
 for(const t of data.texts||[]){if(!t.id||typeof t.value!=='string')throw Error('Invalid text entry');vars[t.id]=esc(t.value);}
 for(const img of data.images||[]){vars[img.id+'_src']=imageURL(img.src);vars[img.id+'_alt']=esc(img.alt);}
 return s.replace(/\{\{([A-Z_a-z0-9]+)\}\}/g,(_,key)=>{if(!(key in vars))throw Error('Missing content: '+key);return vars[key];});
}
export async function build(){
 const settings=await json('content/settings.json');
 const pricing=await json('content/pricing.json');
 const {coaches}=await json('content/coaches.json');
 const coachGrid=renderCoachGrid(coaches,{esc,imageURL});
 if(settings.site_url&&!/^https:\/\/[^/]+\/?$/.test(settings.site_url))throw Error('Site URL must be an HTTPS origin with no path.');
 if(settings.contact_email&&!/^[^\s@<>"&]+@[^\s@<>"&]+\.[^\s@<>"&]+$/.test(settings.contact_email))throw Error('Invalid contact email.');
 const retreats=(await list('content/retreats')).filter(x=>x.published!==false);
 const pages=await list('content/pages');
 for(const item of [...retreats,...pages])if(!slugOK(item.slug))throw Error('Invalid page filename: '+item.slug);
 const custom=pages.filter(x=>!['home','coach-with-us'].includes(x.slug)&&x.published!==false);
 for(const p of custom)if(['admin','api','retreats','pricing','book'].includes(p.slug))throw Error('Reserved page name: '+p.slug);
 const links=`<nav class="extra-links" aria-label="More pages"><a href="/pricing/">Pricing &amp; rooms</a>${custom.map(p=>`<a href="/${p.slug}/">${esc(p.title)}</a>`).join('')}</nav>`;
 const out=path.join(root,'dist');await rm(out,{recursive:true,force:true});await cp(path.join(root,'public'),out,{recursive:true});
 // Page HTML is generated from templates and JSON; remove the earlier snapshot pages.
 for(const file of ['index.html','coach-with-us/index.html','retreats/mens-rebirth/index.html'])await rm(path.join(out,file),{force:true});
 const put=async (url,html)=>{html=html.replace('</head>','<link rel="stylesheet" href="/typography.css"></head>');if(settings.show_booking_button!==false)html=html.replace('</header>',`<a class="site-book-button" href="/pricing/">${esc(settings.booking_button_label||'Book now')} ↗</a></header>`);html=html.replace(/href="\/retreats\/([^/"#?]+)(?:[^"]*)"/g,(match,slug)=>retreats.some(r=>r.slug===slug)?match:'href="/#retreats"');const file=path.join(out,url,'index.html');await mkdir(path.dirname(file),{recursive:true});await writeFile(file,html);};
 await put('pricing',renderPricing(pricing,{esc,imageURL,formHtml:form('retreat',settings),footerLinks:links,contactEmail:settings.contact_email}));
 await writeFile(path.join(out,'_redirects'),'/book /pricing/ 301\n/book/ /pricing/ 301\n');
 const home=pages.find(x=>x.slug==='home'),coach=pages.find(x=>x.slug==='coach-with-us');
 await put('',await renderTemplate('home',home,{RETREAT_CARDS:cards(retreats),COACH_GRID:coachGrid,EXTRA_LINKS:links},settings));
 await put('coach-with-us',await renderTemplate('coach-with-us',coach,{EXTRA_LINKS:links},settings));
 for(const r of retreats){
  let body;
  if(r.slug==='mens-rebirth'){
   body=await renderTemplate('mens-rebirth',r,{EXTRA_LINKS:links,COACH_GRID:coachGrid,EXTRA_BODY:r.body?`<section class="cms-section"><article class="prose cms-container">${markdown(r.body)}</article></section>`:''},settings);
   body=body.replace('</main>',`<section class="cms-section"><div class="cms-container"><p class="eyebrow">Retreat details</p><h2>${esc(r.dates)}</h2><p>${esc(r.duration)} · ${esc(r.capacity)} · ${esc(r.price)}</p><p>${esc(r.summary)}</p></div></section></main>`);
  }else body=shell(r,`<section class="cms-section retreat-hero"><div class="cms-container"><p class="eyebrow">${esc(r.location)}</p><h1>${esc(r.title)}</h1><p class="lead">${esc(r.summary)}</p><img src="${imageURL(r.image)}" alt="${esc(r.title)}"><p>${esc(r.dates)} · ${esc(r.duration)} · ${esc(r.capacity)}</p><p>${esc(r.price)}</p><a class="action-link" href="/#inquire">Request details →</a></div></section><section class="cms-section"><article class="prose cms-container">${markdown(r.body)}</article></section>`).replace('{{EXTRA_LINKS}}',links);
  await put('retreats/'+r.slug,body);
 }
 for(const p of custom)await put(p.slug,shell(p,`<section class="cms-section"><article class="prose cms-container"><h1>${esc(p.title)}</h1>${markdown(p.body)}</article></section>`).replace('{{EXTRA_LINKS}}',links));
 await writeFile(path.join(out,'form-status.json'),JSON.stringify({retreat:!!settings.retreat_form_id,coach:!!settings.coach_form_id}));
 const origin=settings.site_url.replace(/\/$/,'');
 if(origin&&settings.allow_indexing){
  const urls=['/','/pricing/','/coach-with-us/',...retreats.map(r=>'/retreats/'+r.slug+'/'),...custom.map(p=>'/'+p.slug+'/')];
  await writeFile(path.join(out,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(url=>`<url><loc>${esc(origin+url)}</loc></url>`).join('')+'</urlset>');
  await writeFile(path.join(out,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${origin}/sitemap.xml\n`);
 }
 console.log(`Built ${3+retreats.length+custom.length} pages into dist/`);
}
if(process.argv[1]===fileURLToPath(import.meta.url))await build();
