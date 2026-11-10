export function renderFAQ(faq,{esc}){
 return `<section id="faq" class="faq-section" aria-labelledby="faq-heading"><div class="faq-layout"><div class="faq-intro"><p class="eyebrow">${esc(faq.eyebrow)}</p><h2 id="faq-heading">${esc(faq.heading)}</h2></div><div class="faq-list">${faq.items.map((item,i)=>`<details${i===0?' open':''}><summary>${esc(item.question)}<span aria-hidden="true">+</span></summary><p>${esc(item.answer)}</p></details>`).join('')}</div></div></section>`;
}
