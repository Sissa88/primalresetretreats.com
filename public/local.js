'use strict';
for (const form of document.querySelectorAll('.inquiry-form')) {
 const status = form.querySelector('.form-status');
 const button = form.querySelector('button[type=submit]');
 form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity() || button.disabled) return;
  if (!/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(form.action)) {
   status.textContent = 'Online inquiries are not connected yet. Please check back soon.'; return;
  }
  if (!form.elements.name.value.trim() || !form.elements.message.value.trim()) {
   status.textContent = 'Please enter your name and a short message.'; return;
  }
  const label = button.textContent;
  button.disabled = true; button.textContent = 'Sending…';
  status.textContent = 'Sending your message…';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
   const response = await fetch(form.action, {method:'POST', body:new FormData(form), headers:{Accept:'application/json'}, signal:controller.signal});
   const result = await response.json().catch(() => ({}));
   if (!response.ok || result.ok === false) throw new Error('delivery');
   status.textContent = 'Thank you. Your message has been sent to the retreat team.';
   form.reset();
  } catch {
   status.textContent = 'We could not confirm delivery. Your message is still here. Please check your connection before trying again.';
  } finally {
   clearTimeout(timeout); button.disabled = false; button.textContent = label;
  }
 });
}
for (const header of document.querySelectorAll('header')) {
  const menu = document.createElement('details'); menu.className = 'local-menu';
  const summary = document.createElement('summary'); summary.textContent = 'Menu'; menu.append(summary);
  const nav = document.createElement('nav'); nav.setAttribute('aria-label','All pages');
  for (const [label, href] of [['Home','/'],["The Men’s Rebirth",'/retreats/mens-rebirth/'],['Coach with us','/coach-with-us/'],['Inquire','/#inquire']]) {
    const a = document.createElement('a'); a.textContent = label; a.href = href; nav.append(a);
  }
  menu.append(nav); header.append(menu);
  nav.addEventListener('click', () => { menu.open = false; });
}
const skip = document.createElement('a'); skip.href = '#main-content'; skip.className = 'skip-link'; skip.textContent = 'Skip to content';
const main = document.querySelector('main');
if (main) { main.id = 'main-content'; main.tabIndex = -1; document.body.prepend(skip); }
