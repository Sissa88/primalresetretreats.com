export function renderCoachGrid(profiles,{esc,imageURL}){
 return `<div class="coach-grid" aria-label="Meet the coaches">${profiles.map(coach=>`<article class="coach-card" data-coach="${esc(coach.id)}"><div class="coach-photo-frame"><img class="coach-portrait" src="${imageURL(coach.image)}" alt="${esc(coach.image_alt)}" loading="lazy"></div><div class="coach-copy"><p class="coach-role">${esc(coach.role)}</p><h3>${esc(coach.name)}</h3><p class="coach-specialties">${esc(coach.specialties)}</p><p class="coach-bio">${esc(coach.bio)}</p></div></article>`).join('')}</div>`;
}
