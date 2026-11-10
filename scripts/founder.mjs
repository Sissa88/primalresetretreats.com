export function renderFounder(founder,{esc,imageURL}){
 const portrait=founder.image?`<img src="${imageURL(founder.image)}" alt="${esc(founder.image_alt)}" loading="lazy">`:`<div class="founder-photo-placeholder" role="img" aria-label="Portrait space reserved for ${esc(founder.name)}"><span class="founder-initials" aria-hidden="true">${esc(founder.name.split(/\s+/).map(n=>n[0]).join(''))}</span><span>${esc(founder.name)}</span><small>Portrait coming soon</small></div>`;
 const paragraphs=founder.bio.split(/\n\s*\n/).filter(p=>p.trim());
 const introduction=paragraphs.slice(0,2).map(p=>`<p>${esc(p.trim())}</p>`).join('');
 const fullBio=paragraphs.slice(2).map(p=>`<p>${esc(p.trim())}</p>`).join('');
 const disclosure=fullBio?`<details class="coach-details founder-details"><summary><span class="coach-read-more">Read more</span><span class="coach-read-less">Read less</span></summary><div class="coach-full-bio">${fullBio}</div></details>`:'';
 return `<section class="founder-profile" id="founder" aria-labelledby="founder-heading"><div class="founder-identity"><p class="founder-eyebrow">${esc(founder.eyebrow)}</p><h2 id="founder-heading">Meet ${esc(founder.name)}</h2><p class="founder-role">${esc(founder.role)}</p><div class="founder-photo">${portrait}</div></div><div class="founder-copy" id="story"><div class="founder-biography">${introduction}${disclosure}</div><blockquote class="founder-quote">“${esc(founder.quote)}”</blockquote></div></section>`;
}
