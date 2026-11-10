export function renderCoachGrid(profiles,{esc,imageURL}){
 return `<div class="coach-grid" id="coaches" aria-label="Meet the coaches">${profiles.map(coach=>{
  const paragraphs=coach.bio.split(/\n\s*\n/).filter(p=>p.trim());
  const introduction=paragraphs.shift()||'';
  const expanded=paragraphs.length?`<details class="coach-details"><summary><span class="coach-read-more">Read more</span><span class="coach-read-less">Read less</span><span class="coach-toggle-icon" aria-hidden="true">+</span></summary><div class="coach-full-bio">${paragraphs.map(p=>`<p>${esc(p.trim())}</p>`).join('')}</div></details>`:'';
  return `<article class="coach-card" data-coach="${esc(coach.id)}"><div class="coach-photo-frame"><img class="coach-portrait" src="${imageURL(coach.image)}" alt="${esc(coach.image_alt)}" loading="lazy"></div><div class="coach-copy"><p class="coach-role">${esc(coach.role)}</p><h3>${esc(coach.name)}</h3><p class="coach-specialties">${esc(coach.specialties)}</p><div class="coach-bio"><p>${esc(introduction.trim())}</p>${expanded}</div></div></article>`;
 }).join('')}</div>`;
}
