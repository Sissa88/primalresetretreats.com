export function renderCoachGrid(profiles,{esc,imageURL}){
 return `<div class="coach-grid" aria-label="Meet the coaches">${profiles.map(coach=>`<article class="coach-card"><img class="coach-portrait" src="${imageURL(coach.image)}" alt="${esc(coach.image_alt)}" loading="lazy"><div class="coach-copy"><p class="coach-role">${esc(coach.role)}</p><h3>${esc(coach.name)}</h3><p class="coach-specialties">${esc(coach.specialties)}</p><p class="coach-bio">${esc(coach.bio)}</p></div></article>`).join('')}</div>`;
}
